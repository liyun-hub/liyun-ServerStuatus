#!/bin/sh
set -eu

BASE_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
OUT_DIR="$BASE_DIR/release"
VERSION="${1:-$(date +%Y%m%d%H%M%S)}"

LINUX_NAME="server-status-$VERSION-linux-amd64"
WINDOWS_NAME="server-status-$VERSION-windows-amd64"

LINUX_PKG_DIR="$OUT_DIR/$LINUX_NAME"
LINUX_BIN_DIR="$LINUX_PKG_DIR/bin"
LINUX_CONF_DIR="$LINUX_PKG_DIR/conf"
LINUX_WEB_DIR="$LINUX_PKG_DIR/web"

WINDOWS_PKG_DIR="$OUT_DIR/$WINDOWS_NAME"
WINDOWS_BIN_DIR="$WINDOWS_PKG_DIR/bin"
WINDOWS_CONF_DIR="$WINDOWS_PKG_DIR/conf"
WINDOWS_WEB_DIR="$WINDOWS_PKG_DIR/web"

mkdir -p "$LINUX_BIN_DIR" "$LINUX_CONF_DIR" "$LINUX_WEB_DIR"
mkdir -p "$WINDOWS_BIN_DIR" "$WINDOWS_CONF_DIR" "$WINDOWS_WEB_DIR"

echo "[1/7] build linux server binary"
(
  cd "$BASE_DIR/server"
  CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o "$LINUX_BIN_DIR/server" ./cmd/server
)

echo "[2/7] build linux agent binary"
(
  cd "$BASE_DIR/agent"
  CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o "$LINUX_BIN_DIR/agent" ./cmd/agent
)

echo "[3/7] build windows server binary"
(
  cd "$BASE_DIR/server"
  CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -o "$WINDOWS_BIN_DIR/server.exe" ./cmd/server
)

echo "[4/7] build web static files"
(
  cd "$BASE_DIR/web"
  npm install
  npm run build
  cp -r dist/. "$LINUX_WEB_DIR/"
  cp -r dist/. "$WINDOWS_WEB_DIR/"
)

echo "[5/7] copy configs and deploy script"
cp "$BASE_DIR/server/.env.example" "$LINUX_CONF_DIR/server.env.example"
cp "$BASE_DIR/agent/.env.example" "$LINUX_CONF_DIR/agent.env.example"
cp "$BASE_DIR/.env.example" "$LINUX_CONF_DIR/root.env.example"
cp "$BASE_DIR/deploy.sh" "$LINUX_PKG_DIR/deploy.sh"

cp "$BASE_DIR/server/.env.example" "$WINDOWS_CONF_DIR/server.env.example"
cp "$BASE_DIR/.env.example" "$WINDOWS_CONF_DIR/root.env.example"

cat > "$LINUX_PKG_DIR/server.env" <<'EOF'
HTTP_ADDR=:8080
DB_PATH=./data/server-status.db
HEARTBEAT_TIMEOUT_SEC=30
ADMIN_SESSION_TTL_SEC=86400
INSTALL_AGENT_IMAGE=ghcr.io/liyun/server-status-agent:latest
INSTALL_WS_URL=
EOF

cat > "$LINUX_PKG_DIR/agent.env" <<'EOF'
SERVER_WS_URL=ws://127.0.0.1:8080/ws/agent
NODE_ID=agent-linux-1
HEARTBEAT_INTERVAL_SEC=5
COLLECT_INTERVAL_SEC=5
RECONNECT_WAIT_SEC=3
AGENT_TOKEN=replace-with-node-token
EOF

cat > "$WINDOWS_PKG_DIR/server.env" <<'EOF'
HTTP_ADDR=:8080
DB_PATH=./data/server-status.db
HEARTBEAT_TIMEOUT_SEC=30
ADMIN_SESSION_TTL_SEC=86400
INSTALL_AGENT_IMAGE=ghcr.io/liyun/server-status-agent:latest
INSTALL_WS_URL=
EOF

chmod +x "$LINUX_PKG_DIR/deploy.sh"
chmod +x "$LINUX_BIN_DIR/server" "$LINUX_BIN_DIR/agent"

echo "[6/7] archive linux package"
tar -C "$OUT_DIR" -czf "$OUT_DIR/$LINUX_NAME.tar.gz" "$LINUX_NAME"

echo "[7/7] archive windows package"
tar -C "$OUT_DIR" -czf "$OUT_DIR/$WINDOWS_NAME.tar.gz" "$WINDOWS_NAME"

echo "linux package dir: $LINUX_PKG_DIR"
echo "linux tar.gz: $OUT_DIR/$LINUX_NAME.tar.gz"
echo "windows package dir: $WINDOWS_PKG_DIR"
echo "windows tar.gz: $OUT_DIR/$WINDOWS_NAME.tar.gz"
