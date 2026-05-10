import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminLoginPage() {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();

    if (user === "admin" && pass === "admin123") {
      sessionStorage.setItem("admin_auth", "true");
      sessionStorage.setItem("admin_login_time", Date.now().toString());
      navigate("/admin/dashboard");
    } else {
      alert("Invalid credentials");
    }
  };

  return (
    <div style={page}>
      <form onSubmit={handleLogin} style={card}>
        <h1 style={title}>Admin Login</h1>
        <p style={subtitle}>Secure access</p>

        <label style={label}>Username</label>
        <input
          style={input}
          placeholder="Enter username"
          value={user}
          onChange={(e) => setUser(e.target.value)}
        />

        <label style={label}>Password</label>
        <input
          style={input}
          type="password"
          placeholder="Enter password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
        />

        <button type="submit" style={button}>
          Login
        </button>
      </form>
    </div>
  );
}

const page = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  background: "#ffffff",
  fontFamily: "Inter, Arial, sans-serif",
};

const card = {
  width: 380,
  padding: 32,
  borderRadius: 18,
  background: "#ffffff",
  boxShadow: "0 20px 60px rgba(0,0,0,0.08)",
  border: "1px solid #e5e7eb",
};

const title = {
  margin: 0,
  fontSize: 28,
  fontWeight: 900,
  color: "#0f172a",
};

const subtitle = {
  margin: "6px 0 24px",
  color: "#64748b",
  fontWeight: 600,
};

const label = {
  display: "block",
  marginBottom: 6,
  fontSize: 13,
  fontWeight: 800,
  color: "#334155",
};

const input = {
  width: "100%",
  boxSizing: "border-box",
  padding: "13px 14px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  fontSize: 14,
  marginBottom: 14,
  outline: "none",
};

const button = {
  width: "100%",
  padding: 14,
  borderRadius: 10,
  border: "none",
  background: "#2563eb",
  color: "white",
  fontWeight: 900,
  cursor: "pointer",
  fontSize: 15,
};