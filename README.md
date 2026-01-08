# IceShield Web Panel

## Важно: почему панель перестала открываться из файла

Если открыть `web/index.html` напрямую (через `file://`), браузер **блокирует ES-модули** (`type="module"`) по CORS. Это не связано с вашим API.

## Как запускать правильно

### Вариант 1 (самый простой): встроенный сервер Python

```sh
cd /home/kweezy/Desktop/IdeaProjects/IceShield/web
python3 -m http.server 5173
```

Откройте в браузере:

- http://localhost:5173/

### Вариант 2: Node (если установлен)

```sh
cd /home/kweezy/Desktop/IdeaProjects/IceShield/web
npx serve -l 5173
```

## Подключение к API

- По умолчанию Base URL: `/api`
- Если панель и API на разных портах/хостах — укажите полный URL, например: `http://localhost:8080/api`

> Примечание: CORS для API уже включён на стороне сервера.

