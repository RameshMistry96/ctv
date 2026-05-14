import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FiGrid,
  FiCalendar,
  FiMonitor,
  FiLogOut,
} from "react-icons/fi";

export default function AdminLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    sessionStorage.removeItem("admin_auth");
    sessionStorage.removeItem("admin_login_time");
    navigate("/ctv-admin/login");
  };

  const menu = [
    {
      name: "Dashboard",
      path: "/ctv-admin/dashboard",
      icon: <FiGrid />,
      color: "#2563eb",
    },
    {
      name: "Routes",
      path: "/ctv-admin",
      icon: (
        <img
          src="/favicon.ico"
          alt="Routes"
          style={{
            width: 20,
            height: 20,
            objectFit: "contain",
          }}
        />
      ),
      color: "#f97316",
    },
    {
      name: "Templates",
      path: "/ctv-admin/templates",
      icon: <FiCalendar />,
      color: "#7c3aed",
    },
    {
      name: "TV Board",
      path: "/tv",
      icon: <FiMonitor />,
      color: "#0f766e",
    },
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
        <div style={logoBox}>
          <img
            src="/favicon.ico"
            alt="RouteFlow"
            style={{
              width: 26,
              height: 26,
              objectFit: "contain",
            }}
          />
        </div>

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
              }}
            >
              <span style={{ ...iconStyle, color: item.color }}>
                {item.icon}
              </span>
            </Link>
          );
        })}

        <button
          onClick={handleLogout}
          title="Logout"
          style={logoutButtonStyle}
        >
          <FiLogOut style={{ color: "#dc2626" }} />
        </button>
      </div>

      <div className="admin-content" style={contentStyle}>
        {children}
      </div>

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
              <span style={{ ...mobileIconStyle, color: item.color }}>
                {item.icon}
              </span>
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
  display: "grid",
  placeItems: "center",
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