import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import {
  FiActivity,
  FiArrowDownLeft,
  FiArrowRight,
  FiClock,
  FiEye,
  FiMapPin,
  FiTruck,
} from "react-icons/fi";

import AdminLayout from "../components/AdminLayout";
import { API_BASE } from "../config";

const socket = io(API_BASE);

const STATUSES = [
  "ON TIME",
  "DELAYED",
  "LOADING",
  "ENROUTE",
  "ARRIVED",
  "CANCELLED",
  "NOT STARTED",
];

export default function AdminDashboardPage() {
  const navigate = useNavigate();

  const [routes, setRoutes] = useState([]);
  const [now] = useState(new Date());

  /* =====================================================
     KEEP EXISTING ROUTE LOAD LOGIC
  ===================================================== */

  const loadRoutes = async () => {
    try {
      const res = await fetch(`/api/ctv/api/routes`);
      const data = await res.json();

      setRoutes(
        data.filter(
          (r) => r.status !== "DEPARTED"
        )
      );
    } catch (err) {
      console.error(
        "Failed to load dashboard routes:",
        err
      );
    }
  };

  /* =====================================================
     KEEP EXISTING AUTH + SOCKET LOGIC
  ===================================================== */

  useEffect(() => {
    const isAuth =
      sessionStorage.getItem("admin_auth");

    const loginTime = Number(
      sessionStorage.getItem(
        "admin_login_time"
      )
    );

    const eightHours =
      8 * 60 * 60 * 1000;

    if (
      !isAuth ||
      !loginTime ||
      Date.now() - loginTime > eightHours
    ) {
      sessionStorage.removeItem(
        "admin_auth"
      );

      sessionStorage.removeItem(
        "admin_login_time"
      );

      navigate("/ctv-admin/login");

      return;
    }

    loadRoutes();

    socket.on(
      "routes_updated",
      loadRoutes
    );

    const refreshTimer =
      setInterval(
        loadRoutes,
        15000
      );

    return () => {
      socket.off(
        "routes_updated",
        loadRoutes
      );

      clearInterval(
        refreshTimer
      );
    };
  }, [navigate]);

  /* =====================================================
     KEEP EXISTING STATUS COUNTS
  ===================================================== */

  const counts = useMemo(() => {
    const c = {};

    routes.forEach((r) => {
      c[r.status] =
        (c[r.status] || 0) + 1;
    });

    return c;
  }, [routes]);

  const total = routes.length;

  /* =====================================================
     ROUTE TYPE COUNTS
  ===================================================== */

  const arrivals = useMemo(() => {
    return routes.filter(
      (r) =>
        getRouteType(r) === "INBOUND"
    ).length;
  }, [routes]);

  const departures = useMemo(() => {
    return routes.filter(
      (r) =>
        getRouteType(r) === "OUTBOUND"
    ).length;
  }, [routes]);

  /* =====================================================
     KEEP RECENT ACTIVITY LOGIC
  ===================================================== */

  const recentActivities =
    useMemo(() => {
      return [...routes]
        .sort((a, b) => {
          const aTime =
            new Date(
              a.updated_at ||
                a.created_at ||
                0
            ).getTime();

          const bTime =
            new Date(
              b.updated_at ||
                b.created_at ||
                0
            ).getTime();

          return bTime - aTime;
        })
        .slice(0, 5);
    }, [routes]);

  return (
    <AdminLayout>
      <style>
        {responsiveCss}
      </style>

      <div
        style={pageStyle}
        className="dashboard-page-scale"
      >
        {/* HEADER */}

        <div
          style={headerStyle}
          className="dashboard-header"
        >
          <div>
            <div style={smallTopText}>
              CTV OPERATIONS
            </div>

            <h1 style={titleStyle}>
              Dashboard
            </h1>

            <p style={subtitleStyle}>
              Overview of today’s operations
            </p>
          </div>

          <div
            style={dateBoxStyle}
            className="dashboard-date"
          >
            <FiClock />

            {now.toLocaleDateString(
              [],
              {
                month: "short",
                day: "numeric",
                year: "numeric",
                weekday: "short",
              }
            )}
          </div>
        </div>

        {/* TOP SUMMARY CARDS */}

        <div
          style={statsGridStyle}
          className="dashboard-stats"
        >
          <StatCard
            icon={<FiActivity />}
            value={total}
            label="Total Routes"
            sub="Scheduled for today"
            color="#ec2772"
            soft="#fff0f6"
          />

          <StatCard
            icon="✓"
            value={
              counts["ON TIME"] || 0
            }
            label="On Time"
            sub="Routes running on time"
            color="#16a34a"
            soft="#ecfdf3"
          />

          <StatCard
            icon={<FiClock />}
            value={
              counts["DELAYED"] || 0
            }
            label="Delayed"
            sub="Routes delayed"
            color="#f97316"
            soft="#fff7ed"
          />

          <StatCard
            icon={<FiTruck />}
            value={
              counts["ENROUTE"] || 0
            }
            label="Enroute"
            sub="Routes on the way"
            color="#8b5cf6"
            soft="#f5f3ff"
          />

          <StatCard
            icon={<FiArrowDownLeft />}
            value={arrivals}
            label="Arrivals"
            sub="Scheduled to arrive"
            color="#0ea5e9"
            soft="#f0f9ff"
          />
        </div>

        {/* MAIN GRID */}

        <div
          style={mainGridStyle}
          className="dashboard-main-grid"
        >
          {/* TODAY'S ROUTES */}

          <div
            style={cardStyle}
            className="dashboard-main-card"
          >
            <div
              style={cardHeaderStyle}
              className="dashboard-card-header"
            >
              <div>
                <h2
                  style={cardTitleStyle}
                  className="dashboard-card-title"
                >
                  Today’s Routes
                </h2>

                <div
                  style={cardSubtitleStyle}
                  className="dashboard-card-subtitle"
                >
                  Live operational route overview
                </div>
              </div>

              <Link
                to="/ctv-admin"
                style={headerLinkStyle}
              >
                View all routes →
              </Link>
            </div>

            {/* FILTER DISPLAY */}

            <div
              style={filterRowStyle}
              className="dashboard-filter-row"
            >
              <span
                className="dashboard-filter-pill"
                style={{
                  ...filterPillStyle,
                  background: "#fff0f6",
                  color: "#ec2772",
                  borderColor: "#ffd6e5",
                }}
              >
                All ({total})
              </span>

              <span
                className="dashboard-filter-pill"
                style={{
                  ...filterPillStyle,
                  background: "#ecfdf3",
                  color: "#16a34a",
                  borderColor: "#bbf7d0",
                }}
              >
                On Time ({counts["ON TIME"] || 0})
              </span>

              <span
                className="dashboard-filter-pill"
                style={{
                  ...filterPillStyle,
                  background: "#fff7ed",
                  color: "#f97316",
                  borderColor: "#fed7aa",
                }}
              >
                Delayed ({counts["DELAYED"] || 0})
              </span>

              <span
                className="dashboard-filter-pill"
                style={{
                  ...filterPillStyle,
                  background: "#f5f3ff",
                  color: "#7c3aed",
                  borderColor: "#ddd6fe",
                }}
              >
                Enroute ({counts["ENROUTE"] || 0})
              </span>

              <span
                className="dashboard-filter-pill"
                style={{
                  ...filterPillStyle,
                  background: "#fef2f2",
                  color: "#dc2626",
                  borderColor: "#fecaca",
                }}
              >
                Cancelled ({counts["CANCELLED"] || 0})
              </span>
            </div>

            {/* TABLE */}

            <div
              style={tableWrapStyle}
              className="dashboard-table-wrap"
            >
              <div
                style={tableHeaderStyle}
                className="dashboard-table-row dashboard-table-header"
              >
                <span>DEPART / ARRIVE</span>
                <span>ROUTE</span>
                <span>DESTINATION</span>
                <span>STATUS</span>
                <span>DELAY</span>
                <span>DOOR</span>
                <span>ACTIONS</span>
              </div>

              {routes
                .slice(0, 6)
                .map((route) => {
                  const isArrival =
                    getRouteType(route) ===
                    "INBOUND";

                  return (
                    <div
                      key={route.id}
                      style={tableRowStyle}
                      className="dashboard-table-row"
                    >
                      {/* TIME */}

                      <div>
                        <div
                          className="dashboard-route-time"
                          style={{
                            ...routeTimeStyle,
                            color: isArrival
                              ? "#16a34a"
                              : "#ec2772",
                          }}
                        >
                          {
                            route.scheduled_departure_time
                          }
                        </div>

                        <div
                          className="dashboard-route-type"
                          style={{
                            ...routeTypeStyle,
                            color: isArrival
                              ? "#16a34a"
                              : "#ec2772",
                          }}
                        >
                          {isArrival
                            ? "Arrive"
                            : "Depart"}
                        </div>
                      </div>

                      {/* ROUTE */}

                      <div style={routeNameStyle}>
                        {route.route_number}

                        <span style={routeArrowStyle}>
                          {isArrival
                            ? "←"
                            : "→"}
                        </span>

                        {route.destination}
                      </div>

                      {/* DESTINATION */}

                      <div style={destinationStyle}>
                        <FiMapPin />
                        {route.destination}
                      </div>

                      {/* STATUS */}

                      <div>
                        <span
                          className="dashboard-status-pill"
                          style={{
                            ...statusPillStyle,
                            background:
                              statusSoftBg(
                                route.status
                              ),
                            color:
                              statusColor(
                                route.status
                              ),
                            borderColor:
                              statusBorder(
                                route.status
                              ),
                          }}
                        >
                          {route.status}
                        </span>
                      </div>

                      {/* DELAY */}

                      <div
                        style={{
                          ...delayStyle,
                          color:
                            Number(
                              route.delay_minutes
                            ) > 0
                              ? "#f97316"
                              : "#94a3b8",
                        }}
                      >
                        {Number(
                          route.delay_minutes
                        ) > 0
                          ? `${route.delay_minutes} min`
                          : "--"}
                      </div>

                      {/* DOOR */}

                      <div style={doorStyle}>
                        {route.door_number || "--"}
                      </div>

                      {/* ACTION */}

                      <div>
                        <Link
                          to="/ctv-admin"
                          style={viewButtonStyle}
                        >
                          <FiEye />
                        </Link>
                      </div>
                    </div>
                  );
                })}

              {routes.length === 0 && (
                <div style={emptyRoutesStyle}>
                  No routes available today.
                </div>
              )}
            </div>

            <Link
              to="/ctv-admin"
              style={bottomLinkStyle}
            >
              View all routes →
            </Link>
          </div>

          {/* RECENT ACTIVITY */}

          <div
            style={cardStyle}
            className="dashboard-main-card"
          >
            <div style={cardHeaderStyle}>
              <div>
                <h2
                  style={cardTitleStyle}
                  className="dashboard-card-title"
                >
                  Recent Activity
                </h2>

                <div
                  style={cardSubtitleStyle}
                  className="dashboard-card-subtitle"
                >
                  Latest route updates
                </div>
              </div>
            </div>

            <div>
              {recentActivities.length === 0 ? (
                <div style={noActivityStyle}>
                  No recent route activity yet.
                </div>
              ) : (
                recentActivities.map(
                  (route) => (
                    <Activity
                      key={route.id}
                      route={route}
                    />
                  )
                )
              )}
            </div>
          </div>
        </div>

        {/* BOTTOM OPERATION CARDS */}

        <div
          style={bottomStatsGrid}
          className="dashboard-bottom-stats"
        >
          <MiniStat
            title="Departures"
            value={departures}
            color="#ec2772"
            icon={<FiArrowRight />}
          />

          <MiniStat
            title="Loading"
            value={
              counts["LOADING"] || 0
            }
            color="#2563eb"
            icon={<FiTruck />}
          />

          <MiniStat
            title="Not Started"
            value={
              counts["NOT STARTED"] || 0
            }
            color="#64748b"
            icon={<FiClock />}
          />

          <MiniStat
            title="Cancelled"
            value={
              counts["CANCELLED"] || 0
            }
            color="#ef4444"
            icon="×"
          />
        </div>
      </div>
    </AdminLayout>
  );
}

