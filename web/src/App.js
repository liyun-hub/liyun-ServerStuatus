import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Navigate, NavLink, Outlet, Route, Routes } from "react-router-dom";
import { auth } from "./api/client";
import NodesPage from "./pages/Nodes";
import NodeDetailPage from "./pages/NodeDetail";
import AlertRulesPage from "./pages/AlertRules";
import AlertEventsPage from "./pages/AlertEvents";
import AdminLoginPage from "./pages/AdminLogin";
import AdminNodesPage from "./pages/AdminNodes";
import AdminAlertRulesPage from "./pages/AdminAlertRules";
import AdminChangePasswordPage from "./pages/AdminChangePassword";
const navClassName = ({ isActive }) => `app-nav-link${isActive ? " active" : ""}`;
function resolveAdminHome() {
    if (!auth.isLoggedIn()) {
        return "/admin/login";
    }
    if (auth.mustChangePassword()) {
        return "/admin/change-password";
    }
    return "/admin/nodes";
}
function RequireAdminSession({ children }) {
    if (!auth.isLoggedIn()) {
        return _jsx(Navigate, { to: "/admin/login", replace: true });
    }
    return children;
}
function RequireAdminBusiness({ children }) {
    if (!auth.isLoggedIn()) {
        return _jsx(Navigate, { to: "/admin/login", replace: true });
    }
    if (auth.mustChangePassword()) {
        return _jsx(Navigate, { to: "/admin/change-password", replace: true });
    }
    return children;
}
function UserLayout() {
    return (_jsxs("div", { className: "app-shell", children: [_jsx("h1", { className: "app-title", children: "Server Status" }), _jsxs("nav", { className: "app-nav", children: [_jsx(NavLink, { to: "/", className: navClassName, end: true, children: "\u8282\u70B9" }), _jsx(NavLink, { to: "/alert-rules", className: navClassName, children: "\u544A\u8B66\u76D1\u63A7" }), _jsx(NavLink, { to: "/alert-events", className: navClassName, children: "\u544A\u8B66\u4E8B\u4EF6" }), _jsx(NavLink, { to: "/admin", className: navClassName, children: "\u7BA1\u7406\u7AEF\u5165\u53E3" })] }), _jsx(Outlet, {})] }));
}
function AdminLayout() {
    return (_jsxs("div", { className: "app-shell", children: [_jsx("h1", { className: "app-title", children: "Server Status \u7BA1\u7406\u7AEF" }), _jsxs("nav", { className: "app-nav", children: [_jsx(NavLink, { to: "/admin/nodes", className: navClassName, children: "\u7BA1\u7406\u7AEF-\u8282\u70B9" }), _jsx(NavLink, { to: "/admin/alert-rules", className: navClassName, children: "\u7BA1\u7406\u7AEF-\u544A\u8B66\u89C4\u5219" }), _jsx(NavLink, { to: "/", className: navClassName, end: true, children: "\u8FD4\u56DE\u7528\u6237\u9762\u677F" })] }), _jsx(Outlet, {})] }));
}
export default function App() {
    const isAdminLoggedIn = auth.isLoggedIn();
    const adminMustChangePassword = auth.mustChangePassword();
    return (_jsxs(Routes, { children: [_jsxs(Route, { element: _jsx(UserLayout, {}), children: [_jsx(Route, { path: "/", element: _jsx(NodesPage, {}) }), _jsx(Route, { path: "/nodes/:id", element: _jsx(NodeDetailPage, {}) }), _jsx(Route, { path: "/alert-rules", element: _jsx(AlertRulesPage, {}) }), _jsx(Route, { path: "/alert-events", element: _jsx(AlertEventsPage, {}) })] }), _jsx(Route, { path: "/admin/login", element: isAdminLoggedIn ? _jsx(Navigate, { to: resolveAdminHome(), replace: true }) : _jsx(AdminLoginPage, {}) }), _jsx(Route, { path: "/admin/change-password", element: _jsx(RequireAdminSession, { children: adminMustChangePassword ? _jsx(AdminChangePasswordPage, {}) : _jsx(Navigate, { to: "/admin/nodes", replace: true }) }) }), _jsx(Route, { path: "/admin", element: _jsx(Navigate, { to: resolveAdminHome(), replace: true }) }), _jsxs(Route, { element: _jsx(RequireAdminBusiness, { children: _jsx(AdminLayout, {}) }), children: [_jsx(Route, { path: "/admin/nodes", element: _jsx(AdminNodesPage, {}) }), _jsx(Route, { path: "/admin/alert-rules", element: _jsx(AdminAlertRulesPage, {}) })] }), _jsx(Route, { path: "/admin/*", element: _jsx(Navigate, { to: resolveAdminHome(), replace: true }) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }));
}
