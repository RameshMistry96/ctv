import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import { API_BASE } from "../config";

const STATUSES = [
  "NOT STARTED",
  "ON TIME",
  "LOADING",
  "DELAYED",
  "ENROUTE",
  "ARRIVED",
  "CANCELLED",
  "DEPARTED",
];

function AdminCTVRoutesPage() {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState([]);
  const [message, setMessage] = useState("");
  const [modalRoute, setModalRoute] = useState(null);
  const [modalForm, setModalForm] = useState({ delay_minutes: "", notes: "" });

    const [form, setForm] = useState({
    route_number: "",
    destination: "",
    scheduled_departure_time: "",
    route_type: "OUTBOUND",
    status: "NOT STARTED",
    delay_minutes: "",
    notes: "",
    });

    const loadRoutes = async () => {
    try {
        const res = await fetch(`${API_BASE}/api/routes`);
        const data = await res.json();
        setRoutes(data);
    } catch (err) {
        console.error("Failed to load admin routes:", err);
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

    loadRoutes();

    }, [navigate]);

  const handleChange = (e) => {
    const updated = { ...form, [e.target.name]: e.target.value };
    if (e.target.name === "delay_minutes" && Number(e.target.value) > 0) {
      updated.status = "DELAYED";
    }
    setForm(updated);
  };

  const addRoute = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const payload = {
        ...form,
        delay_minutes: Number(form.delay_minutes) || 0,
      };

      const res = await fetch(`${API_BASE}/api/routes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Something went wrong");
        return;
      }

      setMessage("Route added successfully");

      setForm({
        route_number: "",
        destination: "",
        scheduled_departure_time: "",
        route_type: "OUTBOUND",
        status: "NOT STARTED",
        delay_minutes: "",
        notes: "",
      });

      loadRoutes();
    } catch (err) {
      setMessage("Failed to add route");
    }
  };

  const loadTodaySchedule = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/routes/load-today`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Failed to load schedule");
        return;
      }

      setMessage(data.message || "Schedule loaded");
      loadRoutes();
    } catch (err) {
      setMessage("Failed to load today schedule");
    }
  };

const updateStatus = async (id, status) => {
  try {
    const res = await fetch(`${API_BASE}/api/routes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || "Failed to update status");
      return;
    }

    loadRoutes();
  } catch (err) {
    setMessage("Failed to update route status");
  }
};

  const openDelayModal = (route) => {
    setModalRoute(route);
    setModalForm({
      delay_minutes: route.delay_minutes || "",
      notes: route.notes || "",
    });
  };

const saveDelayNotes = async () => {
  try {
    const delayNumber = Number(modalForm.delay_minutes) || 0;

    const res = await fetch(`${API_BASE}/api/routes/${modalRoute.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        delay_minutes: delayNumber,
        notes: modalForm.notes,
        status: delayNumber > 0 ? "DELAYED" : modalRoute.status,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || "Failed to update delay / notes");
      return;
    }

    setMessage("Delay / note updated");
    setModalRoute(null);
    loadRoutes();
  } catch (err) {
    setMessage("Failed to save delay / notes");
  }
};

