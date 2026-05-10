import base64
import binascii
import hashlib
import io
import json
import os
import re
import secrets
import threading
import time
import traceback
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from PIL import Image, ImageOps, UnidentifiedImageError

try:
    from database import SiteDatabase
except ModuleNotFoundError:
    from backend.database import SiteDatabase


APP_DIR = Path(__file__).resolve().parent
DATA_DIR = APP_DIR / "data"
LEGACY_STORE_FILE = DATA_DIR / "store.json"
LEGACY_SQLITE_FILE = DATA_DIR / "exclusive.sqlite3"
UPLOADS_DIR = Path(os.getenv("EXCLUSIVE_UPLOADS_DIR", str(APP_DIR.parent / "uploads"))).resolve()
PRODUCT_UPLOADS_DIR = UPLOADS_DIR / "products"
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://exclusive:exclusive@127.0.0.1:5432/exclusive")
API_HOST = os.getenv("EXCLUSIVE_API_HOST", "127.0.0.1")
API_PORT = int(os.getenv("EXCLUSIVE_API_PORT", "9000"))
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
BOT_USERNAME = os.getenv("TELEGRAM_BOT_USERNAME", "exclusive_order_bot").strip().replace("@", "")
MANAGER_CHAT_IDS = [value.strip() for value in os.getenv("TELEGRAM_MANAGER_CHAT_IDS", "").split(",") if value.strip()]
MANAGER_USERNAMES = [value.strip().replace("@", "") for value in os.getenv("TELEGRAM_MANAGER_USERNAMES", "").split(",") if value.strip()]
DEMO_PHONE = os.getenv("EXCLUSIVE_DEMO_PHONE", "+79999999999").strip()
ADMIN_PHONES_RAW = os.getenv("EXCLUSIVE_ADMIN_PHONES", "+79953980243")
PASSWORD_HASH_ITERATIONS = 180_000


def utc_now():
    return datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def normalize_phone(value):
    digits = "".join(symbol for symbol in str(value or "") if symbol.isdigit())

    if not digits:
        return ""

    if len(digits) == 10:
        return f"+7{digits}"

    if len(digits) == 11 and digits.startswith("8"):
        return f"+7{digits[1:]}"

    if len(digits) == 11 and digits.startswith("7"):
        return f"+{digits}"

    return f"+{digits}"


def sanitize_text(value, fallback=""):
    if not isinstance(value, str):
        return fallback

    trimmed = value.strip()
    return trimmed or fallback


def normalize_email(value):
    email = sanitize_text(value).lower()
    if not email:
        return ""

    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        return ""

    return email


def normalize_telegram_username(value):
    username = sanitize_text(value).replace("@", "").strip()
    username = "".join(symbol for symbol in username if symbol.isascii() and (symbol.isalnum() or symbol == "_"))
    return username[:32]


MOSCOW_TZ = timezone(timedelta(hours=3))


def next_order_code(counter):
    date_prefix = datetime.utcnow().strftime("%Y%m%d")
    return f"EX-{date_prefix}-{counter:04d}"


ADMIN_PHONES = [normalize_phone(value.strip()) for value in ADMIN_PHONES_RAW.split(",") if value.strip()]
UPLOAD_DATA_URL_PATTERN = re.compile(r"^data:(image/(?:avif|gif|jpeg|jpg|png|svg\+xml|webp));base64,(.+)$", re.DOTALL)
UPLOAD_EXTENSIONS = {
    "image/avif": ".avif",
    "image/gif": ".gif",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/svg+xml": ".svg",
    "image/webp": ".webp",
}
MAX_UPLOAD_BYTES = 12 * 1024 * 1024
UPLOAD_IMAGE_MAX_SIZE = (1600, 2200)
UPLOAD_IMAGE_QUALITY = 82
def safe_upload_extension(name, mime_type):
    suffix = Path(sanitize_text(name)).suffix.lower()

    if suffix in {".avif", ".gif", ".jpg", ".jpeg", ".png", ".svg", ".webp"}:
        return ".jpg" if suffix == ".jpeg" else suffix

    return UPLOAD_EXTENSIONS.get(mime_type, ".webp")


