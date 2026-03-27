import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, auth } from "../api/client";

function parseError(error: unknown) {
  const message = (error as Error)?.message ?? "登录失败";
  try {
    const data = JSON.parse(message) as { error?: string };
    if (data.error) return data.error;
  } catch {
    return message;
  }
  return message;
}

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.adminLogin(username.trim(), password);
      auth.setToken(res.token);
      auth.setMustChangePassword(res.mustChangePassword);
      navigate(res.mustChangePassword ? "/admin/change-password" : "/admin/nodes", { replace: true });
    } catch (e) {
      setError(parseError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="app-page app-auth-wrap">
      <div className="app-card">
        <h2 className="app-card-title">后台登录</h2>
        {error && <p className="app-error">{error}</p>}

        <form onSubmit={onSubmit} className="app-form">
          <label className="app-field">
            <span>用户名</span>
            <input
              className="app-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </label>

          <label className="app-field">
            <span>密码</span>
            <input
              className="app-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          <button type="submit" className="app-button" disabled={loading}>
            {loading ? "登录中..." : "登录"}
          </button>
        </form>
      </div>
    </section>
  );
}
