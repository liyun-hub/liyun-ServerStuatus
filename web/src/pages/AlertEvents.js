import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { api } from "../api/client";
export default function AlertEventsPage() {
    const [events, setEvents] = useState([]);
    const [error, setError] = useState("");
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const data = await api.listAlertEvents();
                if (!cancelled)
                    setEvents(data);
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
    return (_jsxs("section", { children: [_jsx("h2", { children: "\u544A\u8B66\u4E8B\u4EF6" }), error && _jsx("p", { style: { color: "crimson" }, children: error }), _jsxs("table", { width: "100%", cellPadding: 8, style: { borderCollapse: "collapse" }, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { align: "left", children: "\u65F6\u95F4" }), _jsx("th", { align: "left", children: "\u8282\u70B9" }), _jsx("th", { align: "left", children: "\u89C4\u5219" }), _jsx("th", { align: "left", children: "\u72B6\u6001" }), _jsx("th", { align: "left", children: "\u503C" }), _jsx("th", { align: "left", children: "\u6D88\u606F" })] }) }), _jsxs("tbody", { children: [events.map((event) => (_jsxs("tr", { style: { borderTop: "1px solid #ddd" }, children: [_jsx("td", { children: new Date(event.createdAt * 1000).toLocaleString() }), _jsx("td", { children: event.nodeId }), _jsx("td", { children: event.ruleName }), _jsx("td", { children: event.status }), _jsx("td", { children: event.value.toFixed(2) }), _jsx("td", { children: event.message })] }, event.id))), events.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 6, style: { color: "#777" }, children: "\u6682\u65E0\u544A\u8B66\u4E8B\u4EF6" }) }))] })] })] }));
}
