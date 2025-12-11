#!/bin/sh

echo "Waiting for database to be ready..."
while ! nc -z db 5432; do
  sleep 1
done
echo "Database is ready!"

echo "Running database migrations..."
yarn prisma migrate deploy
yarn prisma db push

echo "Starting application..."
nginx && exec node node_modules/.bin/next start --port 3000 --hostname 0.0.0.0