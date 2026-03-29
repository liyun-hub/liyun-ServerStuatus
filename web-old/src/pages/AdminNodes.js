import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, auth } from "../api/client";
function parseError(error) {
    const message = error?.message ?? "请求失败";
    try {
        const data = JSON.parse(message);
        if (data.error)
            return { message: data.error, code: data.code ?? "" };
    }
    catch {
        return { message, code: "" };
    }
    return { message, code: "" };
}
function fmtPercent(v) {
    if (v === undefined)
        return "-";
    return `${v.toFixed(1)}%`;
}
export default function AdminNodesPage() {
    const navigate = useNavigate();
    const [nodes, setNodes] = useState([]);
    const [renameDraft, setRenameDraft] = useState({});
    const [newNodeId, setNewNodeId] = useState("");
    const [newDisplayName, setNewDisplayName] = useState("");
    const [resultTitle, setResultTitle] = useState("");
    const [resultBody, setResultBody] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const handleAdminError = (e) => {
        const parsed = parseError(e);
        if (parsed.message.includes("unauthorized") || parsed.message.includes("未登录")) {
            auth.clearToken();
            navigate("/admin/login", { replace: true });
            return true;
        }
        if (parsed.code === "PASSWORD_CHANGE_REQUIRED" || parsed.message.includes("password change required")) {
            auth.setMustChangePassword(true);
            navigate("/admin/change-password", { replace: true });
            return true;
        }
        return parsed.message;
    };
    const syncDraft = (items) => {
        setRenameDraft((old) => {
            const next = {};
            for (const item of items) {
                next[item.nodeId] = old[item.nodeId] ?? item.displayName;
            }
            return next;
        });
    };
    const load = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await api.adminListNodes();
            setNodes(data);
            syncDraft(data);
        }
        catch (e) {
            const handled = handleAdminError(e);
            if (handled !== true) {
                setError(handled);
            }
            return;
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        if (!auth.isLoggedIn()) {
            navigate("/admin/login", { replace: true });
            return;
        }
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const sortedNodes = useMemo(() => [...nodes].sort((a, b) => Number(b.online) - Number(a.online) || a.nodeId.localeCompare(b.nodeId)), [nodes]);
    const onCreateNode = async (event) => {
        event.preventDefault();
        const nodeId = newNodeId.trim();
        const displayName = newDisplayName.trim();
        if (!nodeId) {
            setError("nodeId 不能为空");
            return;
        }
        setError("");
        try {
            const res = await api.adminCreateNode({ nodeId, displayName });
            setResultTitle(`节点 ${res.nodeId} 已创建，token 仅显示一次`);
            setResultBody(res.token);
            setNewNodeId("");
            setNewDisplayName("");
            await load();
        }
        catch (e) {
            const handled = handleAdminError(e);
            if (handled !== true) {
                setError(handled);
            }
        }
    };
    const onRename = async (nodeId) => {
        const displayName = (renameDraft[nodeId] ?? "").trim();
        if (!displayName) {
            setError("displayName 不能为空");
            return;
        }
        setError("");
        try {
            await api.adminUpdateNodeDisplayName(nodeId, { displayName });
            await load();
        }
        catch (e) {
            const handled = handleAdminError(e);
            if (handled !== true) {
                setError(handled);
            }
        }
    };
    const onResetToken = async (nodeId) => {
        setError("");
        try {
            const res = await api.adminResetNodeToken(nodeId);
            setResultTitle(`节点 ${res.nodeId} 新 token（仅显示一次）`);
            setResultBody(res.token);
        }
        catch (e) {
            const handled = handleAdminError(e);
            if (handled !== true) {
                setError(handled);
            }
        }
    };
    const onInstallCommand = async (nodeId) => {
        setError("");
        try {
            const res = await api.adminInstallCommand(nodeId);
            setResultTitle(`节点 ${res.nodeId} 安装命令`);
            setResultBody(res.command);
            await load();
        }
        catch (e) {
            const handled = handleAdminError(e);
            if (handled !== true) {
                setError(handled);
            }
        }
    };
    const onCopyResult = async () => {
        if (!resultBody)
            return;
        try {
            await navigator.clipboard.writeText(resultBody);
        }
        catch {
            setError("复制失败，请手动复制");
        }
    };
    const onLogout = async () => {
        try {
            await api.adminLogout();
        }
        catch {
            // ignore
        }
        auth.clearToken();
        navigate("/admin/login", { replace: true });
    };
    return (_jsxs("section", { className: "app-page", children: [_jsxs("div", { className: "app-card", children: [_jsxs("div", { className: "app-toolbar", children: [_jsx("h2", { className: "app-card-title", style: { marginBottom: 0 }, children: "\u540E\u53F0\u8282\u70B9\u7BA1\u7406" }), _jsxs("div", { className: "app-actions", children: [_jsx("button", { type: "button", className: "app-button app-button-secondary", onClick: () => void load(), disabled: loading, children: "\u5237\u65B0" }), _jsx("button", { type: "button", className: "app-button app-button-secondary", onClick: onLogout, children: "\u9000\u51FA\u767B\u5F55" })] })] }), error && _jsx("p", { className: "app-error", children: error }), _jsxs("form", { onSubmit: onCreateNode, className: "app-form-inline", children: [_jsx("input", { className: "app-input", placeholder: "nodeId (\u552F\u4E00)", value: newNodeId, onChange: (e) => setNewNodeId(e.target.value), required: true }), _jsx("input", { className: "app-input", placeholder: "displayName (\u53EF\u9009)", value: newDisplayName, onChange: (e) => setNewDisplayName(e.target.value) }), _jsx("button", { type: "submit", className: "app-button", children: "\u65B0\u589E\u8282\u70B9" })] })] }), _jsx("div", { className: "app-card", children: _jsx("div", { className: "app-table-wrap", children: _jsxs("table", { className: "app-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "nodeId" }), _jsx("th", { children: "displayName" }), _jsx("th", { children: "\u72B6\u6001" }), _jsx("th", { children: "CPU" }), _jsx("th", { children: "\u5185\u5B58" }), _jsx("th", { children: "\u786C\u76D8" }), _jsx("th", { children: "\u64CD\u4F5C" })] }) }), _jsxs("tbody", { children: [sortedNodes.map((node) => (_jsxs("tr", { children: [_jsx("td", { children: node.nodeId }), _jsx("td", { children: _jsxs("div", { className: "app-actions", children: [_jsx("input", { className: "app-input", value: renameDraft[node.nodeId] ?? "", onChange: (e) => setRenameDraft((old) => ({
                                                                ...old,
                                                                [node.nodeId]: e.target.value,
                                                            })) }), _jsx("button", { type: "button", className: "app-button app-button-secondary", onClick: () => void onRename(node.nodeId), children: "\u91CD\u547D\u540D" })] }) }), _jsx("td", { children: _jsx("span", { className: `app-badge ${node.online ? "app-badge-online" : "app-badge-offline"}`, children: node.online ? "在线" : "离线" }) }), _jsx("td", { children: fmtPercent(node.latest?.cpuUsage) }), _jsx("td", { children: fmtPercent(node.latest?.memoryUsage) }), _jsx("td", { children: fmtPercent(node.latest?.diskUsage) }), _jsx("td", { children: _jsxs("div", { className: "app-actions", children: [_jsx("button", { type: "button", className: "app-button app-button-warning", onClick: () => void onResetToken(node.nodeId), children: "\u91CD\u7F6E token" }), _jsx("button", { type: "button", className: "app-button app-button-secondary", onClick: () => void onInstallCommand(node.nodeId), children: "\u751F\u6210\u5B89\u88C5\u547D\u4EE4" })] }) })] }, node.nodeId))), sortedNodes.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 7, className: "app-empty", children: "\u6682\u65E0\u8282\u70B9" }) }))] })] }) }) }), resultBody && (_jsxs("div", { className: "app-card", children: [_jsx("h3", { className: "app-subtitle", children: resultTitle }), _jsx("textarea", { className: "app-textarea", value: resultBody, readOnly: true }), _jsx("div", { className: "app-actions", style: { marginTop: 8 }, children: _jsx("button", { type: "button", className: "app-button app-button-secondary", onClick: () => void onCopyResult(), children: "\u590D\u5236" }) })] }))] }));
}
