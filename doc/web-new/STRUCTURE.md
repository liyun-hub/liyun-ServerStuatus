# 新版 Web 目录结构（web）

> 状态：**当前维护主线**
> 返回入口：[`README.md`](./README.md)

本文用于快速定位 `web/` 目录下的关键文件与代码组织方式。

## 1. 目录结构

```text
web/
├─ index.html
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
└─ src/
   ├─ main.tsx
   ├─ App.tsx
   ├─ index.css
   ├─ i18n.ts
   ├─ api/
   │  ├─ client.ts
   │  └─ index.ts
   ├─ layouts/
   │  └─ Layout.tsx
   ├─ pages/
   │  ├─ Home.tsx
   │  ├─ NodeDetail.tsx
   │  ├─ Alerts.tsx
   │  └─ admin/
   │     ├─ Login.tsx
   │     ├─ ChangePassword.tsx
   │     └─ NodeManagement.tsx
   ├─ store/
   │  └─ auth.ts
   ├─ locales/
   │  ├─ en.json
   │  └─ zh.json
   └─ utils/
      └─ cn.ts
```

## 2. 关键说明

- 入口链路：`main.tsx -> App.tsx`
- 样式体系：`index.css` 引入 Tailwind CSS v4
- 别名配置：`@ -> src`（见 `vite.config.ts` 与 `tsconfig.json`）
- 构建插件：React + Tailwind + `vite-plugin-singlefile`

## 3. 如何配合其他文档阅读

- 页面职责、路由与轮询周期：见 [`MODULES.md`](./MODULES.md)
- API、鉴权、拦截器与重试规则：见 [`API_AUTH.md`](./API_AUTH.md)
- 本地开发、构建与容器化现状：见 [`DEVELOPMENT.md`](./DEVELOPMENT.md)
