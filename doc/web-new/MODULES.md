# 新版 Web 模块划分（web）

## 1. 路由与页面

| 路由 | 页面文件 | 类型 | 说明 |
|---|---|---|---|
| `/` | `src/pages/Home.tsx` | 公共 | 节点总览，15s 轮询 |
| `/nodes/:id` | `src/pages/NodeDetail.tsx` | 公共 | 节点详情与性能历史，15s 轮询 |
| `/alerts` | `src/pages/Alerts.tsx` | 公共 | 告警规则 + 告警事件，30s 轮询 |
| `/admin/login` | `src/pages/admin/Login.tsx` | 管理 | 管理登录（仅密码） |
| `/admin/change-password` | `src/pages/admin/ChangePassword.tsx` | 管理 | 首登/策略触发后的强制改密 |
| `/admin/nodes` | `src/pages/admin/NodeManagement.tsx` | 管理 | 节点增改、token 重置、安装命令 |

## 2. 访问控制

路由守卫定义于 `src/App.tsx`，通过 `ProtectedRoute` 支持三类约束：

- `requireAuth`：需要已登录
- `requireNoAuth`：未登录访问（已登录会重定向）
- `requireChangePassword`：仅允许必须改密状态访问

## 3. 布局与导航

- 布局文件：`src/layouts/Layout.tsx`
- 统一承载顶部导航、语言切换、登录/登出入口与 `<Outlet />`
- 登录后显示“节点管理”菜单

## 4. 状态与国际化

- 认证状态：`src/store/auth.ts`（Zustand + localStorage）
- 国际化初始化：`src/i18n.ts`
- 语言资源：`src/locales/en.json`、`src/locales/zh.json`

## 5. 数据访问层

- 请求客户端：`src/api/client.ts`
- 业务 API 聚合：`src/api/index.ts`
- 401/403 鉴权处理、GET 自动重试由 `client.ts` 统一处理
