import json
import os
import threading
import time
import traceback
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

try:
    from database import SiteDatabase
except ModuleNotFoundError:
    from backend.database import SiteDatabase


APP_DIR = Path(__file__).resolve().parent
DATA_DIR = APP_DIR / "data"
LEGACY_STORE_FILE = DATA_DIR / "store.json"
LEGACY_SQLITE_FILE = DATA_DIR / "exclusive.sqlite3"
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://exclusive:exclusive@127.0.0.1:5432/exclusive")
API_HOST = os.getenv("EXCLUSIVE_API_HOST", "127.0.0.1")
API_PORT = int(os.getenv("EXCLUSIVE_API_PORT", "9000"))
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
BOT_USERNAME = os.getenv("TELEGRAM_BOT_USERNAME", "exclusive_order_assistant_bot").strip().replace("@", "")
MANAGER_CHAT_IDS = [value.strip() for value in os.getenv("TELEGRAM_MANAGER_CHAT_IDS", "").split(",") if value.strip()]
MANAGER_USERNAMES = [value.strip().replace("@", "") for value in os.getenv("TELEGRAM_MANAGER_USERNAMES", "").split(",") if value.strip()]
DEMO_PHONE = os.getenv("EXCLUSIVE_DEMO_PHONE", "+79999999999").strip()
ADMIN_PHONES_RAW = os.getenv("EXCLUSIVE_ADMIN_PHONES", "+79953980243")


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


def next_order_code(counter):
    date_prefix = datetime.utcnow().strftime("%Y%m%d")
    return f"EX-{date_prefix}-{counter:04d}"


