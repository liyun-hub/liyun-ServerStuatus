# Liyun-ServerStuatus

轻量级服务器监控系统，采用 **Server + Agent + Web** 架构，支持节点在线状态、CPU/内存/磁盘/网络指标、历史图表、告警规则与事件。当前版本已支持：**每节点独立 token、节点重命名、后台管理登录、首登强制改密、在线一键安装命令生成、Linux/Windows 发布打包**。

## 功能概览

- 实时节点在线状态（心跳机制）
- CPU / 内存 / 磁盘 / 网络流量采集
- 指标持久化存储（SQLite）
- Agent → Server WebSocket Bearer 鉴权（每节点独立 token）
- 后台管理（账号密码登录 + 会话鉴权 + 首登强制改密）
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

### 首登改密机制

- 默认管理员 `admin` 首次登录后，后端会返回 `mustChangePassword=true`。
- 在完成 `POST /api/admin/change-password` 前，后台业务接口会被拦截，并返回 `PASSWORD_CHANGE_REQUIRED`。
- 前端会自动跳转到 `/admin/change-password`，改密成功后再进入后台业务页面。

### 后台 API（核心）

- `POST /api/admin/login`：登录，返回会话 token（含 `mustChangePassword`）
- `POST /api/admin/logout`：登出
- `POST /api/admin/change-password`：修改当前后台账号密码
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

## 手动部署

> 适用于无法使用后台一键安装的场景。以下内容为通用参考，请以实际环境配置为准。

### 1) 部署前提条件

#### Server 侧

- 已准备好对应平台的服务端可执行文件（Linux: `server`，Windows: `server.exe`）。
- 已准备可写目录（至少包含 `data/`，用于 SQLite 数据库文件）。
- 已确认监听端口可访问（默认 `8080`），并完成防火墙/安全组放行。
- 如有反向代理（Nginx/Caddy/网关），已规划好转发规则与域名。

#### Agent 侧

- 已准备 Linux amd64 运行环境（当前发布包中的 Agent 为 Linux 版本）。
- 已在后台创建节点并获取该节点专属 `AGENT_TOKEN`。
- Agent 主机可访问 Server 的 WebSocket 地址（`/ws/agent`）。

### 2) 必要参数与环境变量

#### Server 必要项

- `HTTP_ADDR`：服务监听地址（如 `:8080`）。
- `DB_PATH`：SQLite 文件路径（如 `./data/server-status.db`）。
- `ADMIN_SESSION_TTL_SEC`：后台会话有效期。
- `HEARTBEAT_TIMEOUT_SEC`：节点离线判定超时。
- `INSTALL_WS_URL`（可选）：用于固定安装命令中的 WS 地址。

建议将以上参数写入 `server.env`（或系统环境变量），并按生产环境实际地址/路径调整。

#### Agent 必要项

- `SERVER_WS_URL`：Server WebSocket 地址（示例形态：`ws://<server-host>:8080/ws/agent`）。
- `AGENT_TOKEN`：节点专属 token（必填）。
- `NODE_ID`：节点唯一标识（建议明确设置，便于运维识别）。
- `HEARTBEAT_INTERVAL_SEC`、`COLLECT_INTERVAL_SEC`、`RECONNECT_WAIT_SEC`：按网络与性能需求调整。

建议将以上参数写入 `agent.env` 后再启动 Agent，避免命令行明文泄露敏感信息。

### 3) Server 手动部署步骤

1. 准备目录与文件：放置 `server/server.exe` 可执行文件、`web` 静态资源及配置文件。
2. 创建并检查 `server.env`：确认监听地址、数据库路径、会话参数等。
3. 启动 Server 进程：使用你当前环境的进程管理方式（systemd、supervisor、Windows 服务管理器、任务计划等）。
4. 配置开机自启与日志落盘：确保重启后自动恢复，并可追踪运行日志。

> 建议优先使用受控进程管理器运行，不建议长期使用临时前台会话。

### 4) Agent 手动部署步骤

1. 在后台新增节点，记录节点 `NODE_ID` 与 `AGENT_TOKEN`（token 仅返回一次时请妥善保存）。
2. 在 Agent 主机写入 `agent.env`，至少包含 `SERVER_WS_URL`、`AGENT_TOKEN`、`NODE_ID`。
3. 启动 Agent 进程，并配置自动重启策略（防止网络抖动后长期离线）。
4. 多节点部署时，确保每个节点使用独立 token，避免互相覆盖状态。

### 5) 部署完成后验证

#### 服务可用性（Server）

- 访问健康检查接口：`GET /api/health` 应返回正常状态。
- 访问 Web 控制台与后台登录页，确认页面可打开、接口可响应。
- 检查服务日志，确认无启动失败、端口占用、数据库权限错误。

#### 节点在线状态（Agent）

- 登录后台节点管理页，确认目标节点变为在线。
- 观察 CPU/内存/磁盘/网络指标是否持续刷新。
- 如新增节点长时间离线，优先检查 token、WS 地址、网络连通性。

### 6) 常见问题排查建议

- **健康检查不可达**：检查 `HTTP_ADDR`、端口放行、反向代理转发规则。
- **Agent 鉴权失败（401/unauthorized）**：确认 `AGENT_TOKEN` 与节点匹配，必要时在后台重置 token。
- **节点频繁掉线**：检查 `SERVER_WS_URL` 是否正确、网络抖动、代理是否支持 WebSocket 升级。
- **数据库报错/锁冲突**：检查 `DB_PATH` 可写权限与磁盘空间，避免多实例同时写同一 SQLite 文件。
- **后台接口提示需先改密**：默认管理员首登需先完成 `POST /api/admin/change-password`，属于预期安全策略。

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


## 发布打包

仓库根目录提供 `build-release.sh`，用于一键生成发布包。

```bash
sh build-release.sh v1.0.0
```

执行后会在 `release/` 下生成两个压缩包：

- `server-status-v1.0.0-linux-amd64.tar.gz`
- `server-status-v1.0.0-windows-amd64.tar.gz`

说明：

- Linux 包包含：`server`、`agent`、`deploy.sh`、`web` 静态文件与配置模板。
- Windows 包包含：`server.exe`、`web` 静态文件与配置模板（当前不包含 Windows agent）。


---

更完整的设计与说明请查看：`doc/项目文档.md`
