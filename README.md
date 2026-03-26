# Liyun-ServerStuatus

轻量级服务器监控系统，采用 **Server + Agent + Web** 架构，支持节点在线状态、CPU/内存/磁盘/网络指标、历史图表、告警规则与事件。当前版本已支持：**每节点独立 token、节点重命名、后台管理登录、在线一键安装命令生成**。

## 功能概览

- 实时节点在线状态（心跳机制）
- CPU / 内存 / 磁盘 / 网络流量采集
- 指标持久化存储（SQLite）
- Agent → Server WebSocket Bearer 鉴权（每节点独立 token）
- 后台管理（账号密码登录 + 会话鉴权）
- 节点管理：新增节点、重命名 displayName、重置 token
- 在线一键安装（复制命令）
- Web 控制台可视化监控
- Docker Compose 一键部署

## 项目结构

```text
liyun-ServerStuatus/
├─ server/                 # Go 服务端（HTTP API + Agent WebSocket 接入 + SQLite）
├─ agent/                  # Go 探针（系统指标采集与上报）
├─ web/                    # React 管理端
├─ docker-compose.yml      # 一键部署
├─ .env.example            # 环境变量模板
└─ doc/
   └─ 项目文档.md          # 详细文档
```

## 本地开发快速开始

> 首次运行建议先在各子项目执行一次依赖安装：`go mod tidy` / `npm install`

### 1) 启动 Server

```bash
cd server
go run ./cmd/server
```

### 2) 启动 Agent（示例）

> Agent 的 `AGENT_TOKEN` 需使用后台为该节点生成的 token。

```bash
cd agent
NODE_ID=node-1 AGENT_TOKEN=<node-token> SERVER_WS_URL=ws://localhost:8080/ws/agent go run ./cmd/agent
```

### 3) 启动 Web

```bash
cd web
npm install
npm run dev
```

本地访问：

- Web 控制台：`http://localhost:5173`
- 后台登录页：`http://localhost:5173/admin/login`
- Server 健康检查：`http://localhost:8080/api/health`

## 后台管理使用

### 默认后台账号

- 用户名：`admin`
- 密码：请在 `server/internal/store/sqlite/store.go` 的 `seedDefaultAdmin` 中按需设置（建议改为自定义强密码）

> 首次初始化数据库时会写入默认管理员账号。生产环境建议在发布前调整初始化密码哈希。

### 后台 API（核心）

- `POST /api/admin/login`：登录，返回会话 token
- `POST /api/admin/logout`：登出
- `GET /api/admin/nodes`：节点管理列表
- `POST /api/admin/nodes`：新增节点并返回该节点 token（仅返回一次）
- `PUT /api/admin/nodes/{id}/display-name`：修改节点显示名
- `POST /api/admin/nodes/{id}/token/reset`：重置节点 token（仅返回一次）
- `POST /api/admin/nodes/{id}/install-command`：生成在线安装命令

## 一键安装（在线复制命令）

后台在生成安装命令时，会下发 Linux amd64 适用的 Docker 命令（示例）：

```bash
docker run -d --name 'server-status-agent' --restart unless-stopped --network host -e NODE_ID='node-1' -e AGENT_TOKEN='<token>' -e SERVER_WS_URL='ws://your-server:8080/ws/agent' 'ghcr.io/liyun/server-status-agent:latest'
```

> 实际命令请以后台生成结果为准（包含该节点最新 token）。

## 环境变量

### Server

| 变量                      | 默认值                                 | 必填 | 说明 |
|-------------------------|--------------------------------------|----|----|
| `HTTP_ADDR`             | `:8080`                              | 否  | HTTP 监听地址 |
| `DB_PATH`               | `./data/server-status.db`            | 否  | SQLite 数据库路径 |
| `HEARTBEAT_TIMEOUT_SEC` | `30`                                 | 否  | 节点离线判定超时（秒） |
| `ADMIN_SESSION_TTL_SEC` | `86400`                              | 否  | 后台会话有效期（秒） |
| `INSTALL_AGENT_IMAGE`   | `ghcr.io/liyun/server-status-agent:latest` | 否  | 安装命令使用的 agent 镜像 |
| `INSTALL_WS_URL`        | 空（自动根据请求推导）                     | 否  | 安装命令中固定使用的 WS 地址 |

### Agent

| 变量                       | 默认值                            | 必填 | 说明 |
|--------------------------|--------------------------------|----|----|
| `SERVER_WS_URL`          | `ws://localhost:8080/ws/agent` | 否  | Server WebSocket 地址 |
| `NODE_ID`                | 主机名                            | 否  | 节点唯一标识 |
| `HEARTBEAT_INTERVAL_SEC` | `5`                            | 否  | 心跳间隔（秒） |
| `COLLECT_INTERVAL_SEC`   | `5`                            | 否  | 指标采集间隔（秒） |
| `RECONNECT_WAIT_SEC`     | `3`                            | 否  | 断线重连等待（秒） |
| `AGENT_TOKEN`            | -                              | **是** | 该节点专属 token |

### Web

| 变量              | 默认值                     | 必填 | 说明 |
|-----------------|-------------------------|----|----|
| `VITE_API_BASE` | `http://localhost:8080` | 否  | 前端请求 API 基地址 |

## 鉴权机制

### Agent → Server（WebSocket）

- 鉴权入口：`GET /ws/agent`
- 鉴权方式：

```http
Authorization: Bearer <node-token>
```

服务端对 `token` 做 sha256 后与节点 metadata 绑定进行反查，绑定成功后该连接仅可上报对应 nodeId。

### Admin → Server（HTTP）

- 登录后获取会话 token
- 受保护接口通过 Bearer token 访问

```http
Authorization: Bearer <admin-session-token>
```

## Docker Compose 部署（可选）

### 1) 准备配置

```bash
cp .env.example .env
```

Windows 下可手动复制 `.env.example` 为 `.env`。

### 2) 启动

```bash
docker compose up --build -d
```

### 3) 访问

- Web 控制台：`http://localhost:3000`
- 后台登录页：`http://localhost:3000/admin/login`
- Server 健康检查：`http://localhost:8080/api/health`

## 验证命令

```bash
cd server && go test ./...
cd agent && go test ./...
cd web && npm run build
```

---

更完整的设计与说明请查看：`doc/项目文档.md`
