# 新版 Web 目录结构（web）

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

## 关键说明

- 入口链路：`main.tsx -> App.tsx`
- 样式体系：`index.css` 仅引入 Tailwind v4
- 别名配置：`@ -> src`（见 `vite.config.ts` 与 `tsconfig.json`）
- 构建插件：React + Tailwind + `vite-plugin-singlefile`
