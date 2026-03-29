# 新版 Web 文档（web）

> 状态：**当前维护主线**
> 源码目录：`web/`

## 1. 定位

新版 Web 是当前前端主实现，负责：

- 节点总览与节点详情展示
- 告警规则与告警事件展示
- 管理员登录 / 强制改密 / 节点管理
- 中英双语切换（i18next）

## 2. 技术栈

- React 19 + TypeScript 5.9
- Vite 7
- Tailwind CSS v4（`@tailwindcss/vite`）
- React Router DOM v7
- Zustand（认证状态）
- axios（请求拦截与重试）
- i18next + react-i18next
- Recharts
- vite-plugin-singlefile

## 3. 文档清单

- [模块划分](./MODULES.md)
- [目录结构](./STRUCTURE.md)
- [API 与鉴权](./API_AUTH.md)
- [开发与运行](./DEVELOPMENT.md)

## 4. 与旧版关系

- 旧版代码与文档已隔离到 `web-old/` 与 `doc/web-old/`。
- 新版不再包含“管理端告警规则编辑页”（旧版有该能力）。
- 日常开发、联调、发布均应以 `web/` 与 `doc/web-new/*` 为准。
