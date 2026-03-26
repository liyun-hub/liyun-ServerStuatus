import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, auth } from "../api/client";
export default function AdminLoginPage() {
    const navigate = useNavigate();
    const [username, setUsername] = useState("admin");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const onSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await api.adminLogin(username.trim(), password);
            auth.setToken(res.token);
            navigate("/admin/nodes", { replace: true });
        }
        catch (e) {
            setError(e.message || "登录失败");
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx("section", { className: "app-page app-auth-wrap", children: _jsxs("div", { className: "app-card", children: [_jsx("h2", { className: "app-card-title", children: "\u540E\u53F0\u767B\u5F55" }), error && _jsx("p", { className: "app-error", children: error }), _jsxs("form", { onSubmit: onSubmit, className: "app-form", children: [_jsxs("label", { className: "app-field", children: [_jsx("span", { children: "\u7528\u6237\u540D" }), _jsx("input", { className: "app-input", value: username, onChange: (e) => setUsername(e.target.value), required: true })] }), _jsxs("label", { className: "app-field", children: [_jsx("span", { children: "\u5BC6\u7801" }), _jsx("input", { className: "app-input", type: "password", value: password, onChange: (e) => setPassword(e.target.value), required: true })] }), _jsx("button", { type: "submit", className: "app-button", disabled: loading, children: loading ? "登录中..." : "登录" })] })] }) }));
}
