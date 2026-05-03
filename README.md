# EXCLUSIVE

Интернет-магазин женской одежды EXCLUSIVE с полной докеризацией:

- витрина магазина на `nginx`;
- backend API на Python;
- SQLite-база пользователей, товаров и заказов;
- авторизация по номеру телефона;
- админка каталога;
- Telegram-бот для продолжения оформления заказа.

## Запуск через Docker

```bash
docker compose up -d --build
```

После запуска:

- сайт: `http://localhost:8080`
- API: `http://localhost:9000/api`

## Переменные окружения для бота

Для запуска Telegram-бота перед стартом `docker compose` задай переменные окружения:

```bash
export TELEGRAM_BOT_TOKEN="token-from-botfather"
export TELEGRAM_BOT_USERNAME="your_bot_username"
export TELEGRAM_MANAGER_USERNAMES="your_manager_username"
export EXCLUSIVE_ADMIN_PHONES="+79953980243"
docker compose up -d --build
```

Если переменные не заданы, сайт и API всё равно поднимутся, но Telegram polling будет отключён.

## Данные проекта

- SQLite база: `backend/data/exclusive.sqlite3`
- JSON резерв: `backend/data/store.json`
- изображения товаров: `uploads/products`

## Остановка

```bash
docker compose down
```