const deleteRoute = async (id) => {
  const ok = window.confirm("Delete this route from today's board?");
  if (!ok) return;

  try {
    const res = await fetch(`${API_BASE}/api/routes/${id}`, {
      method: "DELETE",
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || "Failed to delete route");
      return;
    }

    setMessage("Route deleted");
    loadRoutes();
  } catch (err) {
    setMessage("Failed to delete route");
  }
};

  return (
    <AdminLayout>
    <div style={pageStyle}>
      <div style={shellStyle}>
        <div style={topBarStyle}>
          <div style={brandStyle}>
            <div style={truckIconStyle}>🚚</div>
            <div>
              <h1 style={titleStyle}>CTV Admin Control</h1>
              <p style={subTitleStyle}>Manage today’s routes and live status</p>
            </div>
          </div>

          <button style={loadButtonStyle} onClick={loadTodaySchedule}>
            ↻ Load Today’s Schedule
          </button>
        </div>

        <div style={gridStyle}>
          <div style={panelStyle}>
            <h2 style={panelTitleStyle}>
              <span style={smallIconStyle}>🚚</span> Add New Route
            </h2>

            <form onSubmit={addRoute} style={formStyle}>
              <label style={labelStyle}>Route Number</label>
              <input style={inputStyle} name="route_number" value={form.route_number} onChange={handleChange} placeholder="e.g. YF201" />

              <label style={labelStyle}>Destination</label>
              <input style={inputStyle} name="destination" value={form.destination} onChange={handleChange} placeholder="e.g. YMX" />

              <label style={labelStyle}>Route Type</label>
            <select
            style={inputStyle}
            name="route_type"
            value={form.route_type}
            onChange={handleChange}
            >
            <option value="OUTBOUND">OUTBOUND - Depart</option>
            <option value="INBOUND">INBOUND - Arrive</option>
            </select>

            <label style={labelStyle}>Scheduled Time</label>
            <input
              type="time"
              style={inputStyle}
              name="scheduled_departure_time"
              value={form.scheduled_departure_time}
              onChange={handleChange}
            />

              <label style={labelStyle}>Initial Status</label>
              <select style={inputStyle} name="status" value={form.status} onChange={handleChange}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>

              <div style={dividerStyle} />

              <label style={labelStyle}>Delay Time <span style={mutedStyle}>(minutes)</span></label>
              <input style={inputStyle} name="delay_minutes" value={form.delay_minutes} onChange={handleChange} placeholder="e.g. 20" type="number" min="0" />

              <label style={labelStyle}>Notes / Comment</label>
              <textarea style={textAreaStyle} name="notes" value={form.notes} onChange={handleChange} placeholder="Enter any note or comment..." />

              <button style={mainButtonStyle} type="submit">⊕ Add Route</button>
            </form>

            {message && <div style={messageStyle}>{message}</div>}
          </div>

          <div style={panelStyle}>
            <div style={listHeaderStyle}>
              <h2 style={panelTitleStyle}>
                <span style={smallIconStyle}>☷</span> Today’s Routes
              </h2>
              <span style={countTextStyle}>Total Routes: {routes.length}</span>
            </div>

            {routes.map((route) => (
              <div key={route.id} style={routeCardStyle}>
                <div style={actionTopStyle}>
                  <button onClick={() => openDelayModal(route)} style={delayTopButtonStyle}>
                    ✎ Delay / Notes
                  </button>
                  <button style={trashButtonStyle} onClick={() => deleteRoute(route.id)}>🗑</button>
                </div>

                <div style={routeTopStyle}>
                  <div style={timeBoxStyle}>
                    <strong>{route.scheduled_departure_time}</strong>
                    <span>{getTimeLabel(route)}</span>
                  </div>

                  <div style={{ flex: 1, paddingRight: 170 }}>
                    <div style={routeTitleStyle}>
                      {route.route_number}
                      <span style={arrowStyle}>→</span>
                      {route.destination}
                      <span style={{ ...statusBadgeStyle, color: statusColor(route.status), background: statusSoftBg(route.status), borderColor: statusColor(route.status) }}>
                        {route.status}
                      </span>
                    </div>

                    <div style={metaRowStyle}>
                      <span>⌖ Destination: {route.destination}</span>
                      <span>◷ {getTimeLabel(route)}: {route.scheduled_departure_time}</span>
                      <span>Delay: {route.delay_minutes > 0 ? `${route.delay_minutes} min` : "--"}</span>
                      <span>Note: {route.notes || "--"}</span>
                    </div>

                    <div style={buttonRowStyle}>
                      {STATUSES.map((status) => (
                        <button
                          key={status}
                          onClick={() => updateStatus(route.id, status)}
                          style={{
                            ...statusButtonStyle,
                            color: statusColor(status),
                            borderColor: statusColor(status),
                            background: route.status === status ? statusSoftBg(status) : "white",
                          }}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {modalRoute && (
          <div style={modalOverlayStyle}>
            <div style={modalStyle}>
              <button style={modalCloseStyle} onClick={() => setModalRoute(null)}>×</button>

              <h2 style={modalTitleStyle}>Update Delay & Notes</h2>
              <p style={modalSubStyle}>{modalRoute.route_number} → {modalRoute.destination}</p>

              <label style={labelStyle}>Delay Minutes</label>
              <input
                style={inputStyle}
                type="number"
                min="0"
                value={modalForm.delay_minutes}
                onChange={(e) => setModalForm({ ...modalForm, delay_minutes: e.target.value })}
                placeholder="e.g. 20"
              />

              <div style={quickRowStyle}>
                {[5, 10, 15, 30, 60].map((m) => (
                  <button
                    key={m}
                    style={quickBtnStyle}
                    onClick={() => setModalForm({ ...modalForm, delay_minutes: m })}
                  >
                    +{m} min
                  </button>
                ))}
              </div>

              <label style={labelStyle}>Notes / Comment</label>
              <textarea
                style={textAreaStyle}
                value={modalForm.notes}
                onChange={(e) => setModalForm({ ...modalForm, notes: e.target.value })}
                placeholder="Enter comment..."
              />

              <div style={modalActionRowStyle}>
                <button style={cancelButtonStyle} onClick={() => setModalRoute(null)}>Cancel</button>
                <button style={saveButtonStyle} onClick={saveDelayNotes}>✓ Save Changes</button>
              </div>
            </div>
          </div>
        )}
      </div>
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

const statusColor = (s) => ({
  "NOT STARTED": "#334155",
  "ON TIME": "#16a34a",
  LOADING: "#0b7ed7",
  DELAYED: "#f97316",
  ENROUTE: "#7c3aed",
  ARRIVED: "#0f766e",
  CANCELLED: "#dc2626",
  DEPARTED: "#334155",
}[s] || "#334155");

const statusSoftBg = (s) => ({
  "NOT STARTED": "#f1f5f9",
  "ON TIME": "#dcfce7",
  LOADING: "#eff6ff",
  DELAYED: "#fff7ed",
  ENROUTE: "#f3e8ff",
  ARRIVED: "#ccfbf1",
  CANCELLED: "#fee2e2",
  DEPARTED: "#e2e8f0",
}[s] || "#f8fafc");

const pageStyle = {
  minHeight: "100vh",
  background: "#f8fafc",
  padding: 18,
  fontFamily: "Inter, Arial, sans-serif",
  color: "#0f172a",
};

const shellStyle = {
  background: "#ffffff",
  borderRadius: 22,
  padding: 22,
  boxShadow: "0 18px 60px rgba(15,23,42,.10)",
  border: "1px solid #e5e7eb",
};

const topBarStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 22,
};

const brandStyle = { display: "flex", alignItems: "center", gap: 14 };

const truckIconStyle = {
  width: 54,
  height: 54,
  borderRadius: 12,
  background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
  color: "white",
  display: "grid",
  placeItems: "center",
  fontSize: 25,
  boxShadow: "0 10px 20px rgba(37,99,235,.25)",
};

const titleStyle = { margin: 0, fontSize: 28, fontWeight: 900, letterSpacing: "-.03em" };
const subTitleStyle = { color: "#64748b", margin: "3px 0 0", fontSize: 14, fontWeight: 600 };

const gridStyle = { display: "grid", gridTemplateColumns: "390px 1fr", gap: 22 };

const panelStyle = {
  background: "white",
  borderRadius: 16,
  padding: 20,
  boxShadow: "0 10px 35px rgba(15,23,42,.08)",
  border: "1px solid #e2e8f0",
};

const panelTitleStyle = {
  margin: "0 0 20px",
  fontSize: 22,
  fontWeight: 900,
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const smallIconStyle = {
  width: 30,
  height: 30,
  borderRadius: 8,
  background: "#eff6ff",
  color: "#2563eb",
  display: "inline-grid",
  placeItems: "center",
  fontSize: 16,
};

const formStyle = { display: "flex", flexDirection: "column", gap: 9 };
const labelStyle = { fontWeight: 800, fontSize: 13, color: "#0f172a", marginTop: 4 };
const mutedStyle = { color: "#64748b", fontWeight: 600 };

const inputStyle = {
  padding: "12px 14px",
  borderRadius: 9,
  border: "1px solid #cbd5e1",
  fontSize: 14,
  outline: "none",
  color: "#0f172a",
  background: "#fff",
};

const textAreaStyle = { ...inputStyle, minHeight: 82, resize: "vertical" };
const dividerStyle = { height: 1, background: "#e2e8f0", margin: "8px 0" };

const mainButtonStyle = {
  padding: 14,
  borderRadius: 10,
  border: "none",
  background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
  color: "white",
  fontWeight: 900,
  cursor: "pointer",
  marginTop: 8,
  fontSize: 15,
};

const loadButtonStyle = {
  padding: "14px 22px",
  borderRadius: 10,
  border: "none",
  background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
  color: "white",
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 8px 18px rgba(37,99,235,.22)",
};

const messageStyle = {
  marginTop: 14,
  padding: 12,
  borderRadius: 10,
  background: "#ecfeff",
  color: "#155e75",
  fontWeight: 800,
};

const listHeaderStyle = { display: "flex", justifyContent: "space-between", alignItems: "center" };
const countTextStyle = { color: "#334155", fontSize: 14, fontWeight: 700 };

const routeCardStyle = {
  position: "relative",
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  padding: 16,
  marginBottom: 14,
  boxShadow: "0 6px 18px rgba(15,23,42,.06)",
  background: "#fff",
};

const actionTopStyle = {
  position: "absolute",
  top: 14,
  right: 14,
  display: "flex",
  gap: 10,
  alignItems: "center",
};

const delayTopButtonStyle = {
  border: "1px solid #93c5fd",
  color: "#2563eb",
  background: "white",
  borderRadius: 8,
  padding: "8px 14px",
  fontWeight: 800,
  cursor: "pointer",
};

const trashButtonStyle = {
  border: "1px solid #fecaca",
  color: "#dc2626",
  background: "#fff",
  borderRadius: 8,
  padding: "8px 10px",
  cursor: "pointer",
};

const routeTopStyle = { display: "flex", gap: 18 };

const timeBoxStyle = {
  minWidth: 76,
  borderRight: "3px solid #e2e8f0",
  color: "#2563eb",
  fontSize: 20,
  display: "flex",
  flexDirection: "column",
  gap: 4,
  paddingTop: 12,
  fontWeight: 900,
};

const routeTitleStyle = { fontSize: 20, fontWeight: 900, marginBottom: 10 };
const arrowStyle = { color: "#94a3b8", margin: "0 12px" };

const statusBadgeStyle = {
  marginLeft: 12,
  border: "1px solid",
  borderRadius: 8,
  padding: "4px 9px",
  fontSize: 11,
  fontWeight: 900,
};

const metaRowStyle = {
  display: "grid",
  gridTemplateColumns: "1.1fr 1fr .8fr 1.4fr",
  gap: 12,
  color: "#475569",
  fontSize: 13,
  marginBottom: 14,
};

const buttonRowStyle = { display: "flex", flexWrap: "wrap", gap: 8 };

const statusButtonStyle = {
  border: "1px solid",
  borderRadius: 7,
  padding: "7px 11px",
  fontWeight: 900,
  cursor: "pointer",
  fontSize: 12,
};

const modalOverlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 50,
};

const modalStyle = {
  width: 420,
  background: "white",
  borderRadius: 18,
  padding: 24,
  boxShadow: "0 30px 80px rgba(15,23,42,.35)",
  position: "relative",
};

const modalCloseStyle = {
  position: "absolute",
  top: 14,
  right: 18,
  border: "none",
  background: "transparent",
  fontSize: 28,
  cursor: "pointer",
  fontWeight: 900,
};

const modalTitleStyle = { margin: 0, fontSize: 24, fontWeight: 900 };
const modalSubStyle = { color: "#475569", fontWeight: 900, fontSize: 17 };
const quickRowStyle = { display: "flex", gap: 8, flexWrap: "wrap", margin: "10px 0 14px" };

const quickBtnStyle = {
  border: "1px solid #bfdbfe",
  background: "#eff6ff",
  color: "#2563eb",
  borderRadius: 9,
  padding: "8px 11px",
  fontWeight: 900,
  cursor: "pointer",
};

const modalActionRowStyle = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 };

const cancelButtonStyle = {
  padding: 14,
  borderRadius: 11,
  border: "none",
  background: "#f1f5f9",
  fontWeight: 900,
  cursor: "pointer",
};

const saveButtonStyle = {
  padding: 14,
  borderRadius: 11,
  border: "none",
  background: "#2563eb",
  color: "white",
  fontWeight: 900,
  cursor: "pointer",
};

export default AdminCTVRoutesPage;