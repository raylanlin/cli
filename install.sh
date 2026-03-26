#!/bin/sh
set -e

REPO="MiniMax-AI-Dev/minimax-cli"
INSTALL_DIR="${MINIMAX_INSTALL_DIR:-/usr/local/bin}"

OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)
case "$ARCH" in
  x86_64)        ARCH="x64" ;;
  aarch64|arm64) ARCH="arm64" ;;
  *) echo "Unsupported architecture: $ARCH" >&2; exit 1 ;;
esac

BINARY="minimax-${OS}-${ARCH}"
URL="https://github.com/${REPO}/releases/latest/download/${BINARY}"

echo "Downloading ${BINARY}..."
curl -fsSL "$URL" -o "${INSTALL_DIR}/minimax"
chmod +x "${INSTALL_DIR}/minimax"
echo "Installed minimax to ${INSTALL_DIR}/minimax"
"${INSTALL_DIR}/minimax" --version
