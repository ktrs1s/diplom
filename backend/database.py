import json
import sqlite3
import threading
from pathlib import Path

import psycopg
from psycopg.rows import dict_row


def _json_dumps(value):
    return json.dumps(value, ensure_ascii=False)


def _json_loads(value, fallback):
    if value in (None, ""):
        return fallback

    if isinstance(value, (list, dict)):
        return value

    try:
        return json.loads(value)
    except (TypeError, json.JSONDecodeError):
        return fallback


class SiteDatabase:
    def __init__(self, dsn, legacy_sqlite_path=None, legacy_store_path=None):
        self.dsn = str(dsn or "").strip()
        if not self.dsn:
            raise ValueError("DATABASE_URL is required for PostgreSQL connection.")

        self.legacy_sqlite_path = Path(legacy_sqlite_path) if legacy_sqlite_path else None
        self.legacy_store_path = Path(legacy_store_path) if legacy_store_path else None
        self.lock = threading.RLock()
        self._ensure_schema()
        self.migrate_legacy_sources()

    def _connect(self):
        return psycopg.connect(self.dsn, row_factory=dict_row)

    def _ensure_schema(self):
        with self.lock, self._connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS categories (
                  key TEXT PRIMARY KEY,
                  title TEXT NOT NULL,
                  description TEXT NOT NULL,
                  palette_start TEXT NOT NULL,
                  palette_end TEXT NOT NULL,
                  image TEXT NOT NULL,
                  show_on_home BOOLEAN NOT NULL DEFAULT FALSE,
                  created_at BIGINT NOT NULL
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS products (
                  id TEXT PRIMARY KEY,
                  category_key TEXT NOT NULL REFERENCES categories(key) ON DELETE CASCADE,
                  sub_key TEXT NOT NULL,
                  sub_title TEXT NOT NULL,
                  title TEXT NOT NULL,
                  article TEXT NOT NULL,
                  price_value INTEGER NOT NULL,
                  sizes_json TEXT NOT NULL,
                  colors_json TEXT NOT NULL,
                  palette_start TEXT NOT NULL,
                  palette_end TEXT NOT NULL,
                  label TEXT NOT NULL,
                  image TEXT NOT NULL,
                  gallery_json TEXT NOT NULL,
                  description TEXT NOT NULL,
                  composition TEXT NOT NULL,
                  care_json TEXT NOT NULL,
                  features_json TEXT NOT NULL,
                  size_table_json TEXT NOT NULL,
                  created_at BIGINT NOT NULL,
                  order_index INTEGER NOT NULL,
                  is_featured BOOLEAN NOT NULL DEFAULT FALSE
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS banners (
                  id TEXT PRIMARY KEY,
                  title TEXT NOT NULL,
                  text TEXT NOT NULL,
                  button TEXT NOT NULL,
                  href TEXT NOT NULL,
                  desktop_image TEXT NOT NULL,
                  mobile_image TEXT NOT NULL,
                  created_at BIGINT NOT NULL,
                  order_index INTEGER NOT NULL
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                  id TEXT PRIMARY KEY,
                  first_name TEXT NOT NULL,
                  last_name TEXT NOT NULL,
                  city TEXT NOT NULL DEFAULT '',
                  phone TEXT NOT NULL UNIQUE,
                  email TEXT NOT NULL DEFAULT '',
                  password_hash TEXT NOT NULL DEFAULT '',
                  telegram_chat_id TEXT NOT NULL DEFAULT '',
                  telegram_username TEXT NOT NULL DEFAULT '',
                  telegram_first_name TEXT NOT NULL DEFAULT '',
                  created_at TEXT NOT NULL
                )
                """
            )
            connection.execute(
                """
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS city TEXT NOT NULL DEFAULT ''
                """
            )
            connection.execute(
                """
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS email TEXT NOT NULL DEFAULT ''
                """
            )
            connection.execute(
                """
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS password_hash TEXT NOT NULL DEFAULT ''
                """
            )
            connection.execute(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique
                ON users (LOWER(email))
                WHERE email <> ''
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS sessions (
                  token TEXT PRIMARY KEY,
                  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                  created_at TEXT NOT NULL
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS orders (
                  id TEXT PRIMARY KEY,
                  status TEXT NOT NULL,
                  created_at TEXT NOT NULL,
                  customer_user_id TEXT NOT NULL DEFAULT '',
                  customer_first_name TEXT NOT NULL,
                  customer_last_name TEXT NOT NULL,
                  customer_phone TEXT NOT NULL,
                  subtotal INTEGER NOT NULL DEFAULT 0,
                  delivery INTEGER NOT NULL DEFAULT 0,
                  total INTEGER NOT NULL DEFAULT 0,
                  source_url TEXT NOT NULL DEFAULT '',
                  delivery_mode TEXT NOT NULL DEFAULT '',
                  city TEXT NOT NULL DEFAULT '',
                  address TEXT NOT NULL DEFAULT '',
                  comment TEXT NOT NULL DEFAULT '',
                  telegram_chat_id TEXT NOT NULL DEFAULT '',
                  status_history_json TEXT NOT NULL DEFAULT '[]'
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS order_items (
                  id BIGSERIAL PRIMARY KEY,
                  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                  line_id TEXT NOT NULL,
                  product_id TEXT NOT NULL,
                  title TEXT NOT NULL,
                  article TEXT NOT NULL,
                  size_value TEXT NOT NULL,
                  color_value TEXT NOT NULL,
                  quantity INTEGER NOT NULL DEFAULT 1,
                  price_value INTEGER NOT NULL DEFAULT 0,
                  price_label TEXT NOT NULL DEFAULT ''
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS manager_chats (
                  username TEXT PRIMARY KEY,
                  chat_id TEXT NOT NULL
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS conversations (
                  chat_id TEXT PRIMARY KEY,
                  state_json TEXT NOT NULL
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS counters (
                  key TEXT PRIMARY KEY,
                  value BIGINT NOT NULL
                )
                """
            )
            connection.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_products_category_key
                ON products(category_key)
                """
            )
            connection.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_orders_customer_phone
                ON orders(customer_phone)
                """
            )
            connection.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_orders_status
                ON orders(status)
                """
            )

    def _table_count(self, table_name):
        with self.lock, self._connect() as connection:
            row = connection.execute(f"SELECT COUNT(*) AS count FROM {table_name}").fetchone()
            return int((row or {}).get("count") or 0)

    def has_catalog(self):
        return self._table_count("categories") > 0 and self._table_count("products") > 0

    def has_banners(self):
        return self._table_count("banners") > 0

    def _has_store_state(self):
        return any(
            self._table_count(table_name) > 0
            for table_name in ("users", "sessions", "orders", "conversations", "manager_chats", "counters")
        )

    def has_any_data(self):
        return self.has_catalog() or self._has_store_state()

    def _serialize_catalog(self, categories, products):
        return {
            "categories": categories,
            "products": products,
            "banners": [],
        }

    def get_banners(self, connection):
        return [
            {
                "id": row["id"],
                "title": row["title"],
                "text": row["text"],
                "button": row["button"],
                "href": row["href"],
                "desktopImage": row["desktop_image"],
                "mobileImage": row["mobile_image"],
                "createdAt": int(row["created_at"] or 0),
                "orderIndex": int(row["order_index"] or 0),
            }
            for row in connection.execute(
                """
                SELECT id, title, text, button, href, desktop_image, mobile_image, created_at, order_index
                FROM banners
                ORDER BY order_index ASC, created_at ASC, id ASC
                """
            ).fetchall()
        ]

    def get_catalog(self):
        with self.lock, self._connect() as connection:
            categories = [
                {
                    "key": row["key"],
                    "title": row["title"],
                    "description": row["description"],
                    "palette": [row["palette_start"], row["palette_end"]],
                    "image": row["image"],
                    "showOnHome": bool(row["show_on_home"]),
                    "createdAt": int(row["created_at"] or 0),
                }
                for row in connection.execute(
                    """
                    SELECT key, title, description, palette_start, palette_end, image, show_on_home, created_at
                    FROM categories
                    ORDER BY created_at ASC, title ASC
                    """
                ).fetchall()
            ]

            products = [
                {
                    "id": row["id"],
                    "categoryKey": row["category_key"],
                    "subKey": row["sub_key"],
                    "subTitle": row["sub_title"],
                    "title": row["title"],
                    "article": row["article"],
                    "priceValue": int(row["price_value"] or 0),
                    "sizes": _json_loads(row["sizes_json"], []),
                    "colors": _json_loads(row["colors_json"], []),
                    "palette": [row["palette_start"], row["palette_end"]],
                    "label": row["label"],
                    "image": row["image"],
                    "gallery": _json_loads(row["gallery_json"], []),
                    "description": row["description"],
                    "composition": row["composition"],
                    "care": _json_loads(row["care_json"], []),
                    "features": _json_loads(row["features_json"], []),
                    "sizeTable": _json_loads(row["size_table_json"], []),
                    "createdAt": int(row["created_at"] or 0),
                    "orderIndex": int(row["order_index"] or 0),
                    "isFeatured": bool(row["is_featured"]),
                }
                for row in connection.execute(
                    """
                    SELECT
                      id, category_key, sub_key, sub_title, title, article, price_value, sizes_json, colors_json,
                      palette_start, palette_end, label, image, gallery_json, description, composition, care_json,
                      features_json, size_table_json, created_at, order_index, is_featured
                    FROM products
                    ORDER BY order_index ASC, created_at ASC, title ASC
                    """
                ).fetchall()
            ]

            catalog = self._serialize_catalog(categories, products)
            catalog["banners"] = self.get_banners(connection)
            return catalog

    def _insert_banners(self, connection, banners):
        connection.execute("DELETE FROM banners")

        for banner in list(banners or []):
            connection.execute(
                """
                INSERT INTO banners (
                  id, title, text, button, href, desktop_image, mobile_image, created_at, order_index
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    banner.get("id", ""),
                    banner.get("title", "") or "",
                    banner.get("text", "") or "",
                    banner.get("button", "") or "",
                    banner.get("href", "") or "",
                    banner.get("desktopImage", "") or "",
                    banner.get("mobileImage", "") or "",
                    int(banner.get("createdAt") or 0),
                    int(banner.get("orderIndex") or 0),
                ),
            )

    def replace_banners(self, banners):
        with self.lock, self._connect() as connection:
            self._insert_banners(connection, banners)

        return self.get_catalog()

    def replace_catalog(self, categories, products, banners=None):
        next_categories = list(categories or [])
        next_products = list(products or [])
        next_banners = list(banners or [])

        with self.lock, self._connect() as connection:
            connection.execute("DELETE FROM products")
            connection.execute("DELETE FROM categories")

            for category in next_categories:
                palette = list(category.get("palette") or ["#f4eee6", "#ccb39d"])
                connection.execute(
                    """
                    INSERT INTO categories (
                      key, title, description, palette_start, palette_end, image, show_on_home, created_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        category.get("key", ""),
                        category.get("title", ""),
                        category.get("description", ""),
                        palette[0] if len(palette) > 0 else "#f4eee6",
                        palette[1] if len(palette) > 1 else "#ccb39d",
                        category.get("image", ""),
                        bool(category.get("showOnHome")),
                        int(category.get("createdAt") or 0),
                    ),
                )

            for product in next_products:
                palette = list(product.get("palette") or ["#f4eee6", "#ccb39d"])
                connection.execute(
                    """
                    INSERT INTO products (
                      id, category_key, sub_key, sub_title, title, article, price_value, sizes_json, colors_json,
                      palette_start, palette_end, label, image, gallery_json, description, composition, care_json,
                      features_json, size_table_json, created_at, order_index, is_featured
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        product.get("id", ""),
                        product.get("categoryKey", ""),
                        product.get("subKey", "all"),
                        product.get("subTitle", "Все товары"),
                        product.get("title", ""),
                        product.get("article", ""),
                        int(product.get("priceValue") or 0),
                        _json_dumps(product.get("sizes") or []),
                        _json_dumps(product.get("colors") or []),
                        palette[0] if len(palette) > 0 else "#f4eee6",
                        palette[1] if len(palette) > 1 else "#ccb39d",
                        product.get("label", ""),
                        product.get("image", ""),
                        _json_dumps(product.get("gallery") or []),
                        product.get("description", ""),
                        product.get("composition", ""),
                        _json_dumps(product.get("care") or []),
                        _json_dumps(product.get("features") or []),
                        _json_dumps(product.get("sizeTable") or []),
                        int(product.get("createdAt") or 0),
                        int(product.get("orderIndex") or 0),
                        bool(product.get("isFeatured")),
                    ),
                )

            self._insert_banners(connection, next_banners)

        return self.get_catalog()

    def bootstrap_catalog(self, categories, products, banners=None):
        with self.lock:
            if not self.has_catalog() and categories and products:
                return self.replace_catalog(categories, products, banners)

            if not self.has_banners() and banners:
                return self.replace_banners(banners)

            return self.get_catalog()

    def _insert_user(self, connection, user):
        connection.execute(
            """
            INSERT INTO users (
              id, first_name, last_name, city, phone, email, password_hash,
              telegram_chat_id, telegram_username, telegram_first_name, created_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
              first_name = EXCLUDED.first_name,
              last_name = EXCLUDED.last_name,
              city = EXCLUDED.city,
              phone = EXCLUDED.phone,
              email = EXCLUDED.email,
              password_hash = EXCLUDED.password_hash,
              telegram_chat_id = EXCLUDED.telegram_chat_id,
              telegram_username = EXCLUDED.telegram_username,
              telegram_first_name = EXCLUDED.telegram_first_name,
              created_at = EXCLUDED.created_at
            """,
            (
                user.get("id", ""),
                user.get("firstName", ""),
                user.get("lastName", ""),
                user.get("city", "") or "",
                user.get("phone", ""),
                user.get("email", "") or "",
                user.get("passwordHash", "") or "",
                user.get("telegramChatId", "") or "",
                user.get("telegramUsername", "") or "",
                user.get("telegramFirstName", "") or "",
                user.get("createdAt", "") or "",
            ),
        )

    def _insert_order(self, connection, order):
        customer = order.get("customer") or {}
        connection.execute(
            """
            INSERT INTO orders (
              id, status, created_at, customer_user_id, customer_first_name, customer_last_name, customer_phone,
              subtotal, delivery, total, source_url, delivery_mode, city, address, comment, telegram_chat_id, status_history_json
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
              status = EXCLUDED.status,
              created_at = EXCLUDED.created_at,
              customer_user_id = EXCLUDED.customer_user_id,
              customer_first_name = EXCLUDED.customer_first_name,
              customer_last_name = EXCLUDED.customer_last_name,
              customer_phone = EXCLUDED.customer_phone,
              subtotal = EXCLUDED.subtotal,
              delivery = EXCLUDED.delivery,
              total = EXCLUDED.total,
              source_url = EXCLUDED.source_url,
              delivery_mode = EXCLUDED.delivery_mode,
              city = EXCLUDED.city,
              address = EXCLUDED.address,
              comment = EXCLUDED.comment,
              telegram_chat_id = EXCLUDED.telegram_chat_id,
              status_history_json = EXCLUDED.status_history_json
            """,
            (
                order.get("id", ""),
                order.get("status", ""),
                order.get("createdAt", "") or "",
                customer.get("id", "") or "",
                customer.get("firstName", "") or "",
                customer.get("lastName", "") or "",
                customer.get("phone", "") or "",
                int(order.get("subtotal") or 0),
                int(order.get("delivery") or 0),
                int(order.get("total") or 0),
                order.get("sourceUrl", "") or "",
                order.get("deliveryMode", "") or "",
                order.get("city", "") or "",
                order.get("address", "") or "",
                order.get("comment", "") or "",
                order.get("telegramChatId", "") or "",
                _json_dumps(order.get("statusHistory") or []),
            ),
        )
        connection.execute("DELETE FROM order_items WHERE order_id = %s", (order.get("id", ""),))
        for item in order.get("items") or []:
            connection.execute(
                """
                INSERT INTO order_items (
                  order_id, line_id, product_id, title, article, size_value, color_value, quantity, price_value, price_label
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    order.get("id", ""),
                    item.get("lineId", "") or "",
                    item.get("productId", "") or "",
                    item.get("title", "") or "",
                    item.get("article", "") or "",
                    item.get("size", "") or "",
                    item.get("color", "") or "",
                    int(item.get("quantity") or 1),
                    int(item.get("priceValue") or 0),
                    item.get("priceLabel", "") or "",
                ),
            )

    def sync_from_json_store(self, data):
        if not isinstance(data, dict):
            return

        users = list(data.get("users") or [])
        sessions = list(data.get("sessions") or [])
        orders = list(data.get("orders") or [])
        conversations = dict(data.get("conversations") or {})
        manager_chats = dict(data.get("managerChats") or {})
        counters = dict(data.get("counters") or {})

        with self.lock, self._connect() as connection:
            connection.execute("DELETE FROM sessions")
            connection.execute("DELETE FROM order_items")
            connection.execute("DELETE FROM orders")
            connection.execute("DELETE FROM conversations")
            connection.execute("DELETE FROM manager_chats")
            connection.execute("DELETE FROM counters")
            connection.execute("DELETE FROM users")

            for user in users:
                self._insert_user(connection, user)

            for session in sessions:
                connection.execute(
                    """
                    INSERT INTO sessions (token, user_id, created_at)
                    VALUES (%s, %s, %s)
                    """,
                    (
                        session.get("token", ""),
                        session.get("userId", ""),
                        session.get("createdAt", "") or "",
                    ),
                )

            for order in orders:
                self._insert_order(connection, order)

            for chat_id, state in conversations.items():
                connection.execute(
                    """
                    INSERT INTO conversations (chat_id, state_json)
                    VALUES (%s, %s)
                    """,
                    (str(chat_id), _json_dumps(state or {})),
                )

            for username, chat_id in manager_chats.items():
                connection.execute(
                    """
                    INSERT INTO manager_chats (username, chat_id)
                    VALUES (%s, %s)
                    """,
                    (str(username), str(chat_id)),
                )

            for key, value in counters.items():
                connection.execute(
                    """
                    INSERT INTO counters (key, value)
                    VALUES (%s, %s)
                    """,
                    (str(key), int(value or 0)),
                )

    def load_store_data(self, seed):
        seeded = dict(seed or {})
        with self.lock, self._connect() as connection:
            users = [
                {
                    "id": row["id"],
                    "firstName": row["first_name"],
                    "lastName": row["last_name"],
                    "city": row["city"],
                    "phone": row["phone"],
                    "email": row["email"],
                    "passwordHash": row["password_hash"],
                    "telegramChatId": row["telegram_chat_id"],
                    "telegramUsername": row["telegram_username"],
                    "telegramFirstName": row["telegram_first_name"],
                    "createdAt": row["created_at"],
                }
                for row in connection.execute(
                    """
                    SELECT
                      id, first_name, last_name, city, phone, email, password_hash,
                      telegram_chat_id, telegram_username, telegram_first_name, created_at
                    FROM users
                    ORDER BY created_at DESC, id DESC
                    """
                ).fetchall()
            ]

            sessions = [
                {
                    "token": row["token"],
                    "userId": row["user_id"],
                    "createdAt": row["created_at"],
                }
                for row in connection.execute(
                    """
                    SELECT token, user_id, created_at
                    FROM sessions
                    ORDER BY created_at DESC, token DESC
                    """
                ).fetchall()
            ]

            order_rows = connection.execute(
                """
                SELECT
                  id, status, created_at, customer_user_id, customer_first_name, customer_last_name, customer_phone,
                  subtotal, delivery, total, source_url, delivery_mode, city, address, comment, telegram_chat_id,
                  status_history_json
                FROM orders
                ORDER BY created_at DESC, id DESC
                """
            ).fetchall()
            item_rows = connection.execute(
                """
                SELECT order_id, line_id, product_id, title, article, size_value, color_value, quantity, price_value, price_label
                FROM order_items
                ORDER BY id ASC
                """
            ).fetchall()

            items_by_order = {}
            for row in item_rows:
                items_by_order.setdefault(row["order_id"], []).append(
                    {
                        "lineId": row["line_id"],
                        "productId": row["product_id"],
                        "title": row["title"],
                        "article": row["article"],
                        "size": row["size_value"],
                        "color": row["color_value"],
                        "quantity": int(row["quantity"] or 1),
                        "priceValue": int(row["price_value"] or 0),
                        "priceLabel": row["price_label"],
                    }
                )

            orders = [
                {
                    "id": row["id"],
                    "status": row["status"],
                    "createdAt": row["created_at"],
                    "customer": {
                        "id": row["customer_user_id"] or "",
                        "firstName": row["customer_first_name"],
                        "lastName": row["customer_last_name"],
                        "phone": row["customer_phone"],
                    },
                    "items": items_by_order.get(row["id"], []),
                    "subtotal": int(row["subtotal"] or 0),
                    "delivery": int(row["delivery"] or 0),
                    "total": int(row["total"] or 0),
                    "sourceUrl": row["source_url"],
                    "deliveryMode": row["delivery_mode"],
                    "city": row["city"],
                    "address": row["address"],
                    "comment": row["comment"],
                    "telegramChatId": row["telegram_chat_id"],
                    "statusHistory": _json_loads(row["status_history_json"], []),
                }
                for row in order_rows
            ]

            conversations = {
                row["chat_id"]: _json_loads(row["state_json"], {})
                for row in connection.execute(
                    """
                    SELECT chat_id, state_json
                    FROM conversations
                    ORDER BY chat_id ASC
                    """
                ).fetchall()
            }

            manager_chats = {
                row["username"]: row["chat_id"]
                for row in connection.execute(
                    """
                    SELECT username, chat_id
                    FROM manager_chats
                    ORDER BY username ASC
                    """
                ).fetchall()
            }

            counters = {
                row["key"]: int(row["value"] or 0)
                for row in connection.execute(
                    """
                    SELECT key, value
                    FROM counters
                    ORDER BY key ASC
                    """
                ).fetchall()
            }

        return {
            "users": users or list(seeded.get("users") or []),
            "sessions": sessions or list(seeded.get("sessions") or []),
            "orders": orders or list(seeded.get("orders") or []),
            "conversations": conversations or dict(seeded.get("conversations") or {}),
            "managerChats": manager_chats or dict(seeded.get("managerChats") or {}),
            "counters": counters or dict(seeded.get("counters") or {"orders": 1}),
        }

    def _legacy_sqlite_has_table(self, connection, table_name):
        row = connection.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
            (table_name,),
        ).fetchone()
        return bool(row)

    def _import_legacy_sqlite(self):
        if not self.legacy_sqlite_path or not self.legacy_sqlite_path.exists():
            return False

        imported = False
        connection = sqlite3.connect(self.legacy_sqlite_path, check_same_thread=False)
        connection.row_factory = sqlite3.Row

        try:
            if self._legacy_sqlite_has_table(connection, "categories") and self._legacy_sqlite_has_table(connection, "products"):
                categories = [
                    {
                        "key": row["key"],
                        "title": row["title"],
                        "description": row["description"],
                        "palette": [row["palette_start"], row["palette_end"]],
                        "image": row["image"],
                        "showOnHome": bool(row["show_on_home"]),
                        "createdAt": int(row["created_at"] or 0),
                    }
                    for row in connection.execute(
                        """
                        SELECT key, title, description, palette_start, palette_end, image, show_on_home, created_at
                        FROM categories
                        ORDER BY created_at ASC, title ASC
                        """
                    ).fetchall()
                ]

                products = [
                    {
                        "id": row["id"],
                        "categoryKey": row["category_key"],
                        "subKey": row["sub_key"],
                        "subTitle": row["sub_title"],
                        "title": row["title"],
                        "article": row["article"],
                        "priceValue": int(row["price_value"] or 0),
                        "sizes": _json_loads(row["sizes_json"], []),
                        "colors": _json_loads(row["colors_json"], []),
                        "palette": [row["palette_start"], row["palette_end"]],
                        "label": row["label"],
                        "image": row["image"],
                        "gallery": _json_loads(row["gallery_json"], []),
                        "description": row["description"],
                        "composition": row["composition"],
                        "care": _json_loads(row["care_json"], []),
                        "features": _json_loads(row["features_json"], []),
                        "sizeTable": _json_loads(row["size_table_json"], []),
                        "createdAt": int(row["created_at"] or 0),
                        "orderIndex": int(row["order_index"] or 0),
                        "isFeatured": bool(row["is_featured"]),
                    }
                    for row in connection.execute(
                        """
                        SELECT
                          id, category_key, sub_key, sub_title, title, article, price_value, sizes_json, colors_json,
                          palette_start, palette_end, label, image, gallery_json, description, composition, care_json,
                          features_json, size_table_json, created_at, order_index, is_featured
                        FROM products
                        ORDER BY order_index ASC, created_at ASC, title ASC
                        """
                    ).fetchall()
                ]

                if categories or products:
                    self.replace_catalog(categories, products)
                    imported = True
        finally:
            connection.close()

        return imported

    def _import_legacy_store_json(self):
        if not self.legacy_store_path or not self.legacy_store_path.exists():
            return False

        try:
            payload = json.loads(self.legacy_store_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return False

        if not isinstance(payload, dict):
            return False

        self.sync_from_json_store(payload)
        return True

    def migrate_legacy_sources(self):
        with self.lock:
            if self.has_any_data():
                return False

        imported_catalog = self._import_legacy_sqlite()
        imported_store = self._import_legacy_store_json()
        return imported_catalog or imported_store
