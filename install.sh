#!/bin/sh
set -e

# Usage: install.sh [stable|latest|VERSION]
CHANNEL="${1:-stable}"

case "$CHANNEL" in
  stable|latest) ;;
  v*|[0-9]*) ;;
  *)
    echo "Usage: $0 [stable|latest|VERSION]" >&2
    exit 1
    ;;
esac

REPO="MiniMax-AI-Dev/cli"
INSTALL_DIR="${MINIMAX_INSTALL_DIR:-$HOME/.local/bin}"

# Dependency check: curl or wget
if command -v curl >/dev/null 2>&1; then
  download()    { curl -fsSL "$1"; }
  download_to() { curl -fsSL -o "$2" "$1"; }
elif command -v wget >/dev/null 2>&1; then
  download()    { wget -qO- "$1"; }
  download_to() { wget -qO  "$2" "$1"; }
else
  echo "curl or wget is required." >&2; exit 1
fi

# Prefer Node.js >= 18 (much smaller download, ~200KB vs ~57MB)
USE_NODE=0
if command -v node >/dev/null 2>&1; then
  NODE_MAJOR=$(node --version 2>/dev/null | sed 's/v//' | cut -d. -f1)
  if [ -n "$NODE_MAJOR" ] && [ "$NODE_MAJOR" -ge 18 ] 2>/dev/null; then
    USE_NODE=1
  fi
fi

if [ "$USE_NODE" = "0" ]; then
  # Detect OS
  case "$(uname -s)" in
    Darwin) OS="darwin" ;;
    Linux)  OS="linux"  ;;
    *) echo "Unsupported OS: $(uname -s)" >&2; exit 1 ;;
  esac

  # Detect architecture
  case "$(uname -m)" in
    x86_64|amd64)  ARCH="x64"   ;;
    arm64|aarch64) ARCH="arm64" ;;
    *) echo "Unsupported architecture: $(uname -m)" >&2; exit 1 ;;
  esac

  # Rosetta 2: x64 shell on ARM Mac → use native arm64 binary
  if [ "$OS" = "darwin" ] && [ "$ARCH" = "x64" ]; then
    if [ "$(sysctl -n sysctl.proc_translated 2>/dev/null)" = "1" ]; then
      ARCH="arm64"
    fi
  fi

  # musl detection on Linux
  PLATFORM="${OS}-${ARCH}"
  if [ "$OS" = "linux" ]; then
    if [ -f /lib/libc.musl-x86_64.so.1 ] || \
       [ -f /lib/libc.musl-aarch64.so.1 ] || \
       ldd /bin/ls 2>&1 | grep -q musl; then
      PLATFORM="${OS}-${ARCH}-musl"
    fi
  fi
fi

# Resolve version from channel
GH_API="https://api.github.com/repos/${REPO}"
case "$CHANNEL" in
  stable)
    VERSION=$(download "${GH_API}/releases/latest" \
      | grep '"tag_name"' | sed 's/.*"tag_name": *"\([^"]*\)".*/\1/')
    ;;
  latest)
    VERSION=$(download "${GH_API}/releases?per_page=1" \
      | grep '"tag_name"' | head -1 | sed 's/.*"tag_name": *"\([^"]*\)".*/\1/')
    ;;
  *)
    case "$CHANNEL" in v*) VERSION="$CHANNEL" ;; *) VERSION="v${CHANNEL}" ;; esac
    ;;
esac

if [ -z "$VERSION" ]; then
  echo "Failed to resolve version." >&2; exit 1
fi

BASE_URL="https://github.com/${REPO}/releases/download/${VERSION}"

# Fetch manifest and extract checksum
MANIFEST=$(download "${BASE_URL}/manifest.json") || {
  echo "Failed to fetch manifest.json" >&2; exit 1
}

if [ "$USE_NODE" = "1" ]; then
  PLATFORM="node"
  DOWNLOAD_FILE="minimax.mjs"
  echo "Installing minimax ${VERSION} (Node.js)..."
else
  DOWNLOAD_FILE="minimax-${PLATFORM}"
  echo "Installing minimax ${VERSION} for ${PLATFORM}..."
fi

CHECKSUM=$(printf '%s' "$MANIFEST" | tr -d '\n' | \
  sed "s/.*\"${PLATFORM}\"[^}]*\"checksum\" *: *\"\([a-f0-9]*\)\".*/\1/")

if [ -z "$CHECKSUM" ] || [ "${#CHECKSUM}" -ne 64 ]; then
  echo "Platform '${PLATFORM}' not found in manifest." >&2; exit 1
fi

# Download to temp file
TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT

download_to "${BASE_URL}/${DOWNLOAD_FILE}" "$TMP" || {
  echo "Download failed." >&2; exit 1
}

# Verify SHA256
if command -v shasum >/dev/null 2>&1; then
  ACTUAL=$(shasum -a 256 "$TMP" | cut -d' ' -f1)
elif command -v sha256sum >/dev/null 2>&1; then
  ACTUAL=$(sha256sum "$TMP" | cut -d' ' -f1)
else
  echo "shasum or sha256sum is required." >&2; exit 1
fi

if [ "$ACTUAL" != "$CHECKSUM" ]; then
  echo "Checksum verification failed." >&2; exit 1
fi

chmod +x "$TMP"
mkdir -p "$INSTALL_DIR"
mv "$TMP" "${INSTALL_DIR}/minimax"

echo "Installed minimax ${VERSION} to ${INSTALL_DIR}/minimax"

# Warn if install dir is not in PATH
case ":${PATH}:" in
  *":${INSTALL_DIR}:"*) ;;
  *)
    printf '\nNote: %s is not in PATH. Add to your shell profile:\n' "$INSTALL_DIR"
    printf '  export PATH="%s:$PATH"\n\n' "$INSTALL_DIR"
    ;;
esac
