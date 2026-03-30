# 旧版 Web API 与鉴权（web-old）

> 状态：**历史归档，仅供参考**
> 返回入口：[`README.md`](./README.md)

本文仅用于回溯旧版 Web 的 API 组织与鉴权方式，不作为当前接入基线。

## 1. API 基础配置

- 文件：`src/api/client.ts`
- 基础地址：`VITE_API_BASE`（默认 `http://localhost:8080`）
- 请求方式：`fetch` 封装（`request` / `adminRequest`）

## 2. 认证信息存储

- token 键：`admin_token`
- 强制改密键：`admin_must_change_password`

由 `auth` 对象统一读写：

- `auth.getToken()` / `auth.setToken()` / `auth.clearToken()`
- `auth.mustChangePassword()` / `auth.setMustChangePassword()`

## 3. 鉴权处理

- `adminRequest` 会自动带上 Bearer Token
- 若错误信息包含 `unauthorized` 或 `401`，会清理本地登录态
- 遇到 `PASSWORD_CHANGE_REQUIRED` 时，页面侧跳转到改密流程

## 4. 接口分组（旧版）

### 4.1 公共接口

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
- `GET /api/alert-rules`（管理视角读取）
- `POST /api/alert-rules`
- `PUT /api/alert-rules/:id`

当前主线的前端接入规则请改看 [`../web-new/API_AUTH.md`](../web-new/API_AUTH.md)。
