import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { api } from "../api/client";
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
export default function AlertRulesPage() {
    const [rules, setRules] = useState([]);
    const [error, setError] = useState("");
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const data = await api.listAlertRules();
                if (!cancelled)
                    setRules(data);
            }
            catch (e) {
                if (!cancelled)
                    setError(e.message);
            }
        };
        void load();
        const timer = setInterval(load, 5000);
        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, []);
    return (_jsx("section", { className: "app-page", children: _jsxs("div", { className: "app-card", children: [_jsx("h2", { className: "app-card-title", children: "\u544A\u8B66\u89C4\u5219\u76D1\u63A7\uFF08\u53EA\u8BFB\uFF09" }), _jsx("p", { className: "app-muted", children: "\u544A\u8B66\u89C4\u5219\u7531\u7BA1\u7406\u7AEF\u7EDF\u4E00\u7EF4\u62A4\uFF0C\u4E1A\u52A1\u4FA7\u4EC5\u5C55\u793A\u5F53\u524D\u751F\u6548\u89C4\u5219\u4E0E\u6267\u884C\u72B6\u6001\u3002" }), error && _jsx("p", { className: "app-error", children: error }), _jsx("div", { className: "app-table-wrap", children: _jsxs("table", { className: "app-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "\u540D\u79F0" }), _jsx("th", { children: "\u6307\u6807" }), _jsx("th", { children: "\u6761\u4EF6" }), _jsx("th", { children: "\u72B6\u6001" }), _jsx("th", { children: "\u66F4\u65B0\u65F6\u95F4" })] }) }), _jsxs("tbody", { children: [rules.map((rule) => (_jsxs("tr", { children: [_jsx("td", { children: rule.name }), _jsx("td", { children: metricLabel(rule.metric) }), _jsxs("td", { children: [rule.operator, " ", rule.threshold, "\uFF08\u8FDE\u7EED ", rule.consecutive, " \u6B21\uFF09"] }), _jsx("td", { children: _jsx("span", { className: `app-badge ${rule.enabled ? "app-badge-online" : "app-badge-muted"}`, children: rule.enabled ? "生效中" : "未启用" }) }), _jsx("td", { children: new Date(rule.updatedAt * 1000).toLocaleString() })] }, rule.id))), rules.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 5, className: "app-empty", children: "\u6682\u65E0\u544A\u8B66\u89C4\u5219" }) }))] })] }) })] }) }));
}