/* =====================================================
   TOP STAT CARD
===================================================== */

function StatCard({
  icon,
  value,
  label,
  sub,
  color,
  soft,
}) {
  return (
    <div
      style={statCardStyle}
      className="dashboard-stat-card"
    >
      <div
        className="dashboard-stat-icon"
        style={{
          ...statIconStyle,
          background: soft,
          color,
        }}
      >
        {icon}
      </div>

      <div>
        <div
          style={statValueStyle}
          className="dashboard-stat-value"
        >
          {value}
        </div>

        <div
          style={statLabelStyle}
          className="dashboard-stat-label"
        >
          {label}
        </div>

        <div
          style={statSubStyle}
          className="dashboard-stat-sub"
        >
          {sub}
        </div>
      </div>

      <div
        style={{
          ...smallAccentStyle,
          background: color,
        }}
      />
    </div>
  );
}

/* =====================================================
   MINI STAT
===================================================== */

function MiniStat({
  title,
  value,
  color,
  icon,
}) {
  return (
    <div
      style={miniCardStyle}
      className="dashboard-bottom-card"
    >
      <div
        className="dashboard-mini-icon"
        style={{
          ...miniIconStyle,
          background: `${color}12`,
          color,
        }}
      >
        {icon}
      </div>

      <div>
        <div
          style={miniTitleStyle}
          className="dashboard-bottom-title"
        >
          {title}
        </div>

        <div
          style={{
            ...miniValueStyle,
            color,
          }}
          className="dashboard-bottom-value"
        >
          {value}
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   ACTIVITY
===================================================== */

function Activity({ route }) {
  const status =
    route.status || "NOT STARTED";

  return (
    <div
      style={activityRowStyle}
      className="dashboard-activity-row"
    >
      <div
        className="dashboard-activity-icon"
        style={{
          ...activityIconStyle,
          background:
            statusSoftBg(status),
          color:
            statusColor(status),
        }}
      >
        {getActivityIcon(status)}
      </div>

      <div style={activityMainStyle}>
        <div
          style={activityTitleStyle}
          className="dashboard-activity-title"
        >
          Route {route.route_number}{" "}
          <span
            style={{
              color:
                statusColor(status),
            }}
          >
            {labelCase(status)}
          </span>
        </div>

        <div
          style={activitySubStyle}
          className="dashboard-activity-sub"
        >
          {route.notes ||
            `${route.destination} • Door ${
              route.door_number || "--"
            }`}
        </div>
      </div>

      <div
        style={activityTimeStyle}
        className="dashboard-activity-time"
      >
        {formatActivityTime(
          route.updated_at ||
            route.created_at
        )}
      </div>
    </div>
  );
}

/* =====================================================
   HELPERS
===================================================== */

const getRouteType = (route) =>
  String(
    route.route_type ||
      route.type ||
      "OUTBOUND"
  ).toUpperCase();

function formatActivityTime(value) {
  if (!value) {
    return "Just now";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Just now";
  }

  return date.toLocaleTimeString(
    [],
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

const labelCase = (status) => {
  return String(status || "")
    .toLowerCase()
    .replace(/\b\w/g, (char) =>
      char.toUpperCase()
    );
};

const getActivityIcon = (status) => {
  switch (status) {
    case "ON TIME":
      return "✓";

    case "DELAYED":
      return "◷";

    case "LOADING":
      return "▣";

    case "ENROUTE":
      return "→";

    case "ARRIVED":
      return "✓";

    case "CANCELLED":
      return "×";

    default:
      return "•";
  }
};

const statusColor = (status) =>
  ({
    "ON TIME": "#16a34a",
    DELAYED: "#f97316",
    LOADING: "#2563eb",
    ENROUTE: "#7c3aed",
    ARRIVED: "#0f766e",
    CANCELLED: "#ef4444",
    "NOT STARTED": "#64748b",
    DEPARTED: "#ec2772",
  }[status] || "#64748b");

const statusSoftBg = (status) =>
  ({
    "ON TIME": "#ecfdf3",
    DELAYED: "#fff7ed",
    LOADING: "#eff6ff",
    ENROUTE: "#f5f3ff",
    ARRIVED: "#ecfdf5",
    CANCELLED: "#fef2f2",
    "NOT STARTED": "#f1f5f9",
    DEPARTED: "#fff0f6",
  }[status] || "#f8fafc");

const statusBorder = (status) =>
  ({
    "ON TIME": "#bbf7d0",
    DELAYED: "#fed7aa",
    LOADING: "#bfdbfe",
    ENROUTE: "#ddd6fe",
    ARRIVED: "#bbf7d0",
    CANCELLED: "#fecaca",
    "NOT STARTED": "#cbd5e1",
    DEPARTED: "#ffd6e5",
  }[status] || "#e2e8f0");

/* =====================================================
   PAGE
===================================================== */

const pageStyle = {
  padding: "28px 30px 38px",
  minHeight: "100vh",
  background:
    "linear-gradient(180deg,#fafbfe,#f6f7fb)",
  color: "#111827",
};

/* =====================================================
   HEADER
===================================================== */

const headerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 24,
  gap: 20,
};

const smallTopText = {
  color: "#ec2772",
  fontSize: 9,
  fontWeight: 900,
  letterSpacing: ".14em",
  marginBottom: 6,
};

const titleStyle = {
  margin: 0,
  fontSize: 29,
  fontWeight: 900,
  letterSpacing: "-.035em",
};

const subtitleStyle = {
  margin: "5px 0 0",
  color: "#64748b",
  fontSize: 12,
  fontWeight: 600,
};

const dateBoxStyle = {
  minHeight: 43,
  padding: "0 15px",
  display: "flex",
  alignItems: "center",
  gap: 9,
  background: "#ffffff",
  border:
    "1px solid #e4e7ec",
  borderRadius: 8,
  color: "#475569",
  fontSize: 11,
  fontWeight: 800,
  boxShadow:
    "0 4px 15px rgba(15,23,42,.035)",
};

/* =====================================================
   STAT CARDS
===================================================== */

const statsGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(5,minmax(0,1fr))",
  gap: 14,
  marginBottom: 18,
};

const statCardStyle = {
  minHeight: 115,
  padding: "17px 17px",
  position: "relative",
  overflow: "hidden",
  display: "flex",
  alignItems: "flex-start",
  gap: 13,
  background: "#ffffff",
  border:
    "1px solid #eceef3",
  borderRadius: 11,
  boxShadow:
    "0 7px 25px rgba(15,23,42,.045)",
};

const statIconStyle = {
  width: 44,
  height: 44,
  borderRadius: 11,
  flexShrink: 0,
  display: "grid",
  placeItems: "center",
  fontSize: 20,
  fontWeight: 900,
};

const statValueStyle = {
  fontSize: 26,
  lineHeight: 1,
  fontWeight: 900,
  color: "#111827",
};

const statLabelStyle = {
  marginTop: 6,
  fontSize: 11,
  fontWeight: 900,
  color: "#1e293b",
};

const statSubStyle = {
  marginTop: 4,
  color: "#94a3b8",
  fontSize: 9,
  lineHeight: 1.3,
  fontWeight: 600,
};

const smallAccentStyle = {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,
  height: 3,
  opacity: 0.75,
};

/* =====================================================
   MAIN GRID
===================================================== */

const mainGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "minmax(0,1.6fr) minmax(300px,.8fr)",
  gap: 16,
  marginBottom: 16,
};

const cardStyle = {
  background: "#ffffff",
  border:
    "1px solid #eceef3",
  borderRadius: 11,
  padding: 18,
  boxShadow:
    "0 7px 25px rgba(15,23,42,.04)",
  minWidth: 0,
};

const cardHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  marginBottom: 16,
};

