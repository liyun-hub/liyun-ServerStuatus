# 旧版 Web 文档（web-old）

> 状态：**历史版本归档**
> 源码目录：`web-old/`

## 1. 定位

旧版 Web 为历史实现，保留用于：

- 回溯旧路由与旧交互行为
- 对照新版改造差异
- 排查历史问题

不作为当前开发主线，不与新版文档混用。

## 2. 技术特征（旧版）

- React + TypeScript + Vite
- 传统全局样式（`src/styles/theme.css`）
- `fetch` 风格 API 客户端（非 axios 拦截器）
- 用户区与管理区路由分离

## 3. 文档清单

- [模块划分](./MODULES.md)
- [目录结构](./STRUCTURE.md)
- [API 与鉴权](./API_AUTH.md)
- [开发与运行](./DEVELOPMENT.md)

## 4. 与新版核心差异

- 旧版存在独立“管理端告警规则页”：`/admin/alert-rules`。
- 旧版登录为“用户名 + 密码”；新版登录页面仅提交密码。
- 旧版多页面轮询周期多为 5s；新版按页面区分为 15s / 30s。
