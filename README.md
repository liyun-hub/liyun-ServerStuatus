# Server Status Monitor

一个从零实现的轻量服务器监控系统（Server + Agent + Web），支持 CPU/内存/磁盘/流量监控、在线状态、历史图表、告警规则与事件。

## 目录结构

- `server/`：Go 服务端（HTTP API + Agent WebSocket 接入 + SQLite）
- `agent/`：Go 探针（系统指标采集与上报）
- `web/`：React 管理端
- `docker-compose.yml`：一键部署

## 新增鉴权机制（仅 Agent -> Server）

- 鉴权入口：`GET /ws/agent`
- 方式：WebSocket 握手头 `Authorization: Bearer <AGENT_TOKEN>`
- Server 与 Agent 都必须设置同一个 `AGENT_TOKEN`

当 token 无效时，服务端返回 `401`：

```json
{"error":"unauthorized"}
```

## 本地开发运行

### 1) 启动 Server

```bash
cd server
go mod tidy
go run ./cmd/server
```

默认环境变量：

- `HTTP_ADDR`（默认 `:8080`）
- `DB_PATH`（默认 `./data/server-status.db`）
- `HEARTBEAT_TIMEOUT_SEC`（默认 `30`）
- `AGENT_TOKEN`（必填）

示例：

```bash
AGENT_TOKEN=dev-token go run ./cmd/server
```

### 2) 启动 Agent

```bash
cd agent
go mod tidy
go run ./cmd/agent
```

关键环境变量：

- `SERVER_WS_URL`（默认 `ws://localhost:8080/ws/agent`）
- `NODE_ID`（默认主机名）
- `HEARTBEAT_INTERVAL_SEC`（默认 `5`）
- `COLLECT_INTERVAL_SEC`（默认 `5`）
- `RECONNECT_WAIT_SEC`（默认 `3`）
- `AGENT_TOKEN`（必填，需与 Server 一致）

示例：

```bash
AGENT_TOKEN=dev-token SERVER_WS_URL=ws://localhost:8080/ws/agent go run ./cmd/agent
```

### 3) 启动 Web

```bash
cd web
npm install
npm run dev
```

可选环境变量：

- `VITE_API_BASE`（默认 `http://localhost:8080`）


## Docker Compose 一键部署（可选）


### 1) 准备环境变量

复制示例文件：

```bash
cp .env.example .env
```

Windows 下可手动复制 `.env.example` 为 `.env`。

至少修改：

- `AGENT_TOKEN` 为强随机值

### 2) 启动

```bash
docker compose up --build -d
```

### 3) 访问

- Web 控制台：`http://localhost:3000`
- Server API：`http://localhost:8080/api/health`

## 验证鉴权是否生效

1. Server/Agent 使用同一 token：Agent 成功上线，上报正常。
2. Agent token 改错：Agent 无法连接，Server 对 `/ws/agent` 返回 `401 unauthorized`。

## 常用验证命令

```bash
cd server && go test ./...
cd agent && go test ./...
cd web && npm run build
```
