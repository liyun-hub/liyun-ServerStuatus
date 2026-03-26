import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { AlertRule } from "../types";

function metricLabel(metric: string) {
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
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await api.listAlertRules();
        if (!cancelled) setRules(data);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    };

    void load();
    const timer = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <section className="app-page">
      <div className="app-card">
        <h2 className="app-card-title">告警规则监控（只读）</h2>
        <p className="app-muted">告警规则由管理端统一维护，业务侧仅展示当前生效规则与执行状态。</p>
        {error && <p className="app-error">{error}</p>}

        <div className="app-table-wrap">
          <table className="app-table">
            <thead>
              <tr>
                <th>名称</th>
                <th>指标</th>
                <th>条件</th>
                <th>状态</th>
                <th>更新时间</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id}>
                  <td>{rule.name}</td>
                  <td>{metricLabel(rule.metric)}</td>
                  <td>
                    {rule.operator} {rule.threshold}（连续 {rule.consecutive} 次）
                  </td>
                  <td>
                    <span className={`app-badge ${rule.enabled ? "app-badge-online" : "app-badge-muted"}`}>
                      {rule.enabled ? "生效中" : "未启用"}
                    </span>
                  </td>
                  <td>{new Date(rule.updatedAt * 1000).toLocaleString()}</td>
                </tr>
              ))}
              {rules.length === 0 && (
                <tr>
                  <td colSpan={5} className="app-empty">
                    暂无告警规则
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
