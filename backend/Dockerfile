FROM python:3.12-alpine

ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY backend /app/backend

EXPOSE 9000

CMD ["python", "backend/app.py"]
