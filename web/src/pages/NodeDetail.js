import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import { MetricLineChart } from "../components/charts/MetricLineChart";
function toSeries(data, pick) {
    return data.map((item) => ({ timestamp: item.timestamp, value: pick(item) }));
}
export default function NodeDetailPage() {
    const { id = "" } = useParams();
    const [node, setNode] = useState(null);
    const [history, setHistory] = useState([]);
    const [error, setError] = useState("");
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const now = Math.floor(Date.now() / 1000);
                const [nodeRes, historyRes] = await Promise.all([
                    api.getNode(id),
                    api.getNodeHistory(id, now - 3600, now, 2000),
                ]);
                if (!cancelled) {
                    setNode(nodeRes);
                    setHistory(historyRes);
                }
            }
            catch (e) {
                if (!cancelled)
                    setError(e.message);
            }
        };
        if (id) {
            load();
            const timer = setInterval(load, 5000);
            return () => {
                cancelled = true;
                clearInterval(timer);
            };
        }
    }, [id]);
    const cpuSeries = useMemo(() => toSeries(history, (r) => r.cpuUsage), [history]);
    const memSeries = useMemo(() => toSeries(history, (r) => r.memoryUsage), [history]);
    const diskSeries = useMemo(() => toSeries(history, (r) => r.diskUsage), [history]);
    const rxSeries = useMemo(() => toSeries(history, (r) => r.netRxRate), [history]);
    const txSeries = useMemo(() => toSeries(history, (r) => r.netTxRate), [history]);
    return (_jsxs("section", { children: [_jsx("h2", { children: "\u8282\u70B9\u8BE6\u60C5" }), error && _jsx("p", { style: { color: "crimson" }, children: error }), node && (_jsxs("div", { style: { marginBottom: 16 }, children: [_jsxs("div", { children: [_jsx("strong", { children: node.hostname }), " (", node.id, ")"] }), _jsxs("div", { children: [node.os, " / ", node.platform, " ", node.platformVersion, " / ", node.arch] }), _jsxs("div", { children: ["CPU: ", node.cpuModel, " x ", node.cpuCores] }), _jsxs("div", { children: ["\u72B6\u6001\uFF1A", node.online ? "在线" : "离线"] })] })), _jsx("h3", { children: "CPU \u4F7F\u7528\u7387 (%)" }), _jsx(MetricLineChart, { data: cpuSeries, color: "#2563eb", unit: "%" }), _jsx("h3", { children: "\u5185\u5B58\u4F7F\u7528\u7387 (%)" }), _jsx(MetricLineChart, { data: memSeries, color: "#16a34a", unit: "%" }), _jsx("h3", { children: "\u786C\u76D8\u4F7F\u7528\u7387 (%)" }), _jsx(MetricLineChart, { data: diskSeries, color: "#9333ea", unit: "%" }), _jsx("h3", { children: "\u4E0B\u884C\u901F\u7387 (B/s)" }), _jsx(MetricLineChart, { data: rxSeries, color: "#ea580c", unit: "" }), _jsx("h3", { children: "\u4E0A\u884C\u901F\u7387 (B/s)" }), _jsx(MetricLineChart, { data: txSeries, color: "#dc2626", unit: "" })] }));
}
