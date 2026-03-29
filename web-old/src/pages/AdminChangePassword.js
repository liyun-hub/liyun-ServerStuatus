import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, auth } from "../api/client";
function parseError(error) {
    const message = error?.message ?? "请求失败";
    try {
        const data = JSON.parse(message);
        if (data.error)
            return { message: data.error, code: data.code ?? "" };
    }
    catch {
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
    const onSubmit = async (event) => {
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
        }
        catch (e) {
            const parsed = parseError(e);
            if (parsed.message.includes("unauthorized") || parsed.message.includes("未登录")) {
                auth.clearToken();
                navigate("/admin/login", { replace: true });
                return;
            }
            setError(parsed.message);
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx("section", { className: "app-page app-auth-wrap", children: _jsxs("div", { className: "app-card", children: [_jsx("h2", { className: "app-card-title", children: "\u9996\u6B21\u767B\u5F55\u8BF7\u4FEE\u6539\u5BC6\u7801" }), _jsx("p", { className: "app-muted", style: { marginTop: 0 }, children: "\u4E3A\u4E86\u5B89\u5168\uFF0C\u9ED8\u8BA4\u5BC6\u7801\u767B\u5F55\u540E\u5FC5\u987B\u5148\u5B8C\u6210\u4FEE\u6539\u3002" }), error && _jsx("p", { className: "app-error", children: error }), _jsxs("form", { onSubmit: onSubmit, className: "app-form", children: [_jsxs("label", { className: "app-field", children: [_jsx("span", { children: "\u5F53\u524D\u5BC6\u7801" }), _jsx("input", { className: "app-input", type: "password", value: currentPassword, onChange: (e) => setCurrentPassword(e.target.value), required: true })] }), _jsxs("label", { className: "app-field", children: [_jsx("span", { children: "\u65B0\u5BC6\u7801" }), _jsx("input", { className: "app-input", type: "password", value: newPassword, onChange: (e) => setNewPassword(e.target.value), required: true })] }), _jsxs("label", { className: "app-field", children: [_jsx("span", { children: "\u786E\u8BA4\u65B0\u5BC6\u7801" }), _jsx("input", { className: "app-input", type: "password", value: confirmPassword, onChange: (e) => setConfirmPassword(e.target.value), required: true })] }), _jsx("button", { type: "submit", className: "app-button", disabled: loading, children: loading ? "提交中..." : "修改密码" })] })] }) }));
}
