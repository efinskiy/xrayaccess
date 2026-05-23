---

## Установка агента на Xray ноду

```bash
# Скачайте бинарник для вашей архитектуры (x86_64)
curl -fsSL https://github.com/efinskiy
/xrayaccess/releases/latest/download/xray-agent-linux-amd64 \
  -o /usr/local/bin/xray-agent
chmod +x /usr/local/bin/xray-agent

# Создайте конфиг
mkdir -p /etc/xray-agent
cat > /etc/xray-agent/config.yaml <<EOF
server_url: https://your-dashboard.example.com
api_key: YOUR_API_KEY_FROM_DASHBOARD
log_file: /var/log/xray/access.log
batch_size: 200
flush_interval: 10s
EOF

# Установите systemd сервис
curl -fsSL https://github.com/efinskiy/xrayaccess/releases/latest/download/xray-agent.service \
  -o /etc/systemd/system/xray-agent.service
systemctl daemon-reload
systemctl enable --now xray-agent
```

## Docker Compose (веб-сервис)

```yaml
services:
  server:
    image: ghcr.io/efinskiy/xrayaccess-server:latest
  frontend:
    image: ghcr.io/efinskiy/xrayaccess-frontend:latest
```