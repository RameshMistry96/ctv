import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";

/* =====================================================
   FLIGHT STATUSES
===================================================== */

const FLIGHT_STATUSES = [
  "SCHEDULED",
  "ENROUTE",
  "DELAYED",
  "LANDED",
  "ON THE GROUND",
  "ARRIVED",
  "LOADING",
  "DEPARTED",
  "CANCELLED",
];

function AdminCTVFlightsPage() {
  const navigate = useNavigate();

  const [flights, setFlights] =
    useState([]);

  const [message, setMessage] =
    useState("");

  const [
    showMobileAddForm,
    setShowMobileAddForm,
  ] = useState(false);

  const [
    modalFlight,
    setModalFlight,
  ] = useState(null);

  const [
    modalForm,
    setModalForm,
  ] = useState({
    delay_minutes: "",
    notes: "",
  });

  const [
    form,
    setForm,
  ] = useState({
    flight_number: "",
    origin: "",
    destination: "",
    scheduled_arrival_time: "",
    scheduled_departure_time: "",
    position: "",
    status: "SCHEDULED",
    delay_minutes: "",
    notes: "",
  });

  /* =====================================================
     API HELPER
  ===================================================== */

  const getApiUrl = (path) => {
    if (
      window.location.hostname ===
      "localhost"
    ) {
      return `http://localhost:5000${path}`;
    }

    return `/api/ctv${path}`;
  };

  /* =====================================================
     ADMIN AUTH
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

    loadFlights();
  }, [navigate]);

  /* =====================================================
     LOAD TODAY'S REAL FLIGHTS
  ===================================================== */

  const loadFlights = async () => {
    try {
      const response =
        await fetch(
          getApiUrl(
            "/api/flights"
          )
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to load flights"
        );
      }

      setFlights(
        Array.isArray(data)
          ? data
          : []
      );
    } catch (error) {
      console.error(
        "Load flights error:",
        error
      );

      setMessage(
        "Unable to load flights."
      );
    }
  };

  /* =====================================================
     FORM CHANGE
  ===================================================== */

  const handleChange = (e) => {
    const {
      name,
      value,
    } = e.target;

    const updated = {
      ...form,
      [name]: value,
    };

    if (
      name ===
        "delay_minutes" &&
      Number(value) > 0
    ) {
      updated.status =
        "DELAYED";
    }

    setForm(updated);
  };

  /* =====================================================
     ADD REAL FLIGHT
  ===================================================== */

  const addFlight = async (e) => {
    e.preventDefault();

    setMessage("");

    if (
      !form.flight_number.trim() ||
      !form.origin.trim() ||
      !form.destination.trim() ||
      !form.scheduled_arrival_time ||
      !form.scheduled_departure_time
    ) {
      setMessage(
        "Please complete all required flight fields."
      );

      return;
    }

    try {
      const response =
        await fetch(
          getApiUrl(
            "/api/flights"
          ),
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              flight_number:
                form.flight_number
                  .trim()
                  .toUpperCase(),

              origin:
                form.origin
                  .trim()
                  .toUpperCase(),

              destination:
                form.destination
                  .trim()
                  .toUpperCase(),

              scheduled_arrival_time:
                form.scheduled_arrival_time,

              scheduled_departure_time:
                form.scheduled_departure_time,

              position:
                form.position,

              status:
                form.status,

              delay_minutes:
                Number(
                  form.delay_minutes
                ) || 0,

              notes:
                form.notes,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to add flight"
        );
      }

      await loadFlights();

      setMessage(
        "Flight added successfully."
      );

      setForm({
        flight_number: "",
        origin: "",
        destination: "",
        scheduled_arrival_time:
          "",
        scheduled_departure_time:
          "",
        position: "",
        status: "SCHEDULED",
        delay_minutes: "",
        notes: "",
      });

      setShowMobileAddForm(
        false
      );
    } catch (error) {
      console.error(
        "Add flight error:",
        error
      );

      setMessage(
        error.message ||
          "Unable to add flight."
      );
    }
  };

  /* =====================================================
     UPDATE REAL FLIGHT STATUS
  ===================================================== */

  const updateStatus = async (
    id,
    status
  ) => {
    try {
      const response =
        await fetch(
          getApiUrl(
            `/api/flights/${id}`
          ),
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
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to update status"
        );
      }

      setFlights((current) =>
        current.map(
          (flight) =>
            flight.id === id
              ? data
              : flight
        )
      );

      setMessage(
        `Flight status updated to ${status}.`
      );
    } catch (error) {
      console.error(
        "Update flight status error:",
        error
      );

      setMessage(
        "Unable to update flight status."
      );
    }
  };

  /* =====================================================
     DELAY / NOTES MODAL
  ===================================================== */

  const openDelayModal = (
    flight
  ) => {
    setModalFlight(
      flight
    );

    setModalForm({
      delay_minutes:
        flight.delay_minutes ||
        "",

      notes:
        flight.notes || "",
    });
  };

  /* =====================================================
     SAVE REAL DELAY / NOTES
  ===================================================== */

  const saveDelayNotes =
    async () => {
      if (!modalFlight) {
        return;
      }

      const delayNumber =
        Number(
          modalForm.delay_minutes
        ) || 0;

      try {
        const body = {
          delay_minutes:
            delayNumber,

          notes:
            modalForm.notes,
        };

        if (
          delayNumber > 0
        ) {
          body.status =
            "DELAYED";
        }

        const response =
          await fetch(
            getApiUrl(
              `/api/flights/${modalFlight.id}`
            ),
            {
              method: "PATCH",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify(
                  body
                ),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Unable to update flight"
          );
        }

        setFlights(
          (current) =>
            current.map(
              (flight) =>
                flight.id ===
                modalFlight.id
                  ? data
                  : flight
            )
        );

        setModalFlight(
          null
        );

        setMessage(
          "Flight delay / notes updated."
        );
      } catch (error) {
        console.error(
          "Update delay error:",
          error
        );

        setMessage(
          "Unable to update delay / notes."
        );
      }
    };

  /* =====================================================
     DELETE REAL FLIGHT
  ===================================================== */

  const deleteFlight = async (
    id
  ) => {
    const ok =
      window.confirm(
        "Delete this flight?"
      );

    if (!ok) return;

    try {
      const response =
        await fetch(
          getApiUrl(
            `/api/flights/${id}`
          ),
          {
            method: "DELETE",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to delete flight"
        );
      }

      setFlights(
        (current) =>
          current.filter(
            (flight) =>
              flight.id !== id
          )
      );

      setMessage(
        "Flight deleted successfully."
      );
    } catch (error) {
      console.error(
        "Delete flight error:",
        error
      );

      setMessage(
        "Unable to delete flight."
      );
    }
  };

  /* =====================================================
     LOAD TODAY'S FLIGHT SCHEDULE
  ===================================================== */

  const loadTodaySchedule =
    async () => {
      try {
        setMessage("");

        const response =
          await fetch(
            getApiUrl(
              "/api/flights/load-today"
            ),
            {
              method: "POST",
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Unable to load today's flights"
          );
        }

        await loadFlights();

        setMessage(
          data.message ||
            "Today's flight schedule loaded."
        );
      } catch (error) {
        console.error(
          "Load today flight schedule error:",
          error
        );

        setMessage(
          "Unable to load today's flight schedule."
        );
      }
    };

  /* =====================================================
     ADD FLIGHT FORM
  ===================================================== */

  const AddFlightForm = (
    isMobile = false
  ) => (
    <div
      style={
        isMobile
          ? mobileFormBoxStyle
          : addFlightPanelStyle
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
          ✈
        </div>

        <div>
          <h2
            style={
              panelTitleStyle
            }
          >
            Add New Flight
          </h2>

          {!isMobile && (
            <div
              style={
                panelSubtitleStyle
              }
            >
              Create a flight for
              today
            </div>
          )}
        </div>
      </div>

      <form
        onSubmit={addFlight}
        style={formStyle}
        className="ctv-add-form"
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
            Flight Number{" "}
            <span
              style={
                requiredStyle
              }
            >
              *
            </span>
          </label>

          <input
            style={
              inputStyle
            }
            name="flight_number"
            value={
              form.flight_number
            }
            onChange={
              handleChange
            }
            placeholder="e.g. FX148"
          />
        </div>

        <div
          className="ctv-form-two"
          style={
            formTwoColumnStyle
          }
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
              Origin{" "}
              <span
                style={
                  requiredStyle
                }
              >
                *
              </span>
            </label>

            <input
              style={
                inputStyle
              }
              name="origin"
              value={
                form.origin
              }
              onChange={
                handleChange
              }
              placeholder="e.g. MEM"
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
              Destination{" "}
              <span
                style={
                  requiredStyle
                }
              >
                *
              </span>
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
              placeholder="e.g. YYZ"
            />
          </div>
        </div>

        <div
          className="ctv-form-two"
          style={
            formTwoColumnStyle
          }
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
              Scheduled Arrival{" "}
              <span
                style={
                  requiredStyle
                }
              >
                *
              </span>
            </label>

            <input
              type="time"
              style={
                inputStyle
              }
              name="scheduled_arrival_time"
              value={
                form.scheduled_arrival_time
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
              Scheduled Departure{" "}
              <span
                style={
                  requiredStyle
                }
              >
                *
              </span>
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
        </div>

        <div
          className="ctv-form-two"
          style={
            formTwoColumnStyle
          }
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
              Position / Ramp
            </label>

            <input
              style={
                inputStyle
              }
              name="position"
              value={
                form.position
              }
              onChange={
                handleChange
              }
              placeholder="e.g. Ramp 3"
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
              {FLIGHT_STATUSES.map(
                (status) => (
                  <option
                    key={
                      status
                    }
                    value={
                      status
                    }
                  >
                    {status}
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
              type="button"
              style={
                mobileCancelButtonStyle
              }
              onClick={() =>
                setShowMobileAddForm(
                  false
                )
              }
            >
              Cancel
            </button>

            <button
              type="submit"
              style={
                mainButtonStyle
              }
            >
              ✈ Add Flight
            </button>
          </div>
        ) : (
          <button
            type="submit"
            style={
              mainButtonStyle
            }
          >
            ✈ Add Flight
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
            Actual Arrival is
            recorded automatically
            when the flight is marked
            ARRIVED. Actual Departure
            is recorded automatically
            when the flight is marked
            DEPARTED.
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
        style={
          pageStyle
        }
        className="ctv-flights-page"
      >
        <div
          style={
            topBarStyle
          }
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
              Manage Flights
            </h1>

            <p
              style={
                subTitleStyle
              }
            >
              Add new flights,
              update status and
              manage today&apos;s
              flight operations
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
            Flight Schedule
          </button>
        </div>

        <div
          style={
            mainGridStyle
          }
          className="ctv-main-grid"
        >
          <div className="ctv-desktop-form">
            {AddFlightForm(
              false
            )}
          </div>

          <div
            style={
              flightsPanelStyle
            }
            className="ctv-flights-panel"
          >
            <div
              style={
                flightsHeaderStyle
              }
              className="ctv-flights-header"
            >
              <div
                style={
                  flightsTitleGroupStyle
                }
              >
                <div
                  style={
                    flightsIconStyle
                  }
                >
                  ✈
                </div>

                <div>
                  <h2
                    style={
                      flightsTitleStyle
                    }
                  >
                    Today&apos;s Flights
                  </h2>

                  <div
                    style={
                      flightsSubTitleStyle
                    }
                  >
                    Manage live flight
                    operations
                  </div>
                </div>
              </div>

              <div
                style={
                  totalBadgeStyle
                }
              >
                Total Flights:{" "}
                {flights.length}
              </div>
            </div>

            <div
              className="ctv-flights-grid"
              style={
                flightsGridStyle
              }
            >
              {flights.map(
                (flight) => (
                  <FlightCard
                    key={
                      flight.id
                    }
                    flight={
                      flight
                    }
                    updateStatus={
                      updateStatus
                    }
                    openDelayModal={
                      openDelayModal
                    }
                    deleteFlight={
                      deleteFlight
                    }
                  />
                )
              )}
            </div>

            {flights.length ===
              0 && (
              <div
                style={
                  emptyStateStyle
                }
              >
                No flights loaded
                yet. Tap{" "}
                <b>
                  Load Today&apos;s
                  Flight Schedule
                </b>{" "}
                or add a flight
                manually.
              </div>
            )}

            <div
              style={
                tvTipStyle
              }
            >
              <span>
                ⓘ
              </span>

              <span>
                Flight status flow:
                SCHEDULED → ENROUTE →
                LANDED → ON THE GROUND
                → ARRIVED → LOADING →
                DEPARTED.
              </span>
            </div>
          </div>
        </div>

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
              {AddFlightForm(
                true
              )}
            </div>
          </div>
        )}

        {modalFlight && (
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
                  setModalFlight(
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
                FLIGHT UPDATE
              </div>

              <h2
                style={
                  modalTitleStyle
                }
              >
                Update Delay & Notes
              </h2>

              <p
                style={
                  modalSubStyle
                }
              >
                {
                  modalFlight.flight_number
                }{" "}
                •{" "}
                {
                  modalFlight.origin
                }{" "}
                →{" "}
                {
                  modalFlight.destination
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
                    type="button"
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
                    setModalFlight(
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
   FLIGHT CARD
===================================================== */

function FlightCard({
  flight,
  updateStatus,
  openDelayModal,
  deleteFlight,
}) {
  const theme =
    getFlightTheme(
      flight
    );

  const isDeparted =
    flight.status ===
    "DEPARTED";

  return (
    <div
      className="ctv-flight-card"
      style={{
        ...flightCardStyle,

        background:
          isDeparted
            ? "#f8fafc"
            : theme.background,

        borderColor:
          isDeparted
            ? "#cbd5e1"
            : theme.border,

        opacity:
          isDeparted
            ? 0.72
            : 1,
      }}
    >
      <div
        style={
          flightCardBodyStyle
        }
      >
        <div
          style={
            flightCardTopStyle
          }
        >
          <div
            style={{
              ...flightTypeIconStyle,

              color:
                theme.primary,

              background:
                theme.soft,
            }}
          >
            ✈
          </div>

          <span
            style={{
              ...statusBadgeStyle,

              color:
                statusColor(
                  flight.status
                ),

              background:
                statusSoftBg(
                  flight.status
                ),

              borderColor:
                statusColor(
                  flight.status
                ),
            }}
          >
            {flight.status}
          </span>
        </div>

        <div
          style={
            flightNumberStyle
          }
        >
          {
            flight.flight_number
          }
        </div>

        <div
          style={
            flightRouteStyle
          }
        >
          {flight.origin}

          <span
            style={
              arrowStyle
            }
          >
            →
          </span>

          {
            flight.destination
          }
        </div>

        <div
          style={
            flightTimesGridStyle
          }
        >
          <div>
            <div
              style={
                flightSmallLabelStyle
              }
            >
              ARRIVAL
            </div>

            <div
              style={
                arrivalTimeStyle
              }
            >
              {
                flight.scheduled_arrival_time ||
                "--:--"
              }
            </div>
          </div>

          <div>
            <div
              style={
                flightSmallLabelStyle
              }
            >
              DEPARTURE
            </div>

            <div
              style={
                departureTimeStyle
              }
            >
              {
                flight.scheduled_departure_time ||
                "--:--"
              }
            </div>
          </div>
        </div>

        <div
          style={
            flightDetailsGridStyle
          }
        >
          <div>
            <div
              style={
                detailLabelStyle
              }
            >
              Actual Arrival
            </div>

            <div
              style={{
                ...detailValueStyle,

                color:
                  flight.actual_arrival_time
                    ? "#059669"
                    : "#64748b",
              }}
            >
              {flight.actual_arrival_time ||
                "--"}
            </div>
          </div>

          <div>
            <div
              style={
                detailLabelStyle
              }
            >
              Actual Departure
            </div>

            <div
              style={{
                ...detailValueStyle,

                color:
                  flight.actual_departure_time
                    ? "#0f766e"
                    : "#64748b",
              }}
            >
              {flight.actual_departure_time ||
                "--"}
            </div>
          </div>

          <div>
            <div
              style={
                detailLabelStyle
              }
            >
              Position
            </div>

            <div
              style={
                detailValueStyle
              }
            >
              {flight.position ||
                "--"}
            </div>
          </div>

          <div>
            <div
              style={
                detailLabelStyle
              }
            >
              Delay
            </div>

            <div
              style={{
                ...detailValueStyle,

                color:
                  Number(
                    flight.delay_minutes
                  ) > 0
                    ? "#f97316"
                    : "#64748b",
              }}
            >
              {Number(
                flight.delay_minutes
              ) > 0
                ? `+${flight.delay_minutes} min`
                : "--"}
            </div>
          </div>

          <div
            style={{
              gridColumn:
                "1 / -1",
            }}
          >
            <div
              style={
                detailLabelStyle
              }
            >
              Notes
            </div>

            <div
              style={{
                ...detailValueStyle,
                ...cardNoteStyle,
              }}
            >
              {flight.notes ||
                "--"}
            </div>
          </div>
        </div>

        {isDeparted && (
          <div
            style={
              hiddenTvStyle
            }
          >
            📺 FLIGHT DEPARTED
          </div>
        )}
      </div>

      <div
        style={
          statusAreaStyle
        }
      >
        <div
          style={
            flightStatusGridStyle
          }
          className="ctv-status-buttons"
        >
          {FLIGHT_STATUSES.map(
            (status) => (
              <button
                type="button"
                key={
                  status
                }
                onClick={() =>
                  updateStatus(
                    flight.id,
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
                    flight.status ===
                    status
                      ? statusSoftBg(
                          status
                        )
                      : "#ffffff",
                }}
              >
                {status}
              </button>
            )
          )}
        </div>

        <div className="ctv-mobile-status-row">
          <label>
            Status
          </label>

          <select
            value={
              flight.status
            }
            onChange={(e) =>
              updateStatus(
                flight.id,
                e.target.value
              )
            }
          >
            {FLIGHT_STATUSES.map(
              (status) => (
                <option
                  key={
                    status
                  }
                  value={
                    status
                  }
                >
                  {status}
                </option>
              )
            )}
          </select>
        </div>
      </div>

      <div
        style={
          cardActionsStyle
        }
      >
        <button
          type="button"
          onClick={() =>
            openDelayModal(
              flight
            )
          }
          style={
            delayButtonStyle
          }
        >
          ✎ Delay / Notes
        </button>

        <button
          type="button"
          style={
            deleteButtonStyle
          }
          onClick={() =>
            deleteFlight(
              flight.id
            )
          }
        >
          🗑 Delete
        </button>
      </div>
    </div>
  );
}

/* =====================================================
   FLIGHT THEME
===================================================== */

const getFlightTheme = () => {
  return {
    primary: "#7c3aed",

    soft: "#f5f3ff",

    background:
      "linear-gradient(145deg,#ffffff 0%,#faf8ff 100%)",

    border:
      "#ddd6fe",
  };
};

/* =====================================================
   STATUS COLORS
===================================================== */

const statusColor = (s) =>
  ({
    SCHEDULED:
      "#64748b",

    ENROUTE:
      "#7c3aed",

    DELAYED:
      "#f97316",

    LANDED:
      "#2563eb",

    "ON THE GROUND":
      "#2563eb",

    ARRIVED:
      "#16a34a",

    LOADING:
      "#7c3aed",

    DEPARTED:
      "#0f766e",

    CANCELLED:
      "#dc2626",
  }[s] || "#334155");

const statusSoftBg = (s) =>
  ({
    SCHEDULED:
      "#f1f5f9",

    ENROUTE:
      "#f5f3ff",

    DELAYED:
      "#fff7ed",

    LANDED:
      "#eff6ff",

    "ON THE GROUND":
      "#eff6ff",

    ARRIVED:
      "#ecfdf3",

    LOADING:
      "#f5f3ff",

    DEPARTED:
      "#ecfdf5",

    CANCELLED:
      "#fef2f2",
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

  color:
    "#0f172a",
};

/* =====================================================
   HEADER
===================================================== */

const topBarStyle = {
  display: "flex",

  justifyContent:
    "space-between",

  alignItems:
    "center",

  gap: 20,

  marginBottom: 24,
};

const smallHeadingStyle = {
  color:
    "#ec2772",

  fontSize: 10,

  fontWeight: 900,

  letterSpacing:
    ".13em",

  marginBottom: 7,
};

const titleStyle = {
  margin: 0,

  fontSize: 32,

  lineHeight: 1.05,

  fontWeight: 900,

  letterSpacing:
    "-.04em",

  color:
    "#172033",
};

const subTitleStyle = {
  color:
    "#64748b",

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

  border:
    "none",

  background:
    "linear-gradient(135deg,#ff326c,#e91e63)",

  color:
    "#ffffff",

  fontWeight: 900,

  fontSize: 12,

  cursor:
    "pointer",

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

  alignItems:
    "start",
};

/* =====================================================
   ADD FLIGHT PANEL
===================================================== */

const addFlightPanelStyle = {
  background:
    "#ffffff",

  border:
    "1px solid #e5e9f0",

  borderRadius: 10,

  overflow:
    "hidden",

  padding: 18,

  boxShadow:
    "0 7px 24px rgba(15,23,42,.04)",
};

const panelHeaderStyle = {
  display:
    "flex",

  alignItems:
    "center",

  gap: 11,

  marginBottom: 20,
};

const addIconStyle = {
  width: 42,

  height: 42,

  flexShrink: 0,

  borderRadius:
    999,

  display:
    "grid",

  placeItems:
    "center",

  background:
    "#f5f3ff",

  color:
    "#7c3aed",

  fontSize: 20,
};

const panelTitleStyle = {
  margin: 0,

  fontSize: 17,

  fontWeight:
    900,

  color:
    "#7c3aed",
};

const panelSubtitleStyle = {
  marginTop: 3,

  color:
    "#94a3b8",

  fontSize: 10,

  fontWeight:
    700,
};

/* =====================================================
   FORM
===================================================== */

const formStyle = {
  display:
    "flex",

  flexDirection:
    "column",

  gap: 14,
};

const formTwoColumnStyle = {
  display:
    "grid",

  gridTemplateColumns:
    "1fr 1fr",

  gap: 12,
};

const fieldStyle = {
  display:
    "flex",

  flexDirection:
    "column",

  gap: 6,

  minWidth: 0,
};

const labelStyle = {
  fontWeight:
    800,

  fontSize: 10,

  color:
    "#334155",
};

const requiredStyle = {
  color:
    "#ec2772",
};

const mutedStyle = {
  color:
    "#94a3b8",

  fontWeight:
    600,
};

const inputStyle = {
  width:
    "100%",

  minHeight: 39,

  padding:
    "9px 11px",

  borderRadius: 6,

  border:
    "1px solid #dbe1e8",

  fontSize: 11,

  fontWeight:
    600,

  outline:
    "none",

  color:
    "#0f172a",

  background:
    "#ffffff",

  boxSizing:
    "border-box",
};

const textAreaStyle = {
  ...inputStyle,

  minHeight: 88,

  resize:
    "vertical",

  fontFamily:
    "Inter, Arial, sans-serif",
};

const formDividerStyle = {
  height: 1,

  borderTop:
    "1px dashed #a78bfa",

  margin:
    "2px 0",
};

const mainButtonStyle = {
  minHeight: 42,

  padding:
    "0 16px",

  borderRadius: 7,

  border:
    "none",

  background:
    "linear-gradient(135deg,#8b5cf6,#6d28d9)",

  color:
    "#ffffff",

  fontWeight:
    900,

  cursor:
    "pointer",

  fontSize: 12,

  boxShadow:
    "0 8px 18px rgba(124,58,237,.18)",
};

const tipStyle = {
  display:
    "flex",

  alignItems:
    "flex-start",

  gap: 8,

  marginTop: 18,

  padding: 11,

  borderRadius: 7,

  background:
    "#f0f8ff",

  border:
    "1px solid #bfdbfe",

  color:
    "#2563eb",

  fontSize: 9,

  lineHeight:
    1.5,

  fontWeight:
    700,
};

const messageStyle = {
  marginTop: 14,

  padding: 10,

  borderRadius: 7,

  background:
    "#ecfdf5",

  border:
    "1px solid #bbf7d0",

  color:
    "#15803d",

  fontSize: 10,

  fontWeight:
    800,
};

/* =====================================================
   FLIGHTS PANEL
===================================================== */

const flightsPanelStyle = {
  background:
    "#ffffff",

  border:
    "1px solid #e5e9f0",

  borderRadius: 10,

  padding: 18,

  minWidth: 0,

  boxShadow:
    "0 7px 24px rgba(15,23,42,.04)",
};

const flightsHeaderStyle = {
  display:
    "flex",

  justifyContent:
    "space-between",

  alignItems:
    "center",

  gap: 16,

  marginBottom: 18,
};

const flightsTitleGroupStyle = {
  display:
    "flex",

  alignItems:
    "center",

  gap: 11,
};

const flightsIconStyle = {
  width: 42,

  height: 42,

  borderRadius:
    999,

  background:
    "#f5f3ff",

  color:
    "#7c3aed",

  display:
    "grid",

  placeItems:
    "center",

  fontSize: 20,

  fontWeight:
    900,
};

const flightsTitleStyle = {
  margin: 0,

  fontSize: 17,

  fontWeight:
    900,

  color:
    "#172033",
};

const flightsSubTitleStyle = {
  color:
    "#94a3b8",

  marginTop: 3,

  fontSize: 10,

  fontWeight:
    700,
};

const totalBadgeStyle = {
  padding:
    "8px 11px",

  background:
    "#f5f3ff",

  borderRadius: 7,

  color:
    "#7c3aed",

  fontSize: 10,

  fontWeight:
    900,
};

/* =====================================================
   GRID
===================================================== */

const flightsGridStyle = {
  display:
    "grid",

  gridTemplateColumns:
    "repeat(3,minmax(0,1fr))",

  gap: 12,
};

/* =====================================================
   FLIGHT CARD
===================================================== */

const flightCardStyle = {
  minWidth: 0,

  minHeight: 360,

  display:
    "flex",

  flexDirection:
    "column",

  border:
    "1px solid",

  borderRadius: 8,

  overflow:
    "hidden",

  boxShadow:
    "0 5px 14px rgba(15,23,42,.035)",

  transition:
    "transform .15s ease, box-shadow .15s ease",
};

const flightCardBodyStyle = {
  padding: 14,

  flex: 1,
};

const flightCardTopStyle = {
  display:
    "flex",

  alignItems:
    "center",

  justifyContent:
    "space-between",

  gap: 10,

  marginBottom: 10,
};

const flightTypeIconStyle = {
  width: 34,

  height: 34,

  borderRadius: 8,

  display:
    "grid",

  placeItems:
    "center",

  fontSize: 18,

  fontWeight:
    900,
};

const statusBadgeStyle = {
  display:
    "inline-flex",

  alignItems:
    "center",

  justifyContent:
    "center",

  border:
    "1px solid",

  borderRadius:
    999,

  padding:
    "4px 8px",

  fontSize: 8,

  fontWeight:
    900,

  whiteSpace:
    "nowrap",
};

const flightNumberStyle = {
  fontSize: 20,

  fontWeight:
    900,

  color:
    "#7c3aed",

  letterSpacing:
    "-.03em",

  marginBottom: 3,
};

const flightRouteStyle = {
  display:
    "flex",

  alignItems:
    "center",

  gap: 5,

  color:
    "#172033",

  fontSize: 13,

  fontWeight:
    900,

  marginBottom: 15,
};

const arrowStyle = {
  color:
    "#94a3b8",

  fontWeight:
    900,
};

const flightTimesGridStyle = {
  display:
    "grid",

  gridTemplateColumns:
    "1fr 1fr",

  gap: 10,

  marginBottom: 14,
};

const flightSmallLabelStyle = {
  color:
    "#64748b",

  fontSize: 8,

  fontWeight:
    900,

  letterSpacing:
    ".04em",

  marginBottom: 3,
};

const arrivalTimeStyle = {
  color:
    "#7c3aed",

  fontSize: 16,

  fontWeight:
    900,
};

const departureTimeStyle = {
  color:
    "#172033",

  fontSize: 16,

  fontWeight:
    900,
};

const flightDetailsGridStyle = {
  display:
    "grid",

  gridTemplateColumns:
    "1fr 1fr",

  gap:
    "12px 10px",
};

const detailLabelStyle = {
  color:
    "#94a3b8",

  fontSize: 8,

  fontWeight:
    700,

  marginBottom: 3,
};

const detailValueStyle = {
  color:
    "#334155",

  fontSize: 10,

  lineHeight:
    1.35,

  fontWeight:
    800,
};

const cardNoteStyle = {
  overflow:
    "hidden",

  textOverflow:
    "ellipsis",

  display:
    "-webkit-box",

  WebkitLineClamp:
    2,

  WebkitBoxOrient:
    "vertical",
};

const hiddenTvStyle = {
  marginTop: 12,

  display:
    "inline-flex",

  alignItems:
    "center",

  justifyContent:
    "center",

  padding:
    "6px 8px",

  borderRadius: 5,

  background:
    "#475569",

  color:
    "#ffffff",

  fontSize: 8,

  fontWeight:
    900,
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

const flightStatusGridStyle = {
  display:
    "grid",

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

  fontWeight:
    900,

  cursor:
    "pointer",

  fontSize: 6.7,

  whiteSpace:
    "nowrap",
};

/* =====================================================
   ACTION BUTTONS
===================================================== */

const cardActionsStyle = {
  display:
    "grid",

  gridTemplateColumns:
    "1fr 1fr",

  gap: 6,

  padding: 9,

  borderTop:
    "1px solid rgba(148,163,184,.22)",

  background:
    "#ffffff",
};

const delayButtonStyle = {
  minHeight: 31,

  border:
    "1px solid #f9a8c3",

  color:
    "#ec2772",

  background:
    "#ffffff",

  borderRadius: 5,

  fontSize: 8,

  fontWeight:
    900,

  cursor:
    "pointer",
};

const deleteButtonStyle = {
  minHeight: 31,

  border:
    "1px solid #fecaca",

  color:
    "#dc2626",

  background:
    "#ffffff",

  borderRadius: 5,

  fontSize: 8,

  fontWeight:
    900,

  cursor:
    "pointer",
};

/* =====================================================
   EMPTY / TIP
===================================================== */

const emptyStateStyle = {
  padding: 24,

  borderRadius: 8,

  background:
    "#f8fafc",

  border:
    "1px dashed #cbd5e1",

  color:
    "#64748b",

  textAlign:
    "center",

  fontSize: 11,

  fontWeight:
    700,
};

const tvTipStyle = {
  display:
    "flex",

  gap: 8,

  alignItems:
    "center",

  marginTop: 12,

  padding:
    "9px 11px",

  borderRadius: 6,

  background:
    "#f0f8ff",

  border:
    "1px solid #bfdbfe",

  color:
    "#2563eb",

  fontSize: 9,

  fontWeight:
    700,
};

/* =====================================================
   MODAL
===================================================== */

const modalOverlayStyle = {
  position:
    "fixed",

  inset: 0,

  background:
    "rgba(15,23,42,.50)",

  display:
    "flex",

  alignItems:
    "center",

  justifyContent:
    "center",

  padding: 18,

  zIndex: 1000,

  backdropFilter:
    "blur(3px)",
};

const modalStyle = {
  width:
    "100%",

  maxWidth: 430,

  background:
    "#ffffff",

  borderRadius: 12,

  padding: 24,

  boxShadow:
    "0 30px 80px rgba(15,23,42,.30)",

  position:
    "relative",

  border:
    "1px solid #e5e7eb",
};

const modalCloseStyle = {
  position:
    "absolute",

  top: 12,

  right: 16,

  border:
    "none",

  background:
    "transparent",

  color:
    "#64748b",

  fontSize: 27,

  cursor:
    "pointer",

  fontWeight:
    700,
};

const modalSmallTitleStyle = {
  color:
    "#7c3aed",

  fontSize: 9,

  fontWeight:
    900,

  letterSpacing:
    ".12em",

  marginBottom: 6,
};

const modalTitleStyle = {
  margin: 0,

  fontSize: 23,

  fontWeight:
    900,

  letterSpacing:
    "-.025em",
};

const modalSubStyle = {
  color:
    "#64748b",

  fontWeight:
    800,

  fontSize: 13,

  margin:
    "5px 0 18px",
};

const quickRowStyle = {
  display:
    "flex",

  gap: 6,

  flexWrap:
    "wrap",

  margin:
    "9px 0 16px",
};

const quickBtnStyle = {
  border:
    "1px solid #c4b5fd",

  background:
    "#f5f3ff",

  color:
    "#7c3aed",

  borderRadius: 5,

  padding:
    "7px 10px",

  fontSize: 9,

  fontWeight:
    900,

  cursor:
    "pointer",
};

const modalActionRowStyle = {
  display:
    "grid",

  gridTemplateColumns:
    "1fr 1fr",

  gap: 9,

  marginTop: 16,
};

const cancelButtonStyle = {
  minHeight: 42,

  borderRadius: 6,

  border:
    "none",

  background:
    "#f1f5f9",

  color:
    "#475569",

  fontWeight:
    900,

  cursor:
    "pointer",
};

const saveButtonStyle = {
  minHeight: 42,

  borderRadius: 6,

  border:
    "none",

  background:
    "linear-gradient(135deg,#8b5cf6,#6d28d9)",

  color:
    "#ffffff",

  fontWeight:
    900,

  cursor:
    "pointer",
};

/* =====================================================
   MOBILE
===================================================== */

const mobileOverlayStyle = {
  position:
    "fixed",

  inset: 0,

  background:
    "rgba(15,23,42,.58)",

  zIndex: 1000,

  display:
    "flex",

  alignItems:
    "center",

  justifyContent:
    "center",

  padding: 16,

  backdropFilter:
    "blur(3px)",
};

const mobileSheetStyle = {
  width:
    "100%",

  maxWidth: 430,

  maxHeight:
    "86vh",

  overflowY:
    "auto",

  background:
    "#ffffff",

  borderRadius: 14,

  padding:
    "16px 16px 110px",

  boxShadow:
    "0 30px 80px rgba(15,23,42,.35)",
};

const mobileFormBoxStyle = {
  background:
    "#ffffff",
};

const mobileActionRowStyle = {
  display:
    "grid",

  gridTemplateColumns:
    "1fr 1fr",

  gap: 9,

  marginTop: 4,
};

const mobileCancelButtonStyle = {
  minHeight: 42,

  borderRadius: 7,

  border:
    "none",

  background:
    "#f1f5f9",

  color:
    "#475569",

  fontWeight:
    900,

  cursor:
    "pointer",
};

/* =====================================================
   RESPONSIVE
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

  .ctv-flight-card:hover {
    transform: translateY(-2px);

    box-shadow:
      0 10px 24px rgba(15,23,42,.08) !important;
  }

  /* =====================================================
     LARGE MONITOR
  ===================================================== */

  @media (min-width: 1750px) {

    .ctv-flights-page {
      padding:
        36px 42px 50px !important;
    }

    .ctv-main-grid {
      grid-template-columns:
        350px minmax(0,1fr) !important;

      gap:
        22px !important;
    }

    .ctv-flights-grid {
      grid-template-columns:
        repeat(4,minmax(0,1fr)) !important;

      gap:
        14px !important;
    }

    .ctv-flight-card {
      min-height:
        380px !important;
    }

    .ctv-topbar h1 {
      font-size:
        36px !important;
    }
  }

  /* =====================================================
     NORMAL DESKTOP
  ===================================================== */

  @media
    (min-width: 1350px)
    and
    (max-width: 1749px) {

    .ctv-flights-grid {
      grid-template-columns:
        repeat(3,minmax(0,1fr)) !important;
    }
  }

  /* =====================================================
     SMALL DESKTOP
  ===================================================== */

  @media
    (max-width: 1349px) {

    .ctv-main-grid {
      grid-template-columns:
        300px minmax(0,1fr) !important;
    }

    .ctv-flights-grid {
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

  @media
    (max-width: 1000px) {

    .ctv-main-grid {
      grid-template-columns:
        1fr !important;
    }

    .ctv-desktop-form {
      display:
        none !important;
    }

    .ctv-flights-grid {
      grid-template-columns:
        repeat(2,minmax(0,1fr)) !important;
    }

    .ctv-mobile-add-btn {
      display:
        grid;

      place-items:
        center;

      position:
        fixed;

      right:
        24px;

      bottom:
        95px;

      width:
        58px;

      height:
        58px;

      border-radius:
        999px;

      border:
        none;

      background:
        linear-gradient(
          135deg,
          #8b5cf6,
          #6d28d9
        );

      color:
        white;

      font-size:
        30px;

      font-weight:
        700;

      cursor:
        pointer;

      box-shadow:
        0 15px 32px
        rgba(124,58,237,.30);

      z-index:
        900;
    }
  }

  /* =====================================================
     MOBILE
  ===================================================== */

  @media
    (max-width: 700px) {

    .ctv-flights-page {
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

    .ctv-flights-panel {
      padding:
        14px !important;
    }

    .ctv-flights-header {
      align-items:
        flex-start !important;
    }

    .ctv-flights-grid {
      grid-template-columns:
        1fr !important;
    }

    .ctv-flight-card {
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

      gap:
        8px;

      align-items:
        center;
    }

    .ctv-mobile-status-row label {
      font-size:
        10px;

      font-weight:
        900;

      color:
        #64748b;
    }

    .ctv-mobile-status-row select {
      width:
        100%;

      min-height:
        38px;

      border:
        1px solid #cbd5e1;

      border-radius:
        6px;

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

  @media
    (max-width: 430px) {

    .ctv-flights-header {
      flex-direction:
        column !important;
    }

    .ctv-flight-card {
      width:
        100% !important;
    }

    .ctv-delay-modal {
      padding:
        20px !important;
    }
  }
`;

export default AdminCTVFlightsPage;