ADMIN_PHONES = [normalize_phone(value.strip()) for value in ADMIN_PHONES_RAW.split(",") if value.strip()]


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
                    "phone": self.demo_phone,
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
            "phone": user["phone"],
        }

    def get_user_by_phone(self, phone):
        normalized_phone = normalize_phone(phone)
        for user in self.data["users"]:
            if normalize_phone(user.get("phone")) == normalized_phone:
                return user
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

    def login(self, phone):
        with self.lock:
            user = self.get_user_by_phone(phone)

            if not user:
                raise ValueError("Аккаунт с таким номером не найден.")

            token = self.create_session(user["id"])
            return {"user": self._public_user(user), "sessionToken": token}

    def register(self, first_name, last_name, phone):
        normalized_phone = normalize_phone(phone)

        with self.lock:
            if self.get_user_by_phone(normalized_phone):
                raise ValueError("Аккаунт с таким номером уже существует.")

            user = {
                "id": f"user-{uuid.uuid4().hex[:12]}",
                "firstName": sanitize_text(first_name),
                "lastName": sanitize_text(last_name),
                "phone": normalized_phone,
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
                "phone": phone,
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
                "city": "",
                "address": "",
                "comment": "",
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

    def update_account_profile(self, session_token, first_name, last_name, phone):
        normalized_phone = normalize_phone(phone)
        normalized_first_name = sanitize_text(first_name)
        normalized_last_name = sanitize_text(last_name)

        with self.lock:
            user = self.get_user_by_session(session_token)

            if not user:
                raise ValueError("Сессия не найдена.")

            if not normalized_first_name or not normalized_last_name or not normalized_phone:
                raise ValueError("Заполните имя, фамилию и телефон.")

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

            previous_phone = normalize_phone(user.get("phone"))
            user["firstName"] = normalized_first_name
            user["lastName"] = normalized_last_name
            user["phone"] = normalized_phone

            for order in self.data["orders"]:
                if normalize_phone(order.get("customer", {}).get("phone")) != previous_phone:
                    continue

                order["customer"]["firstName"] = normalized_first_name
                order["customer"]["lastName"] = normalized_last_name
                order["customer"]["phone"] = normalized_phone

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
    STATUS_LABELS = {
        "draft": "Черновик",
        "pending_manager": "Ждет менеджера",
        "accepted": "Подтвержден",
        "shipping": "Передан в доставку",
        "completed": "Завершен",
        "cancelled": "Отменен",
    }

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

    def send_message(self, chat_id, text, reply_markup=None):
        payload = {
            "chat_id": chat_id,
            "text": text,
        }

        if reply_markup:
            payload["reply_markup"] = reply_markup

        self.api_call("sendMessage", payload)

    def answer_callback(self, callback_id, text=""):
        payload = {"callback_query_id": callback_id}
        if text:
            payload["text"] = text
        self.api_call("answerCallbackQuery", payload)

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

    def build_order_text(self, order):
        items_line = ", ".join(f"{item['title']} × {item['quantity']}" for item in order.get("items", [])[:3])
        customer = order.get("customer", {})
        parts = [
            f"Заказ {order['id']}",
            f"{items_line}",
            f"Итого: {order['total']} ₽",
            f"{customer.get('firstName', '')} {customer.get('lastName', '')}".strip(),
            customer.get("phone", ""),
            f"Статус: {self.STATUS_LABELS.get(order.get('status'), 'В работе')}",
        ]

        if order.get("deliveryMode") == "courier":
            parts.append(f"Доставка: курьер, {order.get('city', '')}, {order.get('address', '')}".strip(", "))
        elif order.get("deliveryMode") == "pickup":
            parts.append(f"Самовывоз: {order.get('city', '')}".strip())

        if order.get("comment"):
            parts.append(f"Комментарий: {order['comment']}")

        return "\n".join(part for part in parts if part)

    def build_customer_keyboard(self, order):
        if order.get("status") in {"accepted", "shipping", "completed", "cancelled"}:
            return {
                "inline_keyboard": [
                    [
                        {
                            "text": "Показать статус",
                            "callback_data": f"status|{order['id']}",
                        }
                    ]
                ]
            }

        return {
            "inline_keyboard": [
                [
                    {"text": "Курьер", "callback_data": f"delivery|{order['id']}|courier"},
                    {"text": "Самовывоз", "callback_data": f"delivery|{order['id']}|pickup"},
                ],
                [
                    {"text": "Комментарий", "callback_data": f"comment|{order['id']}"},
                    {"text": "Подтвердить", "callback_data": f"confirm|{order['id']}"},
                ],
            ]
        }

    def build_manager_keyboard(self, order):
        return {
            "inline_keyboard": [
                [
                    {"text": "Подтвердить", "callback_data": f"admin|{order['id']}|accepted"},
                    {"text": "В доставку", "callback_data": f"admin|{order['id']}|shipping"},
                ],
                [
                    {"text": "Завершен", "callback_data": f"admin|{order['id']}|completed"},
                    {"text": "Отменить", "callback_data": f"admin|{order['id']}|cancelled"},
                ],
            ]
        }

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
            return

        text = f"Новый заказ\n{self.build_order_text(order)}"

        for chat_id in destination_ids:
            self.send_message(chat_id, text, self.build_manager_keyboard(order))

    def prompt_for_order(self, chat_id, order):
        text = f"{self.build_order_text(order)}\n\nВыберите доставку, при желании добавьте комментарий и подтвердите заказ."
        self.send_message(chat_id, text, self.build_customer_keyboard(order))

    def handle_start(self, chat_id, message):
        text = sanitize_text(message.get("text"))
        payload = text.split(maxsplit=1)[1] if " " in text else ""
        telegram_user = message.get("from", {})

        self.remember_manager_from_user(chat_id, telegram_user)

        if payload.startswith("order_"):
            order_id = payload.replace("order_", "", 1)
            order = self.store.get_order(order_id)

            if not order:
                self.send_message(chat_id, "Заказ не найден. Проверьте ссылку и попробуйте еще раз.")
                return

            self.store.attach_chat(order_id, chat_id, message.get("from", {}))
            self.prompt_for_order(chat_id, order)
            return

        if self.is_manager_user(telegram_user):
            self.send_message(chat_id, "Менеджерский аккаунт подключен. Новые заказы будут приходить сюда.")
            return

        orders = self.store.list_orders_for_chat(chat_id)

        if orders:
            latest = orders[0]
            self.send_message(chat_id, self.build_order_text(latest), self.build_customer_keyboard(latest))
            return

        self.send_message(chat_id, "Я помогу подтвердить заказ EXCLUSIVE. Откройте меня из корзины сайта и я продолжу оформление.")

    def handle_callback(self, callback):
        callback_id = callback.get("id")
        data = sanitize_text(callback.get("data"))
        chat_id = callback.get("message", {}).get("chat", {}).get("id")
        telegram_user = callback.get("from", {})
        self.remember_manager_from_user(chat_id, telegram_user)
        parts = data.split("|")

        if not parts:
            self.answer_callback(callback_id)
            return

        action = parts[0]

        if action == "status" and len(parts) >= 2:
            order = self.store.get_order(parts[1])
            if order:
                self.send_message(chat_id, self.build_order_text(order))
            self.answer_callback(callback_id)
            return

        if action == "delivery" and len(parts) >= 3:
            order_id = parts[1]
            delivery_mode = parts[2]
            self.store.update_order(order_id, deliveryMode=delivery_mode, city="", address="")

            if delivery_mode == "courier":
                self.store.set_conversation(chat_id, {"orderId": order_id, "step": "address"})
                self.send_message(chat_id, "Напишите город и адрес одним сообщением.")
            else:
                self.store.set_conversation(chat_id, {"orderId": order_id, "step": "pickup_city"})
                self.send_message(chat_id, "Напишите город для самовывоза.")

            self.answer_callback(callback_id, "Доставка выбрана")
            return

        if action == "comment" and len(parts) >= 2:
            order_id = parts[1]
            self.store.set_conversation(chat_id, {"orderId": order_id, "step": "comment"})
            self.send_message(chat_id, "Напишите короткий комментарий к заказу.")
            self.answer_callback(callback_id, "Жду комментарий")
            return

        if action == "confirm" and len(parts) >= 2:
            order_id = parts[1]
            order = self.store.get_order(order_id)

            if not order:
                self.answer_callback(callback_id, "Заказ не найден")
                return

            if order.get("deliveryMode") == "courier" and not order.get("address"):
                self.store.set_conversation(chat_id, {"orderId": order_id, "step": "address"})
                self.send_message(chat_id, "Чтобы подтвердить заказ, напишите город и адрес.")
                self.answer_callback(callback_id, "Нужен адрес")
                return

            if order.get("deliveryMode") == "pickup" and not order.get("city"):
                self.store.set_conversation(chat_id, {"orderId": order_id, "step": "pickup_city"})
                self.send_message(chat_id, "Чтобы подтвердить заказ, напишите город для самовывоза.")
                self.answer_callback(callback_id, "Нужен город")
                return

            updated = self.store.update_order(order_id, status="pending_manager")
            self.store.clear_conversation(chat_id)
            self.send_message(chat_id, "Заказ принят. Менеджер подтвердит его здесь же в Telegram.")
            self.notify_managers(updated)
            self.answer_callback(callback_id, "Заказ отправлен менеджеру")
            return

        if action == "admin" and len(parts) >= 3:
            if not self.is_manager_user(telegram_user):
                self.answer_callback(callback_id, "Нет доступа")
                return

            order_id = parts[1]
            next_status = parts[2]
            order = self.store.update_order(order_id, status=next_status)

            if order and order.get("telegramChatId"):
                self.send_message(order["telegramChatId"], f"Статус обновлен: {self.STATUS_LABELS.get(next_status, next_status)}.")

            self.answer_callback(callback_id, "Статус обновлен")
            return

        self.answer_callback(callback_id)

    def handle_text(self, message):
        chat_id = message.get("chat", {}).get("id")
        text = sanitize_text(message.get("text"))
        telegram_user = message.get("from", {})

        self.remember_manager_from_user(chat_id, telegram_user)

        if not text:
            return

        if text.startswith("/start"):
            self.handle_start(chat_id, message)
            return

        if text == "/orders":
            if self.is_manager_user(telegram_user):
                pending_order = next(
                    (
                        order
                        for order in self.store.data.get("orders", [])
                        if order.get("status") == "pending_manager"
                    ),
                    None,
                )

                if not pending_order:
                    self.send_message(chat_id, "Новых заказов для подтверждения пока нет.")
                    return

                self.send_message(chat_id, self.build_order_text(pending_order), self.build_manager_keyboard(pending_order))
                return

            orders = self.store.list_orders_for_chat(chat_id)

            if not orders:
                self.send_message(chat_id, "Активных заказов пока нет.")
                return

            self.send_message(chat_id, self.build_order_text(orders[0]), self.build_customer_keyboard(orders[0]))
            return

        conversation = self.store.get_conversation(chat_id)

        if not conversation:
            self.send_message(chat_id, "Откройте меня из корзины сайта, и я продолжу оформление заказа.")
            return

        order_id = conversation.get("orderId")
        step = conversation.get("step")

        if step == "address":
            order = self.store.update_order(order_id, address=text, city=text.split(",")[0].strip())
            self.store.clear_conversation(chat_id)
            self.send_message(chat_id, "Адрес сохранен.")
            self.prompt_for_order(chat_id, order)
            return

        if step == "pickup_city":
            order = self.store.update_order(order_id, city=text)
            self.store.clear_conversation(chat_id)
            self.send_message(chat_id, "Город сохранен.")
            self.prompt_for_order(chat_id, order)
            return

        if step == "comment":
            order = self.store.update_order(order_id, comment=text)
            self.store.clear_conversation(chat_id)
            self.send_message(chat_id, "Комментарий добавлен.")
            self.prompt_for_order(chat_id, order)

    def handle_update(self, update):
        if "callback_query" in update:
            self.handle_callback(update["callback_query"])
            return

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
                        "allowed_updates": ["message", "callback_query"],
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
                            "allowed_updates": ["message", "callback_query"],
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
                result = self.store.login(payload.get("phone"))
                self._send_json(200, {"success": True, **result})
            except ValueError as error:
                self._send_json(400, {"success": False, "error": str(error)})
            return

        if self.path == "/api/auth/register":
            try:
                result = self.store.register(
                    payload.get("firstName"),
                    payload.get("lastName"),
                    payload.get("phone"),
                )
                self._send_json(200, {"success": True, **result})
            except ValueError as error:
                self._send_json(400, {"success": False, "error": str(error)})
            return

        if self.path == "/api/orders":
            try:
                order = self.store.create_order(payload.get("sessionToken"), payload)
                bot_url = f"https://t.me/{BOT_USERNAME}?start=order_{order['id']}" if BOT_USERNAME else "https://t.me/"
                self._send_json(
                    200,
                    {
                        "success": True,
                        "order": order,
                        "botUrl": bot_url,
                        "botReady": bool(self.bot and self.bot.is_ready()),
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
                    payload.get("phone"),
                )
                self._send_json(200, {"success": True, **result})
            except ValueError as error:
                self._send_json(400, {"success": False, "error": str(error)})
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

            if not isinstance(categories, list) or not isinstance(products, list):
                self._send_json(400, {"success": False, "error": "Некорректные данные каталога."})
                return

            catalog = self.database.replace_catalog(categories, products)
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
