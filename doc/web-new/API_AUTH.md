# 新版 Web API 与鉴权（web）

## 1. API 基础配置

- 文件：`src/api/client.ts`
- 基础地址：`VITE_API_BASE`（默认 `http://localhost:8080`）
- 超时：10s

## 2. 认证状态

- 文件：`src/store/auth.ts`
- localStorage 键：
  - `admin_token`
  - `must_change_password`

登录后通过 `setAuth(token, mustChangePassword)` 持久化；登出时清理。

## 3. 拦截器行为

### 3.1 请求拦截

- 若存在 `admin_token`，自动附加：

```http
Authorization: Bearer <token>
```

### 3.2 响应拦截

- `401`：清理登录态并跳转 `/admin/login`
- `403` 且 `code=PASSWORD_CHANGE_REQUIRED`：跳转 `/admin/change-password`

### 3.3 GET 重试

- 仅对 GET 请求生效
- 最多重试 3 次
- 重试间隔：1s / 2s / 4s

## 4. API 分组（`src/api/index.ts`）

### 4.1 公共接口

- `GET /api/health`
- `GET /api/nodes`
- `GET /api/nodes/:id`
- `GET /api/nodes/:id/history`
- `GET /api/alert-rules`
- `GET /api/alert-events`

### 4.2 管理接口

- `POST /api/admin/login`
- `POST /api/admin/logout`
- `POST /api/admin/change-password`
- `GET /api/admin/nodes`
- `POST /api/admin/nodes`
- `PUT /api/admin/nodes/:id/display-name`
- `POST /api/admin/nodes/:id/token/reset`
- `POST /api/admin/nodes/:id/install-command`
- `POST /api/alert-rules`
- `PUT /api/alert-rules/:id`

## 5. 新版与旧版差异（鉴权层）

- 新版：axios + 统一拦截器 + 自动重试
- 旧版：fetch 封装（`web-old/src/api/client.ts`）
