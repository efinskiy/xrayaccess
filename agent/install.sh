#!/bin/bash
set -euo pipefail

BINARY_URL="${1:-}"
CONFIG_DIR="/etc/xray-agent"
BINARY_PATH="/usr/local/bin/xray-agent"
SERVICE_PATH="/etc/systemd/system/xray-agent.service"

if [[ $EUID -ne 0 ]]; then
  echo "Run as root: sudo bash install.sh"
  exit 1
fi

echo "==> Installing xray-agent..."

# Build from source if no URL provided
if [[ -z "$BINARY_URL" ]]; then
  if ! command -v go &>/dev/null; then
    echo "Go is not installed. Provide a pre-built binary URL or install Go first."
    exit 1
  fi
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  cd "$SCRIPT_DIR"
  go build -o /tmp/xray-agent ./cmd/agent
  install -m 755 /tmp/xray-agent "$BINARY_PATH"
else
  curl -fsSL "$BINARY_URL" -o "$BINARY_PATH"
  chmod 755 "$BINARY_PATH"
fi

# Create config directory
mkdir -p "$CONFIG_DIR"
if [[ ! -f "$CONFIG_DIR/config.yaml" ]]; then
  cp "$(dirname "$0")/config.example.yaml" "$CONFIG_DIR/config.yaml"
  echo ""
  echo "==> Config created at $CONFIG_DIR/config.yaml"
  echo "    Edit it and set server_url and api_key before starting the service."
fi

# Install systemd service
install -m 644 "$(dirname "$0")/xray-agent.service" "$SERVICE_PATH"
systemctl daemon-reload
systemctl enable xray-agent

echo ""
echo "==> Done! Edit $CONFIG_DIR/config.yaml, then:"
echo "    systemctl start xray-agent"
echo "    journalctl -u xray-agent -f"
