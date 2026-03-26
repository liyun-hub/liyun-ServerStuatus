import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NavLink, Route, Routes } from "react-router-dom";
import NodesPage from "./pages/Nodes";
import NodeDetailPage from "./pages/NodeDetail";
import AlertRulesPage from "./pages/AlertRules";
import AlertEventsPage from "./pages/AlertEvents";
const navStyle = ({ isActive }) => ({
    marginRight: 12,
    textDecoration: "none",
    color: isActive ? "#2563eb" : "#333",
    fontWeight: isActive ? 700 : 500,
});
export default function App() {
    return (_jsxs("div", { style: { maxWidth: 1200, margin: "0 auto", padding: 16, fontFamily: "Arial, sans-serif" }, children: [_jsx("h1", { style: { marginTop: 0 }, children: "Server Status" }), _jsxs("nav", { style: { marginBottom: 16 }, children: [_jsx(NavLink, { to: "/", style: navStyle, end: true, children: "\u8282\u70B9" }), _jsx(NavLink, { to: "/alert-rules", style: navStyle, children: "\u544A\u8B66\u89C4\u5219" }), _jsx(NavLink, { to: "/alert-events", style: navStyle, children: "\u544A\u8B66\u4E8B\u4EF6" })] }), _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(NodesPage, {}) }), _jsx(Route, { path: "/nodes/:id", element: _jsx(NodeDetailPage, {}) }), _jsx(Route, { path: "/alert-rules", element: _jsx(AlertRulesPage, {}) }), _jsx(Route, { path: "/alert-events", element: _jsx(AlertEventsPage, {}) })] })] }));
}
