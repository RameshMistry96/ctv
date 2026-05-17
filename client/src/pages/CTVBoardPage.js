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
      const res = await fetch(`/api/ctv/api/routes`);
      const data = await res.json();

      const twoMinutes = 2 * 60 * 1000;
      const currentTime = Date.now();

      const cleaned = data
        .filter((r) => {
          const status = String(r.status || "").toUpperCase();

          if (status !== "ARRIVED" && status !== "DEPARTED") return true;

          const updatedTime = new Date(r.updated_at || r.created_at || 0).getTime();
          if (!updatedTime) return false;

          return currentTime - updatedTime <= twoMinutes;
        })
        .sort((a, b) => {
          const aStatus = String(a.status || "").toUpperCase();
          const bStatus = String(b.status || "").toUpperCase();

          const isFinalA = aStatus === "ARRIVED" || aStatus === "DEPARTED";
          const isFinalB = bStatus === "ARRIVED" || bStatus === "DEPARTED";

          if (isFinalA !== isFinalB) return isFinalA ? 1 : -1;

          const aDelayed = aStatus === "DELAYED" ? 0 : 1;
          const bDelayed = bStatus === "DELAYED" ? 0 : 1;
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

      el.scrollTop += direction * 0.7;
    }, 80);

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

        @keyframes twoMinuteGlow {
          0%, 100% { box-shadow: inset 0 0 0 rgba(56,189,248,0), 0 0 0 rgba(56,189,248,0); }
          50% { box-shadow: inset 0 0 28px rgba(56,189,248,.20), 0 0 24px rgba(56,189,248,.22); }
        }

        @keyframes statusPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }

          .ctv-scroll-area::-webkit-scrollbar {
            width: 0;
            display: none;
          }
          
          .ctv-scroll-area {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
      `}</style>

      <div style={topHeaderStyle}>
        <div style={brandWrapStyle}>
          <div style={planeIconStyle}>
            <img
              src="/favicon.ico"
              alt="CTV"
              style={{
                width: 44,
                height: 44,
                objectFit: "contain",
              }}
            />
          </div>
          <div>
            <h1 style={titleStyle}>CTV ROUTE BOARD</h1>
            <div style={subtitleStyle}>Live Route Status — All Times Local</div>
          </div>
        </div>

        <div style={clockWrapStyle}>
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
              marginRight: 12,
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

      <div ref={tableRef} className="ctv-scroll-area" style={tableStyle}>
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
          routes.map((route, index) => {
            const isTwoMinuteWarning = isWithinTwoMinuteWarning(route, now);

            return (
              <div
                key={route.id}
                style={{
                  ...rowStyle,
                  animation:
                    route.status === "DELAYED"
                      ? "rowFadeIn .35s ease both, delayedGlow 2.2s ease-in-out infinite"
                      : route.status === "CANCELLED"
                      ? "rowFadeIn .35s ease both, cancelledGlow 2.4s ease-in-out infinite"
                      : isTwoMinuteWarning
                      ? "rowFadeIn .35s ease both, twoMinuteGlow 1.8s ease-in-out infinite"
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
                  {route.destination}
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
                    return delay === null ? "--" : `${delay} min`;
                  })()}
                </div>

                <div style={noteCellStyle}>{getDisplayNotes(route, now)}</div>
              </div>
            );
          })
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

          <div style={planeSmallStyle}>
            <img
              src="/favicon.ico"
              alt="CTV"
              style={{
                width: 34,
                height: 34,
                objectFit: "contain",
              }}
            />
          </div>
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

const getScheduledDate = (route, now) => {
  const scheduled = route.scheduled_departure_time;
  if (!scheduled) return null;

  const [hh, mm] = scheduled.split(":").map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;

  const scheduledDate = new Date(now);
  scheduledDate.setHours(hh, mm, 0, 0);

  return scheduledDate;
};

const getActualDate = (route, now) => {
  const actualTime = route.actual_departure_time || route.actual_arrival_time;

  if (actualTime && String(actualTime).includes(":")) {
    const [hh, mm] = String(actualTime).split(":").map(Number);

    if (!Number.isNaN(hh) && !Number.isNaN(mm)) {
      const actualDate = new Date(now);
      actualDate.setHours(hh, mm, 0, 0);
      return actualDate;
    }
  }

  const updatedTime = route.updated_at || route.created_at;
  if (updatedTime) {
    const updatedDate = new Date(updatedTime);
    if (!Number.isNaN(updatedDate.getTime())) return updatedDate;
  }

  return null;
};

const getAutoDelayMinutes = (route, now) => {
  const status = String(route.status || "").toUpperCase();
  const finalStatuses = ["ARRIVED", "DEPARTED"];

  const scheduledDate = getScheduledDate(route, now);
  if (!scheduledDate) return Number(route.delay_minutes) || 0;

  if (finalStatuses.includes(status)) {
    const actualDate = getActualDate(route, now);

    if (actualDate) {
      return Math.max(0, Math.floor((actualDate - scheduledDate) / 60000));
    }

    return Number(route.delay_minutes) || 0;
  }

  const diffMinutes = Math.floor((now - scheduledDate) / 60000);

  if (diffMinutes < 0) return null;

  return Math.max(0, diffMinutes);
};

const getDisplayNotes = (route, now) => {
  const status = String(route.status || "").toUpperCase();
  const finalStatuses = ["ARRIVED", "DEPARTED"];

  if (finalStatuses.includes(status)) {
    return route.notes || "--";
  }

  const scheduledDate = getScheduledDate(route, now);
  const adminDelay = Number(route.delay_minutes) || 0;

  if (!scheduledDate) return route.notes || "--";

  const diffMinutes = Math.floor((now - scheduledDate) / 60000);

  if (diffMinutes < 0 && adminDelay > 0) {
    return `Expected Delay: ${adminDelay} min`;
  }

  return route.notes || "--";
};

const isWithinTwoMinuteWarning = (route, now) => {
  const status = String(route.status || "").toUpperCase();
  const finalStatuses = ["ARRIVED", "DEPARTED", "CANCELLED"];

  if (finalStatuses.includes(status)) return false;

  const scheduledDate = getScheduledDate(route, now);
  if (!scheduledDate) return false;

  const diff = scheduledDate - now;

  return diff > 0 && diff <= 2 * 60 * 1000;
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
  borderRadius: 16,
  background: "linear-gradient(135deg, #1e293b, #b45309, #fb923c)",
  border: "2px solid rgba(255,255,255,.22)",
  boxShadow: "0 10px 26px rgba(251,146,60,.22)",
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
  display: "inline-block",
  fontSize: 15,
  fontWeight: 950,
  color: "#dbeafe",
  marginTop: 7,
  letterSpacing: 1.2,
  padding: "4px 10px",
  borderRadius: 999,
  background: "rgba(14,165,233,.20)",
  border: "1px solid rgba(125,211,252,.45)",
  boxShadow: "0 0 14px rgba(14,165,233,.18)",
};

const departCellStyle = { fontSize: 29, fontWeight: 950 };
const routeCellStyle = { fontSize: 24, fontWeight: 950 };
const arrowStyle = { color: "#93c5fd", margin: "0 13px" };

const destinationCellStyle = {
  fontSize: 23,
  fontWeight: 950,
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
  borderRadius: 14,
  background: "linear-gradient(135deg, #1e293b, #b45309, #fb923c)",
  border: "1px solid rgba(255,255,255,.18)",
  boxShadow: "0 8px 20px rgba(251,146,60,.20)",
  display: "grid",
  placeItems: "center",
  fontSize: 33,
};

export default CTVBoardPage;