import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import type { AlertRule } from "../types";

type RuleForm = {
  name: string;
  metric: string;
  operator: string;
  threshold: number;
  consecutive: number;
  enabled: boolean;
};

const defaultForm: RuleForm = {
  name: "",
  metric: "cpu_usage",
  operator: ">",
  threshold: 90,
  consecutive: 3,
  enabled: true,
};

export default function AlertRulesPage() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [form, setForm] = useState<RuleForm>(defaultForm);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const data = await api.listAlertRules();
      setRules(data);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      await api.createAlertRule(form);
      setForm(defaultForm);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const toggleRule = async (rule: AlertRule) => {
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
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <section className="app-page">
      <div className="app-card">
        <h2 className="app-card-title">告警规则</h2>
        {error && <p className="app-error">{error}</p>}

        <form onSubmit={onSubmit} className="app-form" style={{ maxWidth: 520 }}>
          <input
            className="app-input"
            placeholder="规则名称"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <select
            className="app-select"
            value={form.metric}
            onChange={(e) => setForm((f) => ({ ...f, metric: e.target.value }))}
          >
            <option value="cpu_usage">CPU 使用率</option>
            <option value="memory_usage">内存使用率</option>
            <option value="disk_usage">硬盘使用率</option>
            <option value="net_rx_rate">下行速率</option>
            <option value="net_tx_rate">上行速率</option>
          </select>
          <select
            className="app-select"
            value={form.operator}
            onChange={(e) => setForm((f) => ({ ...f, operator: e.target.value }))}
          >
            <option value=">">{">"}</option>
            <option value=">=">{">="}</option>
            <option value="<">{"<"}</option>
            <option value="<=">{"<="}</option>
          </select>
          <input
            className="app-input"
            type="number"
            step="0.1"
            value={form.threshold}
            onChange={(e) => setForm((f) => ({ ...f, threshold: Number(e.target.value) }))}
            required
          />
          <input
            className="app-input"
            type="number"
            min={1}
            value={form.consecutive}
            onChange={(e) => setForm((f) => ({ ...f, consecutive: Number(e.target.value) }))}
            required
          />
          <label className="app-checkbox">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
            />
            启用
          </label>
          <button type="submit" className="app-button">
            创建规则
          </button>
        </form>
      </div>

      <div className="app-card">
        <div className="app-table-wrap">
          <table className="app-table">
            <thead>
              <tr>
                <th>名称</th>
                <th>指标</th>
                <th>条件</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id}>
                  <td>{rule.name}</td>
                  <td>{rule.metric}</td>
                  <td>
                    {rule.operator} {rule.threshold} (连续 {rule.consecutive} 次)
                  </td>
                  <td>
                    <span className={`app-badge ${rule.enabled ? "app-badge-online" : "app-badge-muted"}`}>
                      {rule.enabled ? "启用" : "停用"}
                    </span>
                  </td>
                  <td>
                    <button type="button" className="app-button app-button-secondary" onClick={() => void toggleRule(rule)}>
                      {rule.enabled ? "停用" : "启用"}
                    </button>
                  </td>
                </tr>
              ))}
              {rules.length === 0 && (
                <tr>
                  <td colSpan={5} className="app-empty">
                    暂无规则
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
