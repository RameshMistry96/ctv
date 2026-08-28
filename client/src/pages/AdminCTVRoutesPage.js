import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";

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

  const [modalRoute, setModalRoute] =
    useState(null);

  const [modalForm, setModalForm] =
    useState({
      delay_minutes: "",
      notes: "",
    });

  /* =====================================================
     MOBILE ADD FORM
  ===================================================== */

  const [
    showMobileAddForm,
    setShowMobileAddForm,
  ] = useState(false);

  /* =====================================================
     ADD ROUTE FORM
  ===================================================== */

  const [form, setForm] = useState({
    route_number: "",
    destination: "",
    door_number: "",
    scheduled_departure_time: "",
    route_type: "OUTBOUND",
    status: "NOT STARTED",
    delay_minutes: "",
    notes: "",
  });

  /* =====================================================
     LOAD ROUTES
  ===================================================== */

  const loadRoutes = async () => {
    try {
      const res = await fetch(
        `/api/ctv/api/routes`
      );

      const data = await res.json();

      setRoutes(data);
    } catch (err) {
      console.error(
        "Failed to load admin routes:",
        err
      );
    }
  };

  /* =====================================================
     AUTH
  ===================================================== */

  useEffect(() => {
    const isAuth =
      sessionStorage.getItem(
        "admin_auth"
      );

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
      Date.now() - loginTime >
        eightHours
    ) {
      sessionStorage.removeItem(
        "admin_auth"
      );

      sessionStorage.removeItem(
        "admin_login_time"
      );

      navigate(
        "/ctv-admin/login"
      );

      return;
    }

    loadRoutes();
  }, [navigate]);

  /* =====================================================
     FORM CHANGE
  ===================================================== */

  const handleChange = (e) => {
    const updated = {
      ...form,
      [e.target.name]:
        e.target.value,
    };

    if (
      e.target.name ===
        "delay_minutes" &&
      Number(e.target.value) > 0
    ) {
      updated.status =
        "DELAYED";
    }

    setForm(updated);
  };

  /* =====================================================
     ADD ROUTE
  ===================================================== */

  const addRoute = async (e) => {
    e.preventDefault();

    setMessage("");

    try {
      const payload = {
        ...form,
        delay_minutes:
          Number(
            form.delay_minutes
          ) || 0,
      };

      const res = await fetch(
        `/api/ctv/api/routes`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify(
              payload
            ),
        }
      );

      const data =
        await res.json();

      if (!res.ok) {
        setMessage(
          data.error ||
            "Something went wrong"
        );

        return;
      }

      setMessage(
        "Route added successfully"
      );

      setForm({
        route_number: "",
        destination: "",
        door_number: "",
        scheduled_departure_time:
          "",
        route_type: "OUTBOUND",
        status: "NOT STARTED",
        delay_minutes: "",
        notes: "",
      });

      setShowMobileAddForm(
        false
      );

      loadRoutes();
    } catch (err) {
      setMessage(
        "Failed to add route"
      );
    }
  };

  /* =====================================================
     LOAD TODAY
  ===================================================== */

  const loadTodaySchedule =
    async () => {
      try {
        const res =
          await fetch(
            `/api/ctv/api/routes/load-today`,
            {
              method: "POST",
            }
          );

        const data =
          await res.json();

        if (!res.ok) {
          setMessage(
            data.error ||
              "Failed to load schedule"
          );

          return;
        }

        setMessage(
          data.message ||
            "Schedule loaded"
        );

        loadRoutes();
      } catch (err) {
        setMessage(
          "Failed to load today schedule"
        );
      }
    };

  /* =====================================================
     UPDATE STATUS
  ===================================================== */

  const updateStatus = async (
    id,
    status
  ) => {
    try {
      const res = await fetch(
        `/api/ctv/api/routes/${id}`,
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            status,
          }),
        }
      );

      const data =
        await res.json();

      if (!res.ok) {
        setMessage(
          data.error ||
            "Failed to update status"
        );

        return;
      }

      loadRoutes();
    } catch (err) {
      setMessage(
        "Failed to update route status"
      );
    }
  };

  /* =====================================================
     DELAY MODAL
  ===================================================== */

  const openDelayModal = (
    route
  ) => {
    setModalRoute(route);

    setModalForm({
      delay_minutes:
        route.delay_minutes ||
        "",

      notes:
        route.notes || "",
    });
  };

  /* =====================================================
     SAVE DELAY / NOTES
  ===================================================== */

  const saveDelayNotes =
    async () => {
      try {
        const delayNumber =
          Number(
            modalForm.delay_minutes
          ) || 0;

        const res =
          await fetch(
            `/api/ctv/api/routes/${modalRoute.id}`,
            {
              method: "PATCH",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  delay_minutes:
                    delayNumber,

                  notes:
                    modalForm.notes,

                  status:
                    delayNumber > 0
                      ? "DELAYED"
                      : modalRoute.status,
                }),
            }
          );

        const data =
          await res.json();

        if (!res.ok) {
          setMessage(
            data.error ||
              "Failed to update delay / notes"
          );

          return;
        }

        setMessage(
          "Delay / note updated"
        );

        setModalRoute(null);

        loadRoutes();
      } catch (err) {
        setMessage(
          "Failed to save delay / notes"
        );
      }
    };

  /* =====================================================
     DELETE ROUTE
  ===================================================== */

  const deleteRoute = async (
    id
  ) => {
    const ok =
      window.confirm(
        "Delete this route from today's board?"
      );

    if (!ok) return;

    try {
      const res = await fetch(
        `/api/ctv/api/routes/${id}`,
        {
          method: "DELETE",
        }
      );

      const data =
        await res.json();

      if (!res.ok) {
        setMessage(
          data.error ||
            "Failed to delete route"
        );

        return;
      }

      setMessage(
        "Route deleted"
      );

      loadRoutes();
    } catch (err) {
      setMessage(
        "Failed to delete route"
      );
    }
  };

  /* =====================================================
     ADD ROUTE FORM COMPONENT
  ===================================================== */

  const AddRouteForm = (
    isMobile = false
  ) => (
    <div
      style={
        isMobile
          ? mobileFormBoxStyle
          : addRoutePanelStyle
      }
      className="ctv-add-panel"
    >
      <div
        style={
          panelHeaderStyle
        }
      >
        <div
          style={
            addIconStyle
          }
        >
          🚚
        </div>

        <div>
          <h2
            style={
              panelTitleStyle
            }
          >
            Add New Route
          </h2>

          {!isMobile && (
            <div
              style={
                panelSubtitleStyle
              }
            >
              Create a route for
              today
            </div>
          )}
        </div>
      </div>

      <form
        onSubmit={addRoute}
        style={formStyle}
        className="ctv-add-form"
      >
        {/* ROW 1 */}

        <div
          className="ctv-form-two"
          style={formTwoColumnStyle}
        >
          <div
            style={
              fieldStyle
            }
          >
            <label
              style={
                labelStyle
              }
            >
              Route Number
            </label>

            <input
              style={
                inputStyle
              }
              name="route_number"
              value={
                form.route_number
              }
              onChange={
                handleChange
              }
              placeholder="e.g. YF201"
            />
          </div>

          <div
            style={
              fieldStyle
            }
          >
            <label
              style={
                labelStyle
              }
            >
              Destination
            </label>

            <input
              style={
                inputStyle
              }
              name="destination"
              value={
                form.destination
              }
              onChange={
                handleChange
              }
              placeholder="e.g. YMX"
            />
          </div>
        </div>

        {/* ROW 2 */}

        <div
          className="ctv-form-two"
          style={formTwoColumnStyle}
        >
          <div
            style={
              fieldStyle
            }
          >
            <label
              style={
                labelStyle
              }
            >
              Door Number
            </label>

            <input
              style={
                inputStyle
              }
              name="door_number"
              value={
                form.door_number
              }
              onChange={
                handleChange
              }
              placeholder="e.g. 12"
            />
          </div>

          <div
            style={
              fieldStyle
            }
          >
            <label
              style={
                labelStyle
              }
            >
              Route Type
            </label>

            <select
              style={
                inputStyle
              }
              name="route_type"
              value={
                form.route_type
              }
              onChange={
                handleChange
              }
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

        {/* ROW 3 */}

        <div
          className="ctv-form-two"
          style={formTwoColumnStyle}
        >
          <div
            style={
              fieldStyle
            }
          >
            <label
              style={
                labelStyle
              }
            >
              Scheduled Time
            </label>

            <input
              type="time"
              style={
                inputStyle
              }
              name="scheduled_departure_time"
              value={
                form.scheduled_departure_time
              }
              onChange={
                handleChange
              }
            />
          </div>

          <div
            style={
              fieldStyle
            }
          >
            <label
              style={
                labelStyle
              }
            >
              Initial Status
            </label>

            <select
              style={
                inputStyle
              }
              name="status"
              value={
                form.status
              }
              onChange={
                handleChange
              }
            >
              {STATUSES.map(
                (s) => (
                  <option
                    key={s}
                  >
                    {s}
                  </option>
                )
              )}
            </select>
          </div>
        </div>

        <div
          style={
            formDividerStyle
          }
        />

        {/* DELAY */}

        <div
          style={
            fieldStyle
          }
        >
          <label
            style={
              labelStyle
            }
          >
            Delay Minutes{" "}
            <span
              style={
                mutedStyle
              }
            >
              (optional)
            </span>
          </label>

          <input
            style={
              inputStyle
            }
            name="delay_minutes"
            value={
              form.delay_minutes
            }
            onChange={
              handleChange
            }
            placeholder="e.g. 20"
            type="number"
            min="0"
          />
        </div>

        {/* NOTES */}

        <div
          style={
            fieldStyle
          }
        >
          <label
            style={
              labelStyle
            }
          >
            Notes / Comment
          </label>

          <textarea
            style={
              textAreaStyle
            }
            name="notes"
            value={
              form.notes
            }
            onChange={
              handleChange
            }
            placeholder="Enter any note or comment..."
          />
        </div>

        {isMobile ? (
          <div
            style={
              mobileActionRowStyle
            }
          >
            <button
              style={
                mobileCancelButtonStyle
              }
              type="button"
              onClick={() =>
                setShowMobileAddForm(
                  false
                )
              }
            >
              Cancel
            </button>

            <button
              style={
                mainButtonStyle
              }
              type="submit"
            >
              ⊕ Add Route
            </button>
          </div>
        ) : (
          <button
            style={
              mainButtonStyle
            }
            type="submit"
          >
            ⊕ Add Route
          </button>
        )}
      </form>

      {!isMobile && (
        <div
          style={
            tipStyle
          }
        >
          <span>
            ⓘ
          </span>

          <span>
            Set delay minutes to
            automatically mark the
            route as{" "}
            <b>DELAYED</b>.
          </span>
        </div>
      )}

      {message && (
        <div
          style={
            messageStyle
          }
        >
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
      <style>
        {responsiveCss}
      </style>

      <div
        style={pageStyle}
        className="ctv-routes-page"
      >
        {/* =================================================
            TOP HEADER
        ================================================= */}

        <div
          style={topBarStyle}
          className="ctv-topbar"
        >
          <div>
            <div
              style={
                smallHeadingStyle
              }
            >
              CTV ADMIN CONTROL
            </div>

            <h1
              style={
                titleStyle
              }
            >
              Manage Routes
            </h1>

            <p
              style={
                subTitleStyle
              }
            >
              Add new routes,
              update status and
              manage today&apos;s
              operations
            </p>
          </div>

          <button
            style={
              loadButtonStyle
            }
            onClick={
              loadTodaySchedule
            }
          >
            ↻ Load Today&apos;s
            Schedule
          </button>
        </div>

        {/* =================================================
            MAIN GRID
        ================================================= */}

        <div
          style={mainGridStyle}
          className="ctv-main-grid"
        >
          {/* ADD FORM */}

          <div className="ctv-desktop-form">
            {AddRouteForm(false)}
          </div>

          {/* ROUTE AREA */}

          <div
            style={
              routesPanelStyle
            }
            className="ctv-routes-panel"
          >
            {/* ROUTES HEADER */}

            <div
              style={
                routesHeaderStyle
              }
              className="ctv-routes-header"
            >
              <div
                style={
                  routesTitleGroupStyle
                }
              >
                <div
                  style={
                    routesIconStyle
                  }
                >
                  ☷
                </div>

                <div>
                  <h2
                    style={
                      routesTitleStyle
                    }
                  >
                    Today&apos;s
                    Routes
                  </h2>

                  <div
                    style={
                      routesSubTitleStyle
                    }
                  >
                    Manage live route
                    operations
                  </div>
                </div>
              </div>

              <div
                style={
                  totalBadgeStyle
                }
              >
                Total Routes:{" "}
                {routes.length}
              </div>
            </div>

            {/* ROUTE GRID */}

            <div
              className="ctv-routes-grid"
              style={
                routesGridStyle
              }
            >
              {routes.map(
                (route) => {
                  const isInbound =
                    getRouteType(
                      route
                    ) ===
                    "INBOUND";

                  const routeTheme =
                    getRouteTheme(
                      route
                    );

                  return (
                    <div
                      key={
                        route.id
                      }
                      className={`ctv-route-card ${
                        isInbound
                          ? "ctv-arrival-card"
                          : "ctv-departure-card"
                      }`}
                      style={{
                        ...routeCardStyle,

                        background:
                          route.status ===
                          "DEPARTED"
                            ? "#f8fafc"
                            : routeTheme.background,

                        borderColor:
                          route.status ===
                          "DEPARTED"
                            ? "#cbd5e1"
                            : routeTheme.border,

                        opacity:
                          route.status ===
                          "DEPARTED"
                            ? 0.72
                            : 1,
                      }}
                    >
                      {/* CARD MAIN */}

                      <div
                        style={
                          routeCardBodyStyle
                        }
                      >
                        {/* ICON + STATUS */}

                        <div
                          style={
                            routeCardTopStyle
                          }
                        >
                          <div
                            style={{
                              ...routeTypeIconStyle,
                              color:
                                routeTheme.primary,

                              background:
                                routeTheme.soft,
                            }}
                          >
                            {isInbound
                              ? "↓"
                              : "✈"}
                          </div>

                          <span
                            style={{
                              ...statusBadgeStyle,

                              color:
                                statusColor(
                                  route.status
                                ),

                              background:
                                statusSoftBg(
                                  route.status
                                ),

                              borderColor:
                                statusColor(
                                  route.status
                                ),
                            }}
                          >
                            {
                              route.status
                            }
                          </span>
                        </div>

                        {/* ROUTE */}

                        <div
                          style={
                            routeTitleStyle
                          }
                        >
                          {
                            route.route_number
                          }

                          <span
                            style={
                              arrowStyle
                            }
                          >
                            →
                          </span>

                          {
                            route.destination
                          }
                        </div>

                        {/* DEPART / ARRIVE */}

                        <div
                          style={{
                            ...routeTypeLabelStyle,

                            color:
                              routeTheme.primary,
                          }}
                        >
                          {getTimeLabel(
                            route
                          )}
                        </div>

                        {/* TIME */}

                        <div
                          style={{
                            ...routeTimeStyle,

                            color:
                              routeTheme.primary,
                          }}
                        >
                          {
                            route.scheduled_departure_time
                          }
                        </div>

                        {/* DETAILS */}

                        <div
                          style={
                            routeDetailsStyle
                          }
                        >
                          <div
                            style={
                              detailRowStyle
                            }
                          >
                            <span>
                              🚪
                            </span>

                            <span>
                              Door:{" "}
                              <b>
                                {route.door_number ||
                                  "--"}
                              </b>
                            </span>
                          </div>

                          <div
                            style={
                              detailRowStyle
                            }
                          >
                            <span>
                              ◷
                            </span>

                            <span
                              style={{
                                color:
                                  Number(
                                    route.delay_minutes
                                  ) >
                                  0
                                    ? "#f97316"
                                    : "#64748b",

                                fontWeight:
                                  Number(
                                    route.delay_minutes
                                  ) >
                                  0
                                    ? 900
                                    : 700,
                              }}
                            >
                              Delay:{" "}
                              {Number(
                                route.delay_minutes
                              ) >
                              0
                                ? `${route.delay_minutes} min`
                                : "--"}
                            </span>
                          </div>

                          <div
                            style={
                              detailRowStyle
                            }
                          >
                            <span>
                              📝
                            </span>

                            <span
                              style={
                                noteTextStyle
                              }
                            >
                              Note:{" "}
                              {route.notes ||
                                "--"}
                            </span>
                          </div>
                        </div>

                        {/* DEPARTED TV MESSAGE */}

                        {route.status ===
                          "DEPARTED" && (
                          <div
                            style={
                              hiddenTvStyle
                            }
                          >
                            📺 HIDDEN FROM
                            TV DISPLAY
                          </div>
                        )}
                      </div>

                      {/* STATUS BUTTON AREA */}

                      <div
                        style={
                          statusAreaStyle
                        }
                      >
                        <div
                          style={
                            statusGridStyle
                          }
                          className="ctv-status-buttons"
                        >
                          {STATUSES.map(
                            (
                              status
                            ) => (
                              <button
                                key={
                                  status
                                }
                                onClick={() =>
                                  updateStatus(
                                    route.id,
                                    status
                                  )
                                }
                                style={{
                                  ...statusButtonStyle,

                                  color:
                                    statusColor(
                                      status
                                    ),

                                  borderColor:
                                    statusColor(
                                      status
                                    ),

                                  background:
                                    route.status ===
                                    status
                                      ? statusSoftBg(
                                          status
                                        )
                                      : "#ffffff",

                                  boxShadow:
                                    route.status ===
                                      "DEPARTED" &&
                                    status ===
                                      "DEPARTED"
                                      ? "0 0 0 1px #334155"
                                      : "none",
                                }}
                              >
                                {
                                  status
                                }
                              </button>
                            )
                          )}
                        </div>

                        {/* MOBILE STATUS */}

                        <div className="ctv-mobile-status-row">
                          <label>
                            Status
                          </label>

                          <select
                            value={
                              route.status
                            }
                            onChange={(
                              e
                            ) =>
                              updateStatus(
                                route.id,
                                e
                                  .target
                                  .value
                              )
                            }
                          >
                            {STATUSES.map(
                              (
                                status
                              ) => (
                                <option
                                  key={
                                    status
                                  }
                                  value={
                                    status
                                  }
                                >
                                  {
                                    status
                                  }
                                </option>
                              )
                            )}
                          </select>
                        </div>
                      </div>

                      {/* ACTION BUTTONS */}

                      <div
                        style={
                          cardActionsStyle
                        }
                      >
                        <button
                          onClick={() =>
                            openDelayModal(
                              route
                            )
                          }
                          style={
                            delayButtonStyle
                          }
                        >
                          ✎ Delay / Notes
                        </button>

                        <button
                          style={
                            deleteButtonStyle
                          }
                          onClick={() =>
                            deleteRoute(
                              route.id
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

            {/* EMPTY */}

            {routes.length ===
              0 && (
              <div
                style={
                  emptyStateStyle
                }
              >
                No routes loaded
                yet. Tap{" "}
                <b>
                  Load Today&apos;s
                  Schedule
                </b>{" "}
                or add a route
                manually.
              </div>
            )}

            {/* BOTTOM TIP */}

            <div
              style={
                tvTipStyle
              }
            >
              <span>
                ⓘ
              </span>

              <span>
                Routes with status{" "}
                <b>DEPARTED</b> are
                hidden from TV
                display automatically.
              </span>
            </div>
          </div>
        </div>

        {/* =================================================
            MOBILE FLOATING ADD BUTTON
        ================================================= */}

        {!showMobileAddForm && (
          <button
            className="ctv-mobile-add-btn"
            onClick={() =>
              setShowMobileAddForm(
                true
              )
            }
          >
            +
          </button>
        )}

        {/* =================================================
            MOBILE ADD ROUTE POPUP
        ================================================= */}

        {showMobileAddForm && (
          <div
            style={
              mobileOverlayStyle
            }
          >
            <div
              style={
                mobileSheetStyle
              }
              className="ctv-mobile-sheet-safe"
            >
              {AddRouteForm(true)}
            </div>
          </div>
        )}

        {/* =================================================
            DELAY / NOTES MODAL
        ================================================= */}

        {modalRoute && (
          <div
            style={
              modalOverlayStyle
            }
          >
            <div
              style={
                modalStyle
              }
              className="ctv-delay-modal"
            >
              <button
                style={
                  modalCloseStyle
                }
                onClick={() =>
                  setModalRoute(
                    null
                  )
                }
              >
                ×
              </button>

              <div
                style={
                  modalSmallTitleStyle
                }
              >
                ROUTE UPDATE
              </div>

              <h2
                style={
                  modalTitleStyle
                }
              >
                Update Delay &
                Notes
              </h2>

              <p
                style={
                  modalSubStyle
                }
              >
                {
                  modalRoute.route_number
                }{" "}
                →{" "}
                {
                  modalRoute.destination
                }
              </p>

              <label
                style={
                  labelStyle
                }
              >
                Delay Minutes
              </label>

              <input
                style={
                  inputStyle
                }
                type="number"
                min="0"
                value={
                  modalForm.delay_minutes
                }
                onChange={(e) =>
                  setModalForm({
                    ...modalForm,

                    delay_minutes:
                      e.target
                        .value,
                  })
                }
                placeholder="e.g. 20"
              />

              <div
                style={
                  quickRowStyle
                }
              >
                {[
                  5,
                  10,
                  15,
                  30,
                  60,
                ].map((m) => (
                  <button
                    key={m}
                    style={
                      quickBtnStyle
                    }
                    onClick={() =>
                      setModalForm({
                        ...modalForm,

                        delay_minutes:
                          m,
                      })
                    }
                  >
                    +{m} min
                  </button>
                ))}
              </div>

              <label
                style={
                  labelStyle
                }
              >
                Notes / Comment
              </label>

              <textarea
                style={
                  textAreaStyle
                }
                value={
                  modalForm.notes
                }
                onChange={(e) =>
                  setModalForm({
                    ...modalForm,

                    notes:
                      e.target
                        .value,
                  })
                }
                placeholder="Enter comment..."
              />

              <div
                style={
                  modalActionRowStyle
                }
              >
                <button
                  style={
                    cancelButtonStyle
                  }
                  onClick={() =>
                    setModalRoute(
                      null
                    )
                  }
                >
                  Cancel
                </button>

                <button
                  style={
                    saveButtonStyle
                  }
                  onClick={
                    saveDelayNotes
                  }
                >
                  ✓ Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

/* =====================================================
   ROUTE HELPERS
===================================================== */

const getRouteType = (
  route
) => {
  return String(
    route.route_type ||
      route.type ||
      "OUTBOUND"
  ).toUpperCase();
};

const getTimeLabel = (
  route
) => {
  return getRouteType(route) ===
    "INBOUND"
    ? "ARRIVE"
    : "DEPART";
};

/* =====================================================
   DEPARTURE / ARRIVAL CARD COLORS
===================================================== */

const getRouteTheme = (
  route
) => {
  const isInbound =
    getRouteType(route) ===
    "INBOUND";

  if (isInbound) {
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
   STATUS COLORS
===================================================== */

const statusColor = (s) =>
  ({
    "NOT STARTED": "#64748b",

    "ON TIME": "#16a34a",

    LOADING: "#2563eb",

    DELAYED: "#f97316",

    ENROUTE: "#7c3aed",

    ARRIVED: "#0f766e",

    CANCELLED: "#dc2626",

    DEPARTED: "#475569",
  }[s] || "#334155");

const statusSoftBg = (s) =>
  ({
    "NOT STARTED":
      "#f1f5f9",

    "ON TIME":
      "#ecfdf3",

    LOADING:
      "#eff6ff",

    DELAYED:
      "#fff7ed",

    ENROUTE:
      "#f5f3ff",

    ARRIVED:
      "#ecfdf5",

    CANCELLED:
      "#fef2f2",

    DEPARTED:
      "#e2e8f0",
  }[s] || "#f8fafc");

/* =====================================================
   PAGE
===================================================== */

const pageStyle = {
  minHeight: "100vh",

  padding:
    "30px 32px 42px",

  background:
    "linear-gradient(180deg,#fafbfe 0%,#f6f7fb 100%)",

  fontFamily:
    "Inter, Arial, sans-serif",

  color: "#0f172a",
};

/* =====================================================
   HEADER
===================================================== */

const topBarStyle = {
  display: "flex",

  justifyContent:
    "space-between",

  alignItems: "center",

  gap: 20,

  marginBottom: 24,
};

const smallHeadingStyle = {
  color: "#ec2772",

  fontSize: 10,

  fontWeight: 900,

  letterSpacing: ".13em",

  marginBottom: 7,
};

const titleStyle = {
  margin: 0,

  fontSize: 32,

  lineHeight: 1.05,

  fontWeight: 900,

  letterSpacing: "-.04em",

  color: "#172033",
};

const subTitleStyle = {
  color: "#64748b",

  margin:
    "7px 0 0",

  fontSize: 13,

  fontWeight: 600,
};

const loadButtonStyle = {
  minHeight: 46,

  padding:
    "0 20px",

  borderRadius: 8,

  border: "none",

  background:
    "linear-gradient(135deg,#ff326c,#e91e63)",

  color: "#ffffff",

  fontWeight: 900,

  fontSize: 12,

  cursor: "pointer",

  boxShadow:
    "0 10px 24px rgba(236,39,114,.20)",
};

/* =====================================================
   MAIN LAYOUT
===================================================== */

const mainGridStyle = {
  display: "grid",

  gridTemplateColumns:
    "320px minmax(0,1fr)",

  gap: 18,

  alignItems: "start",
};

/* =====================================================
   ADD ROUTE PANEL
===================================================== */

const addRoutePanelStyle = {
  background: "#ffffff",

  border:
    "1px solid #e5e9f0",

  borderRadius: 10,

  overflow: "hidden",

  padding: 18,

  boxShadow:
    "0 7px 24px rgba(15,23,42,.04)",
};

const panelHeaderStyle = {
  display: "flex",

  alignItems: "center",

  gap: 11,

  marginBottom: 20,
};

const addIconStyle = {
  width: 42,

  height: 42,

  flexShrink: 0,

  borderRadius: 999,

  display: "grid",

  placeItems: "center",

  background: "#fff0f6",

  color: "#ec2772",

  fontSize: 18,
};

const panelTitleStyle = {
  margin: 0,

  fontSize: 17,

  fontWeight: 900,

  color: "#ec2772",
};

const panelSubtitleStyle = {
  marginTop: 3,

  color: "#94a3b8",

  fontSize: 10,

  fontWeight: 700,
};

/* =====================================================
   FORM
===================================================== */

const formStyle = {
  display: "flex",

  flexDirection: "column",

  gap: 14,
};

const formTwoColumnStyle = {
  display: "grid",

  gridTemplateColumns:
    "1fr 1fr",

  gap: 12,
};

const fieldStyle = {
  display: "flex",

  flexDirection: "column",

  gap: 6,

  minWidth: 0,
};

const labelStyle = {
  fontWeight: 800,

  fontSize: 10,

  color: "#334155",
};

const mutedStyle = {
  color: "#94a3b8",

  fontWeight: 600,
};

const inputStyle = {
  width: "100%",

  minHeight: 39,

  padding: "9px 11px",

  borderRadius: 6,

  border:
    "1px solid #dbe1e8",

  fontSize: 11,

  fontWeight: 600,

  outline: "none",

  color: "#0f172a",

  background: "#ffffff",

  boxSizing: "border-box",
};

const textAreaStyle = {
  ...inputStyle,

  minHeight: 88,

  resize: "vertical",

  fontFamily:
    "Inter, Arial, sans-serif",
};

const formDividerStyle = {
  height: 1,

  borderTop:
    "1px dashed #f472a3",

  margin: "2px 0",
};

const mainButtonStyle = {
  minHeight: 42,

  padding: "0 16px",

  borderRadius: 7,

  border: "none",

  background:
    "linear-gradient(135deg,#ff326c,#e91e63)",

  color: "#ffffff",

  fontWeight: 900,

  cursor: "pointer",

  fontSize: 12,

  boxShadow:
    "0 8px 18px rgba(236,39,114,.18)",
};

const tipStyle = {
  display: "flex",

  alignItems: "flex-start",

  gap: 8,

  marginTop: 18,

  padding: 11,

  borderRadius: 7,

  background: "#f0f8ff",

  border:
    "1px solid #bfdbfe",

  color: "#2563eb",

  fontSize: 9,

  lineHeight: 1.5,

  fontWeight: 700,
};

const messageStyle = {
  marginTop: 14,

  padding: 10,

  borderRadius: 7,

  background: "#ecfdf5",

  border:
    "1px solid #bbf7d0",

  color: "#15803d",

  fontSize: 10,

  fontWeight: 800,
};

/* =====================================================
   ROUTES PANEL
===================================================== */

const routesPanelStyle = {
  background: "#ffffff",

  border:
    "1px solid #e5e9f0",

  borderRadius: 10,

  padding: 18,

  minWidth: 0,

  boxShadow:
    "0 7px 24px rgba(15,23,42,.04)",
};

const routesHeaderStyle = {
  display: "flex",

  justifyContent:
    "space-between",

  alignItems: "center",

  gap: 16,

  marginBottom: 18,
};

const routesTitleGroupStyle = {
  display: "flex",

  alignItems: "center",

  gap: 11,
};

const routesIconStyle = {
  width: 42,

  height: 42,

  borderRadius: 999,

  background: "#f5f3ff",

  color: "#7c3aed",

  display: "grid",

  placeItems: "center",

  fontSize: 20,

  fontWeight: 900,
};

const routesTitleStyle = {
  margin: 0,

  fontSize: 17,

  fontWeight: 900,

  color: "#172033",
};

const routesSubTitleStyle = {
  color: "#94a3b8",

  marginTop: 3,

  fontSize: 10,

  fontWeight: 700,
};

const totalBadgeStyle = {
  padding:
    "8px 11px",

  background: "#f5f3ff",

  borderRadius: 7,

  color: "#7c3aed",

  fontSize: 10,

  fontWeight: 900,
};

/* =====================================================
   SQUARE ROUTE GRID
===================================================== */

const routesGridStyle = {
  display: "grid",

  gridTemplateColumns:
    "repeat(3,minmax(0,1fr))",

  gap: 12,
};

/* =====================================================
   ROUTE CARD
===================================================== */

const routeCardStyle = {
  minWidth: 0,

  minHeight: 330,

  display: "flex",

  flexDirection: "column",

  border:
    "1px solid",

  borderRadius: 8,

  overflow: "hidden",

  boxShadow:
    "0 5px 14px rgba(15,23,42,.035)",

  transition:
    "transform .15s ease, box-shadow .15s ease",
};

const routeCardBodyStyle = {
  padding: 14,

  flex: 1,
};

const routeCardTopStyle = {
  display: "flex",

  alignItems: "center",

  justifyContent:
    "space-between",

  gap: 10,

  marginBottom: 13,
};

const routeTypeIconStyle = {
  width: 34,

  height: 34,

  borderRadius: 8,

  display: "grid",

  placeItems: "center",

  fontSize: 20,

  fontWeight: 900,
};

const statusBadgeStyle = {
  display: "inline-flex",

  alignItems: "center",

  justifyContent:
    "center",

  border:
    "1px solid",

  borderRadius: 999,

  padding:
    "4px 8px",

  fontSize: 8,

  fontWeight: 900,

  whiteSpace: "nowrap",
};

const routeTitleStyle = {
  display: "flex",

  alignItems: "center",

  flexWrap: "wrap",

  gap: 5,

  fontSize: 16,

  fontWeight: 900,

  color: "#172033",

  marginBottom: 12,

  letterSpacing: "-.025em",
};

const arrowStyle = {
  color: "#94a3b8",

  fontWeight: 900,
};

const routeTypeLabelStyle = {
  fontSize: 9,

  fontWeight: 900,

  letterSpacing: ".04em",

  marginBottom: 3,
};

const routeTimeStyle = {
  fontSize: 21,

  fontWeight: 900,

  lineHeight: 1,

  marginBottom: 16,
};

const routeDetailsStyle = {
  display: "flex",

  flexDirection: "column",

  gap: 7,
};

const detailRowStyle = {
  display: "flex",

  alignItems: "flex-start",

  gap: 6,

  color: "#64748b",

  fontSize: 9,

  lineHeight: 1.45,

  fontWeight: 700,
};

const noteTextStyle = {
  overflow: "hidden",

  textOverflow: "ellipsis",

  display: "-webkit-box",

  WebkitLineClamp: 2,

  WebkitBoxOrient:
    "vertical",
};

const hiddenTvStyle = {
  marginTop: 12,

  display: "inline-flex",

  alignItems: "center",

  justifyContent:
    "center",

  padding: "6px 8px",

  borderRadius: 5,

  background: "#475569",

  color: "#ffffff",

  fontSize: 8,

  fontWeight: 900,
};

/* =====================================================
   STATUS AREA
===================================================== */

const statusAreaStyle = {
  padding: 9,

  borderTop:
    "1px solid rgba(148,163,184,.22)",

  background:
    "rgba(255,255,255,.58)",
};

const statusGridStyle = {
  display: "grid",

  gridTemplateColumns:
    "repeat(3,minmax(0,1fr))",

  gap: 5,
};

const statusButtonStyle = {
  minHeight: 26,

  padding:
    "4px 3px",

  border:
    "1px solid",

  borderRadius: 4,

  fontWeight: 900,

  cursor: "pointer",

  fontSize: 7,

  whiteSpace: "nowrap",
};

/* =====================================================
   CARD ACTIONS
===================================================== */

const cardActionsStyle = {
  display: "grid",

  gridTemplateColumns:
    "1fr 1fr",

  gap: 6,

  padding: 9,

  borderTop:
    "1px solid rgba(148,163,184,.22)",

  background: "#ffffff",
};

const delayButtonStyle = {
  minHeight: 31,

  border:
    "1px solid #f9a8c3",

  color: "#ec2772",

  background: "#ffffff",

  borderRadius: 5,

  fontSize: 8,

  fontWeight: 900,

  cursor: "pointer",
};

const deleteButtonStyle = {
  minHeight: 31,

  border:
    "1px solid #fecaca",

  color: "#dc2626",

  background: "#ffffff",

  borderRadius: 5,

  fontSize: 8,

  fontWeight: 900,

  cursor: "pointer",
};

/* =====================================================
   EMPTY + TV TIP
===================================================== */

const emptyStateStyle = {
  padding: 24,

  borderRadius: 8,

  background: "#f8fafc",

  border:
    "1px dashed #cbd5e1",

  color: "#64748b",

  textAlign: "center",

  fontSize: 11,

  fontWeight: 700,
};

const tvTipStyle = {
  display: "flex",

  gap: 8,

  alignItems: "center",

  marginTop: 12,

  padding:
    "9px 11px",

  borderRadius: 6,

  background: "#f0f8ff",

  border:
    "1px solid #bfdbfe",

  color: "#2563eb",

  fontSize: 9,

  fontWeight: 700,
};

/* =====================================================
   MODAL
===================================================== */

const modalOverlayStyle = {
  position: "fixed",

  inset: 0,

  background:
    "rgba(15,23,42,.50)",

  display: "flex",

  alignItems: "center",

  justifyContent: "center",

  padding: 18,

  zIndex: 1000,

  backdropFilter:
    "blur(3px)",
};

const modalStyle = {
  width: "100%",

  maxWidth: 430,

  background: "#ffffff",

  borderRadius: 12,

  padding: 24,

  boxShadow:
    "0 30px 80px rgba(15,23,42,.30)",

  position: "relative",

  border:
    "1px solid #e5e7eb",
};

const modalCloseStyle = {
  position: "absolute",

  top: 12,

  right: 16,

  border: "none",

  background:
    "transparent",

  color: "#64748b",

  fontSize: 27,

  cursor: "pointer",

  fontWeight: 700,
};

const modalSmallTitleStyle = {
  color: "#ec2772",

  fontSize: 9,

  fontWeight: 900,

  letterSpacing: ".12em",

  marginBottom: 6,
};

const modalTitleStyle = {
  margin: 0,

  fontSize: 23,

  fontWeight: 900,

  letterSpacing: "-.025em",
};

const modalSubStyle = {
  color: "#64748b",

  fontWeight: 800,

  fontSize: 13,

  margin:
    "5px 0 18px",
};

const quickRowStyle = {
  display: "flex",

  gap: 6,

  flexWrap: "wrap",

  margin:
    "9px 0 16px",
};

const quickBtnStyle = {
  border:
    "1px solid #f9a8c3",

  background: "#fff5f9",

  color: "#ec2772",

  borderRadius: 5,

  padding:
    "7px 10px",

  fontSize: 9,

  fontWeight: 900,

  cursor: "pointer",
};

const modalActionRowStyle = {
  display: "grid",

  gridTemplateColumns:
    "1fr 1fr",

  gap: 9,

  marginTop: 16,
};

const cancelButtonStyle = {
  minHeight: 42,

  borderRadius: 6,

  border: "none",

  background: "#f1f5f9",

  color: "#475569",

  fontWeight: 900,

  cursor: "pointer",
};

const saveButtonStyle = {
  minHeight: 42,

  borderRadius: 6,

  border: "none",

  background:
    "linear-gradient(135deg,#ff326c,#e91e63)",

  color: "#ffffff",

  fontWeight: 900,

  cursor: "pointer",
};

/* =====================================================
   MOBILE ADD FORM
===================================================== */

const mobileOverlayStyle = {
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

const mobileSheetStyle = {
  width: "100%",

  maxWidth: 430,

  maxHeight: "86vh",

  overflowY: "auto",

  background: "#ffffff",

  borderRadius: 14,

  padding:
    "16px 16px 110px",

  boxShadow:
    "0 30px 80px rgba(15,23,42,.35)",
};

const mobileFormBoxStyle = {
  background: "#ffffff",
};

const mobileActionRowStyle = {
  display: "grid",

  gridTemplateColumns:
    "1fr 1fr",

  gap: 9,

  marginTop: 4,
};

const mobileCancelButtonStyle = {
  minHeight: 42,

  borderRadius: 7,

  border: "none",

  background: "#f1f5f9",

  color: "#475569",

  fontWeight: 900,

  cursor: "pointer",
};

/* =====================================================
   RESPONSIVE CSS
===================================================== */

const responsiveCss = `
  * {
    box-sizing: border-box;
  }

  .ctv-mobile-status-row {
    display: none;
  }

  .ctv-mobile-add-btn {
    display: none;
  }

  .ctv-route-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 24px rgba(15,23,42,.08) !important;
  }

  /* =====================================================
     VERY LARGE MONITOR
  ===================================================== */

  @media (min-width: 1750px) {

    .ctv-routes-page {
      padding:
        36px 42px 50px !important;
    }

    .ctv-main-grid {
      grid-template-columns:
        350px minmax(0,1fr) !important;

      gap: 22px !important;
    }

    .ctv-routes-grid {
      grid-template-columns:
        repeat(4,minmax(0,1fr)) !important;

      gap: 14px !important;
    }

    .ctv-route-card {
      min-height:
        345px !important;
    }

    .ctv-topbar h1 {
      font-size:
        36px !important;
    }
  }

  /* =====================================================
     NORMAL DESKTOP
  ===================================================== */

  @media (min-width: 1350px) and (max-width: 1749px) {

    .ctv-routes-grid {
      grid-template-columns:
        repeat(3,minmax(0,1fr)) !important;
    }
  }

  /* =====================================================
     SMALLER DESKTOP / LAPTOP
  ===================================================== */

  @media (max-width: 1349px) {

    .ctv-main-grid {
      grid-template-columns:
        300px minmax(0,1fr) !important;
    }

    .ctv-routes-grid {
      grid-template-columns:
        repeat(2,minmax(0,1fr)) !important;
    }

    .ctv-form-two {
      grid-template-columns:
        1fr !important;
    }
  }

  /* =====================================================
     TABLET
  ===================================================== */

  @media (max-width: 1000px) {

    .ctv-main-grid {
      grid-template-columns:
        1fr !important;
    }

    .ctv-desktop-form {
      display:
        none !important;
    }

    .ctv-routes-grid {
      grid-template-columns:
        repeat(2,minmax(0,1fr)) !important;
    }

    .ctv-mobile-add-btn {
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

    .ctv-routes-page {
      padding:
        18px 14px 105px !important;
    }

    .ctv-topbar {
      flex-direction:
        column !important;

      align-items:
        stretch !important;
    }

    .ctv-topbar h1 {
      font-size:
        26px !important;
    }

    .ctv-topbar button {
      width:
        100% !important;
    }

    .ctv-routes-panel {
      padding:
        14px !important;
    }

    .ctv-routes-header {
      align-items:
        flex-start !important;
    }

    .ctv-routes-grid {
      grid-template-columns:
        1fr !important;
    }

    .ctv-route-card {
      min-height:
        auto !important;
    }

    .ctv-status-buttons {
      display:
        none !important;
    }

    .ctv-mobile-status-row {
      display:
        grid !important;

      grid-template-columns:
        60px 1fr;

      gap: 8px;

      align-items:
        center;
    }

    .ctv-mobile-status-row label {
      font-size: 10px;

      font-weight: 900;

      color: #64748b;
    }

    .ctv-mobile-status-row select {
      width: 100%;

      min-height: 38px;

      border:
        1px solid #cbd5e1;

      border-radius: 6px;

      padding:
        8px 10px;

      background:
        #ffffff;

      color:
        #0f172a;

      font-size:
        11px;

      font-weight:
        900;

      outline:
        none;
    }

    .ctv-mobile-sheet-safe {
      padding-bottom:
        100px !important;
    }

    .ctv-add-form .ctv-form-two {
      grid-template-columns:
        1fr !important;
    }
  }

  /* =====================================================
     VERY SMALL MOBILE
  ===================================================== */

  @media (max-width: 430px) {

    .ctv-routes-header {
      flex-direction:
        column !important;
    }

    .ctv-route-card {
      width:
        100% !important;
    }

    .ctv-delay-modal {
      padding:
        20px !important;
    }
  }
`;

export default AdminCTVRoutesPage;