const cardTitleStyle = {
  margin: 0,
  color: "#18243b",
  fontSize: 15,
  fontWeight: 900,
  letterSpacing: "-.015em",
};

const cardSubtitleStyle = {
  marginTop: 4,
  color: "#94a3b8",
  fontSize: 9,
  fontWeight: 600,
};

const headerLinkStyle = {
  color: "#ec2772",
  textDecoration: "none",
  fontSize: 10,
  fontWeight: 900,
};

/* =====================================================
   FILTERS
===================================================== */

const filterRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 7,
  marginBottom: 13,
};

const filterPillStyle = {
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid",
  fontSize: 8,
  fontWeight: 900,
};

/* =====================================================
   TABLE
===================================================== */

const tableWrapStyle = {
  width: "100%",
  overflow: "hidden",
  borderTop:
    "1px solid #edf0f5",
};

const tableHeaderStyle = {
  display: "grid",
  gridTemplateColumns:
    "1.1fr 1.4fr 1.4fr 1.1fr .8fr .6fr .5fr",
  gap: 10,
  padding:
    "11px 7px",
  color: "#64748b",
  fontSize: 7.5,
  fontWeight: 900,
  letterSpacing: ".04em",
};

const tableRowStyle = {
  display: "grid",
  gridTemplateColumns:
    "1.1fr 1.4fr 1.4fr 1.1fr .8fr .6fr .5fr",
  gap: 10,
  alignItems: "center",
  padding:
    "12px 7px",
  borderTop:
    "1px solid #edf0f5",
  fontSize: 9.5,
};

