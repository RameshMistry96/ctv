import { Link, useLocation, useNavigate } from "react-router-dom";

export default function AdminLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    sessionStorage.removeItem("admin_auth");
    sessionStorage.removeItem("admin_login_time");
    navigate("/ctv-admin/login");
  };

  const menu = [
    { name: "Dashboard", path: "/ctv-admin/dashboard", icon: "📊" },
    { name: "Routes", path: "/ctv-admin", icon: "📦" },
    { name: "Templates", path: "/ctv-admin/templates", icon: "🗓" },
    { name: "TV Board", path: "/tv", icon: "📺" },
  ];

  return (
    <div style={layoutStyle}>
      <style>{`
        @media (max-width: 768px) {
          .admin-sidebar {
            display: none !important;
          }

          .admin-content {
            width: 100% !important;
            padding-bottom: 90px !important;
          }

          .admin-mobile-nav {
            display: grid !important;
          }
        }
      `}</style>

      <div className="admin-sidebar" style={sidebarStyle}>
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

      <div className="admin-content" style={contentStyle}>{children}</div>

      <div className="admin-mobile-nav" style={mobileNavStyle}>
        {menu.slice(0, 3).map((item) => {
          const active = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              style={{
                ...mobileNavItemStyle,
                color: active ? "#2563eb" : "#64748b",
                background: active ? "#dbeafe" : "transparent",
              }}
            >
              <span style={mobileIconStyle}>{item.icon}</span>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>
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
  minWidth: 0,
};

const mobileNavStyle = {
  display: "none",
  position: "fixed",
  left: 10,
  right: 10,
  bottom: 10,
  gridTemplateColumns: "repeat(3, 1fr)",
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  padding: 8,
  boxShadow: "0 18px 45px rgba(15,23,42,.18)",
  zIndex: 100,
};

const mobileNavItemStyle = {
  textDecoration: "none",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 4,
  fontSize: 11,
  fontWeight: 900,
  borderRadius: 14,
  padding: "9px 4px",
};

const mobileIconStyle = {
  fontSize: 20,
};