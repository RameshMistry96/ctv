import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { API_BASE } from "../config";

const socket = io(API_BASE);

function CTVBoardPage() {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState([]);
  const [now, setNow] = useState(new Date());
  const [lastUpdated, setLastUpdated] = useState(null);
  const tableRef = useRef(null);

  const loadRoutes = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/routes`);
      const data = await res.json();

      const cleaned = data
        .filter((r) => r.status !== "DEPARTED")
        .sort((a, b) => {
          const aDelayed = a.status === "DELAYED" ? 0 : 1;
          const bDelayed = b.status === "DELAYED" ? 0 : 1;
          if (aDelayed !== bDelayed) return aDelayed - bDelayed;

          return String(a.scheduled_departure_time || "").localeCompare(
            String(b.scheduled_departure_time || "")
          );
        });

      setRoutes(cleaned);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to load routes:", err);
    }
  };

    useEffect(() => {
    const isAuth = sessionStorage.getItem("tv_auth");
    const loginTime = Number(sessionStorage.getItem("tv_login_time"));
    const eightHours = 8 * 60 * 60 * 1000;

    if (!isAuth || !loginTime || Date.now() - loginTime > eightHours) {
      sessionStorage.removeItem("tv_auth");
      sessionStorage.removeItem("tv_login_time");
      navigate("/tv-login");
      return;
    }
    loadRoutes();

    socket.on("routes_updated", loadRoutes);

    const refreshTimer = setInterval(loadRoutes, 60000);
    const clockTimer = setInterval(() => setNow(new Date()), 1000);

    return () => {
      socket.off("routes_updated", loadRoutes);
      clearInterval(refreshTimer);
      clearInterval(clockTimer);
    };
  }, [navigate]);

  useEffect(() => {
  const el = tableRef.current;
  if (!el || routes.length <= 6) return;

  let direction = 1;

  const scrollTimer = setInterval(() => {
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 5) {
      direction = -1;
    }

    if (el.scrollTop <= 5) {
      direction = 1;
    }

    el.scrollTop += direction * 1.5;
  }, 40);

  return () => clearInterval(scrollTimer);
}, [routes]);

  const statusCounts = useMemo(() => {
    const counts = {};
    routes.forEach((r) => {
      counts[r.status] = (counts[r.status] || 0) + 1;
    });
    return counts;
  }, [routes]);

  return (
    <div style={pageStyle}>
      <style>{`
        @keyframes rowFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes delayedGlow {
          0%, 100% { box-shadow: inset 0 0 0 rgba(249,115,22,0), 0 0 0 rgba(249,115,22,0); }
          50% { box-shadow: inset 0 0 28px rgba(249,115,22,.20), 0 0 24px rgba(249,115,22,.22); }
        }

        @keyframes cancelledGlow {
          0%, 100% { box-shadow: inset 0 0 0 rgba(220,38,38,0), 0 0 0 rgba(220,38,38,0); }
          50% { box-shadow: inset 0 0 26px rgba(220,38,38,.20), 0 0 22px rgba(220,38,38,.20); }
        }

        @keyframes statusPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
      `}</style>

      <div style={topHeaderStyle}>
        <div style={brandWrapStyle}>
          <div style={planeIconStyle}>✈</div>
          <div>
            <h1 style={titleStyle}>CTV ROUTE BOARD</h1>
            <div style={subtitleStyle}>Live Route Status — All Times Local</div>
          </div>
        </div>

        <div style={clockWrapStyle}>
        {/* ✅ FULLSCREEN BUTTON */}
        <button
            onClick={() => {
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen();
                } else {
                    document.exitFullscreen();
                }
                }}
            style={{
            padding: "10px 14px",
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: 8,
            fontWeight: 800,
            cursor: "pointer",
            marginRight: 12
            }}
        >
            ⛶
        </button>

        <div style={clockIconStyle}>◷</div>
        <div>
            <div style={clockStyle}>
            {now.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
            })}
            </div>
            <div style={dateStyle}>
            {now.toLocaleDateString([], {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
            })}
            </div>
        </div>
        </div>
      </div>

      <div style={statusSummaryStyle}>
        {[
          "NOT STARTED",
          "ON TIME",
          "LOADING",
          "DELAYED",
          "ENROUTE",
          "ARRIVED",
          "CANCELLED",
          "DEPARTED",
        ].map((status) => (
          <div key={status} style={summaryItemStyle}>
            <div style={{ ...summaryIconStyle, background: statusColor(status) }}>
              {statusIcon(status)}
            </div>
            <div>
              <div style={summaryLabelStyle}>{status}</div>
              <div style={summaryCountStyle}>{statusCounts[status] || 0}</div>
            </div>
          </div>
        ))}
      </div>

      <div ref={tableRef} style={tableStyle}>
        <div style={tableHeaderStyle}>
          <div>◷ ARRIVE / DEPART</div>
          <div>✈ ROUTE</div>
          <div>⌖ DESTINATION</div>
          <div>◉ STATUS</div>
          <div>◷ DELAY</div>
          <div>▤ NOTES / COMMENT</div>
        </div>

        {routes.length === 0 ? (
          <div style={emptyStyle}>No active routes loaded</div>
        ) : (
          routes.map((route, index) => (
            <div
              key={route.id}
              style={{
                ...rowStyle,
                animation:
                  route.status === "DELAYED"
                    ? "rowFadeIn .35s ease both, delayedGlow 2.2s ease-in-out infinite"
                    : route.status === "CANCELLED"
                    ? "rowFadeIn .35s ease both, cancelledGlow 2.4s ease-in-out infinite"
                    : "rowFadeIn .35s ease both",
                animationDelay: `${index * 0.04}s`,
                borderColor: statusColor(route.status),
                background: rowBackground(route.status),
              }}
            >
              <div style={departCellStyle}>
                {route.scheduled_departure_time}
                <span style={timeLabelStyle}>{getTimeLabel(route)}</span>
              </div>

              <div style={routeCellStyle}>
                {route.route_number} <span style={arrowStyle}>→</span>{" "}
                {route.destination}
              </div>

              <div style={destinationCellStyle}>
                <strong>{route.destination}</strong>
                <span>{destinationName(route.destination)}</span>
              </div>

              <div>
                <span
                  style={{
                    ...statusBadgeStyle,
                    background: statusColor(route.status),
                    animation:
                      route.status === "DELAYED" || route.status === "CANCELLED"
                        ? "statusPulse 1.5s ease-in-out infinite"
                        : "none",
                  }}
                >
                  {route.status}
                </span>
              </div>

              <div style={delayCellStyle}>
                {(() => {
                  const delay = getAutoDelayMinutes(route, now);
                  return delay > 0 ? `${delay} min` : "--";
                })()}
              </div>

              <div style={noteCellStyle}>{route.notes || "--"}</div>
            </div>
          ))
        )}
      </div>

      <div style={footerStyle}>
        <div>
          <strong>Information</strong>
          <div>All times are local. Please check with ground staff for latest updates.</div>
        </div>

        <div style={footerBrandStyle}>
          <div>
            <strong>Last Updated</strong>
            <div>
              {lastUpdated
                ? lastUpdated.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })
                : "--"}
            </div>
          </div>

          <div style={planeSmallStyle}>✈</div>
          <div>
            <strong>CTV AIRPORT</strong>
            <div>Safe. Reliable. On Time.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const getRouteType = (route) => {
  return String(route.route_type || route.type || "OUTBOUND").toUpperCase();
};

const getTimeLabel = (route) => {
  return getRouteType(route) === "INBOUND" ? "ARRIVE" : "DEPART";
};

const getAutoDelayMinutes = (route, now) => {
  const completedStatuses = ["ARRIVED", "DEPARTED", "CANCELLED"];
  if (completedStatuses.includes(route.status)) return Number(route.delay_minutes) || 0;

  const scheduled = route.scheduled_departure_time;
  if (!scheduled) return Number(route.delay_minutes) || 0;

  const [hh, mm] = scheduled.split(":").map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return Number(route.delay_minutes) || 0;

  const scheduledDate = new Date(now);
  scheduledDate.setHours(hh, mm, 0, 0);

  const diffMinutes = Math.floor((now - scheduledDate) / 60000);
  return Math.max(Number(route.delay_minutes) || 0, diffMinutes > 0 ? diffMinutes : 0);
};

const rowBackground = (status) => {
  if (status === "DELAYED") {
    return "linear-gradient(90deg, rgba(249,115,22,.28), rgba(15,23,42,.82))";
  }
  if (status === "CANCELLED") {
    return "linear-gradient(90deg, rgba(220,38,38,.26), rgba(15,23,42,.82))";
  }
  if (status === "ARRIVED") {
    return "linear-gradient(90deg, rgba(15,118,110,.22), rgba(15,23,42,.82))";
  }
  if (status === "ENROUTE") {
    return "linear-gradient(90deg, rgba(124,58,237,.22), rgba(15,23,42,.82))";
  }
  if (status === "LOADING") {
    return "linear-gradient(90deg, rgba(11,126,215,.22), rgba(15,23,42,.82))";
  }
  return "linear-gradient(90deg, rgba(15,23,42,.95), rgba(15,23,42,.82))";
};

const statusColor = (status) =>
  ({
    "NOT STARTED": "#64748b",
    "ON TIME": "#16a34a",
    LOADING: "#0b7ed7",
    DELAYED: "#f97316",
    ENROUTE: "#7c3aed",
    ARRIVED: "#0f766e",
    CANCELLED: "#dc2626",
    DEPARTED: "#334155",
  }[status] || "#94a3b8");

const statusIcon = (status) =>
  ({
    "NOT STARTED": "⌛",
    "ON TIME": "✓",
    LOADING: "🚚",
    DELAYED: "◷",
    ENROUTE: "✈",
    ARRIVED: "⌁",
    CANCELLED: "×",
    DEPARTED: "→",
  }[status] || "•");

const destinationName = (dest) =>
  ({
    YYZR: "Billy Bishop Toronto City",
    YMX: "Montreal-Trudeau",
    YBCS: "Nanaimo Harbour",
    YQX: "Gander Intl",
    YMXR: "Montréal Mirabel",
    YTZR: "Toronto Pearson",
    YQG: "Windsor Intl",
    YUL: "Montréal-Trudeau",
  }[dest] || "");

const pageStyle = {
  minHeight: "100vh",
  height: "100vh",
  overflow: "hidden",
  boxSizing: "border-box",
  background:
    "radial-gradient(circle at top left, #0f2a4a, #020617 45%, #000814)",
  color: "white",
  padding: 20,
  fontFamily: "Inter, Arial, sans-serif",
  cursor: "none",
};

const topHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  borderBottom: "2px solid #0ea5e9",
  paddingBottom: 15,
};

const brandWrapStyle = { display: "flex", alignItems: "center", gap: 18 };

const planeIconStyle = {
  width: 68,
  height: 68,
  borderRadius: 14,
  background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
  display: "grid",
  placeItems: "center",
  fontSize: 40,
};

const titleStyle = { margin: 0, fontSize: 42, fontWeight: 950, letterSpacing: 1 };
const subtitleStyle = { color: "#7dd3fc", fontSize: 20, marginTop: 4 };

const clockWrapStyle = { display: "flex", alignItems: "center", gap: 16 };

const clockIconStyle = {
  width: 60,
  height: 60,
  borderRadius: "50%",
  border: "5px solid #bfdbfe",
  display: "grid",
  placeItems: "center",
  fontSize: 32,
  color: "#bfdbfe",
};

const clockStyle = { fontSize: 42, fontWeight: 950 };
const dateStyle = { color: "#7dd3fc", fontSize: 17, textAlign: "right" };

const statusSummaryStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(8, 1fr)",
  gap: 12,
  padding: "18px 0",
};

const summaryItemStyle = {
  display: "flex",
  alignItems: "center",
  gap: 11,
  borderRight: "1px solid rgba(148,163,184,.25)",
  paddingRight: 10,
};

const summaryIconStyle = {
  width: 48,
  height: 48,
  borderRadius: "50%",
  display: "grid",
  placeItems: "center",
  fontSize: 25,
  fontWeight: 900,
};

const summaryLabelStyle = { fontSize: 13, fontWeight: 900, color: "#cbd5e1" };
const summaryCountStyle = { fontSize: 24, fontWeight: 950 };

const tableStyle = {
  border: "1px solid #0369a1",
  borderRadius: 14,
  overflow: "hidden auto",
  scrollBehavior: "smooth",
  maxHeight: "calc(100vh - 255px)",
};

const tableHeaderStyle = {
  display: "grid",
  gridTemplateColumns: "1.1fr 2fr 2fr 1.4fr 1fr 2fr",
  background: "linear-gradient(90deg,#0f3b70,#082f5f)",
  color: "#dbeafe",
  fontWeight: 900,
  fontSize: 16,
  padding: "15px 20px",
};

const rowStyle = {
  display: "grid",
  gridTemplateColumns: "1.1fr 2fr 2fr 1.4fr 1fr 2fr",
  alignItems: "center",
  minHeight: 70,
  padding: "0 20px",
  borderLeft: "7px solid",
  borderBottom: "1px solid rgba(148,163,184,.18)",
  transition: "all .35s ease",
};

const emptyStyle = {
  padding: 50,
  textAlign: "center",
  fontSize: 28,
  color: "#93c5fd",
  fontWeight: 900,
};

const timeLabelStyle = {
  display: "block",
  fontSize: 12,
  color: "#93c5fd",
  marginTop: 4,
  letterSpacing: 1,
};

const departCellStyle = { fontSize: 29, fontWeight: 950 };
const routeCellStyle = { fontSize: 24, fontWeight: 950 };
const arrowStyle = { color: "#93c5fd", margin: "0 13px" };

const destinationCellStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  fontSize: 23,
};

const statusBadgeStyle = {
  display: "inline-block",
  padding: "9px 24px",
  borderRadius: 8,
  fontWeight: 950,
  fontSize: 16,
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,.25)",
};

const delayCellStyle = { fontSize: 21, fontWeight: 900, color: "#fb923c" };
const noteCellStyle = { fontSize: 18, fontWeight: 700 };

const footerStyle = {
  marginTop: 16,
  border: "1px solid #0369a1",
  borderRadius: 14,
  padding: 16,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  background: "rgba(2,6,23,.55)",
  color: "#bfdbfe",
  fontSize: 16,
};

const footerBrandStyle = { display: "flex", alignItems: "center", gap: 16 };

const planeSmallStyle = {
  width: 54,
  height: 54,
  borderRadius: 13,
  background: "#2563eb",
  display: "grid",
  placeItems: "center",
  fontSize: 33,
};

export default CTVBoardPage;