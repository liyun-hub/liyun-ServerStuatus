import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import { auth } from "./api/client";
import NodesPage from "./pages/Nodes";
import NodeDetailPage from "./pages/NodeDetail";
import AlertRulesPage from "./pages/AlertRules";
import AlertEventsPage from "./pages/AlertEvents";
import AdminLoginPage from "./pages/AdminLogin";
import AdminNodesPage from "./pages/AdminNodes";
import AdminAlertRulesPage from "./pages/AdminAlertRules";
const navClassName = ({ isActive }) => `app-nav-link${isActive ? " active" : ""}`;
function RequireAdmin({ children }) {
    if (!auth.isLoggedIn()) {
        return _jsx(Navigate, { to: "/admin/login", replace: true });
    }
    return children;
}
export default function App() {
    const isAdminLoggedIn = auth.isLoggedIn();
    return (_jsxs("div", { className: "app-shell", children: [_jsx("h1", { className: "app-title", children: "Server Status" }), _jsxs("nav", { className: "app-nav", children: [_jsx(NavLink, { to: "/", className: navClassName, end: true, children: "\u8282\u70B9" }), _jsx(NavLink, { to: "/alert-rules", className: navClassName, children: "\u544A\u8B66\u76D1\u63A7" }), _jsx(NavLink, { to: "/alert-events", className: navClassName, children: "\u544A\u8B66\u4E8B\u4EF6" }), isAdminLoggedIn ? (_jsxs(_Fragment, { children: [_jsx(NavLink, { to: "/admin/nodes", className: navClassName, children: "\u7BA1\u7406\u7AEF-\u8282\u70B9" }), _jsx(NavLink, { to: "/admin/alert-rules", className: navClassName, children: "\u7BA1\u7406\u7AEF-\u544A\u8B66\u89C4\u5219" })] })) : (_jsx(NavLink, { to: "/admin/login", className: navClassName, children: "\u7BA1\u7406\u7AEF\u767B\u5F55" }))] }), _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(NodesPage, {}) }), _jsx(Route, { path: "/nodes/:id", element: _jsx(NodeDetailPage, {}) }), _jsx(Route, { path: "/alert-rules", element: _jsx(AlertRulesPage, {}) }), _jsx(Route, { path: "/alert-events", element: _jsx(AlertEventsPage, {}) }), _jsx(Route, { path: "/admin/login", element: isAdminLoggedIn ? _jsx(Navigate, { to: "/admin/nodes", replace: true }) : _jsx(AdminLoginPage, {}) }), _jsx(Route, { path: "/admin/nodes", element: _jsx(RequireAdmin, { children: _jsx(AdminNodesPage, {}) }) }), _jsx(Route, { path: "/admin/alert-rules", element: _jsx(RequireAdmin, { children: _jsx(AdminAlertRulesPage, {}) }) }), _jsx(Route, { path: "/admin", element: _jsx(Navigate, { to: isAdminLoggedIn ? "/admin/nodes" : "/admin/login", replace: true }) })] })] }));
}
