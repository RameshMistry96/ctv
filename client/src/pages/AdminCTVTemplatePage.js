import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import { API_BASE } from "../config";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function AdminCTVTemplatePage() {
  const navigate = useNavigate();

  const [templates, setTemplates] = useState([]);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [viewMode, setViewMode] = useState("list");
  const [openDays, setOpenDays] = useState({});
  const [showMobileForm, setShowMobileForm] = useState(false);

  const [form, setForm] = useState({
    day_of_week: "Monday",
    route_number: "",
    destination: "",
    scheduled_departure_time: "",
    route_type: "OUTBOUND",
    default_status: "ON TIME",
  });

  const loadTemplates = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/templates`);
      const data = await res.json();
      setTemplates(data);
    } catch (err) {
      console.error("Failed to load templates:", err);
      setMessage("Failed to load weekly templates");
    }
  };

  useEffect(() => {
    const isAuth = sessionStorage.getItem("admin_auth");
    const loginTime = Number(sessionStorage.getItem("admin_login_time"));
    const eightHours = 8 * 60 * 60 * 1000;

    if (!isAuth || !loginTime || Date.now() - loginTime > eightHours) {
      sessionStorage.removeItem("admin_auth");
      sessionStorage.removeItem("admin_login_time");
      navigate("/ctv-admin/login");
      return;
    }

    loadTemplates();
  }, [navigate]);

  useEffect(() => {
    const nextOpen = {};
    DAYS.forEach((day) => {
      nextOpen[day] = templates.some((t) => t.day_of_week === day);
    });
    setOpenDays(nextOpen);
  }, [templates]);

  const stats = useMemo(() => {
    const daysWithRoutes = DAYS.filter((day) =>
      templates.some((t) => t.day_of_week === day)
    ).length;

    const times = templates
      .map((t) => t.scheduled_departure_time)
      .filter(Boolean)
      .sort();

    return {
      daysWithRoutes,
      totalRoutes: templates.length,
      earliest: times[0] || "--",
      latest: times[times.length - 1] || "--",
    };
  }, [templates]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      day_of_week: "Monday",
      route_number: "",
      destination: "",
      scheduled_departure_time: "",
      route_type: "OUTBOUND",
      default_status: "ON TIME",
    });
    setShowMobileForm(false);
  };

  const saveTemplate = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const url = editingId
        ? `${API_BASE}/api/templates/${editingId}`
        : `${API_BASE}/api/templates`;

      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Something went wrong");
        return;
      }

      setMessage(
        editingId
          ? "Weekly route updated successfully"
          : "Weekly route saved successfully"
      );

      resetForm();
      loadTemplates();
    } catch (err) {
      setMessage("Failed to save weekly route");
    }
  };

  const startEdit = (route) => {
    setEditingId(route.id);
    setMessage("");
    setShowMobileForm(true);
    setForm({
      day_of_week: route.day_of_week,
      route_number: route.route_number,
      destination: route.destination,
      scheduled_departure_time: route.scheduled_departure_time,
      route_type: route.route_type || "OUTBOUND",
      default_status: route.default_status || "ON TIME",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteTemplate = async (id) => {
    const ok = window.confirm("Delete this weekly route?");
    if (!ok) return;

    try {
      await fetch(`${API_BASE}/api/templates/${id}`, {
        method: "DELETE",
      });

      setMessage("Weekly route deleted");
      loadTemplates();
    } catch (err) {
      setMessage("Failed to delete weekly route");
    }
  };

  const toggleDay = (day) => {
    setOpenDays((prev) => ({
      ...prev,
      [day]: !prev[day],
    }));
  };

  const FormCard = ({ mobile = false }) => (
    <div style={mobile ? mobileFormCard : card}>
      <div style={cardHeader}>
        <h2 style={cardTitle}>{editingId ? "Edit Weekly Route" : "Add Weekly Route"}</h2>
        <span style={plusBtn}>＋</span>
      </div>

      <form onSubmit={saveTemplate} style={formStyle}>
        <label style={label}>Select Day</label>
        <select name="day_of_week" value={form.day_of_week} onChange={handleChange} style={input}>
          {DAYS.map((day) => (
            <option key={day}>{day}</option>
          ))}
        </select>

        <label style={label}>Route Number</label>
        <input name="route_number" value={form.route_number} onChange={handleChange} placeholder="e.g. YF201" style={input} />

        <label style={label}>Destination</label>
        <input name="destination" value={form.destination} onChange={handleChange} placeholder="e.g. YMX" style={input} />

        <label style={label}>Route Type</label>
        <select name="route_type" value={form.route_type} onChange={handleChange} style={input}>
          <option value="OUTBOUND">OUTBOUND - Depart</option>
          <option value="INBOUND">INBOUND - Arrive</option>
        </select>

        <label style={label}>Scheduled Time</label>
        <input
          type="time"
          name="scheduled_departure_time"
          value={form.scheduled_departure_time}
          onChange={handleChange}
          style={input}
        />

        <label style={label}>Status</label>
        <select name="default_status" value={form.default_status} onChange={handleChange} style={input}>
          <option>ON TIME</option>
          <option>LOADING</option>
          <option>DELAYED</option>
          <option>CANCELLED</option>
        </select>

        {mobile ? (
          <div style={mobileActionRow}>
            <button type="button" style={mobileCancelBtn} onClick={resetForm}>
              Cancel
            </button>
            <button style={button}>{editingId ? "Save Update" : "Save Route"}</button>
          </div>
        ) : (
          <>
            <button style={button}>{editingId ? "Save Update" : "Save Weekly Route"}</button>
            {editingId && (
              <button type="button" style={cancelButton} onClick={resetForm}>
                Cancel Edit
              </button>
            )}
          </>
        )}
      </form>

      {message && <div style={messageBox}>{message}</div>}
    </div>
  );

  return (
    <AdminLayout>
      <style>{mobileCss}</style>

      <div style={page} className="tpl-page">
        <div style={header} className="tpl-header">
          <div>
            <h1 style={title}>Weekly Route Templates</h1>
            <p style={subtitle}>
              Create and manage recurring weekly routes. These routes can be loaded to today’s schedule.
            </p>
          </div>

          <div style={headerActions} className="tpl-header-actions">
            <button
              style={primaryTopBtn}
              onClick={async () => {
                try {
                  const res = await fetch(`${API_BASE}/api/routes/load-today`, {
                    method: "POST",
                  });

                  const data = await res.json();
                  setMessage(data.message || "Today schedule loaded");
                } catch (err) {
                  setMessage("Failed to load today schedule");
                }
              }}
            >
              ⇩ Load This Week to Today
            </button>
            <button style={secondaryTopBtn}>ⓘ Quick Guide</button>
          </div>
        </div>

        <div style={statsBar} className="tpl-stats">
          <StatBox icon="🗓" label="Days With Routes" value={stats.daysWithRoutes} sub="of 7 days" />
          <StatBox icon="🔗" label="Total Routes" value={stats.totalRoutes} sub="this week" />
          <StatBox icon="◷" label="Earliest Depart" value={stats.earliest} sub="scheduled time" />
          <StatBox icon="◷" label="Latest Depart" value={stats.latest} sub="scheduled time" />
          <StatBox icon="✓" label="Active Status" value="Active" sub="All systems normal" green />
        </div>

        <div style={layout} className="tpl-layout">
          <div className="tpl-desktop-form">
            <FormCard />
          </div>

          <div style={card}>
            <div style={scheduleHeader} className="tpl-schedule-header">
              <h2 style={cardTitle}>Saved Weekly Schedule</h2>
              <div style={viewBtns}>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  style={viewMode === "list" ? viewActiveBtn : viewBtn}
                >
                  ☰ List View
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setViewMode("calendar");
                    setMessage("Calendar View coming soon. List View is active for now.");
                  }}
                  style={viewMode === "calendar" ? viewActiveBtn : viewBtn}
                >
                  🗓 Calendar View
                </button>
              </div>
            </div>

            {DAYS.map((day) => {
              const dayRoutes = templates.filter((t) => t.day_of_week === day);
              const shortDay = day.slice(0, 3).toUpperCase();

              return (
                <div key={day} style={dayBlock}>
                  <div style={dayHeader} className="tpl-day-header" onClick={() => toggleDay(day)}>
                    <span style={dayPill}>{shortDay}</span>
                    <strong style={dayName}>{day}</strong>
                    <span style={routeCountText}>
                      {dayRoutes.length === 0 ? "No routes added" : `${dayRoutes.length} route${dayRoutes.length > 1 ? "s" : ""}`}
                    </span>
                    <span style={chevron}>{openDays[day] ? "⌃" : "⌄"}</span>
                  </div>

                  {openDays[day] && dayRoutes.length > 0 && (
                    <div style={routesWrap}>
                      {dayRoutes.map((r) => (
                        <div key={r.id} style={routeRow} className="tpl-route-row">
                          <div style={routeInfo}>
                            <strong style={routeTitle}>{r.route_number} <span style={arrow}>→</span> {r.destination}</strong>
                            <div style={timeText}>
                              {getTimeLabel(r)}: {r.scheduled_departure_time}
                              <span style={statusPill}>{r.default_status}</span>
                            </div>
                          </div>

                          <div style={actionRow}>
                            <button style={editBtn} onClick={() => startEdit(r)}>Edit</button>
                            <button style={deleteBtn} onClick={() => deleteTemplate(r.id)}>Delete</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div style={infoBox} className="tpl-info">
          <div style={infoIcon}>ⓘ</div>
          <div>
            <strong>How it works</strong>
            <p style={infoText}>
              Add routes for each day of the week. These templates will be available to load into today’s schedule automatically.
            </p>
          </div>
        </div>

        {!showMobileForm && (
          <button className="tpl-mobile-add-btn" onClick={() => setShowMobileForm(true)}>
            +
          </button>
        )}

        {showMobileForm && (
          <div style={mobileOverlay}>
            <div style={mobileSheet}>
              <FormCard mobile />
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

const getRouteType = (route) => {
  return String(route.route_type || route.type || "OUTBOUND").toUpperCase();
};

const getTimeLabel = (route) => {
  return getRouteType(route) === "INBOUND" ? "Arrive" : "Depart";
};

function StatBox({ icon, label, value, sub, green }) {
  return (
    <div style={statBox}>
      <div style={{ ...statIcon, background: green ? "#dcfce7" : "#eef2ff", color: green ? "#15803d" : "#2563eb" }}>
        {icon}
      </div>
      <div>
        <div style={statLabel}>{label}</div>
        <div style={{ ...statValue, color: green ? "#15803d" : "#0f172a" }}>{value}</div>
        <div style={statSub}>{sub}</div>
      </div>
    </div>
  );
}

const page = {
  minHeight: "100vh",
  background: "linear-gradient(135deg, #f8fbff, #eaf6ff, #f8fafc)",
  padding: "34px",
  fontFamily: "Inter, Arial, sans-serif",
  color: "#0f172a",
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: "24px",
};

const title = { margin: 0, fontSize: "40px", color: "#0f172a", fontWeight: 950, letterSpacing: "-0.04em" };
const subtitle = { color: "#475569", fontSize: "16px", marginTop: "8px" };

const headerActions = { display: "flex", gap: "14px" };

const primaryTopBtn = {
  border: "none",
  borderRadius: "10px",
  padding: "13px 18px",
  background: "#2563eb",
  color: "white",
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 12px 24px rgba(37,99,235,.20)",
};

const secondaryTopBtn = {
  ...primaryTopBtn,
  background: "white",
  color: "#2563eb",
  border: "1px solid #dbeafe",
  boxShadow: "0 10px 25px rgba(15,23,42,.08)",
};

const statsBar = {
  background: "rgba(255,255,255,.96)",
  border: "1px solid #e2e8f0",
  borderRadius: "18px",
  padding: "20px",
  display: "grid",
  gridTemplateColumns: "repeat(5, 1fr)",
  gap: "18px",
  boxShadow: "0 18px 45px rgba(15,23,42,.08)",
  marginBottom: "26px",
};

const statBox = {
  display: "flex",
  gap: "14px",
  alignItems: "center",
  borderRight: "1px solid #e2e8f0",
};

const statIcon = {
  width: 58,
  height: 58,
  borderRadius: "50%",
  display: "grid",
  placeItems: "center",
  fontSize: 26,
};

const statLabel = { textTransform: "uppercase", color: "#64748b", fontSize: 12, fontWeight: 900 };
const statValue = { fontSize: 26, fontWeight: 950, marginTop: 3 };
const statSub = { color: "#475569", fontSize: 14 };

const layout = {
  display: "grid",
  gridTemplateColumns: "380px 1fr",
  gap: "24px",
};

const card = {
  background: "rgba(255,255,255,0.96)",
  borderRadius: "18px",
  padding: "24px",
  boxShadow: "0 18px 45px rgba(15,23,42,0.08)",
  border: "1px solid #e2e8f0",
};

const cardHeader = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 };
const cardTitle = { margin: 0, color: "#0f172a", fontSize: 24, fontWeight: 950 };
const plusBtn = {
  width: 30,
  height: 30,
  borderRadius: 8,
  background: "#2563eb",
  color: "white",
  display: "grid",
  placeItems: "center",
  fontWeight: 900,
};

const formStyle = { display: "flex", flexDirection: "column", gap: "10px" };
const label = { fontSize: 13, fontWeight: 800, color: "#334155", marginTop: 8 };

const input = {
  padding: "14px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  fontSize: "15px",
  outline: "none",
  background: "white",
};

const button = {
  padding: "15px",
  borderRadius: "10px",
  border: "none",
  background: "linear-gradient(135deg, #2563eb, #06b6d4)",
  color: "white",
  fontWeight: "900",
  cursor: "pointer",
  marginTop: 10,
};

const cancelButton = {
  ...button,
  background: "#64748b",
  marginTop: 0,
};

const messageBox = {
  marginTop: "16px",
  padding: "13px",
  borderRadius: "13px",
  background: "#dcfce7",
  color: "#166534",
  fontWeight: "800",
};

const scheduleHeader = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 };
const viewBtns = { display: "flex", gap: 10 };

const viewActiveBtn = {
  border: "none",
  borderRadius: 9,
  padding: "10px 14px",
  background: "#2563eb",
  color: "white",
  fontWeight: 800,
  cursor: "pointer",
};

const viewBtn = {
  ...viewActiveBtn,
  background: "white",
  color: "#334155",
  border: "1px solid #cbd5e1",
};

const dayBlock = {
  marginBottom: "12px",
  borderRadius: "12px",
  background: "#ffffff",
  border: "1px solid #dbeafe",
  overflow: "hidden",
};

const dayHeader = {
  minHeight: 54,
  display: "grid",
  gridTemplateColumns: "70px 120px 1fr 30px",
  alignItems: "center",
  padding: "0 16px",
  background: "#f8fbff",
  cursor: "pointer",
};

const dayPill = {
  background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
  color: "white",
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: 12,
  fontWeight: 900,
  textAlign: "center",
  width: 44,
};

const dayName = { color: "#0f172a", fontSize: 16 };
const routeCountText = { color: "#64748b", fontSize: 14 };
const chevron = { color: "#2563eb", fontWeight: 900 };

const routesWrap = {
  borderTop: "1px solid #dbeafe",
  background: "#f8fbff",
  padding: "10px",
  borderLeft: "4px solid #2563eb",
};

const routeRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  padding: "16px 18px",
  background: "#ffffff",
  borderLeft: "4px solid #10b981",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  marginBottom: "10px",
  boxShadow: "0 4px 10px rgba(15,23,42,0.04)",
};

const routeInfo = { display: "flex", flexDirection: "column", gap: 6 };
const routeTitle = { fontSize: 17 };
const arrow = { color: "#94a3b8", margin: "0 6px" };
const timeText = { color: "#334155", fontWeight: "800", display: "flex", alignItems: "center", gap: 10 };

const statusPill = {
  background: "#dcfce7",
  color: "#047857",
  borderRadius: 999,
  padding: "4px 9px",
  fontSize: 11,
  fontWeight: 900,
};

const actionRow = { display: "flex", gap: "10px" };

const editBtn = {
  border: "none",
  borderRadius: "9px",
  padding: "10px 14px",
  background: "#2563eb",
  color: "white",
  fontWeight: "900",
  cursor: "pointer",
};

const deleteBtn = {
  ...editBtn,
  background: "#dc2626",
};

const infoBox = {
  marginTop: 24,
  border: "1px solid #bfdbfe",
  borderRadius: 14,
  background: "rgba(239,246,255,.75)",
  padding: "18px",
  display: "flex",
  gap: 14,
  alignItems: "center",
};

const infoIcon = {
  width: 42,
  height: 42,
  borderRadius: "50%",
  background: "#dbeafe",
  color: "#2563eb",
  display: "grid",
  placeItems: "center",
  fontWeight: 900,
};

const infoText = { margin: "5px 0 0", color: "#475569" };

const mobileOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,.55)",
  zIndex: 100,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "18px",
};

const mobileSheet = {
  width: "100%",
  maxWidth: 390,
  maxHeight: "82vh",
  overflowY: "auto",
  background: "#ffffff",
  borderRadius: 24,
  padding: "16px 16px 115px",
  boxShadow: "0 30px 80px rgba(15,23,42,.35)",
};

const mobileFormCard = {
  background: "white",
  borderRadius: 18,
  padding: 4,
};

const mobileActionRow = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
  marginTop: 14,
};

const mobileCancelBtn = {
  padding: "15px",
  borderRadius: "10px",
  border: "none",
  background: "#f1f5f9",
  color: "#334155",
  fontWeight: "900",
  cursor: "pointer",
  marginTop: 10,
};

const mobileCss = `
  .tpl-mobile-add-btn {
    display: none;
  }

  @media (max-width: 768px) {
    .tpl-page {
      padding: 16px !important;
      padding-bottom: 110px !important;
    }

    .tpl-header {
      flex-direction: column !important;
      gap: 14px !important;
      margin-bottom: 16px !important;
    }

    .tpl-header h1 {
      font-size: 25px !important;
      line-height: 1.1 !important;
    }

    .tpl-header p {
      font-size: 13px !important;
      line-height: 1.35 !important;
    }

    .tpl-header-actions {
      width: 100% !important;
      display: grid !important;
      grid-template-columns: 1fr !important;
      gap: 10px !important;
    }

    .tpl-header-actions button {
      width: 100% !important;
    }

    .tpl-stats {
      grid-template-columns: 1fr !important;
      padding: 14px !important;
      gap: 12px !important;
      margin-bottom: 16px !important;
    }

    .tpl-stats > div {
      border-right: none !important;
      border-bottom: 1px solid #e2e8f0 !important;
      padding-bottom: 12px !important;
    }

    .tpl-layout {
      display: block !important;
    }

    .tpl-desktop-form {
      display: none !important;
    }

    .tpl-schedule-header {
      flex-direction: column !important;
      align-items: stretch !important;
      gap: 12px !important;
    }

    .tpl-schedule-header h2 {
      font-size: 19px !important;
    }

    .tpl-day-header {
      grid-template-columns: 58px 1fr 1fr 24px !important;
      padding: 0 10px !important;
      gap: 8px !important;
    }

    .tpl-route-row {
      flex-direction: column !important;
      align-items: stretch !important;
    }

    .tpl-route-row button {
      flex: 1 !important;
    }

    .tpl-info {
      align-items: flex-start !important;
      font-size: 13px !important;
    }

    .tpl-mobile-add-btn {
      display: grid;
      place-items: center;
      position: fixed;
      right: 22px;
      bottom: 95px;
      width: 62px;
      height: 62px;
      border-radius: 999px;
      border: 1px solid #fecaca;
      background: linear-gradient(135deg, #fee2e2, #fecaca);
      color: #dc2626;
      font-size: 34px;
      font-weight: 900;
      cursor: pointer;
      box-shadow: 0 18px 35px rgba(220,38,38,.25);
      z-index: 999;
    }
  }
`;

export default AdminCTVTemplatePage;