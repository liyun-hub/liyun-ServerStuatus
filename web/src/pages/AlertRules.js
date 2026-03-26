import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { api } from "../api/client";
const defaultForm = {
    name: "",
    metric: "cpu_usage",
    operator: ">",
    threshold: 90,
    consecutive: 3,
    enabled: true,
};
export default function AlertRulesPage() {
    const [rules, setRules] = useState([]);
    const [form, setForm] = useState(defaultForm);
    const [error, setError] = useState("");
    const load = async () => {
        try {
            const data = await api.listAlertRules();
            setRules(data);
        }
        catch (e) {
            setError(e.message);
        }
    };
    useEffect(() => {
        void load();
    }, []);
    const onSubmit = async (event) => {
        event.preventDefault();
        setError("");
        try {
            await api.createAlertRule(form);
            setForm(defaultForm);
            await load();
        }
        catch (e) {
            setError(e.message);
        }
    };
    const toggleRule = async (rule) => {
        try {
            await api.updateAlertRule(rule.id, {
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
            setError(e.message);
        }
    };
    return (_jsxs("section", { className: "app-page", children: [_jsxs("div", { className: "app-card", children: [_jsx("h2", { className: "app-card-title", children: "\u544A\u8B66\u89C4\u5219" }), error && _jsx("p", { className: "app-error", children: error }), _jsxs("form", { onSubmit: onSubmit, className: "app-form", style: { maxWidth: 520 }, children: [_jsx("input", { className: "app-input", placeholder: "\u89C4\u5219\u540D\u79F0", value: form.name, onChange: (e) => setForm((f) => ({ ...f, name: e.target.value })), required: true }), _jsxs("select", { className: "app-select", value: form.metric, onChange: (e) => setForm((f) => ({ ...f, metric: e.target.value })), children: [_jsx("option", { value: "cpu_usage", children: "CPU \u4F7F\u7528\u7387" }), _jsx("option", { value: "memory_usage", children: "\u5185\u5B58\u4F7F\u7528\u7387" }), _jsx("option", { value: "disk_usage", children: "\u786C\u76D8\u4F7F\u7528\u7387" }), _jsx("option", { value: "net_rx_rate", children: "\u4E0B\u884C\u901F\u7387" }), _jsx("option", { value: "net_tx_rate", children: "\u4E0A\u884C\u901F\u7387" })] }), _jsxs("select", { className: "app-select", value: form.operator, onChange: (e) => setForm((f) => ({ ...f, operator: e.target.value })), children: [_jsx("option", { value: ">", children: ">" }), _jsx("option", { value: ">=", children: ">=" }), _jsx("option", { value: "<", children: "<" }), _jsx("option", { value: "<=", children: "<=" })] }), _jsx("input", { className: "app-input", type: "number", step: "0.1", value: form.threshold, onChange: (e) => setForm((f) => ({ ...f, threshold: Number(e.target.value) })), required: true }), _jsx("input", { className: "app-input", type: "number", min: 1, value: form.consecutive, onChange: (e) => setForm((f) => ({ ...f, consecutive: Number(e.target.value) })), required: true }), _jsxs("label", { className: "app-checkbox", children: [_jsx("input", { type: "checkbox", checked: form.enabled, onChange: (e) => setForm((f) => ({ ...f, enabled: e.target.checked })) }), "\u542F\u7528"] }), _jsx("button", { type: "submit", className: "app-button", children: "\u521B\u5EFA\u89C4\u5219" })] })] }), _jsx("div", { className: "app-card", children: _jsx("div", { className: "app-table-wrap", children: _jsxs("table", { className: "app-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "\u540D\u79F0" }), _jsx("th", { children: "\u6307\u6807" }), _jsx("th", { children: "\u6761\u4EF6" }), _jsx("th", { children: "\u72B6\u6001" }), _jsx("th", { children: "\u64CD\u4F5C" })] }) }), _jsxs("tbody", { children: [rules.map((rule) => (_jsxs("tr", { children: [_jsx("td", { children: rule.name }), _jsx("td", { children: rule.metric }), _jsxs("td", { children: [rule.operator, " ", rule.threshold, " (\u8FDE\u7EED ", rule.consecutive, " \u6B21)"] }), _jsx("td", { children: _jsx("span", { className: `app-badge ${rule.enabled ? "app-badge-online" : "app-badge-muted"}`, children: rule.enabled ? "启用" : "停用" }) }), _jsx("td", { children: _jsx("button", { type: "button", className: "app-button app-button-secondary", onClick: () => void toggleRule(rule), children: rule.enabled ? "停用" : "启用" }) })] }, rule.id))), rules.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 5, className: "app-empty", children: "\u6682\u65E0\u89C4\u5219" }) }))] })] }) }) })] }));
}
