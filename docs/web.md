# 服务端 API 完整接入指南（前端）

> 基于项目 `README.md` 与后端路由实现整理，可直接用于前端独立接入。

## 1. 接入范围

前端需要完成以下能力：

- 公共监控数据展示：节点列表、节点详情、历史指标、告警规则与事件
- 后台管理能力：登录/登出、首登强制改密、节点管理
- 会话管理、错误处理与重试策略
- 本地联调到生产上线流程
- 常见问题排查（401、健康检查不可达、节点掉线、数据库锁冲突）

---

## 2. 接口分组与用途说明

### 2.1 健康检查（公开）

- `GET /api/health`
- 用途：服务健康探测、部署后连通性验证
- 响应示例：

```json
{
  "ok": true,
  "ts": 1719999999
}
```

### 2.2 管理后台认证（Admin 会话）

- `POST /api/admin/login`：后台登录，返回会话 token（含 `mustChangePassword`）
- `POST /api/admin/logout`：后台登出
- `POST /api/admin/change-password`：修改当前后台账号密码

### 2.3 管理后台节点管理（需登录且已完成改密）

- `GET /api/admin/nodes`：节点管理列表
- `POST /api/admin/nodes`：新增节点，返回该节点 token（仅返回一次）
- `PUT /api/admin/nodes/{id}/display-name`：更新节点显示名
- `POST /api/admin/nodes/{id}/token/reset`：重置节点 token（仅返回一次）
- `POST /api/admin/nodes/{id}/install-command`：生成在线安装命令（返回 command + 新 token）

### 2.4 公共监控查询（当前为公开读接口）

- `GET /api/nodes`：节点摘要列表
- `GET /api/nodes/{id}`：单节点详情
- `GET /api/nodes/{id}/history?from=&to=&limit=`：历史指标

### 2.5 告警接口

- `GET /api/alert-rules`：规则列表
- `POST /api/alert-rules`：创建规则（需后台业务权限）
- `PUT /api/alert-rules/{id}`：更新规则（需后台业务权限）
- `GET /api/alert-events?limit=`：事件列表

---

## 3. 认证与会话机制（含首次改密）

### 3.1 Admin 认证方式

后台受保护接口统一使用：

```http
Authorization: Bearer <admin-session-token>
```

登录成功返回：

```json
{
  "token": "...",
  "expiresAt": 1719999999,
  "mustChangePassword": true
}
```

字段说明：

- `token`：会话令牌
- `expiresAt`：Unix 秒级过期时间
- `mustChangePassword`：是否必须先改密

### 3.2 首登强制改密流程（必须实现）

后端约束：当账号需改密时，后台业务接口会返回：

- HTTP `403`
- 响应：

```json
{
  "error": "password change required",
  "code": "PASSWORD_CHANGE_REQUIRED"
}
```

前端流程建议：

1. 登录后若 `mustChangePassword=true`，立即跳转 `/admin/change-password`
2. 改密前仅允许访问“改密页/登出接口”
3. 若后台业务请求返回 `PASSWORD_CHANGE_REQUIRED`，统一重定向改密页
4. 改密成功后用新 token 覆盖旧 token，再进入后台页面

### 3.3 改密接口规则

`POST /api/admin/change-password`

请求：

```json
{
  "currentPassword": "old",
  "newPassword": "new"
}
```

后端密码规则：

- 长度 8~72
- 不能是 `admin`
- 至少满足 4 类字符中的 3 类：大写、小写、数字、特殊字符
- 新旧密码不能相同

成功后会返回新的会话 token：

```json
{
  "token": "...",
  "expiresAt": 1719999999,
  "mustChangePassword": false
}
```

---

## 4. 请求/响应字段规范

### 4.1 通用规范

- `Content-Type: application/json`
- 时间字段：Unix 时间戳（秒）
- 错误结构：

```json
{
  "error": "错误描述"
}
```

- 特定业务错误会带 `code`（如 `PASSWORD_CHANGE_REQUIRED`）

### 4.2 关键数据结构

#### 节点摘要（NodeSummary）

```json
{
  "id": "node-1",
  "hostname": "host-a",
  "os": "linux",
  "platform": "ubuntu",
  "platformVersion": "22.04",
  "kernel": "5.15",
  "arch": "amd64",
  "cpuModel": "Intel",
  "cpuCores": 4,
  "totalMemory": 8192,
  "totalDisk": 102400,
  "ip": "10.0.0.1",
  "createdAt": 1719990000,
  "updatedAt": 1719999000,
  "lastSeenAt": 1719999990,
  "displayName": "生产节点-1",
  "online": true,
  "latest": {
    "nodeId": "node-1",
    "cpuUsage": 12.3,
    "memoryUsed": 2048,
    "memoryTotal": 8192,
    "memoryUsage": 25,
    "diskUsed": 20480,
    "diskTotal": 102400,
    "diskUsage": 20,
    "netRxRate": 1.2,
    "netTxRate": 0.8,
    "netRxTotal": 123456,
    "netTxTotal": 234567,
    "timestamp": 1719999999
  }
}
```

#### 历史指标查询

