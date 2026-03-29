# 旧版 Web 开发与运行（web-old）

## 1. 环境要求

- Node.js 18+
- npm 9+

## 2. 本地开发

```bash
cd web-old
npm install
npm run dev
```

默认开发地址：`http://localhost:5173`

常用页面：

- 用户节点：`/`
- 用户告警规则：`/alert-rules`
- 用户告警事件：`/alert-events`
- 管理登录：`/admin/login`
- 管理节点：`/admin/nodes`
- 管理告警规则：`/admin/alert-rules`

## 3. 构建与预览

```bash
cd web-old
npm run build
npm run preview
```

## 4. 环境变量

- `.env.example` 提供示例
- `VITE_API_BASE=http://localhost:8080`

## 5. 容器化

旧版目录包含 `Dockerfile`，可单独构建镜像。

示例：

```bash
cd web-old
docker build -t server-status-web-old .
```

## 6. 使用边界

- 旧版文档仅用于历史回溯和差异对照。
- 当前项目的日常开发、联调、发布应以 `web/` 与 `doc/web-new/*` 为准。
