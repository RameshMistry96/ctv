import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function AdminCTVTemplatePage() {
  const navigate = useNavigate();

  const [templates, setTemplates] = useState([]);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [viewMode, setViewMode] = useState("list");
  const [openDays, setOpenDays] = useState({});
  const [showMobileForm, setShowMobileForm] = useState(false);

  const didSetDefaultOpenDay = useRef(false);
  const lastEditedDayRef = useRef(null);

  const [form, setForm] = useState({
    day_of_week: "Monday",
    route_number: "",
    destination: "",
    door_number: "",
    scheduled_departure_time: "",
    route_type: "OUTBOUND",
    default_status: "ON TIME",
  });

  /* =====================================================
     LOAD TEMPLATES
  ===================================================== */

  const loadTemplates = async () => {
    try {
      const res = await fetch("/api/ctv/api/templates");
      const data = await res.json();

      const cleanData = data.map((t) => ({
        ...t,
        day_of_week: String(t.day_of_week || "").trim(),
      }));

      setTemplates(cleanData);
    } catch (err) {
      console.error("Failed to load templates:", err);
      setMessage("Failed to load weekly templates");
    }
  };

  /* =====================================================
     AUTH
  ===================================================== */

  useEffect(() => {
    const isAuth = sessionStorage.getItem("admin_auth");

    const loginTime = Number(
      sessionStorage.getItem("admin_login_time")
    );

    const eightHours = 8 * 60 * 60 * 1000;

    if (
      !isAuth ||
      !loginTime ||
      Date.now() - loginTime > eightHours
    ) {
      sessionStorage.removeItem("admin_auth");
      sessionStorage.removeItem("admin_login_time");

      navigate("/ctv-admin/login");
      return;
    }

    loadTemplates();
  }, [navigate]);

  /* =====================================================
     DEFAULT OPEN DAY
  ===================================================== */

  useEffect(() => {
    if (didSetDefaultOpenDay.current) return;

    const todayName = new Date().toLocaleDateString("en-US", {
      weekday: "long",
    });

    const nextOpen = {};

    DAYS.forEach((day) => {
      nextOpen[day] = day === todayName;
    });

    setOpenDays(nextOpen);

    didSetDefaultOpenDay.current = true;
  }, [templates]);

  /* =====================================================
     STATS
  ===================================================== */

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

  /* =====================================================
     FORM CHANGE
  ===================================================== */

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  /* =====================================================
     RESET FORM
  ===================================================== */

  const resetForm = () => {
    setEditingId(null);

    setForm({
      day_of_week: "Monday",
      route_number: "",
      destination: "",
      door_number: "",
      scheduled_departure_time: "",
      route_type: "OUTBOUND",
      default_status: "ON TIME",
    });

    setShowMobileForm(false);
  };

  /* =====================================================
     SAVE TEMPLATE
  ===================================================== */

  const saveTemplate = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const url = editingId
        ? `/api/ctv/api/templates/${editingId}`
        : `/api/ctv/api/templates`;

      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
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

      const dayToReturn = form.day_of_week;

      resetForm();

      await loadTemplates();

      setOpenDays(() => {
        const nextOpen = {};

        DAYS.forEach((day) => {
          nextOpen[day] = day === dayToReturn;
        });

        return nextOpen;
      });

      setTimeout(() => {
        document
          .getElementById(`day-${dayToReturn}`)
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
      }, 100);
    } catch (err) {
      setMessage("Failed to save weekly route");
    }
  };

  /* =====================================================
     EDIT TEMPLATE
  ===================================================== */

  const startEdit = (route) => {
    setEditingId(route.id);

    lastEditedDayRef.current = route.day_of_week;

    setMessage("");
    setShowMobileForm(true);

    setForm({
      day_of_week: route.day_of_week,
      route_number: route.route_number,
      destination: route.destination,
      door_number: route.door_number || "",
      scheduled_departure_time:
        route.scheduled_departure_time,
      route_type: route.route_type || "OUTBOUND",
      default_status: route.default_status || "ON TIME",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /* =====================================================
     DELETE TEMPLATE
  ===================================================== */

  const deleteTemplate = async (id) => {
    const ok = window.confirm(
      "Delete this weekly route?"
    );

    if (!ok) return;

    try {
      const res = await fetch(
        `/api/ctv/api/templates/${id}`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) {
        setMessage("Failed to delete weekly route");
        return;
      }

      setTemplates((prev) =>
        prev.filter((t) => t.id !== id)
      );

      setMessage("Weekly route deleted");
    } catch (err) {
      setMessage("Failed to delete weekly route");
    }
  };

  /* =====================================================
     TOGGLE DAY
  ===================================================== */

  const toggleDay = (day) => {
    setOpenDays((prev) => {
      const isAlreadyOpen = !!prev[day];

      const nextOpen = {};

      DAYS.forEach((d) => {
        nextOpen[d] = false;
      });

      nextOpen[day] = !isAlreadyOpen;

      return nextOpen;
    });
  };

  /* =====================================================
     FORM CARD
  ===================================================== */

  const FormCard = (mobile = false) => (
    <div
      style={
        mobile
          ? mobileFormCard
          : formPanelStyle
      }
      className="tpl-form-panel"
    >
      <div style={formHeaderStyle}>
        <div style={formIconStyle}>
          {editingId ? "✎" : "＋"}
        </div>

        <div>
          <div style={formSmallTitleStyle}>
            WEEKLY TEMPLATE
          </div>

          <h2 style={formTitleStyle}>
            {editingId
              ? "Edit Weekly Route"
              : "Add Weekly Route"}
          </h2>
        </div>
      </div>

      <form
        onSubmit={saveTemplate}
        style={formStyle}
        className="tpl-template-form"
      >
        <div
          style={formTwoColStyle}
          className="tpl-form-two"
        >
          <div style={fieldStyle}>
            <label style={label}>
              Select Day
            </label>

            <select
              name="day_of_week"
              value={form.day_of_week}
              onChange={handleChange}
              style={input}
            >
              {DAYS.map((day) => (
                <option key={day}>
                  {day}
                </option>
              ))}
            </select>
          </div>

          <div style={fieldStyle}>
            <label style={label}>
              Route Type
            </label>

            <select
              name="route_type"
              value={form.route_type}
              onChange={handleChange}
              style={input}
            >
              <option value="OUTBOUND">
                OUTBOUND - Depart
              </option>

              <option value="INBOUND">
                INBOUND - Arrive
              </option>
            </select>
          </div>
        </div>

        <div
          style={formTwoColStyle}
          className="tpl-form-two"
        >
          <div style={fieldStyle}>
            <label style={label}>
              Route Number
            </label>

            <input
              name="route_number"
              value={form.route_number}
              onChange={handleChange}
              placeholder="e.g. YF201"
              style={input}
            />
          </div>

          <div style={fieldStyle}>
            <label style={label}>
              Destination
            </label>

            <input
              name="destination"
              value={form.destination}
              onChange={handleChange}
              placeholder="e.g. YMX"
              style={input}
            />
          </div>
        </div>

        <div
          style={formTwoColStyle}
          className="tpl-form-two"
        >
          <div style={fieldStyle}>
            <label style={label}>
              Door Number
            </label>

            <input
              name="door_number"
              value={form.door_number}
              onChange={handleChange}
              placeholder="e.g. 12"
              style={input}
            />
          </div>

          <div style={fieldStyle}>
            <label style={label}>
              Scheduled Time
            </label>

            <input
              type="time"
              name="scheduled_departure_time"
              value={
                form.scheduled_departure_time
              }
              onChange={handleChange}
              style={input}
            />
          </div>
        </div>

        <div style={fieldStyle}>
          <label style={label}>
            Status
          </label>

          <select
            name="default_status"
            value={form.default_status}
            onChange={handleChange}
            style={input}
          >
            <option>ON TIME</option>
            <option>LOADING</option>
            <option>DELAYED</option>
            <option>CANCELLED</option>
          </select>
        </div>

        {mobile ? (
          <div style={mobileActionRow}>
            <button
              type="button"
              style={mobileCancelBtn}
              onClick={resetForm}
            >
              Cancel
            </button>

            <button style={button}>
              {editingId
                ? "Save Update"
                : "Save Route"}
            </button>
          </div>
        ) : (
          <>
            <button style={button}>
              {editingId
                ? "Save Update"
                : "Save Weekly Route"}
            </button>

            {editingId && (
              <button
                type="button"
                style={cancelButton}
                onClick={resetForm}
              >
                Cancel Edit
              </button>
            )}
          </>
        )}
      </form>

      {!mobile && (
        <div style={formTipStyle}>
          <span>ⓘ</span>

          <span>
            Add recurring routes for each day.
            These can be loaded into today&apos;s
            schedule.
          </span>
        </div>
      )}

      {message && (
        <div style={messageBox}>
          {message}
        </div>
      )}
    </div>
  );

  /* =====================================================
     PAGE
  ===================================================== */

  return (
    <AdminLayout>
      <style>{responsiveCss}</style>

      <div
        style={page}
        className="tpl-page"
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <div
          style={header}
          className="tpl-header"
        >
          <div>
            <div style={smallHeading}>
              CTV WEEKLY PLANNING
            </div>

            <h1 style={title}>
              Weekly Route Templates
            </h1>

            <p style={subtitle}>
              Create and manage recurring weekly
              routes. These routes can be loaded
              to today&apos;s schedule.
            </p>
          </div>

          <div
            style={headerActions}
            className="tpl-header-actions"
          >
            <button
              style={primaryTopBtn}
              onClick={async () => {
                try {
                  const res = await fetch(
                    "/api/ctv/api/routes/load-today",
                    {
                      method: "POST",
                    }
                  );

                  const data = await res.json();

                  setMessage(
                    data.message ||
                      "Today schedule loaded"
                  );
                } catch (err) {
                  setMessage(
                    "Failed to load today schedule"
                  );
                }
              }}
            >
              ⇩ Load This Week to Today
            </button>

            <button
              type="button"
              style={secondaryTopBtn}
            >
              ⓘ Quick Guide
            </button>
          </div>
        </div>

        {/* =================================================
            STATS
        ================================================= */}

        <div
          style={statsBar}
          className="tpl-stats"
        >
          <StatBox
            icon="🗓"
            label="Days With Routes"
            value={stats.daysWithRoutes}
            sub="of 7 days"
            color="#ec2772"
            soft="#fff0f6"
          />

          <StatBox
            icon="🔗"
            label="Total Routes"
            value={stats.totalRoutes}
            sub="this week"
            color="#7c3aed"
            soft="#f5f3ff"
          />

          <StatBox
            icon="◷"
            label="Earliest Time"
            value={stats.earliest}
            sub="scheduled time"
            color="#0ea5e9"
            soft="#f0f9ff"
          />

          <StatBox
            icon="◷"
            label="Latest Time"
            value={stats.latest}
            sub="scheduled time"
            color="#f97316"
            soft="#fff7ed"
          />

          <StatBox
            icon="✓"
            label="Active Status"
            value="Active"
            sub="All systems normal"
            color="#16a34a"
            soft="#ecfdf3"
          />
        </div>

        {/* =================================================
            MAIN LAYOUT
        ================================================= */}

        <div
          style={layout}
          className="tpl-layout"
        >
          <div className="tpl-desktop-form">
            {FormCard(false)}
          </div>

          <div
            style={schedulePanelStyle}
            className="tpl-schedule-panel"
          >
            {/* SCHEDULE HEADER */}

            <div
              style={scheduleHeader}
              className="tpl-schedule-header"
            >
              <div>
                <div style={scheduleSmallTitle}>
                  SAVED TEMPLATES
                </div>

                <h2 style={scheduleTitle}>
                  Saved Weekly Schedule
                </h2>

                <div style={scheduleSubtitle}>
                  Open a day to view and manage
                  its recurring routes.
                </div>
              </div>

              <div style={viewBtns}>
                <button
                  type="button"
                  onClick={() =>
                    setViewMode("list")
                  }
                  style={
                    viewMode === "list"
                      ? viewActiveBtn
                      : viewBtn
                  }
                >
                  ☰ List View
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setViewMode("calendar");

                    setMessage(
                      "Calendar View coming soon. List View is active for now."
                    );
                  }}
                  style={
                    viewMode === "calendar"
                      ? viewActiveBtn
                      : viewBtn
                  }
                >
                  🗓 Calendar View
                </button>
              </div>
            </div>

            {/* =================================================
                DAYS
            ================================================= */}

            <div className="tpl-days-wrap">
              {DAYS.map((day) => {
                const dayRoutes =
                  templates.filter(
                    (t) =>
                      t.day_of_week === day
                  );

                const shortDay = day
                  .slice(0, 3)
                  .toUpperCase();

                return (
                  <div
                    key={day}
                    id={`day-${day}`}
                    style={dayBlock}
                    className="tpl-day-block"
                  >
                    {/* DAY HEADER */}

                    <div
                      style={dayHeader}
                      className="tpl-day-header"
                      onClick={() =>
                        toggleDay(day)
                      }
                    >
                      <span style={dayPill}>
                        {shortDay}
                      </span>

                      <div>
                        <strong style={dayName}>
                          {day}
                        </strong>

                        <div
                          style={
                            routeCountText
                          }
                        >
                          {dayRoutes.length === 0
                            ? "No routes added"
                            : `${dayRoutes.length} route${
                                dayRoutes.length > 1
                                  ? "s"
                                  : ""
                              }`}
                        </div>
                      </div>

                      <div
                        style={
                          dayHeaderRight
                        }
                      >
                        <span
                          style={
                            dayCountBadge
                          }
                        >
                          {dayRoutes.length}
                        </span>

                        <span style={chevron}>
                          {openDays[day]
                            ? "⌃"
                            : "⌄"}
                        </span>
                      </div>
                    </div>

                    {/* ROUTES */}

                    {openDays[day] &&
                      dayRoutes.length >
                        0 && (
                        <div
                          style={routesWrap}
                          className="tpl-routes-grid"
                        >
                          {dayRoutes.map(
                            (r) => {
                              const theme =
                                getRouteTheme(
                                  r
                                );

                              const isInbound =
                                getRouteType(
                                  r
                                ) ===
                                "INBOUND";

                              return (
                                <div
                                  key={r.id}
                                  style={{
                                    ...routeCard,
                                    background:
                                      theme.background,
                                    borderColor:
                                      theme.border,
                                  }}
                                  className={`tpl-route-card ${
                                    isInbound
                                      ? "tpl-arrival-card"
                                      : "tpl-departure-card"
                                  }`}
                                >
                                  {/* TOP */}

                                  <div
                                    style={
                                      routeCardTop
                                    }
                                  >
                                    <div
                                      style={{
                                        ...routeTypeIcon,
                                        color:
                                          theme.primary,
                                        background:
                                          theme.soft,
                                      }}
                                    >
                                      {isInbound
                                        ? "↓"
                                        : "✈"}
                                    </div>

                                    <span
                                      style={{
                                        ...routeTypeBadge,
                                        color:
                                          theme.primary,
                                        background:
                                          theme.soft,
                                        borderColor:
                                          theme.border,
                                      }}
                                    >
                                      {getTimeLabel(
                                        r
                                      ).toUpperCase()}
                                    </span>
                                  </div>

                                  {/* ROUTE */}

                                  <div
                                    style={
                                      routeTitle
                                    }
                                  >
                                    {
                                      r.route_number
                                    }

                                    <span
                                      style={
                                        arrow
                                      }
                                    >
                                      →
                                    </span>

                                    {
                                      r.destination
                                    }
                                  </div>

                                  {/* TIME */}

                                  <div
                                    style={{
                                      ...routeTime,
                                      color:
                                        theme.primary,
                                    }}
                                  >
                                    {
                                      r.scheduled_departure_time
                                    }
                                  </div>

                                  {/* DETAILS */}

                                  <div
                                    style={
                                      routeDetails
                                    }
                                  >
                                    <div
                                      style={
                                        detailRow
                                      }
                                    >
                                      <span>
                                        🚪
                                      </span>

                                      <span>
                                        Door:{" "}
                                        <b>
                                          {r.door_number ||
                                            "--"}
                                        </b>
                                      </span>
                                    </div>

                                    <div
                                      style={
                                        detailRow
                                      }
                                    >
                                      <span>
                                        ●
                                      </span>

                                      <span>
                                        Status:{" "}
                                        <b>
                                          {r.default_status ||
                                            "--"}
                                        </b>
                                      </span>
                                    </div>

                                    <div
                                      style={
                                        detailRow
                                      }
                                    >
                                      <span>
                                        🗓
                                      </span>

                                      <span>
                                        {r.day_of_week}
                                      </span>
                                    </div>
                                  </div>

                                  {/* ACTIONS */}

                                  <div
                                    style={
                                      actionRow
                                    }
                                  >
                                    <button
                                      style={
                                        editBtn
                                      }
                                      onClick={() =>
                                        startEdit(
                                          r
                                        )
                                      }
                                    >
                                      ✎ Edit
                                    </button>

                                    <button
                                      style={
                                        deleteBtn
                                      }
                                      onClick={() =>
                                        deleteTemplate(
                                          r.id
                                        )
                                      }
                                    >
                                      🗑 Delete
                                    </button>
                                  </div>
                                </div>
                              );
                            }
                          )}
                        </div>
                      )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* =================================================
            INFO BOX
        ================================================= */}

        <div
          style={infoBox}
          className="tpl-info"
        >
          <div style={infoIcon}>
            ⓘ
          </div>

          <div>
            <strong>
              How it works
            </strong>

            <p style={infoText}>
              Add routes for each day of the
              week. These templates will be
              available to load into today&apos;s
              schedule automatically.
            </p>
          </div>
        </div>

        {/* =================================================
            MOBILE ADD BUTTON
        ================================================= */}

        {!showMobileForm && (
          <button
            className="tpl-mobile-add-btn"
            onClick={() =>
              setShowMobileForm(
                true
              )
            }
          >
            +
          </button>
        )}

        {/* =================================================
            MOBILE FORM
        ================================================= */}

        {showMobileForm && (
          <div style={mobileOverlay}>
            <div
              style={mobileSheet}
              className="tpl-mobile-sheet"
            >
              {FormCard(true)}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

/* =====================================================
   HELPERS
===================================================== */

const getRouteType = (route) => {
  return String(
    route.route_type ||
      route.type ||
      "OUTBOUND"
  ).toUpperCase();
};

const getTimeLabel = (route) => {
  return getRouteType(route) ===
    "INBOUND"
    ? "Arrive"
    : "Depart";
};

const getRouteTheme = (route) => {
  const inbound =
    getRouteType(route) ===
    "INBOUND";

  if (inbound) {
    return {
      primary: "#059669",
      soft: "#ecfdf5",
      background:
        "linear-gradient(145deg,#ffffff 0%,#f3fff9 100%)",
      border: "#b7ead4",
    };
  }

  return {
    primary: "#ec2772",
    soft: "#fff0f6",
    background:
      "linear-gradient(145deg,#ffffff 0%,#fff5f9 100%)",
    border: "#f6c3d6",
  };
};

/* =====================================================
   STAT BOX
===================================================== */

function StatBox({
  icon,
  label,
  value,
  sub,
  color,
  soft,
}) {
  return (
    <div
      style={statBox}
      className="tpl-stat-box"
    >
      <div
        style={{
          ...statIcon,
          background: soft,
          color,
        }}
        className="tpl-stat-icon"
      >
        {icon}
      </div>

      <div>
        <div
          style={statLabel}
          className="tpl-stat-label"
        >
          {label}
        </div>

        <div
          style={{
            ...statValue,
            color,
          }}
          className="tpl-stat-value"
        >
          {value}
        </div>

        <div
          style={statSub}
          className="tpl-stat-sub"
        >
          {sub}
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   PAGE
===================================================== */

const page = {
  minHeight: "100vh",

  background:
    "linear-gradient(180deg,#fafbfe 0%,#f6f7fb 100%)",

  padding: "30px 32px 42px",

  fontFamily:
    "Inter, Arial, sans-serif",

  color: "#0f172a",
};

/* =====================================================
   HEADER
===================================================== */

const header = {
  display: "flex",

  justifyContent:
    "space-between",

  alignItems:
    "flex-start",

  gap: 20,

  marginBottom: 24,
};

const smallHeading = {
  color: "#ec2772",

  fontSize: 10,

  fontWeight: 900,

  letterSpacing: ".13em",

  marginBottom: 7,
};

const title = {
  margin: 0,

  fontSize: 32,

  color: "#172033",

  fontWeight: 900,

  letterSpacing: "-.04em",

  lineHeight: 1.05,
};

const subtitle = {
  color: "#64748b",

  fontSize: 13,

  marginTop: 7,

  maxWidth: 650,

  fontWeight: 600,

  lineHeight: 1.5,
};

const headerActions = {
  display: "flex",

  gap: 10,

  flexWrap: "wrap",
};

const primaryTopBtn = {
  minHeight: 44,

  border: "none",

  borderRadius: 8,

  padding: "0 18px",

  background:
    "linear-gradient(135deg,#ff326c,#e91e63)",

  color: "white",

  fontWeight: 900,

  fontSize: 11,

  cursor: "pointer",

  boxShadow:
    "0 10px 24px rgba(236,39,114,.20)",
};

const secondaryTopBtn = {
  ...primaryTopBtn,

  background: "#ffffff",

  color: "#7c3aed",

  border:
    "1px solid #ddd6fe",

  boxShadow:
    "0 6px 16px rgba(15,23,42,.04)",
};

/* =====================================================
   STATS
===================================================== */

const statsBar = {
  display: "grid",

  gridTemplateColumns:
    "repeat(5,minmax(0,1fr))",

  gap: 12,

  marginBottom: 20,
};

const statBox = {
  minHeight: 105,

  display: "flex",

  alignItems: "center",

  gap: 12,

  background: "#ffffff",

  border:
    "1px solid #e5e9f0",

  borderRadius: 10,

  padding: 15,

  boxShadow:
    "0 6px 18px rgba(15,23,42,.035)",
};

const statIcon = {
  width: 42,

  height: 42,

  borderRadius: 10,

  display: "grid",

  placeItems: "center",

  fontSize: 18,

  flexShrink: 0,
};

const statLabel = {
  textTransform: "uppercase",

  color: "#64748b",

  fontSize: 8,

  fontWeight: 900,

  letterSpacing: ".05em",
};

const statValue = {
  fontSize: 21,

  fontWeight: 900,

  marginTop: 3,

  lineHeight: 1,
};

const statSub = {
  color: "#94a3b8",

  fontSize: 9,

  marginTop: 4,

  fontWeight: 600,
};

/* =====================================================
   MAIN LAYOUT
===================================================== */

const layout = {
  display: "grid",

  gridTemplateColumns:
    "320px minmax(0,1fr)",

  gap: 18,

  alignItems: "start",
};

/* =====================================================
   FORM PANEL
===================================================== */

const formPanelStyle = {
  background: "#ffffff",

  borderRadius: 10,

  padding: 18,

  boxShadow:
    "0 7px 24px rgba(15,23,42,.04)",

  border:
    "1px solid #e5e9f0",
};

const formHeaderStyle = {
  display: "flex",

  alignItems: "center",

  gap: 11,

  marginBottom: 18,
};

const formIconStyle = {
  width: 42,

  height: 42,

  borderRadius: 999,

  background: "#fff0f6",

  color: "#ec2772",

  display: "grid",

  placeItems: "center",

  fontSize: 18,

  fontWeight: 900,
};

const formSmallTitleStyle = {
  color: "#ec2772",

  fontSize: 8,

  fontWeight: 900,

  letterSpacing: ".11em",

  marginBottom: 3,
};

const formTitleStyle = {
  margin: 0,

  color: "#172033",

  fontSize: 17,

  fontWeight: 900,
};

const formStyle = {
  display: "flex",

  flexDirection: "column",

  gap: 13,
};

const formTwoColStyle = {
  display: "grid",

  gridTemplateColumns:
    "1fr 1fr",

  gap: 10,
};

const fieldStyle = {
  display: "flex",

  flexDirection: "column",

  gap: 6,

  minWidth: 0,
};

const label = {
  fontSize: 10,

  fontWeight: 800,

  color: "#334155",
};

const input = {
  width: "100%",

  minHeight: 39,

  padding: "9px 11px",

  borderRadius: 6,

  border:
    "1px solid #dbe1e8",

  fontSize: 11,

  outline: "none",

  background: "#ffffff",

  color: "#0f172a",

  fontWeight: 600,

  boxSizing: "border-box",
};

const button = {
  minHeight: 42,

  borderRadius: 7,

  border: "none",

  background:
    "linear-gradient(135deg,#ff326c,#e91e63)",

  color: "white",

  fontWeight: 900,

  fontSize: 11,

  cursor: "pointer",

  boxShadow:
    "0 8px 18px rgba(236,39,114,.18)",
};

const cancelButton = {
  ...button,

  background: "#f1f5f9",

  color: "#475569",

  boxShadow: "none",
};

const formTipStyle = {
  display: "flex",

  gap: 8,

  marginTop: 16,

  padding: 10,

  borderRadius: 7,

  background: "#f0f8ff",

  border:
    "1px solid #bfdbfe",

  color: "#2563eb",

  fontSize: 9,

  fontWeight: 700,

  lineHeight: 1.5,
};

const messageBox = {
  marginTop: 14,

  padding: 10,

  borderRadius: 7,

  background: "#ecfdf5",

  border:
    "1px solid #bbf7d0",

  color: "#15803d",

  fontWeight: 800,

  fontSize: 10,
};

/* =====================================================
   SCHEDULE PANEL
===================================================== */

const schedulePanelStyle = {
  background: "#ffffff",

  borderRadius: 10,

  padding: 18,

  border:
    "1px solid #e5e9f0",

  boxShadow:
    "0 7px 24px rgba(15,23,42,.04)",

  minWidth: 0,
};

const scheduleHeader = {
  display: "flex",

  justifyContent:
    "space-between",

  alignItems: "flex-start",

  gap: 16,

  marginBottom: 18,
};

const scheduleSmallTitle = {
  color: "#7c3aed",

  fontSize: 8,

  fontWeight: 900,

  letterSpacing: ".11em",

  marginBottom: 4,
};

const scheduleTitle = {
  margin: 0,

  color: "#172033",

  fontSize: 18,

  fontWeight: 900,
};

const scheduleSubtitle = {
  marginTop: 4,

  color: "#94a3b8",

  fontSize: 9,

  fontWeight: 600,
};

const viewBtns = {
  display: "flex",

  gap: 7,
};

const viewActiveBtn = {
  minHeight: 34,

  border: "none",

  borderRadius: 6,

  padding: "0 11px",

  background: "#7c3aed",

  color: "white",

  fontWeight: 800,

  fontSize: 9,

  cursor: "pointer",
};

const viewBtn = {
  ...viewActiveBtn,

  background: "#ffffff",

  color: "#64748b",

  border:
    "1px solid #dbe1e8",
};

/* =====================================================
   DAY BLOCK
===================================================== */

const dayBlock = {
  marginBottom: 10,

  borderRadius: 8,

  background: "#ffffff",

  border:
    "1px solid #e6e9ef",

  overflow: "hidden",
};

const dayHeader = {
  minHeight: 58,

  display: "grid",

  gridTemplateColumns:
    "52px 1fr auto",

  alignItems: "center",

  gap: 10,

  padding: "0 13px",

  background:
    "linear-gradient(90deg,#fbfcff,#ffffff)",

  cursor: "pointer",
};

const dayPill = {
  background:
    "linear-gradient(135deg,#ec2772,#9b3ce7)",

  color: "white",

  borderRadius: 6,

  padding: "8px 7px",

  fontSize: 9,

  fontWeight: 900,

  textAlign: "center",

  width: 42,
};

const dayName = {
  color: "#172033",

  fontSize: 13,

  fontWeight: 900,
};

const routeCountText = {
  color: "#94a3b8",

  fontSize: 9,

  marginTop: 3,

  fontWeight: 600,
};

const dayHeaderRight = {
  display: "flex",

  alignItems: "center",

  gap: 10,
};

const dayCountBadge = {
  minWidth: 26,

  height: 26,

  padding: "0 7px",

  borderRadius: 999,

  display: "grid",

  placeItems: "center",

  background: "#f5f3ff",

  color: "#7c3aed",

  fontSize: 9,

  fontWeight: 900,
};

const chevron = {
  color: "#7c3aed",

  fontWeight: 900,

  fontSize: 14,
};

/* =====================================================
   ROUTES GRID
===================================================== */

const routesWrap = {
  display: "grid",

  gridTemplateColumns:
    "repeat(3,minmax(0,1fr))",

  gap: 10,

  padding: 11,

  borderTop:
    "1px solid #edf0f5",

  background: "#fafbfe",
};

/* =====================================================
   ROUTE CARD
===================================================== */

const routeCard = {
  minWidth: 0,

  minHeight: 220,

  display: "flex",

  flexDirection: "column",

  border:
    "1px solid",

  borderRadius: 7,

  padding: 12,

  boxShadow:
    "0 4px 12px rgba(15,23,42,.03)",

  transition:
    "transform .15s ease, box-shadow .15s ease",
};

const routeCardTop = {
  display: "flex",

  justifyContent:
    "space-between",

  alignItems: "center",

  gap: 8,

  marginBottom: 12,
};

const routeTypeIcon = {
  width: 32,

  height: 32,

  borderRadius: 7,

  display: "grid",

  placeItems: "center",

  fontSize: 17,

  fontWeight: 900,
};

const routeTypeBadge = {
  padding: "4px 7px",

  borderRadius: 999,

  border:
    "1px solid",

  fontSize: 7,

  fontWeight: 900,
};

const routeTitle = {
  display: "flex",

  alignItems: "center",

  flexWrap: "wrap",

  gap: 5,

  fontSize: 15,

  fontWeight: 900,

  color: "#172033",

  marginBottom: 8,

  letterSpacing: "-.02em",
};

const arrow = {
  color: "#94a3b8",

  fontWeight: 900,
};

const routeTime = {
  fontSize: 20,

  fontWeight: 900,

  lineHeight: 1,

  marginBottom: 14,
};

const routeDetails = {
  display: "flex",

  flexDirection: "column",

  gap: 7,

  flex: 1,
};

const detailRow = {
  display: "flex",

  alignItems: "center",

  gap: 6,

  color: "#64748b",

  fontSize: 9,

  fontWeight: 700,
};

const actionRow = {
  display: "grid",

  gridTemplateColumns:
    "1fr 1fr",

  gap: 6,

  marginTop: 15,
};

const editBtn = {
  minHeight: 31,

  border:
    "1px solid #f9a8c3",

  borderRadius: 5,

  background: "#ffffff",

  color: "#ec2772",

  fontSize: 8,

  fontWeight: 900,

  cursor: "pointer",
};

const deleteBtn = {
  ...editBtn,

  borderColor: "#fecaca",

  color: "#dc2626",
};

/* =====================================================
   INFO
===================================================== */

const infoBox = {
  marginTop: 18,

  border:
    "1px solid #bfdbfe",

  borderRadius: 8,

  background: "#f0f8ff",

  padding: 13,

  display: "flex",

  gap: 10,

  alignItems: "center",
};

const infoIcon = {
  width: 34,

  height: 34,

  borderRadius: 999,

  background: "#dbeafe",

  color: "#2563eb",

  display: "grid",

  placeItems: "center",

  fontWeight: 900,

  flexShrink: 0,
};

const infoText = {
  margin: "4px 0 0",

  color: "#64748b",

  fontSize: 10,

  lineHeight: 1.5,

  fontWeight: 600,
};

/* =====================================================
   MOBILE
===================================================== */

const mobileOverlay = {
  position: "fixed",

  inset: 0,

  background:
    "rgba(15,23,42,.58)",

  zIndex: 1000,

  display: "flex",

  alignItems: "center",

  justifyContent: "center",

  padding: 16,

  backdropFilter:
    "blur(3px)",
};

const mobileSheet = {
  width: "100%",

  maxWidth: 430,

  maxHeight: "86vh",

  overflowY: "auto",

  background: "#ffffff",

  borderRadius: 14,

  padding: "16px 16px 110px",

  boxShadow:
    "0 30px 80px rgba(15,23,42,.35)",
};

const mobileFormCard = {
  background: "#ffffff",
};

const mobileActionRow = {
  display: "grid",

  gridTemplateColumns:
    "1fr 1fr",

  gap: 9,

  marginTop: 3,
};

const mobileCancelBtn = {
  minHeight: 42,

  borderRadius: 7,

  border: "none",

  background: "#f1f5f9",

  color: "#475569",

  fontWeight: 900,

  cursor: "pointer",
};

/* =====================================================
   RESPONSIVE
===================================================== */

const responsiveCss = `
  * {
    box-sizing: border-box;
  }

  .tpl-mobile-add-btn {
    display: none;
  }

  .tpl-route-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 9px 20px rgba(15,23,42,.07) !important;
  }

  /* =====================================================
     VERY LARGE MONITOR
  ===================================================== */

  @media (min-width: 1750px) {

    .tpl-page {
      padding:
        36px 42px 50px !important;
    }

    .tpl-header h1 {
      font-size:
        36px !important;
    }

    .tpl-stats {
      gap:
        16px !important;
    }

    .tpl-stat-box {
      min-height:
        125px !important;

      padding:
        19px !important;
    }

    .tpl-stat-icon {
      width:
        50px !important;

      height:
        50px !important;

      font-size:
        21px !important;
    }

    .tpl-stat-value {
      font-size:
        26px !important;
    }

    .tpl-stat-label {
      font-size:
        9px !important;
    }

    .tpl-stat-sub {
      font-size:
        10px !important;
    }

    .tpl-layout {
      grid-template-columns:
        350px minmax(0,1fr) !important;

      gap:
        22px !important;
    }

    .tpl-routes-grid {
      grid-template-columns:
        repeat(4,minmax(0,1fr)) !important;

      gap:
        12px !important;
    }

    .tpl-route-card {
      min-height:
        235px !important;
    }
  }

  /* =====================================================
     NORMAL DESKTOP
  ===================================================== */

  @media (min-width: 1350px) and (max-width: 1749px) {

    .tpl-routes-grid {
      grid-template-columns:
        repeat(3,minmax(0,1fr)) !important;
    }
  }

  /* =====================================================
     SMALLER DESKTOP
  ===================================================== */

  @media (max-width: 1349px) {

    .tpl-layout {
      grid-template-columns:
        300px minmax(0,1fr) !important;
    }

    .tpl-routes-grid {
      grid-template-columns:
        repeat(2,minmax(0,1fr)) !important;
    }

    .tpl-form-two {
      grid-template-columns:
        1fr !important;
    }

    .tpl-stats {
      grid-template-columns:
        repeat(3,minmax(0,1fr)) !important;
    }
  }

  /* =====================================================
     TABLET
  ===================================================== */

  @media (max-width: 1000px) {

    .tpl-layout {
      grid-template-columns:
        1fr !important;
    }

    .tpl-desktop-form {
      display:
        none !important;
    }

    .tpl-routes-grid {
      grid-template-columns:
        repeat(2,minmax(0,1fr)) !important;
    }

    .tpl-mobile-add-btn {
      display: grid;

      place-items: center;

      position: fixed;

      right: 24px;

      bottom: 95px;

      width: 58px;

      height: 58px;

      border-radius: 999px;

      border: none;

      background:
        linear-gradient(135deg,#ff326c,#e91e63);

      color: white;

      font-size: 30px;

      font-weight: 700;

      cursor: pointer;

      box-shadow:
        0 15px 32px rgba(236,39,114,.30);

      z-index: 900;
    }
  }

  /* =====================================================
     MOBILE
  ===================================================== */

  @media (max-width: 700px) {

    .tpl-page {
      padding:
        18px 14px 105px !important;
    }

    .tpl-header {
      flex-direction:
        column !important;

      align-items:
        stretch !important;

      gap:
        14px !important;
    }

    .tpl-header h1 {
      font-size:
        26px !important;
    }

    .tpl-header-actions {
      display:
        grid !important;

      grid-template-columns:
        1fr !important;
    }

    .tpl-header-actions button {
      width:
        100% !important;
    }

    .tpl-stats {
      grid-template-columns:
        1fr 1fr !important;
    }

    .tpl-schedule-panel {
      padding:
        14px !important;
    }

    .tpl-schedule-header {
      flex-direction:
        column !important;

      align-items:
        stretch !important;
    }

    .tpl-routes-grid {
      grid-template-columns:
        1fr !important;
    }

    .tpl-day-header {
      grid-template-columns:
        48px 1fr auto !important;

      padding:
        0 10px !important;
    }

    .tpl-template-form .tpl-form-two {
      grid-template-columns:
        1fr !important;
    }

    .tpl-mobile-sheet {
      padding-bottom:
        100px !important;
    }
  }

  /* =====================================================
     VERY SMALL MOBILE
  ===================================================== */

  @media (max-width: 430px) {

    .tpl-stats {
      grid-template-columns:
        1fr !important;
    }

    .tpl-routes-grid {
      grid-template-columns:
        1fr !important;
    }
  }
`;

export default AdminCTVTemplatePage;