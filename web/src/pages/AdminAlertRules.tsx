import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, auth } from "../api/client";
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

function parseError(error: unknown) {
  const message = (error as Error)?.message ?? "请求失败";
  try {
    const data = JSON.parse(message) as { error?: string };
    if (data.error) return data.error;
  } catch {
    return message;
  }
  return message;
}

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

export default function AdminAlertRulesPage() {
  const navigate = useNavigate();
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [form, setForm] = useState<RuleForm>(defaultForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.adminListAlertRules();
      setRules(data);
    } catch (e) {
      const message = parseError(e);
      if (message.includes("unauthorized") || message.includes("未登录")) {
        auth.clearToken();
        navigate("/admin/login", { replace: true });
        return;
      }
      setError(message);
    } finally {
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

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      if (editingId === null) {
        await api.adminCreateAlertRule(form);
      } else {
        await api.adminUpdateAlertRule(editingId, form);
      }
      resetForm();
      await load();
    } catch (e) {
      setError(parseError(e));
    }
  };

  const onEdit = (rule: AlertRule) => {
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

  const onToggle = async (rule: AlertRule) => {
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
    } catch (e) {
      setError(parseError(e));
    }
  };

  return (
    <section className="app-page">
      <div className="app-card">
        <div className="app-toolbar">
          <h2 className="app-card-title" style={{ marginBottom: 0 }}>
            管理端告警规则配置
          </h2>
          <button
            type="button"
            className="app-button app-button-secondary"
            onClick={() => void load()}
            disabled={loading}
          >
            刷新
          </button>
        </div>

        {error && <p className="app-error">{error}</p>}

        <form onSubmit={onSubmit} className="app-form" style={{ maxWidth: 560 }}>
          <input
            className="app-input"
            placeholder="规则名称"
            value={form.name}
            onChange={(e) => setForm((old) => ({ ...old, name: e.target.value }))}
            required
          />
          <select
            className="app-select"
            value={form.metric}
            onChange={(e) => setForm((old) => ({ ...old, metric: e.target.value }))}
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
            onChange={(e) => setForm((old) => ({ ...old, operator: e.target.value }))}
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
            onChange={(e) => setForm((old) => ({ ...old, threshold: Number(e.target.value) }))}
            required
          />
          <input
            className="app-input"
            type="number"
            min={1}
            value={form.consecutive}
            onChange={(e) => setForm((old) => ({ ...old, consecutive: Number(e.target.value) }))}
            required
          />
          <label className="app-checkbox">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm((old) => ({ ...old, enabled: e.target.checked }))}
            />
            启用
          </label>

          <div className="app-actions">
            <button type="submit" className="app-button">
              {editingId === null ? "新增规则" : "保存规则"}
            </button>
            {editingId !== null && (
              <button type="button" className="app-button app-button-secondary" onClick={resetForm}>
                取消编辑
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="app-card">
        <div className="app-table-wrap">
          <table className="app-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>名称</th>
                <th>指标</th>
                <th>条件</th>
                <th>状态</th>
                <th>更新时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id}>
                  <td>{rule.id}</td>
                  <td>{rule.name}</td>
                  <td>{metricLabel(rule.metric)}</td>
                  <td>
                    {rule.operator} {rule.threshold}（连续 {rule.consecutive} 次）
                  </td>
                  <td>
                    <span className={`app-badge ${rule.enabled ? "app-badge-online" : "app-badge-muted"}`}>
                      {rule.enabled ? "启用" : "停用"}
                    </span>
                  </td>
                  <td>{new Date(rule.updatedAt * 1000).toLocaleString()}</td>
                  <td>
                    <div className="app-actions">
                      <button
                        type="button"
                        className="app-button app-button-secondary"
                        onClick={() => onEdit(rule)}
                      >
                        编辑
                      </button>
                      <button
                        type="button"
                        className="app-button app-button-secondary"
                        onClick={() => void onToggle(rule)}
                      >
                        {rule.enabled ? "停用" : "启用"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rules.length === 0 && (
                <tr>
                  <td colSpan={7} className="app-empty">
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
