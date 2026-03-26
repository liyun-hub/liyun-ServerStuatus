import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
function fmtPercent(v) {
    if (v === undefined)
        return "-";
    return `${v.toFixed(1)}%`;
}
export default function NodesPage() {
    const [nodes, setNodes] = useState([]);
    const [error, setError] = useState("");
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const data = await api.listNodes();
                if (!cancelled)
                    setNodes(data);
            }
            catch (e) {
                if (!cancelled)
                    setError(e.message);
            }
        };
        load();
        const timer = setInterval(load, 5000);
        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, []);
    return (_jsxs("section", { children: [_jsx("h2", { children: "\u8282\u70B9\u603B\u89C8" }), error && _jsx("p", { style: { color: "crimson" }, children: error }), _jsxs("table", { width: "100%", cellPadding: 8, style: { borderCollapse: "collapse" }, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { align: "left", children: "\u8282\u70B9" }), _jsx("th", { align: "left", children: "\u72B6\u6001" }), _jsx("th", { align: "left", children: "CPU" }), _jsx("th", { align: "left", children: "\u5185\u5B58" }), _jsx("th", { align: "left", children: "\u786C\u76D8" }), _jsx("th", { align: "left", children: "\u6D41\u91CF" }), _jsx("th", { align: "left", children: "\u64CD\u4F5C" })] }) }), _jsxs("tbody", { children: [nodes.map((node) => (_jsxs("tr", { style: { borderTop: "1px solid #ddd" }, children: [_jsxs("td", { children: [_jsx("div", { children: node.hostname }), _jsx("small", { children: node.id })] }), _jsx("td", { children: node.online ? "在线" : "离线" }), _jsx("td", { children: fmtPercent(node.latest?.cpuUsage) }), _jsx("td", { children: fmtPercent(node.latest?.memoryUsage) }), _jsx("td", { children: fmtPercent(node.latest?.diskUsage) }), _jsxs("td", { children: ["\u2193", (node.latest?.netRxRate ?? 0).toFixed(0), " B/s / \u2191", (node.latest?.netTxRate ?? 0).toFixed(0), " B/s"] }), _jsx("td", { children: _jsx(Link, { to: `/nodes/${node.id}`, children: "\u67E5\u770B\u8BE6\u60C5" }) })] }, node.id))), nodes.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 7, style: { padding: 20, color: "#777" }, children: "\u6682\u65E0\u8282\u70B9\uFF0C\u8BF7\u5148\u542F\u52A8 agent\u3002" }) }))] })] })] }));
}