def optimize_upload_image(binary, mime_type):
    if mime_type == "image/svg+xml":
        return binary, ".svg"

    try:
        with Image.open(io.BytesIO(binary)) as source:
            image = ImageOps.exif_transpose(source)
            image.thumbnail(UPLOAD_IMAGE_MAX_SIZE, Image.Resampling.LANCZOS)

            if image.mode not in {"RGB", "RGBA"}:
                image = image.convert("RGBA" if "A" in image.getbands() else "RGB")

            output = io.BytesIO()
            image.save(output, format="WEBP", quality=UPLOAD_IMAGE_QUALITY, method=6)
            return output.getvalue(), ".webp"
    except UnidentifiedImageError as error:
        raise ValueError("Не удалось обработать изображение.") from error


def hash_password(password):
    normalized_password = str(password or "")
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        normalized_password.encode("utf-8"),
        salt.encode("utf-8"),
        PASSWORD_HASH_ITERATIONS,
    ).hex()
    return f"pbkdf2_sha256${PASSWORD_HASH_ITERATIONS}${salt}${digest}"


def verify_password(password, password_hash):
    parts = str(password_hash or "").split("$")
    if len(parts) != 4 or parts[0] != "pbkdf2_sha256":
        return False

    try:
        iterations = int(parts[1])
    except ValueError:
        return False

    salt = parts[2]
    expected = parts[3]
    actual = hashlib.pbkdf2_hmac(
        "sha256",
        str(password or "").encode("utf-8"),
        salt.encode("utf-8"),
        iterations,
    ).hex()
    return secrets.compare_digest(actual, expected)


