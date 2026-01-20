# Этап 1: Установка зависимостей
FROM node:20-alpine AS deps
# Установка libc6-compat нужна, если используются нативные модули (например, sharp)
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Копируем файлы package для установки
COPY package.json package-lock.json ./
# Устанавливаем зависимости (npm ci быстрее и надежнее для CI/CD)
RUN npm ci

# Этап 2: Сборка приложения
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Отключаем телеметрию Next.js во время сборки
ENV NEXT_TELEMETRY_DISABLED 1

# Запускаем сборку
RUN npm run build

# Этап 3: Финальный образ (Runner)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Создаем системного пользователя для безопасности (не запускаем под root)
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Копируем только необходимые файлы из этапа сборки
COPY --from=builder /app/public ./public

# Автоматически созданная папка standalone содержит всё необходимое для запуска
# (нужна настройка output: 'standalone' в next.config.ts)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Запускаем сервер
CMD ["node", "server.js"]
