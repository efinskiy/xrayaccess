# Xray Access Dashboard

[![CI](https://github.com/efinskiy/xrayaccess/actions/workflows/ci.yml/badge.svg)](https://github.com/efinskiy/xrayaccess/actions/workflows/ci.yml)
[![Release](https://github.com/efinskiy/xrayaccess/actions/workflows/release.yml/badge.svg)](https://github.com/efinskiy/xrayaccess/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Веб-дашборд для визуализации access-логов [Xray-core](https://github.com/XTLS/Xray-core). Показывает к каким сайтам и IP обращаются пользователи прокси, строит графики активности, позволяет фильтровать трафик по пользователю, домену и временному диапазону.

![Dashboard screenshot](docs/dashboard.png)

---

## Содержание

- [Как это работает](#как-это-работает)
- [Возможности](#возможности)
- [Требования](#требования)
- [Быстрый старт](#быстрый-старт-docker-compose)
- [Ручная установка сервера](#ручная-установка-сервера)
- [Установка агента на Xray ноду](#установка-агента-на-xray-ноду)
- [Конфигурация](#конфигурация)
- [Добавление сервера в дашборд](#добавление-сервера-в-дашборд)
- [Разработка](#разработка)
- [Релиз](#релиз)

---

## Как это работает

Система состоит из двух компонентов:

```
┌─────────────────────────────────┐        ┌──────────────────────────────────┐
│         Xray нода (VPS)         │        │        Веб-сервис (сервер)        │
│                                 │        │                                  │
│  /var/log/xray/access.log       │  HTTPS │  Go API (Gin + PostgreSQL)       │
│         │                       │ ──────▶│  POST /api/ingest                │
│  xray-agent (Go binary)         │        │                                  │
│  • читает лог через tail -f     │        │  React Dashboard                 │
│  • парсит строки                │        │  • Графики трафика               │
│  • буферизует батчами           │        │  • Топ пользователей/сайтов      │
│  • отправляет по HTTPS          │        │  • Просмотр логов с фильтрами    │
└─────────────────────────────────┘        └──────────────────────────────────┘
         Xray нода 2 ──────────────────────────────▲
         Xray нода 3 ──────────────────────────────┘
```

**Агент** (`agent/`) устанавливается на каждую Xray ноду как systemd-сервис. Он читает access.log в реальном времени, парсит строки и батчами отправляет данные на веб-сервис по HTTPS, используя уникальный API ключ.

**Веб-сервис** (`server/`) принимает данные от агентов, сохраняет в PostgreSQL и отдаёт REST API для фронтенда.

**Фронтенд** (`frontend/`) — React SPA с авторизацией, графиками и таблицами.

### Формат лога Xray

Парсер поддерживает оба формата access.log:

```
# TCP/UDP без указания протокола источника
2026/05/23 13:32:32.721765 from xxx.xxx.xxx.xxx:65479 accepted tcp:www.google.com:443 [VLESS-Inbound -> SS_OUTBOUND] email: 149

# UDP с протоколом источника
2026/05/23 13:32:33.444395 from tcp:xxx.xxx.xxx.xxx:24227 accepted udp:1.1.1.1:53 [VLESS-Inbound -> VLESS_OUTBOUND_DE] email: 149
```

---

## Возможности

- **Дашборд** — KPI карточки (запросы, пользователи, сайты, серверы), график трафика по времени, топ направлений, распределение по inbound
- **Пользователи** — таблица с количеством запросов и уникальных сайтов на каждого пользователя, детальная страница с персональными графиками
- **Серверы** — управление подключёнными Xray нодами, генерация API ключей, статус онлайн/офлайн
- **Логи** — постраничный просмотр всех записей с фильтрацией по пользователю, домену, временному диапазону
- **Временные диапазоны** — 1 час, 24 часа, 7 дней, 30 дней
- **Авторизация** — JWT-аутентификация администратора
- **Масштабируемость** — поддержка множества Xray нод одновременно
- **Безопасная передача** — HTTPS + API ключ на каждый сервер

---

## Требования

**Веб-сервис:**
- Docker + Docker Compose **или** Go 1.22+ и PostgreSQL 15+
- 512 MB RAM минимум, 1 GB рекомендуется

**Агент на Xray ноде:**
- Linux x86_64 или arm64 (Ubuntu/Debian)
- Доступ к файлу `/var/log/xray/access.log` (или другому пути)
- HTTPS доступ до вашего веб-сервиса

---

## Быстрый старт (Docker Compose)

### 1. Клонируйте репозиторий

```bash
git clone https://github.com/efinskiy/xrayaccess.git /etc/xrayaccess
cd /etc/xrayaccess
```

### 2. Настройте переменные окружения

```bash
# Сгенерируйте hex JWT секрет
openssl rand -hex 16
```
```bash
cp .env.example .env
nano .env
```
```env
POSTGRES_PASSWORD=надёжный_пароль_базы
JWT_SECRET=случайная_строка_минимум_32_символа
ADMIN_USERNAME=admin
ADMIN_PASSWORD=надёжный_пароль_админа
```

### 3. Запустите

```bash
docker compose up -d
```

Дашборд будет доступен на **http://your-server:3000**, API на **:8080**.

### 4. Проверьте что всё запустилось

```bash
docker compose ps
docker compose logs server
```

### 5. Настройка Caddy для HTTPS (требуется домен/поддомен)
```bash
apt update && apt upgrade -y
apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install caddy
cp /etc/xrayaccess/Caddyfile /etc/caddy/Caddyfile
nano /etc/caddy/Caddyfile
```

В открывшемся редакторе измените `<your domain>` на имя вашего домена (напр. subdomain.example.com)

Проверьте конфиг
```bash
caddy validate --config /etc/caddy/Caddyfile
```

Перезапустите Caddy

```bash
systemctl reload caddy
```

---

## Ручная установка сервера

Если вы не хотите использовать Docker:

### PostgreSQL

```bash
sudo apt install postgresql
sudo -u postgres psql -c "CREATE USER xray WITH PASSWORD 'xray_secret';"
sudo -u postgres psql -c "CREATE DATABASE xray_dashboard OWNER xray;"
```

### Сборка сервера

```bash
cd server
go build -o /usr/local/bin/xray-server ./cmd/server
```

### Переменные окружения

Создайте `/etc/xray-dashboard/server.env`:

```env
DATABASE_URL=postgres://xray:xray_secret@localhost:5432/xray_dashboard?sslmode=disable
JWT_SECRET=случайная_строка_минимум_32_символа
ADMIN_USERNAME=admin
ADMIN_PASSWORD=надёжный_пароль
PORT=8080
```

### Systemd сервис для сервера

```bash
cat > /etc/systemd/system/xray-dashboard.service << 'EOF'
[Unit]
Description=Xray Dashboard Server
After=network.target postgresql.service

[Service]
EnvironmentFile=/etc/xray-dashboard/server.env
ExecStart=/usr/local/bin/xray-server
Restart=on-failure
RestartSec=5s
User=www-data

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now xray-dashboard
```

### Сборка фронтенда

```bash
cd frontend
npm ci
npm run build
# Содержимое dist/ разместите в nginx/apache
```

---

## Установка агента на Xray ноду

### Вариант А — скачать готовый бинарник (рекомендуется)

```bash
# Скачайте последний релиз (замените URL на актуальный из раздела Releases)
curl -fsSL https://github.com/efinskiy/xrayaccess/releases/latest/download/xray-agent-linux-amd64 \
  -o /usr/local/bin/xray-agent
chmod +x /usr/local/bin/xray-agent

# Проверьте версию
xray-agent -version
```

### Вариант Б — собрать из исходников

```bash
# На сервере должен быть установлен Go 1.22+
git clone https://github.com/efinskiy/xrayaccess.git
cd xrayaccess/agent
go build -o /usr/local/bin/xray-agent ./cmd/agent
```

### Создайте конфигурацию

Сначала **добавьте сервер в дашборд** (раздел «Серверы» → «Добавить сервер») и скопируйте сгенерированный API ключ.

```bash
mkdir -p /etc/xray-agent

cat > /etc/xray-agent/config.yaml << 'EOF'
# URL вашего дашборда (без слеша в конце)
server_url: https://

# API ключ из раздела "Серверы" в дашборде
api_key: 

# Путь к access логу Xray
log_file: /var/log/remnanode/access.log

# Размер батча перед отправкой
batch_size: 200

# Максимальный интервал между отправками
flush_interval: 10s

# true только для самоподписанных сертификатов в dev-окружении
tls_skip_verify: false
EOF

chmod 600 /etc/xray-agent/config.yaml
```

### Установите systemd сервис

```bash
curl -fsSL https://github.com/efinskiy/xrayaccess/releases/latest/download/xray-agent.service \
  -o /etc/systemd/system/xray-agent.service

systemctl daemon-reload
systemctl enable --now xray-agent
```

### Проверьте что агент работает

```bash
# Статус
systemctl status xray-agent

# Логи в реальном времени
journalctl -u xray-agent -f

# Ожидаемый вывод:
# xray-agent v1.0.0 starting: log=/var/log/xray/access.log server=https://...
```

### Убедитесь что access.log включён в Xray

В конфиге Xray должна быть настройка:

```json
{
  "log": {
    "access": "/var/log/xray/access.log",
    "loglevel": "info"
  }
}
```

---

## Конфигурация

### Сервер — переменные окружения

| Переменная | По умолчанию | Описание |
|---|---|---|
| `DATABASE_URL` | `postgres://...localhost.../xray_dashboard` | DSN PostgreSQL |
| `JWT_SECRET` | `change_me_...` | Секрет для подписи JWT токенов. **Обязательно измените!** |
| `ADMIN_USERNAME` | `admin` | Логин администратора |
| `ADMIN_PASSWORD` | `admin123` | Пароль администратора. **Обязательно измените!** |
| `PORT` | `8080` | Порт HTTP сервера |

### Агент — `config.yaml`

| Параметр | По умолчанию | Описание |
|---|---|---|
| `server_url` | — | URL веб-сервиса, **обязателен** |
| `api_key` | — | API ключ сервера, **обязателен** |
| `log_file` | `/var/log/xray/access.log` | Путь к access логу Xray |
| `batch_size` | `200` | Сколько записей накопить перед отправкой |
| `flush_interval` | `10s` | Максимальное время между отправками |
| `tls_skip_verify` | `false` | Пропускать проверку TLS (только для разработки) |

---

## Добавление сервера в дашборд

1. Откройте дашборд и войдите под admin
2. Перейдите в раздел **Серверы**
3. Нажмите **Добавить сервер**, введите имя (например, `VPS-Frankfurt-01`)
4. Скопируйте сгенерированный **API ключ** — он показывается только один раз
5. Вставьте ключ в `api_key` в `/etc/xray-agent/config.yaml` на нужной ноде
6. Перезапустите агент: `systemctl restart xray-agent`
7. Через 10–30 секунд сервер появится онлайн в списке

---

## Разработка

### Требования

- Go 1.22+
- Node.js 20+
- PostgreSQL 15+ (или `docker compose up postgres -d`)

### Запуск бэкенда

```bash
# Только PostgreSQL через Docker
docker compose up postgres -d

# Сервер локально
cd server
export DATABASE_URL="postgres://xray:xray_secret@localhost:5432/xray_dashboard?sslmode=disable"
export JWT_SECRET="dev_secret_32_chars_minimum_here"
export ADMIN_PASSWORD="admin123"
go run ./cmd/server
```

### Запуск фронтенда

```bash
cd frontend
npm install
npm run dev
# Откройте http://localhost:5173
```

Vite проксирует `/api/*` запросы на `localhost:8080`.

### Структура проекта

```
xrayaccess/
├── server/                     # Go бэкенд
│   ├── cmd/server/main.go
│   └── internal/
│       ├── api/
│       │   ├── handlers/       # auth, ingest, stats, logs, servers
│       │   ├── middleware/     # JWT, API key
│       │   └── router.go
│       ├── config/
│       ├── database/           # подключение, миграции, seed admin
│       └── models/             # GORM модели
├── agent/                      # Go агент для Xray нод
│   ├── cmd/agent/main.go
│   └── internal/
│       ├── config/
│       ├── parser/             # парсер строк access.log
│       └── sender/             # HTTP отправка с retry
├── frontend/                   # React + TypeScript
│   └── src/
│       ├── pages/              # Dashboard, Users, Servers, Logs
│       ├── components/         # Layout, charts, UI kit
│       ├── api/                # клиент + типы
│       └── store/              # Zustand auth store
└── .github/workflows/
    ├── ci.yml                  # проверка на каждый PR
    └── release.yml             # релиз по тегу v*
```

---

## Релиз

Для создания нового релиза достаточно поставить git тег:

```bash
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions автоматически:
1. Скомпилирует агент для `linux/amd64` и `linux/arm64`
2. Соберёт и опубликует Docker образы в `ghcr.io/efinskiy/xrayaccess-server` и `ghcr.io/efinskiy/xrayaccess-frontend`
3. Создаст GitHub Release с бинарниками, systemd сервисом, примером конфига и `checksums.txt`

### Docker образы в docker-compose.yml для production

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: xray_dashboard
      POSTGRES_USER: xray
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  server:
    image: ghcr.io/efinskiy/xrayaccess-server:latest
    environment:
      DATABASE_URL: postgres://xray:${POSTGRES_PASSWORD}@postgres:5432/xray_dashboard?sslmode=disable
      JWT_SECRET: ${JWT_SECRET}
      ADMIN_USERNAME: ${ADMIN_USERNAME:-admin}
      ADMIN_PASSWORD: ${ADMIN_PASSWORD}
    ports:
      - "8080:8080"
    depends_on:
      postgres:
        condition: service_healthy

  frontend:
    image: ghcr.io/efinskiy/xrayaccess-frontend:latest
    ports:
      - "3000:80"
    depends_on:
      - server

volumes:
  postgres_data:
```

---

## Лицензия

MIT