const routeTimeStyle = {
  fontWeight: 900,
  fontSize: 11,
};

const routeTypeStyle = {
  marginTop: 3,
  fontSize: 8,
  fontWeight: 800,
};

const routeNameStyle = {
  color: "#18243b",
  fontWeight: 900,
  display: "flex",
  alignItems: "center",
  gap: 6,
};

const routeArrowStyle = {
  color: "#94a3b8",
  fontWeight: 900,
};

const destinationStyle = {
  display: "flex",
  alignItems: "center",
  gap: 5,
  color: "#475569",
  fontWeight: 700,
};

const statusPillStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "4px 7px",
  border: "1px solid",
  borderRadius: 5,
  fontSize: 7,
  fontWeight: 900,
};

const delayStyle = {
  fontSize: 9,
  fontWeight: 900,
};

const doorStyle = {
  color: "#334155",
  fontWeight: 900,
};

const viewButtonStyle = {
  width: 29,
  height: 29,
  border:
    "1px solid #ffd6e5",
  borderRadius: 6,
  display: "grid",
  placeItems: "center",
  color: "#ec2772",
  textDecoration: "none",
  background: "#fff8fb",
};

const emptyRoutesStyle = {
  padding: "30px 10px",
  textAlign: "center",
  color: "#94a3b8",
  fontSize: 10,
  fontWeight: 700,
};

