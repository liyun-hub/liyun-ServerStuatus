# 新版 Web 文档（web）

> 状态：**当前维护主线**
> 源码目录：`web/`

新版 Web 是当前前端实现与发布基线。本目录负责记录当前页面结构、代码组织、接口接入与开发运行方式。

## 1. 阅读入口

- 返回项目总览：[`../项目文档.md`](../项目文档.md)
- 模块划分：[`./MODULES.md`](./MODULES.md)
- 目录结构：[`./STRUCTURE.md`](./STRUCTURE.md)
- API 与鉴权：[`./API_AUTH.md`](./API_AUTH.md)
- 开发与运行：[`./DEVELOPMENT.md`](./DEVELOPMENT.md)

## 2. 定位

当前 Web 负责：

- 节点总览与节点详情展示
- 告警规则与告警事件展示
- 管理员登录、强制改密、节点管理
- 中英双语切换（i18next）

需要快速定位文档时，可按以下原则阅读：

- 想看页面、路由、职责划分：进入 `MODULES.md`
- 想看 `web/` 目录与关键文件位置：进入 `STRUCTURE.md`
- 想看前端接入 API、会话与拦截逻辑：进入 `API_AUTH.md`
- 想看本地开发、构建与容器化现状：进入 `DEVELOPMENT.md`

## 3. 技术栈

- React 19 + TypeScript 5.9
- Vite 7
- Tailwind CSS v4（`@tailwindcss/vite`）
- React Router DOM v7
- Zustand（认证状态）
- axios（请求拦截与重试）
- i18next + react-i18next
- Recharts
- vite-plugin-singlefile

## 4. 与历史文档的关系

- `doc/web-new/*` 是当前维护主线。
- `doc/web-old/*` 仅用于历史回溯、差异对照与旧问题排查。
- `docs/web.md` 仅保留为旧链接兼容入口，不再作为当前文档基线。
