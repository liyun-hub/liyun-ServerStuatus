import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Props = {
  data: Array<{ timestamp: number; value: number }>;
  color: string;
  unit?: string;
};

export function MetricLineChart({ data, color, unit }: Props) {
  return (
    <div className="metric-chart">
      <ResponsiveContainer>
        <LineChart data={data}>
          <XAxis
            dataKey="timestamp"
            tickFormatter={(v) => new Date(v * 1000).toLocaleTimeString()}
            minTickGap={30}
          />
          <YAxis tickFormatter={(v) => `${Number(v).toFixed(0)}${unit ?? ""}`} />
          <Tooltip
            labelFormatter={(v) => new Date(Number(v) * 1000).toLocaleString()}
            formatter={(value: number) => `${value.toFixed(2)}${unit ?? ""}`}
          />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}