class Store:
    def __init__(self, path, demo_phone, database=None, admin_phones=None):
        self.path = path
        self.demo_phone = normalize_phone(demo_phone)
        self.database = database
        self.admin_phones = {normalize_phone(value) for value in (admin_phones or []) if normalize_phone(value)}
        self.lock = threading.RLock()
        if not self.database:
            self.path.parent.mkdir(parents=True, exist_ok=True)
        self.data = self._load()
        if self.database:
            self.database.sync_from_json_store(self.data)

    def _seed(self):
        return {
            "users": [
                {
                    "id": "demo-user",
                    "firstName": "Demo",
                    "lastName": "Client",
                    "city": "",
                    "phone": self.demo_phone,
                    "email": "",
                    "passwordHash": "",
                    "telegramChatId": "",
                    "createdAt": utc_now(),
                }
            ],
            "sessions": [],
            "orders": [],
            "conversations": {},
            "managerChats": {},
            "counters": {"orders": 1},
        }

    def _load(self):
        if self.database:
            data = self.database.load_store_data(self._seed())
        elif not self.path.exists():
            data = self._seed()
            self._write(data)
        else:
            try:
                with self.path.open("r", encoding="utf-8") as source:
                    data = json.load(source)
            except (OSError, json.JSONDecodeError):
                data = self._seed()
                self._write(data)

            if not isinstance(data, dict):
                data = self._seed()

        data.setdefault("users", [])
        data.setdefault("sessions", [])
        data.setdefault("orders", [])
        data.setdefault("conversations", {})
        data.setdefault("managerChats", {})
        data.setdefault("counters", {"orders": 1})

        if not any(normalize_phone(user.get("phone")) == self.demo_phone for user in data["users"]):
            data["users"].insert(0, self._seed()["users"][0])

        if not self.database:
            self._write(data)
        return data

    def _write(self, data):
        with self.path.open("w", encoding="utf-8") as target:
            json.dump(data, target, ensure_ascii=False, indent=2)

    def save(self):
        if self.database:
            self.database.sync_from_json_store(self.data)
            return

        self._write(self.data)

    def _public_user(self, user):
        return {
            "id": user["id"],
            "firstName": user["firstName"],
            "lastName": user["lastName"],
            "city": user.get("city", ""),
            "phone": user["phone"],
            "email": user.get("email", ""),
        }

    def get_user_by_phone(self, phone):
        normalized_phone = normalize_phone(phone)
        for user in self.data["users"]:
            if normalize_phone(user.get("phone")) == normalized_phone:
                return user
        return None

    def get_user_by_email(self, email):
        normalized_email = normalize_email(email)
        if not normalized_email:
            return None

        for user in self.data["users"]:
            if normalize_email(user.get("email")) == normalized_email:
                return user
        return None

    def get_user_by_login(self, login):
        normalized_phone = normalize_phone(login)
        if normalized_phone:
            user = self.get_user_by_phone(normalized_phone)
            if user:
                return user

        normalized_email = normalize_email(login)
        if normalized_email:
            return self.get_user_by_email(normalized_email)

        return None

    def get_user_by_session(self, session_token):
        token = sanitize_text(session_token)

        if not token:
            return None

        session = next((entry for entry in self.data["sessions"] if entry.get("token") == token), None)

        if not session:
            return None

        user_id = session.get("userId")
        return next((user for user in self.data["users"] if user.get("id") == user_id), None)

    def is_admin_session(self, session_token):
        user = self.get_user_by_session(session_token)
        if not user:
            return False
        return normalize_phone(user.get("phone")) in self.admin_phones

    def create_session(self, user_id):
        token = uuid.uuid4().hex
        self.data["sessions"] = [entry for entry in self.data["sessions"] if entry.get("userId") != user_id]
        self.data["sessions"].append(
            {
                "token": token,
                "userId": user_id,
                "createdAt": utc_now(),
            }
        )
        self.save()
        return token

    def login(self, login, password):
        normalized_login = sanitize_text(login)
        normalized_password = str(password or "")

        if not normalized_login or not normalized_password:
            raise ValueError("Введите номер телефона или адрес электронной почты и пароль.")

        with self.lock:
            user = self.get_user_by_login(normalized_login)

            if not user or not verify_password(normalized_password, user.get("passwordHash")):
                raise ValueError("Неверный логин или пароль.")

            token = self.create_session(user["id"])
            return {"user": self._public_user(user), "sessionToken": token}

    def register(self, first_name, last_name, city, phone, email, password):
        normalized_phone = normalize_phone(phone)
        normalized_first_name = sanitize_text(first_name)
        normalized_last_name = sanitize_text(last_name)
        normalized_city = sanitize_text(city)
        normalized_email = normalize_email(email)
        normalized_password = str(password or "")

        if not normalized_first_name or not normalized_last_name or not normalized_city or not normalized_phone or not normalized_email:
            raise ValueError("Заполните имя, фамилию, город, телефон и почту.")

        if len(normalized_password) < 6:
            raise ValueError("Пароль должен быть не короче 6 символов.")

        with self.lock:
            existing_by_phone = self.get_user_by_phone(normalized_phone)
            existing_by_email = self.get_user_by_email(normalized_email)

            if existing_by_email and (not existing_by_phone or existing_by_email.get("id") != existing_by_phone.get("id")):
                raise ValueError("Аккаунт с такой почтой уже существует.")

            if existing_by_phone:
                if existing_by_phone.get("passwordHash"):
                    raise ValueError("Аккаунт с таким номером уже существует.")

                existing_by_phone["firstName"] = normalized_first_name
                existing_by_phone["lastName"] = normalized_last_name
                existing_by_phone["city"] = normalized_city
                existing_by_phone["email"] = normalized_email
                existing_by_phone["passwordHash"] = hash_password(normalized_password)
                user = existing_by_phone
            else:
                user = {
                    "id": f"user-{uuid.uuid4().hex[:12]}",
                    "firstName": normalized_first_name,
                    "lastName": normalized_last_name,
                    "city": normalized_city,
                    "phone": normalized_phone,
                    "email": normalized_email,
                    "passwordHash": hash_password(normalized_password),
                    "telegramChatId": "",
                    "createdAt": utc_now(),
                }
                self.data["users"].insert(0, user)

            token = self.create_session(user["id"])
            self.save()
            return {"user": self._public_user(user), "sessionToken": token}

    def resolve_customer(self, session_token, customer_payload):
        with self.lock:
            session_user = self.get_user_by_session(session_token)

            if session_user:
                return session_user

            phone = normalize_phone(customer_payload.get("phone"))
            first_name = sanitize_text(customer_payload.get("firstName"))
            last_name = sanitize_text(customer_payload.get("lastName"))

            if not phone or not first_name or not last_name:
                raise ValueError("Недостаточно данных клиента для создания заказа.")

            existing = self.get_user_by_phone(phone)

            if existing:
                if not existing.get("firstName"):
                    existing["firstName"] = first_name
                if not existing.get("lastName"):
                    existing["lastName"] = last_name
                self.save()
                return existing

            user = {
                "id": f"user-{uuid.uuid4().hex[:12]}",
                "firstName": first_name,
                "lastName": last_name,
                "city": sanitize_text(customer_payload.get("city")),
                "phone": phone,
                "email": normalize_email(customer_payload.get("email")),
                "passwordHash": "",
                "telegramChatId": "",
                "createdAt": utc_now(),
            }
            self.data["users"].insert(0, user)
            self.save()
            return user

    def create_order(self, session_token, payload):
        items = payload.get("items") or []

        if not isinstance(items, list) or not items:
            raise ValueError("Корзина пуста.")

        with self.lock:
            user = self.resolve_customer(session_token, payload.get("customer") or {})
            order_number = self.data["counters"].get("orders", 1)
            order_id = next_order_code(order_number)
            self.data["counters"]["orders"] = order_number + 1

            order = {
                "id": order_id,
                "status": "draft",
                "createdAt": utc_now(),
                "customer": self._public_user(user),
                "items": [
                    {
                        "lineId": sanitize_text(item.get("lineId")),
                        "productId": sanitize_text(item.get("productId")),
                        "title": sanitize_text(item.get("title")),
                        "article": sanitize_text(item.get("article")),
                        "size": sanitize_text(item.get("size")),
                        "color": sanitize_text(item.get("color")),
                        "quantity": int(item.get("quantity") or 1),
                        "priceValue": int(item.get("priceValue") or 0),
                        "priceLabel": sanitize_text(item.get("priceLabel")),
                    }
                    for item in items
                ],
                "subtotal": int(payload.get("subtotal") or 0),
                "delivery": int(payload.get("delivery") or 0),
                "total": int(payload.get("total") or 0),
                "sourceUrl": sanitize_text(payload.get("sourceUrl")),
                "deliveryMode": "",
                "city": sanitize_text(payload.get("city")),
                "address": "",
                "comment": "",
                "telegramUsername": normalize_telegram_username(payload.get("telegramUsername")),
                "telegramChatId": "",
                "statusHistory": [{"status": "draft", "at": utc_now(), "source": "site"}],
            }
            self.data["orders"].insert(0, order)
            self.save()
            return order

    def get_order(self, order_id):
        with self.lock:
            return next((order for order in self.data["orders"] if order.get("id") == order_id), None)

    def list_orders_for_chat(self, chat_id):
        chat_value = str(chat_id)
        with self.lock:
            return [order for order in self.data["orders"] if str(order.get("telegramChatId") or "") == chat_value]

    def update_order(self, order_id, **changes):
        with self.lock:
            order = next((entry for entry in self.data["orders"] if entry.get("id") == order_id), None)

            if not order:
                return None

            status = changes.pop("status", None)

            for key, value in changes.items():
                order[key] = value

            if status and status != order.get("status"):
                order["status"] = status
                order.setdefault("statusHistory", []).append(
                    {
                        "status": status,
                        "at": utc_now(),
                        "source": changes.pop("statusSource", "bot"),
                    }
                )

            self.save()
            return order

    def list_orders_for_phone(self, phone):
        normalized_phone = normalize_phone(phone)

        with self.lock:
            return [
                order
                for order in self.data["orders"]
                if normalize_phone(order.get("customer", {}).get("phone")) == normalized_phone
            ]

    def get_account_payload(self, session_token):
        with self.lock:
            user = self.get_user_by_session(session_token)

            if not user:
                raise ValueError("Сессия не найдена.")

            return {
                "user": self._public_user(user),
                "orders": self.list_orders_for_phone(user.get("phone")),
            }

    def update_account_profile(self, session_token, first_name, last_name, city, phone, email):
        normalized_phone = normalize_phone(phone)
        normalized_first_name = sanitize_text(first_name)
        normalized_last_name = sanitize_text(last_name)
        normalized_city = sanitize_text(city)
        normalized_email = normalize_email(email)

        with self.lock:
            user = self.get_user_by_session(session_token)

            if not user:
                raise ValueError("Сессия не найдена.")

            if not normalized_first_name or not normalized_last_name or not normalized_city or not normalized_phone or not normalized_email:
                raise ValueError("Заполните имя, фамилию, город, телефон и почту.")

            duplicate = next(
                (
                    entry
                    for entry in self.data["users"]
                    if entry.get("id") != user.get("id") and normalize_phone(entry.get("phone")) == normalized_phone
                ),
                None,
            )

            if duplicate:
                raise ValueError("Аккаунт с таким номером уже существует.")

            duplicate_email = next(
                (
                    entry
                    for entry in self.data["users"]
                    if entry.get("id") != user.get("id") and normalize_email(entry.get("email")) == normalized_email
                ),
                None,
            )

            if duplicate_email:
                raise ValueError("Аккаунт с такой почтой уже существует.")

            previous_phone = normalize_phone(user.get("phone"))
            user["firstName"] = normalized_first_name
            user["lastName"] = normalized_last_name
            user["city"] = normalized_city
            user["phone"] = normalized_phone
            user["email"] = normalized_email

            for order in self.data["orders"]:
                if normalize_phone(order.get("customer", {}).get("phone")) != previous_phone:
                    continue

                order["customer"]["firstName"] = normalized_first_name
                order["customer"]["lastName"] = normalized_last_name
                order["customer"]["city"] = normalized_city
                order["customer"]["phone"] = normalized_phone
                order["customer"]["email"] = normalized_email

            self.save()
            return {
                "user": self._public_user(user),
                "orders": self.list_orders_for_phone(normalized_phone),
            }

    def attach_chat(self, order_id, chat_id, telegram_user):
        with self.lock:
            order = next((entry for entry in self.data["orders"] if entry.get("id") == order_id), None)

            if not order:
                return None

            order["telegramChatId"] = str(chat_id)
            customer_phone = normalize_phone(order.get("customer", {}).get("phone"))
            user = self.get_user_by_phone(customer_phone)

            if user:
                user["telegramChatId"] = str(chat_id)
                user["telegramUsername"] = sanitize_text(telegram_user.get("username"))
                user["telegramFirstName"] = sanitize_text(telegram_user.get("first_name"))

            self.save()
            return order

    def set_conversation(self, chat_id, state):
        with self.lock:
            self.data["conversations"][str(chat_id)] = state
            self.save()

    def get_conversation(self, chat_id):
        return self.data["conversations"].get(str(chat_id))

    def clear_conversation(self, chat_id):
        with self.lock:
            if str(chat_id) in self.data["conversations"]:
                self.data["conversations"].pop(str(chat_id), None)
                self.save()

    def remember_manager_chat(self, username, chat_id):
        normalized_username = sanitize_text(username).replace("@", "")

        if not normalized_username or not chat_id:
            return

        with self.lock:
            self.data.setdefault("managerChats", {})
            self.data["managerChats"][normalized_username] = str(chat_id)
            self.save()

    def get_manager_chat_ids(self, allowed_usernames=None):
        with self.lock:
            manager_chats = self.data.get("managerChats", {})

            if not allowed_usernames:
                return [value for value in manager_chats.values() if sanitize_text(value)]

            normalized = {sanitize_text(value).replace("@", "") for value in allowed_usernames if sanitize_text(value)}
            return [
                chat_id
                for username, chat_id in manager_chats.items()
                if username in normalized and sanitize_text(chat_id)
            ]


