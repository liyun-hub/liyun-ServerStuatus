# 旧版 Web 目录结构（web-old）

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

## 关键说明

- `main.tsx` 中注入 `BrowserRouter`，`App.tsx` 仅负责路由定义。
- 样式由 `theme.css` 提供，非 Tailwind 体系。
- 旧版保留完整 Dockerfile 与 `.env.example`，可独立构建。
