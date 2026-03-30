# 新版 Web 开发与运行（web）

> 状态：**当前维护主线**
> 返回入口：[`README.md`](./README.md)

本文只记录当前 Web 的本地开发、构建、运行与容器化现状。

## 1. 环境要求

- Node.js 18+
- npm 9+

## 2. 本地开发

```bash
cd web
npm install
npm run dev
```

默认开发地址：`http://localhost:5173`

常用页面：

- 用户面板：`/`
- 告警页：`/alerts`
- 管理登录：`/admin/login`
- 管理节点：`/admin/nodes`

## 3. 构建与预览

```bash
cd web
npm run build
npm run preview
```

## 4. 环境变量

- `VITE_API_BASE`：后端 API 基础地址（默认 `http://localhost:8080`）

示例：

```bash
VITE_API_BASE=http://localhost:8080 npm run dev
```

## 5. 联调要点

1. 管理登录成功后会保存 `admin_token`。
2. 当后端返回 `PASSWORD_CHANGE_REQUIRED` 时，前端会跳转至 `/admin/change-password`。
3. 公共数据页采用轮询：
   - Home：15s
   - NodeDetail：15s
   - Alerts：30s

更具体的接口与会话行为见 [`API_AUTH.md`](./API_AUTH.md)。

## 6. 容器化现状

- 根目录 `docker-compose.yml` 已配置 `web` 服务，构建上下文为 `./web`。
- 当前主仓库中如未提供 `web/Dockerfile`，则不能直接按现有 compose 构建新版 Web 镜像。
- 需要直接构建新版 Web 容器时，应先补齐 `web/Dockerfile` 或调整 compose 配置。
