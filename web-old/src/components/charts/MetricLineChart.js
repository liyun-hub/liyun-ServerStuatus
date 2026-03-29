import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
export function MetricLineChart({ data, color, unit }) {
    return (_jsx("div", { className: "metric-chart", children: _jsx(ResponsiveContainer, { children: _jsxs(LineChart, { data: data, children: [_jsx(XAxis, { dataKey: "timestamp", tickFormatter: (v) => new Date(v * 1000).toLocaleTimeString(), minTickGap: 30 }), _jsx(YAxis, { tickFormatter: (v) => `${Number(v).toFixed(0)}${unit ?? ""}` }), _jsx(Tooltip, { labelFormatter: (v) => new Date(Number(v) * 1000).toLocaleString(), formatter: (value) => `${value.toFixed(2)}${unit ?? ""}` }), _jsx(Line, { type: "monotone", dataKey: "value", stroke: color, strokeWidth: 2, dot: false })] }) }) }));
}
