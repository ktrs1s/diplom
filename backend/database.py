import json
import sqlite3
import threading
from pathlib import Path


def _json_dumps(value):
    return json.dumps(value, ensure_ascii=False)


def _json_loads(value, fallback):
    if not value:
        return fallback

    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return fallback


class SiteDatabase:
    def __init__(self, path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.lock = threading.RLock()
        self._ensure_schema()

    def _connect(self):
        connection = sqlite3.connect(self.path, check_same_thread=False)
        connection.row_factory = sqlite3.Row
        return connection

    def _ensure_schema(self):
        with self.lock, self._connect() as connection:
            connection.executescript(
                """
                PRAGMA journal_mode=WAL;
                PRAGMA foreign_keys=ON;

                CREATE TABLE IF NOT EXISTS categories (
                  key TEXT PRIMARY KEY,
                  title TEXT NOT NULL,
                  description TEXT NOT NULL,
                  palette_start TEXT NOT NULL,
                  palette_end TEXT NOT NULL,
                  image TEXT NOT NULL,
                  show_on_home INTEGER NOT NULL DEFAULT 0,
                  created_at INTEGER NOT NULL
                );

                CREATE TABLE IF NOT EXISTS products (
                  id TEXT PRIMARY KEY,
                  category_key TEXT NOT NULL,
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
                  created_at INTEGER NOT NULL,
                  order_index INTEGER NOT NULL,
                  is_featured INTEGER NOT NULL DEFAULT 0,
                  FOREIGN KEY(category_key) REFERENCES categories(key) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS users (
                  id TEXT PRIMARY KEY,
                  first_name TEXT NOT NULL,
                  last_name TEXT NOT NULL,
                  phone TEXT NOT NULL UNIQUE,
                  telegram_chat_id TEXT NOT NULL DEFAULT '',
                  telegram_username TEXT NOT NULL DEFAULT '',
                  telegram_first_name TEXT NOT NULL DEFAULT '',
                  created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS sessions (
                  token TEXT PRIMARY KEY,
                  user_id TEXT NOT NULL,
                  created_at TEXT NOT NULL,
                  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS orders (
                  id TEXT PRIMARY KEY,
                  status TEXT NOT NULL,
                  created_at TEXT NOT NULL,
                  customer_user_id TEXT,
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
                );

                CREATE TABLE IF NOT EXISTS order_items (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  order_id TEXT NOT NULL,
                  line_id TEXT NOT NULL,
                  product_id TEXT NOT NULL,
                  title TEXT NOT NULL,
                  article TEXT NOT NULL,
                  size_value TEXT NOT NULL,
                  color_value TEXT NOT NULL,
                  quantity INTEGER NOT NULL DEFAULT 1,
                  price_value INTEGER NOT NULL DEFAULT 0,
                  price_label TEXT NOT NULL DEFAULT '',
                  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS manager_chats (
                  username TEXT PRIMARY KEY,
                  chat_id TEXT NOT NULL
                );
                """
            )

    def _table_count(self, table_name):
        with self.lock, self._connect() as connection:
            row = connection.execute(f"SELECT COUNT(*) AS count FROM {table_name}").fetchone()
            return int(row["count"] if row else 0)

    def has_catalog(self):
        return self._table_count("categories") > 0 and self._table_count("products") > 0

    def _serialize_catalog(self, categories, products):
        return {
          "categories": categories,
          "products": products,
        }

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

            return self._serialize_catalog(categories, products)

    def replace_catalog(self, categories, products):
        next_categories = list(categories or [])
        next_products = list(products or [])

        with self.lock, self._connect() as connection:
            connection.execute("BEGIN")
            connection.execute("DELETE FROM products")
            connection.execute("DELETE FROM categories")

            for category in next_categories:
                palette = list(category.get("palette") or ["#f4eee6", "#ccb39d"])
                connection.execute(
                    """
                    INSERT INTO categories (
                      key, title, description, palette_start, palette_end, image, show_on_home, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        category.get("key", ""),
                        category.get("title", ""),
                        category.get("description", ""),
                        palette[0] if len(palette) > 0 else "#f4eee6",
                        palette[1] if len(palette) > 1 else "#ccb39d",
                        category.get("image", ""),
                        1 if category.get("showOnHome") else 0,
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
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                        1 if product.get("isFeatured") else 0,
                    ),
                )

            connection.commit()

        return self.get_catalog()

    def bootstrap_catalog(self, categories, products):
        with self.lock:
            if not self.has_catalog() and categories and products:
                return self.replace_catalog(categories, products)

            return self.get_catalog()

    def upsert_user(self, user):
        if not user:
            return

        with self.lock, self._connect() as connection:
            connection.execute(
                """
                INSERT INTO users (
                  id, first_name, last_name, phone, telegram_chat_id, telegram_username, telegram_first_name, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                  first_name = excluded.first_name,
                  last_name = excluded.last_name,
                  phone = excluded.phone,
                  telegram_chat_id = excluded.telegram_chat_id,
                  telegram_username = excluded.telegram_username,
                  telegram_first_name = excluded.telegram_first_name,
                  created_at = excluded.created_at
                """,
                (
                    user.get("id", ""),
                    user.get("firstName", ""),
                    user.get("lastName", ""),
                    user.get("phone", ""),
                    user.get("telegramChatId", "") or "",
                    user.get("telegramUsername", "") or "",
                    user.get("telegramFirstName", "") or "",
                    user.get("createdAt", "") or "",
                ),
            )
            connection.commit()

    def replace_sessions(self, sessions):
        with self.lock, self._connect() as connection:
            connection.execute("DELETE FROM sessions")
            for session in sessions or []:
                connection.execute(
                    "INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)",
                    (
                        session.get("token", ""),
                        session.get("userId", ""),
                        session.get("createdAt", "") or "",
                    ),
                )
            connection.commit()

    def upsert_order(self, order):
        if not order:
            return

        customer = order.get("customer") or {}

        with self.lock, self._connect() as connection:
            connection.execute(
                """
                INSERT INTO orders (
                  id, status, created_at, customer_user_id, customer_first_name, customer_last_name, customer_phone,
                  subtotal, delivery, total, source_url, delivery_mode, city, address, comment, telegram_chat_id, status_history_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                  status = excluded.status,
                  created_at = excluded.created_at,
                  customer_user_id = excluded.customer_user_id,
                  customer_first_name = excluded.customer_first_name,
                  customer_last_name = excluded.customer_last_name,
                  customer_phone = excluded.customer_phone,
                  subtotal = excluded.subtotal,
                  delivery = excluded.delivery,
                  total = excluded.total,
                  source_url = excluded.source_url,
                  delivery_mode = excluded.delivery_mode,
                  city = excluded.city,
                  address = excluded.address,
                  comment = excluded.comment,
                  telegram_chat_id = excluded.telegram_chat_id,
                  status_history_json = excluded.status_history_json
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
            connection.execute("DELETE FROM order_items WHERE order_id = ?", (order.get("id", ""),))

            for item in order.get("items") or []:
                connection.execute(
                    """
                    INSERT INTO order_items (
                      order_id, line_id, product_id, title, article, size_value, color_value, quantity, price_value, price_label
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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

            connection.commit()

    def upsert_manager_chat(self, username, chat_id):
        if not username or not chat_id:
            return

        with self.lock, self._connect() as connection:
            connection.execute(
                """
                INSERT INTO manager_chats (username, chat_id)
                VALUES (?, ?)
                ON CONFLICT(username) DO UPDATE SET chat_id = excluded.chat_id
                """,
                (str(username), str(chat_id)),
            )
            connection.commit()

    def sync_from_json_store(self, data):
        if not isinstance(data, dict):
            return

        users = data.get("users") or []
        sessions = data.get("sessions") or []
        orders = data.get("orders") or []
        manager_chats = data.get("managerChats") or {}

        for user in users:
            self.upsert_user(user)

        self.replace_sessions(sessions)

        for order in orders:
            self.upsert_order(order)

        for username, chat_id in manager_chats.items():
            self.upsert_manager_chat(username, chat_id)