class TelegramBot:
    def __init__(self, token, username, manager_chat_ids, manager_usernames, store):
        self.token = token
        self.username = username
        self.manager_chat_ids = manager_chat_ids
        self.manager_usernames = [sanitize_text(value).replace("@", "") for value in manager_usernames if sanitize_text(value)]
        self.store = store
        self.offset = 0

    def is_ready(self):
        return bool(self.token and self.username)

    def api_call(self, method, payload):
        if not self.token:
            return {}

        body = json.dumps(payload).encode("utf-8")
        request = urllib.request.Request(
            f"https://api.telegram.org/bot{self.token}/{method}",
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            details = ""

            try:
                details = error.read().decode("utf-8")
            except Exception:
                details = str(error)

            print(f"Telegram API {method} failed with HTTP {error.code}: {details}", flush=True)

            try:
                return json.loads(details)
            except json.JSONDecodeError:
                return {"ok": False, "error_code": error.code, "description": details}
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
            print(f"Telegram API {method} request failed: {error}", flush=True)
            return {}
        except Exception as error:
            print(f"Telegram API {method} unexpected error: {error}", flush=True)
            traceback.print_exc()
            return {}

    def send_message(self, chat_id, text):
        payload = {
            "chat_id": chat_id,
            "text": text,
        }
        return self.api_call("sendMessage", payload)

    def is_manager_user(self, telegram_user):
        user_id = str(telegram_user.get("id") or "")
        username = sanitize_text(telegram_user.get("username")).replace("@", "")

        if user_id and user_id in self.manager_chat_ids:
            return True

        if username and username in self.manager_usernames:
            return True

        remembered_chat_ids = set(self.store.get_manager_chat_ids(self.manager_usernames))
        if user_id and user_id in remembered_chat_ids:
            return True

        return False

    def remember_manager_from_user(self, chat_id, telegram_user):
        username = sanitize_text(telegram_user.get("username")).replace("@", "")

        if username and username in self.manager_usernames:
            self.store.remember_manager_chat(username, chat_id)

    def format_order_date(self, order):
        created_at = sanitize_text(order.get("createdAt"))

        try:
            normalized = created_at.replace("Z", "+00:00")
            date_value = datetime.fromisoformat(normalized)

            if date_value.tzinfo is None:
                date_value = date_value.replace(tzinfo=timezone.utc)

            return date_value.astimezone(MOSCOW_TZ).strftime("%d.%m.%Y, %H:%M")
        except ValueError:
            return datetime.now(MOSCOW_TZ).strftime("%d.%m.%Y, %H:%M")

    def build_order_text(self, order):
        customer = order.get("customer", {})
        full_name = " ".join(
            part
            for part in [
                sanitize_text(customer.get("lastName")),
                sanitize_text(customer.get("firstName")),
            ]
            if part
        )
        telegram_username = sanitize_text(order.get("telegramUsername"))
        item_lines = []
        header_lines = [
            "✨Поступил новый заказ!",
            f"ФИО: {full_name or 'Не указано'}",
            f"Телефон: {sanitize_text(customer.get('phone'), 'Не указан')}",
            f"Город: {sanitize_text(order.get('city'), 'Не указан')}",
        ]

        if telegram_username:
            header_lines.append(f"Telegram: @{telegram_username}")

        for item in order.get("items", []):
            title = sanitize_text(item.get("title"), "Товар EXCLUSIVE")
            size = sanitize_text(item.get("size"), "размер не указан")
            article = sanitize_text(item.get("article"), "артикул не указан")
            quantity = int(item.get("quantity") or 1)
            quantity_label = f" x {quantity}" if quantity > 1 else ""
            item_lines.append(f"• {title}, {size}, ({article}){quantity_label}")

        return "\n".join(
            [
                *header_lines,
                "",
                *(item_lines or ["• Товары не указаны"]),
                "",
                f"Дата заказа: {self.format_order_date(order)}",
            ]
        )

    def notify_managers(self, order):
        destination_ids = {
            str(chat_id)
            for chat_id in [
                *self.manager_chat_ids,
                *self.store.get_manager_chat_ids(self.manager_usernames),
            ]
            if sanitize_text(str(chat_id))
        }

        if not destination_ids:
            print("Telegram manager chat is not configured. Order notification skipped.", flush=True)
            return False

        text = self.build_order_text(order)
        sent = False

        for chat_id in destination_ids:
            response = self.send_message(chat_id, text)
            sent = bool(isinstance(response, dict) and response.get("ok")) or sent

        return sent

    def handle_text(self, message):
        chat_id = message.get("chat", {}).get("id")
        telegram_user = message.get("from", {})

        self.remember_manager_from_user(chat_id, telegram_user)

        if self.is_manager_user(telegram_user):
            self.send_message(chat_id, "Менеджерский аккаунт подключен. Новые заказы будут приходить сюда.")
            return

        self.send_message(chat_id, "Заказы оформляются на сайте EXCLUSIVE. Менеджер получит уведомление после оформления.")

    def handle_update(self, update):
        message = update.get("message")

        if message:
            self.handle_text(message)

    def prepare_polling(self):
        webhook_info = self.api_call("getWebhookInfo", {})
        webhook_result = webhook_info.get("result", {}) if isinstance(webhook_info, dict) else {}
        webhook_url = sanitize_text(webhook_result.get("url"))
        pending_updates = int(webhook_result.get("pending_update_count") or 0)

        if webhook_url:
            print("Telegram bot webhook detected. Removing it before polling starts.", flush=True)

        if webhook_url or pending_updates:
            self.api_call("deleteWebhook", {"drop_pending_updates": False})

        if pending_updates:
            print(f"Telegram bot pending updates before polling: {pending_updates}", flush=True)

    def run(self):
        if not self.token:
            print("Telegram bot token not configured. Bot polling skipped.", flush=True)
            return

        print("Telegram bot polling started.", flush=True)
        self.prepare_polling()

        while True:
            try:
                response = self.api_call(
                    "getUpdates",
                    {
                        "offset": self.offset,
                        "timeout": 25,
                        "allowed_updates": ["message"],
                    },
                )

                if isinstance(response, dict) and response.get("ok") is False:
                    description = sanitize_text(response.get("description"), "unknown error")
                    print(f"Telegram polling response error: {description}", flush=True)
                    time.sleep(3.0)
                    continue

                updates = response.get("result", []) if isinstance(response, dict) else []

                for update in updates:
                    self.offset = max(self.offset, int(update.get("update_id", 0)) + 1)
                    try:
                        self.handle_update(update)
                    except Exception:
                        traceback.print_exc()

                if updates:
                    self.api_call(
                        "getUpdates",
                        {
                            "offset": self.offset,
                            "timeout": 0,
                            "allowed_updates": ["message"],
                        },
                    )

                time.sleep(1.0)
            except Exception:
                print("Telegram polling loop crashed. Retrying.", flush=True)
                traceback.print_exc()
                time.sleep(3.0)


class ApiHandler(BaseHTTPRequestHandler):
    store = None
    bot = None
    database = None

    def _send_json(self, status_code, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()
        self.wfile.write(body)

    def _client_ip(self):
        forwarded = self.headers.get("X-Forwarded-For", "")
        if forwarded:
            return forwarded.split(",", 1)[0].strip()

        return self.client_address[0] if self.client_address else ""

    def do_OPTIONS(self):
        self._send_json(200, {"success": True})

    def do_GET(self):
        if self.path == "/api/health":
            self._send_json(
                200,
                {
                    "success": True,
                    "botReady": bool(self.bot and self.bot.is_ready()),
                    "botUsername": BOT_USERNAME,
                    "authMode": "password",
                },
            )
            return

        if self.path == "/api/config":
            self._send_json(
                200,
                {
                    "success": True,
                    "demoPhone": DEMO_PHONE,
                    "botReady": bool(self.bot and self.bot.is_ready()),
                    "botUsername": BOT_USERNAME,
                    "authMode": "password",
                },
            )
            return

        if self.path == "/api/catalog":
            if not self.database:
                self._send_json(503, {"success": False, "error": "Database unavailable"})
                return

            catalog = self.database.get_catalog()
            self._send_json(200, {"success": True, **catalog})
            return

        self._send_json(404, {"success": False, "error": "Not found"})

    def _read_json_body(self):
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            content_length = 0

        raw_body = self.rfile.read(content_length) if content_length > 0 else b"{}"

        try:
            return json.loads(raw_body.decode("utf-8"))
        except json.JSONDecodeError:
            return {}

    def do_POST(self):
        payload = self._read_json_body()

        if self.path == "/api/auth/login":
            try:
                result = self.store.login(payload.get("login"), payload.get("password"))
                self._send_json(200, {"success": True, **result})
            except ValueError as error:
                self._send_json(400, {"success": False, "error": str(error)})
            return

        if self.path == "/api/auth/request-code":
            self._send_json(410, {"success": False, "error": "Коды подтверждения отключены. Используйте вход по паролю."})
            return

        if self.path == "/api/auth/verify-code":
            self._send_json(410, {"success": False, "error": "Коды подтверждения отключены. Используйте вход по паролю."})
            return

        if self.path == "/api/auth/register":
            try:
                result = self.store.register(
                    payload.get("firstName"),
                    payload.get("lastName"),
                    payload.get("city"),
                    payload.get("phone"),
                    payload.get("email"),
                    payload.get("password"),
                )
                self._send_json(200, {"success": True, **result})
            except ValueError as error:
                self._send_json(400, {"success": False, "error": str(error)})
            return

        if self.path == "/api/orders":
            try:
                order = self.store.create_order(payload.get("sessionToken"), payload)
                manager_notified = bool(self.bot and self.bot.is_ready() and self.bot.notify_managers(order))
                self._send_json(
                    200,
                    {
                        "success": True,
                        "order": order,
                        "botReady": bool(self.bot and self.bot.is_ready()),
                        "managerNotified": manager_notified,
                    },
                )
            except ValueError as error:
                self._send_json(400, {"success": False, "error": str(error)})
            return

        if self.path == "/api/account":
            try:
                result = self.store.get_account_payload(payload.get("sessionToken"))
                self._send_json(200, {"success": True, **result})
            except ValueError as error:
                self._send_json(400, {"success": False, "error": str(error)})
            return

        if self.path == "/api/account/update":
            try:
                result = self.store.update_account_profile(
                    payload.get("sessionToken"),
                    payload.get("firstName"),
                    payload.get("lastName"),
                    payload.get("city"),
                    payload.get("phone"),
                    payload.get("email"),
                )
                self._send_json(200, {"success": True, **result})
            except ValueError as error:
                self._send_json(400, {"success": False, "error": str(error)})
            return

        if self.path == "/api/uploads":
            if not self.store.is_admin_session(payload.get("sessionToken")):
                self._send_json(403, {"success": False, "error": "Доступ к загрузке разрешен только владельцу."})
                return

            files = payload.get("files") or []

            if not isinstance(files, list) or not files:
                self._send_json(400, {"success": False, "error": "Файлы для загрузки не переданы."})
                return

            uploaded = []
            PRODUCT_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

            try:
                for file_payload in files:
                    if not isinstance(file_payload, dict):
                        raise ValueError("Некорректный файл.")

                    data_url = sanitize_text(file_payload.get("dataUrl"))
                    match = UPLOAD_DATA_URL_PATTERN.match(data_url)

                    if not match:
                        raise ValueError("Поддерживаются только изображения.")

                    mime_type = match.group(1)
                    binary = base64.b64decode(match.group(2), validate=True)

                    if not binary:
                        raise ValueError("Пустой файл изображения.")

                    if len(binary) > MAX_UPLOAD_BYTES:
                        raise ValueError("Одно изображение не должно быть больше 12 МБ.")

                    binary, extension = optimize_upload_image(binary, mime_type)
                    filename = f"product-{int(time.time())}-{uuid.uuid4().hex[:12]}{extension}"
                    target = PRODUCT_UPLOADS_DIR / filename
                    target.write_bytes(binary)
                    uploaded.append({"url": f"/uploads/products/{filename}"})

            except (ValueError, binascii.Error) as error:
                self._send_json(400, {"success": False, "error": str(error) or "Не удалось загрузить файл."})
                return

            self._send_json(200, {"success": True, "files": uploaded})
            return

        if self.path == "/api/catalog/bootstrap":
            if not self.database:
                self._send_json(503, {"success": False, "error": "Database unavailable"})
                return

            if self.database.has_catalog():
                catalog = self.database.get_catalog()
                self._send_json(200, {"success": True, **catalog})
                return

            catalog = self.database.bootstrap_catalog(
                payload.get("categories") or [],
                payload.get("products") or [],
                payload.get("banners") or [],
            )
            self._send_json(200, {"success": True, **catalog})
            return

        if self.path == "/api/catalog/save":
            if not self.database:
                self._send_json(503, {"success": False, "error": "Database unavailable"})
                return

            if not self.store.is_admin_session(payload.get("sessionToken")):
                self._send_json(403, {"success": False, "error": "Доступ к админке разрешен только владельцу."})
                return

            categories = payload.get("categories") or []
            products = payload.get("products") or []
            banners = payload.get("banners") or []

            if not isinstance(categories, list) or not isinstance(products, list) or not isinstance(banners, list):
                self._send_json(400, {"success": False, "error": "Некорректные данные каталога."})
                return

            catalog = self.database.replace_catalog(categories, products, banners)
            self._send_json(200, {"success": True, **catalog})
            return

        self._send_json(404, {"success": False, "error": "Not found"})


def main():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    database = SiteDatabase(
        DATABASE_URL,
        legacy_sqlite_path=LEGACY_SQLITE_FILE,
        legacy_store_path=LEGACY_STORE_FILE,
    )
    store = Store(LEGACY_STORE_FILE, DEMO_PHONE, database=database, admin_phones=ADMIN_PHONES)
    bot = TelegramBot(BOT_TOKEN, BOT_USERNAME, MANAGER_CHAT_IDS, MANAGER_USERNAMES, store)

    ApiHandler.store = store
    ApiHandler.bot = bot
    ApiHandler.database = database

    if bot.token:
        thread = threading.Thread(target=bot.run, daemon=True)
        thread.start()
    else:
        print("Bot credentials are not set. API will run without Telegram polling.", flush=True)

    server = ThreadingHTTPServer((API_HOST, API_PORT), ApiHandler)
    print(f"Exclusive backend running at http://{API_HOST}:{API_PORT}", flush=True)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
