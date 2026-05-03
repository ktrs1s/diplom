# EXCLUSIVE Backend + Telegram Bot

Backend работает в отдельном Docker-контейнере и поднимается вместе с сайтом через `docker compose`.

Что он делает:

- хранит пользователей, категории, товары и заказы в SQLite;
- обслуживает вход, регистрацию и личный кабинет;
- принимает изменения из админки;
- создает заказ из корзины;
- ведет клиента в Telegram-бота;
- отправляет менеджеру подтвержденные заказы.

## Локальный запуск без Docker

```bash
python3 backend/app.py
```

API поднимется на:

```text
http://127.0.0.1:9000
```

## Docker-переменные окружения

```bash
TELEGRAM_BOT_TOKEN
TELEGRAM_BOT_USERNAME
TELEGRAM_MANAGER_CHAT_IDS
TELEGRAM_MANAGER_USERNAMES
EXCLUSIVE_DEMO_PHONE
EXCLUSIVE_ADMIN_PHONES
EXCLUSIVE_API_HOST
EXCLUSIVE_API_PORT
```

По умолчанию backend в контейнере слушает `0.0.0.0:9000`.

## Хранилище данных

- `backend/data/exclusive.sqlite3`
- `backend/data/store.json`

Каталог синхронизируется между фронтом, админкой и SQLite автоматически.
