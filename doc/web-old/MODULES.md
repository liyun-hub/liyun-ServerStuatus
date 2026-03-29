# 旧版 Web 模块划分（web-old）

## 1. 路由与页面

| 路由 | 页面文件 | 类型 | 说明 |
|---|---|---|---|
| `/` | `src/pages/Nodes.tsx` | 用户 | 节点列表（5s 轮询） |
| `/nodes/:id` | `src/pages/NodeDetail.tsx` | 用户 | 节点详情 |
| `/alert-rules` | `src/pages/AlertRules.tsx` | 用户 | 规则只读展示（5s 轮询） |
| `/alert-events` | `src/pages/AlertEvents.tsx` | 用户 | 告警事件列表（5s 轮询） |
| `/admin/login` | `src/pages/AdminLogin.tsx` | 管理 | 管理登录（用户名+密码） |
| `/admin/change-password` | `src/pages/AdminChangePassword.tsx` | 管理 | 强制改密 |
| `/admin/nodes` | `src/pages/AdminNodes.tsx` | 管理 | 节点管理 |
| `/admin/alert-rules` | `src/pages/AdminAlertRules.tsx` | 管理 | 告警规则配置（旧版特有） |

## 2. 路由守卫

守卫逻辑集中在 `src/App.tsx`：

- `RequireAdminSession`
- `RequireAdminBusiness`
- `resolveAdminHome`

通过 `auth.isLoggedIn()` 与 `auth.mustChangePassword()` 控制跳转。

## 3. 布局

- 用户布局：`UserLayout`
- 管理布局：`AdminLayout`

二者在导航项和入口上完全分离。

## 4. API 与状态

- API 客户端：`src/api/client.ts`
- 认证状态由 `auth` 对象 + localStorage 维护
- 无 Zustand / axios 统一拦截机制
