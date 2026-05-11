import { Link, useLocation, useNavigate } from "react-router-dom";

export default function AdminLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    sessionStorage.removeItem("admin_auth");
    navigate("/ctv-admin/login");
  };

  const menu = [
    { name: "Dashboard", path: "/admin/dashboard", icon: "📊" },
    { name: "Routes", path: "/admin", icon: "📦" },
    { name: "Templates", path: "/templates", icon: "🗓" },
    { name: "TV Board", path: "/ctv-board", icon: "📺" },
  ];

  return (
    <div style={layoutStyle}>
      <div style={sidebarStyle}>
        <div style={logoBox}>🚚</div>

        {menu.map((item) => {
          const active = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              title={item.name}
              style={{
                ...iconButtonStyle,
                background: active ? "#dbeafe" : "transparent",
                color: active ? "#2563eb" : "#334155",
              }}
            >
              <span style={iconStyle}>{item.icon}</span>
            </Link>
          );
        })}

        <button onClick={handleLogout} title="Logout" style={logoutButtonStyle}>
          ↪
        </button>
      </div>

      <div style={contentStyle}>{children}</div>
    </div>
  );
}

const layoutStyle = {
  display: "flex",
  minHeight: "100vh",
  background: "#f8fafc",
};

const sidebarStyle = {
  width: "82px",
  background: "#ffffff",
  padding: "18px 10px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "14px",
  borderRight: "1px solid #e2e8f0",
};

const logoBox = {
  width: 50,
  height: 50,
  borderRadius: 14,
  background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
  color: "white",
  display: "grid",
  placeItems: "center",
  fontSize: 24,
  marginBottom: 18,
};

const iconButtonStyle = {
  width: 50,
  height: 50,
  borderRadius: 14,
  display: "grid",
  placeItems: "center",
  textDecoration: "none",
  transition: "all .2s ease",
};

const iconStyle = {
  fontSize: 22,
};

const logoutButtonStyle = {
  width: 50,
  height: 50,
  borderRadius: 14,
  display: "grid",
  placeItems: "center",
  border: "none",
  background: "#fee2e2",
  color: "#dc2626",
  fontSize: 22,
  cursor: "pointer",
  marginTop: "auto",
};

const contentStyle = {
  flex: 1,
  background: "#f8fafc",
};