const bottomLinkStyle = {
  display: "inline-block",
  marginTop: 14,
  color: "#ec2772",
  fontSize: 9,
  fontWeight: 900,
  textDecoration: "none",
};

/* =====================================================
   ACTIVITY
===================================================== */

const activityRowStyle = {
  display: "grid",
  gridTemplateColumns:
    "38px 1fr auto",
  gap: 10,
  alignItems: "center",
  padding: "12px 0",
  borderBottom:
    "1px solid #edf0f5",
};

const activityIconStyle = {
  width: 34,
  height: 34,
  borderRadius: 9,
  display: "grid",
  placeItems: "center",
  fontSize: 15,
  fontWeight: 900,
};

const activityMainStyle = {
  minWidth: 0,
};

const activityTitleStyle = {
  color: "#18243b",
  fontSize: 9.5,
  fontWeight: 800,
};

const activitySubStyle = {
  marginTop: 3,
  color: "#94a3b8",
  fontSize: 8.5,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const activityTimeStyle = {
  color: "#94a3b8",
  fontSize: 8,
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const noActivityStyle = {
  padding: "30px 0",
  color: "#94a3b8",
  textAlign: "center",
  fontSize: 10,
  fontWeight: 700,
};

/* =====================================================
   BOTTOM MINI CARDS
===================================================== */

const bottomStatsGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(4,minmax(0,1fr))",
  gap: 14,
};

const miniCardStyle = {
  minHeight: 78,
  padding: "14px 16px",
  display: "flex",
  alignItems: "center",
  gap: 12,
  background: "#ffffff",
  border:
    "1px solid #eceef3",
  borderRadius: 10,
  boxShadow:
    "0 6px 20px rgba(15,23,42,.035)",
};

const miniIconStyle = {
  width: 37,
  height: 37,
  borderRadius: 9,
  display: "grid",
  placeItems: "center",
  flexShrink: 0,
  fontSize: 16,
  fontWeight: 900,
};

const miniTitleStyle = {
  color: "#64748b",
  fontSize: 8,
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: ".06em",
};

const miniValueStyle = {
  marginTop: 3,
  fontSize: 19,
  fontWeight: 900,
};

/* =====================================================
   RESPONSIVE
===================================================== */

const responsiveCss = `
  * {
    box-sizing: border-box;
  }

  /* =====================================================
     BIG MONITOR - 1600px+
  ===================================================== */

  @media (min-width: 1600px) {

    .dashboard-page-scale {
      padding: 36px 42px 48px !important;
    }

    .dashboard-header {
      margin-bottom: 30px !important;
    }

    .dashboard-header h1 {
      font-size: 36px !important;
    }

    .dashboard-date {
      min-height: 48px !important;
      padding: 0 18px !important;
      font-size: 13px !important;
    }

    .dashboard-stats {
      gap: 18px !important;
      margin-bottom: 24px !important;
    }

    .dashboard-stat-card {
      min-height: 145px !important;
      padding: 22px !important;
      gap: 16px !important;
      border-radius: 14px !important;
    }

    .dashboard-stat-icon {
      width: 54px !important;
      height: 54px !important;
      font-size: 24px !important;
      border-radius: 13px !important;
    }

    .dashboard-stat-value {
      font-size: 34px !important;
    }

    .dashboard-stat-label {
      font-size: 14px !important;
      margin-top: 8px !important;
    }

    .dashboard-stat-sub {
      font-size: 11px !important;
      margin-top: 5px !important;
    }

    .dashboard-main-grid {
      grid-template-columns:
        minmax(0,1.7fr)
        minmax(380px,.8fr) !important;

      gap: 20px !important;
      margin-bottom: 20px !important;
    }

    .dashboard-main-card {
      padding: 24px !important;
      border-radius: 14px !important;
    }

    .dashboard-card-title {
      font-size: 19px !important;
    }

    .dashboard-card-subtitle {
      font-size: 11px !important;
    }

    .dashboard-filter-row {
      gap: 9px !important;
      margin-bottom: 17px !important;
    }

    .dashboard-filter-pill {
      font-size: 10px !important;
      padding: 7px 12px !important;
    }

    .dashboard-table-header {
      font-size: 10px !important;
      padding: 14px 10px !important;
    }

    .dashboard-table-row {
      font-size: 12px !important;
      padding: 15px 10px !important;
    }

    .dashboard-route-time {
      font-size: 15px !important;
    }

    .dashboard-route-type {
      font-size: 10px !important;
    }

    .dashboard-status-pill {
      font-size: 9px !important;
      padding: 5px 9px !important;
    }

    .dashboard-activity-row {
      grid-template-columns:
        46px 1fr auto !important;

      gap: 13px !important;
      padding: 16px 0 !important;
    }

    .dashboard-activity-icon {
      width: 42px !important;
      height: 42px !important;
      font-size: 18px !important;
    }

    .dashboard-activity-title {
      font-size: 12px !important;
    }

    .dashboard-activity-sub {
      font-size: 10px !important;
      margin-top: 4px !important;
    }

    .dashboard-activity-time {
      font-size: 9px !important;
    }

    .dashboard-bottom-stats {
      gap: 18px !important;
    }

    .dashboard-bottom-card {
      min-height: 95px !important;
      padding: 18px 20px !important;
      border-radius: 12px !important;
    }

    .dashboard-mini-icon {
      width: 46px !important;
      height: 46px !important;
      font-size: 20px !important;
    }

    .dashboard-bottom-title {
      font-size: 10px !important;
    }

    .dashboard-bottom-value {
      font-size: 24px !important;
    }
  }

  /* =====================================================
     NORMAL LAPTOP / DESKTOP
     1251px - 1599px
  ===================================================== */

  @media (min-width: 1251px) and (max-width: 1599px) {

    .dashboard-stats {
      grid-template-columns:
        repeat(5,minmax(0,1fr)) !important;
    }

    .dashboard-main-grid {
      grid-template-columns:
        minmax(0,1.6fr)
        minmax(300px,.8fr) !important;
    }

    .dashboard-bottom-stats {
      grid-template-columns:
        repeat(4,minmax(0,1fr)) !important;
    }
  }

  /* =====================================================
     SMALL LAPTOP
  ===================================================== */

  @media (max-width: 1250px) {

    .dashboard-stats {
      grid-template-columns:
        repeat(3,minmax(0,1fr)) !important;
    }

    .dashboard-main-grid {
      grid-template-columns:
        1fr !important;
    }

    .dashboard-bottom-stats {
      grid-template-columns:
        repeat(2,minmax(0,1fr)) !important;
    }
  }

  /* =====================================================
     TABLET
  ===================================================== */

  @media (max-width: 900px) {

    .dashboard-page-scale {
      padding: 20px 18px 100px !important;
    }

    .dashboard-header {
      flex-direction:
        column !important;

      align-items:
        stretch !important;
    }

    .dashboard-date {
      width:
        fit-content !important;
    }

    .dashboard-table-wrap {
      overflow-x:
        auto !important;
    }

    .dashboard-table-row {
      min-width:
        780px !important;
    }
  }

  /* =====================================================
     MOBILE
  ===================================================== */

  @media (max-width: 650px) {

    .dashboard-page-scale {
      padding: 16px 14px 100px !important;
    }

    .dashboard-stats {
      grid-template-columns:
        1fr 1fr !important;
    }

    .dashboard-bottom-stats {
      grid-template-columns:
        1fr 1fr !important;
    }

    .dashboard-card-header {
      flex-direction:
        column !important;
    }

    .dashboard-filter-row {
      overflow-x:
        auto !important;

      flex-wrap:
        nowrap !important;

      padding-bottom:
        5px !important;
    }

    .dashboard-filter-pill {
      flex-shrink: 0 !important;
    }

    .dashboard-stat-card {
      min-height: 108px !important;
      padding: 14px !important;
    }
  }

  /* =====================================================
     SMALL MOBILE
  ===================================================== */

  @media (max-width: 440px) {

    .dashboard-stats {
      grid-template-columns:
        1fr !important;
    }

    .dashboard-bottom-stats {
      grid-template-columns:
        1fr !important;
    }
  }
`;