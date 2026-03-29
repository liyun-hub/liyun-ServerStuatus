# 新版 Web 开发与运行（web）

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

## 5. 与后端联调要点

1. 管理登录成功后会保存 `admin_token`。
2. 当后端返回 `PASSWORD_CHANGE_REQUIRED` 时，前端会跳转至 `/admin/change-password`。
3. 公共数据页采用轮询：
   - Home：15s
   - NodeDetail：15s
   - Alerts：30s

## 6. 容器化说明（当前仓库状态）

- 根目录 `docker-compose.yml` 已配置 `web` 服务（构建上下文 `./web`）。
- 但当前 `web/` 目录未包含 `Dockerfile`（旧版 `web-old/Dockerfile` 存在）。
- 如需使用当前 compose 直接构建新版 web，请先补齐 `web/Dockerfile` 或调整 compose 配置。
