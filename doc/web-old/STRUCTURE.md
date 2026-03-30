# 旧版 Web 目录结构（web-old）

> 状态：**历史归档，仅供参考**
> 返回入口：[`README.md`](./README.md)

本文仅用于定位旧版 `web-old/` 目录结构与关键文件。

## 1. 目录结构

```text
web-old/
├─ .env.example
├─ Dockerfile
├─ index.html
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
└─ src/
   ├─ main.tsx
   ├─ App.tsx
   ├─ api/
   │  └─ client.ts
   ├─ components/
   │  └─ charts/
   │     └─ MetricLineChart.tsx
   ├─ pages/
   │  ├─ Nodes.tsx
   │  ├─ NodeDetail.tsx
   │  ├─ AlertRules.tsx
   │  ├─ AlertEvents.tsx
   │  ├─ AdminLogin.tsx
   │  ├─ AdminChangePassword.tsx
   │  ├─ AdminNodes.tsx
   │  └─ AdminAlertRules.tsx
   ├─ styles/
   │  └─ theme.css
   └─ types/
      └─ index.ts
```

## 2. 关键说明

- `main.tsx` 中注入 `BrowserRouter`，`App.tsx` 仅负责路由定义
- 样式由 `theme.css` 提供，非 Tailwind 体系
- 旧版目录保留 `Dockerfile` 与 `.env.example`，可独立构建

当前主线的目录结构请改看 [`../web-new/STRUCTURE.md`](../web-new/STRUCTURE.md)。
