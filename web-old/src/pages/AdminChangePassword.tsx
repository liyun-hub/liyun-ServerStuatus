import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, auth } from "../api/client";

function parseError(error: unknown) {
  const message = (error as Error)?.message ?? "请求失败";
  try {
    const data = JSON.parse(message) as { error?: string; code?: string };
    if (data.error) return { message: data.error, code: data.code ?? "" };
  } catch {
    return { message, code: "" };
  }
  return { message, code: "" };
}

export default function AdminChangePasswordPage() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("请填写完整信息");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("两次输入的新密码不一致");
      return;
    }

    setLoading(true);
    try {
      const res = await api.adminChangePassword(currentPassword, newPassword);
      auth.setToken(res.token);
      auth.setMustChangePassword(res.mustChangePassword);
      navigate("/admin/nodes", { replace: true });
    } catch (e) {
      const parsed = parseError(e);
      if (parsed.message.includes("unauthorized") || parsed.message.includes("未登录")) {
        auth.clearToken();
        navigate("/admin/login", { replace: true });
        return;
      }
      setError(parsed.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="app-page app-auth-wrap">
      <div className="app-card">
        <h2 className="app-card-title">首次登录请修改密码</h2>
        <p className="app-muted" style={{ marginTop: 0 }}>
          为了安全，默认密码登录后必须先完成修改。
        </p>
        {error && <p className="app-error">{error}</p>}

        <form onSubmit={onSubmit} className="app-form">
          <label className="app-field">
            <span>当前密码</span>
            <input
              className="app-input"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </label>

          <label className="app-field">
            <span>新密码</span>
            <input
              className="app-input"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </label>

          <label className="app-field">
            <span>确认新密码</span>
            <input
              className="app-input"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </label>

          <button type="submit" className="app-button" disabled={loading}>
            {loading ? "提交中..." : "修改密码"}
          </button>
        </form>
      </div>
    </section>
  );
}
