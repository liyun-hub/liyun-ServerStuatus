# Liyun Server Status

轻量级服务器监控系统，采用 **Server + Agent + Web** 架构，提供节点在线状态、CPU/内存/磁盘/网络指标、历史图表、告警规则与事件能力。

## 快速导航

- [功能概览](#功能概览)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
  - [本地开发](#本地开发)
  - [Docker Compose 部署](#docker-compose-部署)
- [后台管理与认证](#后台管理与认证)
- [API 分组总览](#api-分组总览)
- [节点接入（在线安装 / 手动部署）](#节点接入在线安装--手动部署)
- [环境变量](#环境变量)
- [发布打包](#发布打包)
- [常见问题排查](#常见问题排查)
- [文档索引](#文档索引)
  - [项目总入口](#项目总入口)
  - [新版 Web 文档（当前主线）](#新版-web-文档当前主线)
  - [旧版 Web 文档（历史归档）](#旧版-web-文档历史归档)
  - [历史文档兼容入口](#历史文档兼容入口)

---

## 功能概览

- 实时节点在线状态（心跳机制）
- CPU / 内存 / 磁盘 / 网络流量采集
- 指标持久化存储（SQLite）
- Agent → Server WebSocket Bearer 鉴权（每节点独立 token）
- 后台管理（账号密码登录 + 会话鉴权 + 首登强制改密）
- 节点管理：新增节点、重命名、重置 token
- 在线一键安装命令生成
- Web 控制台可视化监控
- Docker Compose 一键部署

---

## 项目结构

```text
server-status/
├─ server/                 # Go 服务端（HTTP API + Agent WebSocket + SQLite）
├─ agent/                  # Go 探针（采集并上报系统指标）
├─ web/                    # 新版前端（当前维护主线）
├─ web-old/                # 旧版前端（历史归档）
├─ doc/                    # 项目与 Web 分层文档（web-new / web-old）
├─ docs/                   # 历史单体文档（兼容保留）
├─ docker-compose.yml      # 一键部署编排
├─ .env.example            # 环境变量模板
├─ build-release.sh        # 一键打包脚本
└─ deploy.sh               # Linux 发布包部署脚本
```

---

## 快速开始

> 首次运行建议先在各子项目安装依赖：`go mod tidy` / `npm install`

## 本地开发

### 1) 启动 Server

```bash
cd server
go run ./cmd/server
```

### 2) 启动 Agent（示例）

> `AGENT_TOKEN` 必须使用后台为该节点生成的专属 token。

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

---

## Docker Compose 部署

### 1) 准备配置

```bash
cp .env.example .env
```

Windows 下可手动复制 `.env.example` 为 `.env`。

### 2) 修改关键变量

至少确认以下变量：

- `AGENT_TOKEN`：必填，节点专属 token
- `NODE_ID`：节点标识
- `VITE_API_BASE`：前端 API 地址（生产环境不要保留 `http://localhost:8080`）

### 3) 启动

```bash
docker compose up --build -d
```

### 4) 访问

- Web：`http://localhost:3000`
- 后台登录页：`http://localhost:3000/admin/login`
- Server 健康检查：`http://localhost:8080/api/health`

---

## 后台管理与认证

### 默认后台账号

- 用户名：`admin`
- 初始密码：`admin`

> 首次初始化数据库会写入默认管理员，且默认启用“首登强制改密”。生产环境务必第一时间修改密码。

### 首登强制改密机制

1. `POST /api/admin/login` 登录成功后，若返回 `mustChangePassword=true`，必须先改密。
2. 在完成 `POST /api/admin/change-password` 前，后台业务接口会被拦截。
3. 拦截响应为：`403` + `code=PASSWORD_CHANGE_REQUIRED`。
4. 改密成功后返回新会话 token，继续访问后台业务接口。

### Admin 鉴权方式

后台受保护接口统一使用：

```http
Authorization: Bearer <admin-session-token>
```

---

## API 分组总览

### 健康检查

- `GET /api/health`

### 后台认证

- `POST /api/admin/login`（请求体包含 `username` + `password`）
- `POST /api/admin/logout`
- `POST /api/admin/change-password`

### 后台节点管理（需登录且完成改密）

- `GET /api/admin/nodes`
- `POST /api/admin/nodes`（返回节点 token，仅一次）
- `PUT /api/admin/nodes/{id}/display-name`
- `POST /api/admin/nodes/{id}/token/reset`（返回新 token，仅一次）
- `POST /api/admin/nodes/{id}/install-command`（返回安装命令）

### 公共监控查询

- `GET /api/nodes`
- `GET /api/nodes/{id}`
- `GET /api/nodes/{id}/history?from=&to=&limit=`

### 告警接口

- `GET /api/alert-rules`
- `POST /api/alert-rules`（需后台业务权限）
- `PUT /api/alert-rules/{id}`（需后台业务权限）
- `GET /api/alert-events?limit=`

> 前端完整接入规范见：[`docs/web.md`](docs/web.md)

---

## 节点接入（在线安装 / 手动部署）

## 在线安装命令（后台生成）

后台可为节点生成可直接执行的安装命令（示例）：

```bash
docker run -d --name 'server-status-agent' --restart unless-stopped --network host -e NODE_ID='node-1' -e AGENT_TOKEN='<token>' -e SERVER_WS_URL='ws://your-server:8080/ws/agent' 'ghcr.io/liyun/server-status-agent:latest'
```

说明：

- 实际请以后台返回命令为准（包含该节点最新 token）
- 每个节点必须使用独立 token
- 生成安装命令/重置 token 后，旧 token 应视为失效并及时更新 Agent 配置

## 手动部署关键点

### Server 侧

- 确认可执行文件与静态资源就绪
- `DB_PATH` 所在目录需可写
- 放通监听端口（默认 `8080`）
- 如使用反向代理，需正确转发 API 和 WebSocket

### Agent 侧

- 必填：`SERVER_WS_URL`、`AGENT_TOKEN`
- 建议明确设置：`NODE_ID`
- 建议配置自动重启策略，避免网络抖动后长期离线

---

## 环境变量

## Server

| 变量 | 默认值 | 必填 | 说明 |
|---|---|---|---|
| `HTTP_ADDR` | `:8080` | 否 | HTTP 监听地址 |
| `DB_PATH` | `./data/server-status.db` | 否 | SQLite 数据库路径 |
| `HEARTBEAT_TIMEOUT_SEC` | `30` | 否 | 节点离线判定超时（秒） |
| `ADMIN_SESSION_TTL_SEC` | `86400` | 否 | 后台会话有效期（秒） |
| `INSTALL_AGENT_IMAGE` | `ghcr.io/liyun/server-status-agent:latest` | 否 | 安装命令使用的 Agent 镜像 |
| `INSTALL_WS_URL` | 空（自动推导） | 否 | 安装命令固定 WS 地址 |

## Agent

| 变量 | 默认值 | 必填 | 说明 |
|---|---|---|---|
| `SERVER_WS_URL` | `ws://localhost:8080/ws/agent` | 否 | Server WebSocket 地址 |
| `NODE_ID` | 主机名 | 否 | 节点唯一标识 |
| `HEARTBEAT_INTERVAL_SEC` | `5` | 否 | 心跳间隔（秒） |
| `COLLECT_INTERVAL_SEC` | `5` | 否 | 指标采集间隔（秒） |
| `RECONNECT_WAIT_SEC` | `3` | 否 | 断线重连等待（秒） |
| `AGENT_TOKEN` | - | **是** | 节点专属 token |

## Web

| 变量 | 默认值 | 必填 | 说明 |
|---|---|---|---|
| `VITE_API_BASE` | `http://localhost:8080` | 否 | 前端 API 基地址 |

---

## 鉴权机制（Agent ↔ Server）

- 入口：`GET /ws/agent`
- 方式：

```http
Authorization: Bearer <node-token>
```

服务端会对 token 做 sha256 后与节点 metadata 绑定反查；鉴权失败返回 `401 unauthorized`。

---

## 发布打包

仓库根目录提供一键打包脚本：

```bash
sh build-release.sh v1.0.0
```

执行后会在 `release/` 下生成：

- `server-status-v1.0.0-linux-amd64.tar.gz`
- `server-status-v1.0.0-windows-amd64.tar.gz`

产物说明：

- Linux 包：`bin/server`、`bin/agent`、`deploy.sh`、`web` 静态资源、`conf` 模板
- Windows 包：`bin/server.exe`、`web` 静态资源、`conf` 模板（当前不包含 Windows agent）

---

## 常见问题排查

- **健康检查不可达**：检查 `HTTP_ADDR`、端口放行、防火墙/安全组、反向代理转发规则。
- **Agent 鉴权失败（401/unauthorized）**：确认 `AGENT_TOKEN` 与节点匹配，必要时在后台重置 token。
- **节点频繁掉线**：检查 `SERVER_WS_URL`、网络稳定性、代理是否支持 WebSocket 升级。
- **数据库锁冲突**：检查 `DB_PATH` 可写权限与磁盘空间，避免多个实例同时写同一 SQLite 文件。
- **后台接口提示需先改密**：默认管理员首登需先完成 `POST /api/admin/change-password`，属于预期安全策略。

---

## 文档索引

### 项目总入口

- 文档总览：[`doc/项目文档.md`](doc/项目文档.md)

### 新版 Web 文档（当前主线）

- 入口：[`doc/web-new/README.md`](doc/web-new/README.md)
- 模块划分：[`doc/web-new/MODULES.md`](doc/web-new/MODULES.md)
- 目录结构：[`doc/web-new/STRUCTURE.md`](doc/web-new/STRUCTURE.md)
- API 与鉴权：[`doc/web-new/API_AUTH.md`](doc/web-new/API_AUTH.md)
- 开发与运行：[`doc/web-new/DEVELOPMENT.md`](doc/web-new/DEVELOPMENT.md)

### 旧版 Web 文档（历史归档）

- 入口：[`doc/web-old/README.md`](doc/web-old/README.md)
- 模块划分：[`doc/web-old/MODULES.md`](doc/web-old/MODULES.md)
- 目录结构：[`doc/web-old/STRUCTURE.md`](doc/web-old/STRUCTURE.md)
- API 与鉴权：[`doc/web-old/API_AUTH.md`](doc/web-old/API_AUTH.md)
- 开发与运行：[`doc/web-old/DEVELOPMENT.md`](doc/web-old/DEVELOPMENT.md)

### 历史文档兼容入口

- 旧版单体接入文档：[`docs/web.md`](docs/web.md)
