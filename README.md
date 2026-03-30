# Liyun Server Status

轻量级服务器监控系统，采用 **Server + Agent + Web** 架构，提供节点在线状态、CPU / 内存 / 磁盘 / 网络指标、历史图表、告警规则与事件能力。

## 文档入口

- 项目文档总览：[`doc/项目文档.md`](doc/项目文档.md)
- 当前 Web 文档主入口：[`doc/web-new/README.md`](doc/web-new/README.md)
- 历史 Web 文档归档：[`doc/web-old/README.md`](doc/web-old/README.md)
- 旧链接兼容入口：[`docs/web.md`](docs/web.md)

> 当前开发、联调、发布默认以 `doc/web-new/*` 为准；`doc/web-old/*` 与 `docs/web.md` 仅用于历史参考或兼容跳转。

---

## 核心架构

- `server/`：Go 服务端，提供 HTTP API、Agent WebSocket 与 SQLite 存储
- `agent/`：Go 探针，采集主机指标并通过 WebSocket 上报
- `web/`：当前维护的前端主线
- `web-old/`：历史前端归档

## 仓库结构

```text
server-status/
├─ server/
├─ agent/
├─ web/
├─ web-old/
├─ doc/
├─ docs/
├─ docker-compose.yml
├─ .env.example
├─ build-release.sh
└─ deploy.sh
```

## 快速开始

### 本地开发

1. 启动服务端：

```bash
cd server
go run ./cmd/server
```

2. 启动 Agent（示例）：

```bash
cd agent
NODE_ID=node-1 AGENT_TOKEN=<node-token> SERVER_WS_URL=ws://localhost:8080/ws/agent go run ./cmd/agent
```

3. 启动当前 Web：

```bash
cd web
npm install
npm run dev
```

默认访问地址：

- Web：`http://localhost:5173`
- 管理登录：`http://localhost:5173/admin/login`
- 健康检查：`http://localhost:8080/api/health`

### Docker Compose 部署

1. 复制环境变量模板：

```bash
cp .env.example .env
```

2. 至少确认以下变量：

- `AGENT_TOKEN`
- `NODE_ID`
- `VITE_API_BASE`
- `ADMIN_SESSION_TTL_SEC`
- `INSTALL_AGENT_IMAGE`
- `INSTALL_WS_URL`

3. 启动：

```bash
docker compose up --build -d
```

默认访问地址：

- Web：`http://localhost:3000`
- 管理登录：`http://localhost:3000/admin/login`
- 健康检查：`http://localhost:8080/api/health`

> 当前根目录 `docker-compose.yml` 已配置 `web` 服务从 `./web` 构建；如果当前分支尚未提供 `web/Dockerfile`，需要先补齐该文件或调整 compose 配置后再直接构建新版 Web 镜像。

## 环境变量速览

根目录 `.env.example` 当前包含：

- `AGENT_TOKEN`
- `NODE_ID`
- `VITE_API_BASE`
- `ADMIN_SESSION_TTL_SEC`
- `INSTALL_AGENT_IMAGE`
- `INSTALL_WS_URL`

更细的前端开发、接口接入、历史文档分层说明，请从 [`doc/项目文档.md`](doc/项目文档.md) 继续阅读。

## 发布打包

仓库根目录提供一键打包脚本：

```bash
sh build-release.sh v1.0.0
```

产物会输出到 `release/` 目录。
