import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, auth } from "../api/client";
const defaultForm = {
    name: "",
    metric: "cpu_usage",
    operator: ">",
    threshold: 90,
    consecutive: 3,
    enabled: true,
};
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
function metricLabel(metric) {
    switch (metric) {
        case "cpu_usage":
            return "CPU 使用率";
        case "memory_usage":
            return "内存使用率";
        case "disk_usage":
            return "硬盘使用率";
        case "net_rx_rate":
            return "下行速率";
        case "net_tx_rate":
            return "上行速率";
        default:
            return metric;
    }
}
export default function AdminAlertRulesPage() {
    const navigate = useNavigate();
    const [rules, setRules] = useState([]);
    const [form, setForm] = useState(defaultForm);
    const [editingId, setEditingId] = useState(null);
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
    const load = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await api.adminListAlertRules();
            setRules(data);
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
    const resetForm = () => {
        setEditingId(null);
        setForm(defaultForm);
    };
    const onSubmit = async (event) => {
        event.preventDefault();
        setError("");
        try {
            if (editingId === null) {
                await api.adminCreateAlertRule(form);
            }
            else {
                await api.adminUpdateAlertRule(editingId, form);
            }
            resetForm();
            await load();
        }
        catch (e) {
            const handled = handleAdminError(e);
            if (handled !== true) {
                setError(handled);
            }
        }
    };
    const onEdit = (rule) => {
        setEditingId(rule.id);
        setForm({
            name: rule.name,
            metric: rule.metric,
            operator: rule.operator,
            threshold: rule.threshold,
            consecutive: rule.consecutive,
            enabled: rule.enabled,
        });
    };
    const onToggle = async (rule) => {
        setError("");
        try {
            await api.adminUpdateAlertRule(rule.id, {
                name: rule.name,
                metric: rule.metric,
                operator: rule.operator,
                threshold: rule.threshold,
                consecutive: rule.consecutive,
                enabled: !rule.enabled,
            });
            await load();
        }
        catch (e) {
            const handled = handleAdminError(e);
            if (handled !== true) {
                setError(handled);
            }
        }
    };
    return (_jsxs("section", { className: "app-page", children: [_jsxs("div", { className: "app-card", children: [_jsxs("div", { className: "app-toolbar", children: [_jsx("h2", { className: "app-card-title", style: { marginBottom: 0 }, children: "\u7BA1\u7406\u7AEF\u544A\u8B66\u89C4\u5219\u914D\u7F6E" }), _jsx("button", { type: "button", className: "app-button app-button-secondary", onClick: () => void load(), disabled: loading, children: "\u5237\u65B0" })] }), error && _jsx("p", { className: "app-error", children: error }), _jsxs("form", { onSubmit: onSubmit, className: "app-form", style: { maxWidth: 560 }, children: [_jsx("input", { className: "app-input", placeholder: "\u89C4\u5219\u540D\u79F0", value: form.name, onChange: (e) => setForm((old) => ({ ...old, name: e.target.value })), required: true }), _jsxs("select", { className: "app-select", value: form.metric, onChange: (e) => setForm((old) => ({ ...old, metric: e.target.value })), children: [_jsx("option", { value: "cpu_usage", children: "CPU \u4F7F\u7528\u7387" }), _jsx("option", { value: "memory_usage", children: "\u5185\u5B58\u4F7F\u7528\u7387" }), _jsx("option", { value: "disk_usage", children: "\u786C\u76D8\u4F7F\u7528\u7387" }), _jsx("option", { value: "net_rx_rate", children: "\u4E0B\u884C\u901F\u7387" }), _jsx("option", { value: "net_tx_rate", children: "\u4E0A\u884C\u901F\u7387" })] }), _jsxs("select", { className: "app-select", value: form.operator, onChange: (e) => setForm((old) => ({ ...old, operator: e.target.value })), children: [_jsx("option", { value: ">", children: ">" }), _jsx("option", { value: ">=", children: ">=" }), _jsx("option", { value: "<", children: "<" }), _jsx("option", { value: "<=", children: "<=" })] }), _jsx("input", { className: "app-input", type: "number", step: "0.1", value: form.threshold, onChange: (e) => setForm((old) => ({ ...old, threshold: Number(e.target.value) })), required: true }), _jsx("input", { className: "app-input", type: "number", min: 1, value: form.consecutive, onChange: (e) => setForm((old) => ({ ...old, consecutive: Number(e.target.value) })), required: true }), _jsxs("label", { className: "app-checkbox", children: [_jsx("input", { type: "checkbox", checked: form.enabled, onChange: (e) => setForm((old) => ({ ...old, enabled: e.target.checked })) }), "\u542F\u7528"] }), _jsxs("div", { className: "app-actions", children: [_jsx("button", { type: "submit", className: "app-button", children: editingId === null ? "新增规则" : "保存规则" }), editingId !== null && (_jsx("button", { type: "button", className: "app-button app-button-secondary", onClick: resetForm, children: "\u53D6\u6D88\u7F16\u8F91" }))] })] })] }), _jsx("div", { className: "app-card", children: _jsx("div", { className: "app-table-wrap", children: _jsxs("table", { className: "app-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "ID" }), _jsx("th", { children: "\u540D\u79F0" }), _jsx("th", { children: "\u6307\u6807" }), _jsx("th", { children: "\u6761\u4EF6" }), _jsx("th", { children: "\u72B6\u6001" }), _jsx("th", { children: "\u66F4\u65B0\u65F6\u95F4" }), _jsx("th", { children: "\u64CD\u4F5C" })] }) }), _jsxs("tbody", { children: [rules.map((rule) => (_jsxs("tr", { children: [_jsx("td", { children: rule.id }), _jsx("td", { children: rule.name }), _jsx("td", { children: metricLabel(rule.metric) }), _jsxs("td", { children: [rule.operator, " ", rule.threshold, "\uFF08\u8FDE\u7EED ", rule.consecutive, " \u6B21\uFF09"] }), _jsx("td", { children: _jsx("span", { className: `app-badge ${rule.enabled ? "app-badge-online" : "app-badge-muted"}`, children: rule.enabled ? "启用" : "停用" }) }), _jsx("td", { children: new Date(rule.updatedAt * 1000).toLocaleString() }), _jsx("td", { children: _jsxs("div", { className: "app-actions", children: [_jsx("button", { type: "button", className: "app-button app-button-secondary", onClick: () => onEdit(rule), children: "\u7F16\u8F91" }), _jsx("button", { type: "button", className: "app-button app-button-secondary", onClick: () => void onToggle(rule), children: rule.enabled ? "停用" : "启用" })] }) })] }, rule.id))), rules.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 7, className: "app-empty", children: "\u6682\u65E0\u544A\u8B66\u89C4\u5219" }) }))] })] }) }) })] }));
}
