# 旧版 Web 文档（web-old）

> 状态：**历史归档，仅供参考**
> 源码目录：`web-old/`

旧版 Web 为历史实现归档，仅用于回溯旧路由、旧交互、旧技术方案与迁移差异，不作为当前开发、联调或发布基线。

## 1. 阅读入口

- 返回项目总览：[`../项目文档.md`](../项目文档.md)
- 当前 Web 主入口：[`../web-new/README.md`](../web-new/README.md)
- 模块划分：[`./MODULES.md`](./MODULES.md)
- 目录结构：[`./STRUCTURE.md`](./STRUCTURE.md)
- API 与鉴权：[`./API_AUTH.md`](./API_AUTH.md)
- 开发与运行：[`./DEVELOPMENT.md`](./DEVELOPMENT.md)

## 2. 适用场景

仅在以下场景进入本目录：

- 回溯旧页面与旧交互行为
- 对照新版改造差异
- 排查历史实现相关问题

如果目标是当前功能开发、接口联调或发布，请直接返回 [`../web-new/README.md`](../web-new/README.md)。

## 3. 技术特征（旧版）

- React + TypeScript + Vite
- 传统全局样式（`src/styles/theme.css`）
- `fetch` 风格 API 客户端（非 axios 拦截器）
- 用户区与管理区路由分离

## 4. 与当前主线的关键差异

- 旧版存在独立“管理端告警规则页”：`/admin/alert-rules`
- 旧版登录为“用户名 + 密码”；当前主线登录页仅提交密码
- 旧版多页面轮询周期多为 5s；当前主线按页面区分为 15s / 30s
