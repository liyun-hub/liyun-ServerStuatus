#!/bin/sh
set -eu

BASE_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
OUT_DIR="$BASE_DIR/release"
VERSION="${1:-$(date +%Y%m%d%H%M%S)}"
PKG_DIR="$OUT_DIR/server-status-$VERSION"
BIN_DIR="$PKG_DIR/bin"
CONF_DIR="$PKG_DIR/conf"
WEB_DIR="$PKG_DIR/web"

mkdir -p "$BIN_DIR" "$CONF_DIR" "$WEB_DIR"

echo "[1/4] build server binary"
(
  cd "$BASE_DIR/server"
  CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o "$BIN_DIR/server" ./cmd/server
)

echo "[2/4] build agent binary"
(
  cd "$BASE_DIR/agent"
  CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o "$BIN_DIR/agent" ./cmd/agent
)

echo "[3/4] build web static files"
(
  cd "$BASE_DIR/web"
  npm install
  npm run build
  cp -r dist/. "$WEB_DIR/"
)

echo "[4/4] copy configs and deploy script"
cp "$BASE_DIR/server/.env.example" "$CONF_DIR/server.env.example"
cp "$BASE_DIR/agent/.env.example" "$CONF_DIR/agent.env.example"
cp "$BASE_DIR/.env.example" "$CONF_DIR/root.env.example"
cp "$BASE_DIR/deploy.sh" "$PKG_DIR/deploy.sh"

cat > "$PKG_DIR/server.env" <<'EOF'
HTTP_ADDR=:8080
DB_PATH=./data/server-status.db
HEARTBEAT_TIMEOUT_SEC=30
AGENT_TOKEN=replace-with-strong-token
EOF

cat > "$PKG_DIR/agent.env" <<'EOF'
SERVER_WS_URL=ws://127.0.0.1:8080/ws/agent
NODE_ID=agent-linux-1
HEARTBEAT_INTERVAL_SEC=5
COLLECT_INTERVAL_SEC=5
RECONNECT_WAIT_SEC=3
AGENT_TOKEN=replace-with-strong-token
EOF

chmod +x "$PKG_DIR/deploy.sh"
chmod +x "$BIN_DIR/server" "$BIN_DIR/agent"

tar -C "$OUT_DIR" -czf "$OUT_DIR/server-status-$VERSION-linux-amd64.tar.gz" "server-status-$VERSION"

echo "package dir: $PKG_DIR"
echo "tar.gz: $OUT_DIR/server-status-$VERSION-linux-amd64.tar.gz"
