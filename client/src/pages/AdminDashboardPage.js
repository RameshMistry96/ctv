import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { API_BASE } from "../config";

const socket = io(API_BASE);

const STATUSES = ["ON TIME", "DELAYED", "LOADING", "ENROUTE", "ARRIVED", "CANCELLED", "NOT STARTED"];

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState([]);
  const [now] = useState(new Date());

  const handleLogout = () => {
  sessionStorage.removeItem("admin_auth");
  navigate("/admin/login");
  };

  const loadRoutes = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/routes`);
      const data = await res.json();
      setRoutes(data.filter((r) => r.status !== "DEPARTED"));
    } catch (err) {
      console.error("Failed to load dashboard routes:", err);
    }
  };

 useEffect(() => {
  const isAuth = sessionStorage.getItem("admin_auth");
  const loginTime = Number(sessionStorage.getItem("admin_login_time"));
  const eightHours = 8 * 60 * 60 * 1000;

  if (!isAuth || !loginTime || Date.now() - loginTime > eightHours) {
    sessionStorage.removeItem("admin_auth");
    sessionStorage.removeItem("admin_login_time");
    navigate("/admin/login");
    return;
  }
    loadRoutes();

    socket.on("routes_updated", loadRoutes);

    const refreshTimer = setInterval(loadRoutes, 15000);

    return () => {
      socket.off("routes_updated", loadRoutes);
      clearInterval(refreshTimer);
    };
 }, [navigate]);

  const counts = useMemo(() => {
    const c = {};
    routes.forEach((r) => {
      c[r.status] = (c[r.status] || 0) + 1;
    });
    return c;
  }, [routes]);

  const total = routes.length;

    const recentActivities = useMemo(() => {
    return [...routes]
      .sort((a, b) => {
        const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
        const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
        return bTime - aTime;
      })
      .slice(0, 5)
      .map((r) => ({
        text: `Route ${r.route_number} is currently`,
        status: r.status,
        time: r.updated_at || r.created_at || "Just now",
      }));
  }, [routes]);

  const donutGradient = useMemo(() => {
    if (!total) return "#e2e8f0";

    let start = 0;

    const parts = STATUSES.map((status) => {
      const value = counts[status] || 0;
      if (!value) return null;

      const percent = (value / total) * 100;
      const end = start + percent;
      const part = `${statusColor(status)} ${start}% ${end}%`;
      start = end;
      return part;
    }).filter(Boolean);

    return `conic-gradient(${parts.join(", ")})`;
  }, [counts, total]);

  return (
    <div style={page}>
      <aside style={sidebar}>
        <div style={brand}>
          <div style={brandIcon}>✈</div>
          <div>
            <div style={brandTitle}>CTV SYSTEM</div>
            <div style={brandSub}>Admin Control Panel</div>
          </div>
        </div>

        <NavGroup title="MAIN">
          <NavItem active icon="⌂" text="Dashboard" to="/admin/dashboard" />
        </NavGroup>

        <NavGroup title="ROUTE MANAGEMENT">
          <NavItem icon="☷" text="Admin Routes" to="/admin" />
          <NavItem icon="▣" text="Weekly Templates" to="/templates" />
        </NavGroup>

        <NavGroup title="SYSTEM">
          <NavItem icon="⚙" text="Settings" to="/admin/dashboard" />
          <NavItem icon="♙" text="Users" to="/admin/dashboard" />
        </NavGroup>

        <NavGroup title="OTHER">
          <NavItem icon="▤" text="Activity Logs" to="/admin/dashboard" />
          <button onClick={handleLogout} style={logoutNavItem}>
            <span style={navIcon}>↪</span>
            Logout
            </button>
        </NavGroup>

        <div style={systemStatus}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={greenDot}></span>
            <strong>System Status</strong>
          </div>
          <div style={systemSub}>All Systems Operational</div>
        </div>
      </aside>

      <main style={main}>
        <header style={topbar}>
          <button style={hamburger}>☰</button>

          <div style={topRight}>
            <div style={bell}>🔔<span style={badge}>{(counts["DELAYED"] || 0) + (counts["CANCELLED"] || 0)}</span></div>
            <div style={avatar}>A</div>
            <strong>Admin User</strong>
            <span>⌄</span>
          </div>
        </header>

        <section style={content}>
          <div style={titleRow}>
            <div>
              <h1 style={title}><span style={titleIcon}>▧</span> Dashboard</h1>
              <p style={subtitle}>Overview of today’s operations and system status</p>
            </div>

            <div style={dateCard}>▣ {now.toLocaleDateString([], { month: "long", day: "numeric", year: "numeric", weekday: "long" })}</div>
          </div>

          <div style={statsGrid}>
            <StatCard icon="✈" value={total} label="Total Routes" sub="Scheduled for today" color="#2563eb" />
            <StatCard icon="✓" value={counts["ON TIME"] || 0} label="On Time" sub="Routes running on time" color="#16a34a" />
            <StatCard icon="◷" value={counts["DELAYED"] || 0} label="Delayed" sub="Routes delayed" color="#f97316" />
            <StatCard icon="🚚" value={counts["LOADING"] || 0} label="Loading" sub="Currently loading" color="#7c3aed" />
            <StatCard icon="✈" value={counts["ENROUTE"] || 0} label="Enroute" sub="Currently enroute" color="#0f766e" />
            <StatCard icon="×" value={counts["CANCELLED"] || 0} label="Cancelled" sub="Routes cancelled" color="#ef4444" />
          </div>

          <div style={middleGrid}>
            <div style={card}>
              <h2 style={cardTitle}>⌁ Route Status Overview</h2>
              <div style={overviewBody}>
                <div style={{ ...donut, background: donutGradient }}>
                  <div style={donutInner}>
                    <strong>{total}</strong>
                    <span>Total</span>
                  </div>
                </div>

                <div style={legend}>
                  {STATUSES.map((s) => (
                    <div key={s} style={legendRow}>
                      <span style={{ ...legendDot, background: statusColor(s) }}></span>
                      <span>{labelCase(s)}</span>
                      <span>{counts[s] || 0}</span>
                      <span>{total ? Math.round(((counts[s] || 0) / total) * 100) : 0}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={card}>
              <h2 style={cardTitle}>◷ Recent Activity</h2>
                    {recentActivities.length === 0 ? (
                    <div style={{ color: "#64748b", fontWeight: 700 }}>
                        No recent route activity yet
                    </div>
                    ) : (
                    recentActivities.map((a, index) => (
                        <Activity
                        key={index}
                        text={a.text}
                        status={a.status}
                        time={formatActivityTime(a.time)}
                        />
                    ))
                    )}
              <div style={viewLink}>View all activity logs →</div>
            </div>
          </div>

          <div style={card}>
            <div style={routesHeader}>
              <h2 style={cardTitle}>☷ Today’s Routes</h2>
              <div style={tabs}>
                <span style={tabActive}>All ({total})</span>
                <span style={{ ...tab, color: "#16a34a" }}>On Time ({counts["ON TIME"] || 0})</span>
                <span style={{ ...tab, color: "#f97316" }}>Delayed ({counts["DELAYED"] || 0})</span>
                <span style={{ ...tab, color: "#2563eb" }}>Loading ({counts["LOADING"] || 0})</span>
                <span style={{ ...tab, color: "#7c3aed" }}>Enroute ({counts["ENROUTE"] || 0})</span>
                <span style={{ ...tab, color: "#dc2626" }}>Cancelled ({counts["CANCELLED"] || 0})</span>
              </div>
              <Link to="/admin" style={addBtn}>＋ Add New Route</Link>
            </div>

            <div style={table}>
              <div style={thead}>
                <span>DEPART TIME</span>
                <span>ROUTE</span>
                <span>DESTINATION</span>
                <span>STATUS</span>
                <span>DELAY</span>
                <span>NOTES / COMMENT</span>
                <span>ACTIONS</span>
              </div>

              {routes.slice(0, 7).map((r) => (
                <div key={r.id} style={{ ...trow, borderLeft: `4px solid ${statusColor(r.status)}` }}>
                  <span style={timeText}>{r.scheduled_departure_time}</span>
                  <span style={routeText}>{r.route_number} → {r.destination}</span>
                  <span>{destName(r.destination)}</span>
                  <span><b style={{ ...pill, background: statusColor(r.status) }}>{r.status}</b></span>
                  <span style={{ color: r.delay_minutes > 0 ? "#f97316" : "#64748b", fontWeight: 800 }}>
                    {r.delay_minutes > 0 ? `${r.delay_minutes} min` : "---"}
                  </span>
                  <span>{r.notes || "--"}</span>
                  <span style={actions}>
                    <Link to="/admin" style={actionBtn}>✎</Link>
                    <Link to="/ctv-board" style={eyeBtn}>◉</Link>
                  </span>
                </div>
              ))}
            </div>

            <Link to="/admin" style={bottomLink}>View all routes →</Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function NavGroup({ title, children }) {
  return (
    <div style={navGroup}>
      <div style={navTitle}>{title}</div>
      {children}
    </div>
  );
}

function NavItem({ icon, text, to, active }) {
  return (
    <Link to={to} style={active ? navItemActive : navItem}>
      <span style={navIcon}>{icon}</span>
      {text}
    </Link>
  );
}

function StatCard({ icon, value, label, sub, color }) {
  return (
    <div style={statCard}>
      <div style={{ ...statIcon, background: color }}>{icon}</div>
      <div>
        <div style={statValue}>{value}</div>
        <div style={statLabel}>{label}</div>
        <div style={statSub}>{sub}</div>
      </div>
    </div>
  );
}

function formatActivityTime(value) {
  if (!value) return "Just now";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Activity({ text, status, time }) {
  return (
    <div style={activityRow}>
      <span>⊕</span>
      <span>{text} {status && <b style={{ color: statusColor(status) }}>{status}</b>}</span>
      <span>{time}</span>
    </div>
  );
}

const statusColor = (s) => ({
  "ON TIME": "#16a34a",
  DELAYED: "#f97316",
  LOADING: "#2563eb",
  ENROUTE: "#7c3aed",
  ARRIVED: "#0f766e",
  CANCELLED: "#ef4444",
  "NOT STARTED": "#94a3b8",
}[s] || "#64748b");

const labelCase = (s) => s.charAt(0) + s.slice(1).toLowerCase();
const destName = (d) => ({ YMX: "Montreal-Trudeau", YYZR: "Billy Bishop Toronto City", YBCS: "Nanaimo Harbour", YQX: "Gander Intl", YMXR: "Montreal Mirabel", YTZR: "Toronto Pearson", YQG: "Windsor Intl", YUL: "Montreal-Trudeau" }[d] || d);

const page = { minHeight: "100vh", display: "flex", background: "#f8fafc", color: "#0f172a", fontFamily: "Inter, Arial, sans-serif" };
const sidebar = { width: 280, background: "#ffffff", borderRight: "1px solid #e2e8f0", padding: "22px 14px", display: "flex", flexDirection: "column", gap: 16 };
const brand = { display: "flex", gap: 14, alignItems: "center", padding: "0 8px 20px", borderBottom: "1px solid #e2e8f0" };
const brandIcon = { width: 50, height: 50, borderRadius: 12, background: "#2563eb", color: "white", display: "grid", placeItems: "center", fontSize: 30 };
const brandTitle = { fontSize: 24, fontWeight: 950 };
const brandSub = { color: "#64748b", fontWeight: 600 };
const navGroup = { marginTop: 12 };
const navTitle = { color: "#64748b", fontSize: 13, fontWeight: 900, margin: "18px 8px 10px" };
const navItem = { display: "flex", gap: 14, alignItems: "center", padding: "14px 12px", borderRadius: 9, textDecoration: "none", color: "#0f172a", fontWeight: 700 };
const navItemActive = { ...navItem, background: "#dbeafe", color: "#2563eb" };
const navIcon = { fontSize: 20 };
const systemStatus = { marginTop: "auto", border: "1px solid #e2e8f0", borderRadius: 10, padding: 18 };
const greenDot = { width: 13, height: 13, background: "#22c55e", borderRadius: "50%" };
const systemSub = { color: "#475569", marginTop: 8 };

const main = { flex: 1 };
const topbar = { height: 72, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 28px", borderBottom: "1px solid #e2e8f0", background: "#fff" };
const hamburger = { border: "none", background: "transparent", fontSize: 26, cursor: "pointer" };
const topRight = { display: "flex", gap: 14, alignItems: "center" };
const bell = { position: "relative", fontSize: 22 };
const badge = { position: "absolute", top: -10, right: -9, background: "#ef4444", color: "white", borderRadius: "50%", fontSize: 11, padding: "2px 6px" };
const avatar = { width: 40, height: 40, borderRadius: "50%", background: "#2563eb", color: "white", display: "grid", placeItems: "center", fontWeight: 900 };

const content = { padding: 28 };
const titleRow = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 };
const title = { margin: 0, fontSize: 32, fontWeight: 950 };
const titleIcon = { marginRight: 12 };
const subtitle = { margin: "6px 0 0", color: "#475569", fontWeight: 600 };
const dateCard = { border: "1px solid #cbd5e1", borderRadius: 8, padding: "14px 18px", background: "#fff", fontWeight: 800 };

const statsGrid = { display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 14, marginBottom: 22 };
const statCard = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 18, display: "flex", gap: 16, alignItems: "center" };
const statIcon = { width: 56, height: 56, borderRadius: "50%", color: "white", display: "grid", placeItems: "center", fontSize: 28 };
const statValue = { fontSize: 28, fontWeight: 950 };
const statLabel = { fontWeight: 900 };
const statSub = { color: "#475569", fontSize: 13 };

const middleGrid = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 22 };
const card = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20 };
const cardTitle = { margin: "0 0 18px", fontSize: 20 };
const overviewBody = { display: "grid", gridTemplateColumns: "250px 1fr", gap: 24, alignItems: "center" };
const donut = { width: 170, height: 170, borderRadius: "50%", background: "conic-gradient(#16a34a 0 25%, #f97316 25% 42%, #2563eb 42% 60%, #7c3aed 60% 70%, #ef4444 70% 82%, #cbd5e1 82% 100%)", display: "grid", placeItems: "center", margin: "auto" };
const donutInner = { width: 98, height: 98, borderRadius: "50%", background: "#fff", display: "grid", placeItems: "center", textAlign: "center", fontSize: 22 };
const legend = { display: "flex", flexDirection: "column", gap: 12 };
const legendRow = { display: "grid", gridTemplateColumns: "20px 1fr 40px 50px", borderBottom: "1px solid #e2e8f0", paddingBottom: 8 };
const legendDot = { width: 14, height: 14, borderRadius: "50%" };

const activityRow = { display: "grid", gridTemplateColumns: "30px 1fr 80px", padding: "11px 0", borderBottom: "1px solid #e2e8f0", fontSize: 14 };
const viewLink = { color: "#2563eb", fontWeight: 900, marginTop: 12 };

const routesHeader = { display: "flex", alignItems: "center", gap: 16, marginBottom: 14 };
const tabs = { display: "flex", gap: 8, flex: 1 };
const tab = { padding: "8px 12px", borderRadius: 7, fontWeight: 900, background: "#f8fafc", fontSize: 13 };
const tabActive = { ...tab, background: "#dbeafe", color: "#2563eb" };
const addBtn = { background: "#2563eb", color: "white", padding: "11px 18px", borderRadius: 7, textDecoration: "none", fontWeight: 900 };

const table = { borderTop: "1px solid #e2e8f0" };
const thead = { display: "grid", gridTemplateColumns: "1fr 1.5fr 2fr 1.2fr 1fr 2fr 1fr", padding: "13px 16px", color: "#64748b", fontSize: 12, fontWeight: 900 };
const trow = { display: "grid", gridTemplateColumns: "1fr 1.5fr 2fr 1.2fr 1fr 2fr 1fr", padding: "13px 16px", alignItems: "center", borderTop: "1px solid #e2e8f0", fontSize: 14 };
const timeText = { fontWeight: 900 };
const routeText = { fontWeight: 900 };
const pill = { color: "white", padding: "6px 12px", borderRadius: 5, fontSize: 12 };
const actions = { display: "flex", gap: 8 };
const actionBtn = { background: "#2563eb", color: "white", borderRadius: 6, padding: "7px 10px", textDecoration: "none" };
const eyeBtn = { background: "#eef2ff", color: "#334155", borderRadius: 6, padding: "7px 10px", textDecoration: "none" };
const bottomLink = { display: "inline-block", marginTop: 16, color: "#2563eb", fontWeight: 900, textDecoration: "none" };
const logoutNavItem = {
  display: "flex",
  gap: 14,
  alignItems: "center",
  padding: "14px 12px",
  borderRadius: 9,
  textDecoration: "none",
  color: "#dc2626",
  fontWeight: 700,
  border: "none",
  background: "#fee2e2",
  cursor: "pointer",
  width: "100%",
  fontSize: 16,
};