- 接口：`GET /api/nodes/{id}/history`
- 参数：
  - `from`：起始时间（秒）
  - `to`：结束时间（秒）
  - `limit`：条数（后端会做保护，异常值会回退默认）

---

## 5. 错误处理与重试策略

### 5.1 错误码处理建议

- `400`：参数或表单错误，直接展示后端 `error`
- `401`：会话失效/未登录，清理 token 并跳转登录页
- `403` + `PASSWORD_CHANGE_REQUIRED`：跳转改密页
- `404`：资源不存在（如节点已删除），提示后刷新列表
- `500`：服务端异常，展示“稍后重试”

### 5.2 重试策略建议

- **GET 查询类接口**：允许自动重试（指数退避 1s/2s/4s，最多 3 次）
- **POST/PUT 写操作**：默认不自动重试（防止重复创建/重复重置 token）
- **健康检查**：可按 10~30 秒周期轮询

---

## 6. WebSocket 接入与断线重连（前端协同要点）

> 该系统的 WS 链路是 **Agent → Server**，前端通常不直接连 `/ws/agent`。

### 6.1 Agent WS 鉴权

- 入口：`GET /ws/agent`
- 鉴权头：

```http
Authorization: Bearer <node-token>
```

- 失败返回：`401` + `{"error":"unauthorized"}`

### 6.2 前端联调关注点

虽然前端不直接建立此 WS，但页面在线状态依赖该链路稳定性：

- `SERVER_WS_URL` 必须可达且路径正确（`/ws/agent`）
- 反向代理必须支持 WebSocket Upgrade
- Agent 应配置断线重连：`RECONNECT_WAIT_SEC`（默认 3 秒）
- 页面在线状态以服务端 `online` 字段为准，不在前端自行推导

---

## 7. 环境变量对接项及影响

### 7.1 前端侧

- `VITE_API_BASE`（默认 `http://localhost:8080`）
  - 影响所有 API 请求目标
  - 生产必须替换为真实 API 地址（建议 HTTPS）

### 7.2 与前端体验强相关的服务端变量

- `ADMIN_SESSION_TTL_SEC`：会话有效期，影响多久触发 401
- `HEARTBEAT_TIMEOUT_SEC`：离线判定阈值，影响 `online` 展示
- `INSTALL_WS_URL`：影响后台“安装命令”中 WS 地址生成
- `HTTP_ADDR`：影响健康检查与 API 对外监听

### 7.3 Agent 关键变量（联调必查）

- `SERVER_WS_URL`
- `AGENT_TOKEN`（必填，且节点独立）
- `NODE_ID`
- `HEARTBEAT_INTERVAL_SEC`
- `COLLECT_INTERVAL_SEC`
- `RECONNECT_WAIT_SEC`

---

## 8. 本地联调到生产上线完整步骤

### 8.1 本地联调

1. 启动 Server（默认 `:8080`）
2. 启动 Web（`npm run dev`，默认 `:5173`）
3. 设置前端 `VITE_API_BASE=http://localhost:8080`
4. 访问：
   - Web：`http://localhost:5173`
   - 登录：`http://localhost:5173/admin/login`
   - 健康检查：`http://localhost:8080/api/health`
5. 登录管理员，验证首登改密流程
6. 新增节点并启动 Agent，确认在线状态与指标刷新

### 8.2 生产上线

1. 配置并启动 Server（含 `DB_PATH` 可写目录）
2. 配置反向代理/API 域名（确保 WS 升级可用）
3. 前端构建注入生产 `VITE_API_BASE`
4. 回归验证：
   - 登录/改密/登出
   - 节点新增/改名/重置 token/安装命令
   - 节点列表、详情、历史、告警页面
5. 上线后通过 `/api/health` 与节点在线状态持续观测

---

## 9. 常见问题排查

### 9.1 401 unauthorized

- 是否正确携带 `Authorization: Bearer <token>`
- token 是否过期（`expiresAt`）
- 是否改密后仍使用旧 token
- 是否请求到了错误环境（测试 token 打到生产 API）

### 9.2 健康检查不可达

- `HTTP_ADDR` 监听是否正确
- 端口是否放行（防火墙/安全组）
- 代理是否正确转发 `/api/health`

### 9.3 节点掉线/频繁离线

- `SERVER_WS_URL` 是否正确
- `AGENT_TOKEN` 是否与节点匹配（必要时重置）
- 代理是否支持 WS Upgrade
- 网络抖动与 `RECONNECT_WAIT_SEC` 是否合理
- `HEARTBEAT_TIMEOUT_SEC` 是否过短导致误判

### 9.4 数据库锁冲突（SQLite）

- 是否多实例同时写入同一个 `DB_PATH`
- `DB_PATH` 目录是否可写、磁盘空间是否充足
- 避免共享同一 SQLite 文件给多个写进程

---

## 10. 推荐前端落地实现（简要）

- 统一 `apiClient`（axios/fetch 封装）：
  - 自动注入 Bearer token
  - 统一处理 401 / `PASSWORD_CHANGE_REQUIRED`
- 路由守卫分层：
  - 未登录 → `/admin/login`
  - 已登录但需改密 → `/admin/change-password`
- 仅对查询接口做自动重试；写操作默认手动重试
- 将后端 `error` 原样展示，减少排障成本

