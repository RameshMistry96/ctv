import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function TVLoginPage() {
  const [pin, setPin] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const isAuth = sessionStorage.getItem("tv_auth");

    if (isAuth) {
      navigate("/ctv-board");
    }
  }, [navigate]);

  const handleLogin = async () => {
    if (pin === "1234") {
      sessionStorage.setItem("tv_auth", "true");
      sessionStorage.setItem("tv_login_time", Date.now().toString());

      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
      } catch (err) {
        console.log("Fullscreen blocked by browser");
      }

      navigate("/ctv-board");
    } else {
      alert("Invalid PIN");
    }
  };

  return (
    <div style={page}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleLogin();
        }}
        style={card}
      >
        <h2 style={title}>TV Access</h2>
        <p style={subtitle}>Enter PIN to open board</p>

        <input
          type="password"
          placeholder="Enter PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          style={input}
          autoFocus
        />

        <button type="submit" style={button}>
          Enter
        </button>
      </form>
    </div>
  );
}

const page = {
  height: "100vh",
  display: "grid",
  placeItems: "center",
  background: "linear-gradient(135deg,#0f172a,#1e3a8a,#2563eb)",
  fontFamily: "Inter, Arial, sans-serif",
};

const card = {
  width: 340,
  background: "#ffffff",
  borderRadius: 16,
  padding: 30,
  boxShadow: "0 20px 60px rgba(0,0,0,.25)",
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

const title = {
  margin: 0,
  fontSize: 26,
  fontWeight: 900,
  color: "#0f172a",
};

const subtitle = {
  margin: 0,
  fontSize: 14,
  color: "#64748b",
};

const input = {
  padding: "14px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  fontSize: 16,
  outline: "none",
};

const button = {
  marginTop: 10,
  padding: "14px",
  borderRadius: 10,
  border: "none",
  background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
  color: "white",
  fontWeight: 900,
  cursor: "pointer",
  fontSize: 16,
};