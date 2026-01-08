#!/bin/sh
# Быстрый запуск статики для web-панели.
# Нужен, потому что ES-modules не работают корректно при открытии через file://

cd "$(dirname "$0")" || exit 1

PORT="${1:-5173}"

echo "Serving IceShield web panel on http://localhost:${PORT}/"
python3 -m http.server "$PORT"

