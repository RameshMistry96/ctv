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

function AdminCTVTemplatePage() {
  const navigate = useNavigate();

  /* =====================================================
     TEMPLATE MODE
  ===================================================== */

  const [templateMode, setTemplateMode] =
    useState("ROUTE");

  /* =====================================================
     DATA
  ===================================================== */

  const [templates, setTemplates] =
    useState([]);

  const [flightTemplates, setFlightTemplates] =
    useState([]);

  const [message, setMessage] =
    useState("");

  const [editingId, setEditingId] =
    useState(null);

  const [viewMode, setViewMode] =
    useState("list");

  const [openDays, setOpenDays] =
    useState({});

  const [
    showMobileForm,
    setShowMobileForm,
  ] = useState(false);

  const didSetDefaultOpenDay =
    useRef(false);

  /* =====================================================
     ROUTE FORM
  ===================================================== */

  const [form, setForm] =
    useState({
      day_of_week: "Monday",
      route_number: "",
      destination: "",
      door_number: "",
      scheduled_departure_time: "",
      route_type: "OUTBOUND",
      default_status: "ON TIME",
    });

  /* =====================================================
     FLIGHT FORM
  ===================================================== */

  const [
    flightForm,
    setFlightForm,
  ] = useState({
    day_of_week: "Monday",
    flight_number: "",
    origin: "",
    destination: "",
    scheduled_arrival_time: "",
    scheduled_departure_time: "",
    position: "",
    default_status: "SCHEDULED",
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
     LOAD ROUTE TEMPLATES
  ===================================================== */

  const loadTemplates =
    async () => {
      try {
        const res =
          await fetch(
            getApiUrl(
              "/api/templates"
            )
          );

        const data =
          await res.json();

        if (!res.ok) {
          throw new Error(
            data.error ||
              "Failed to load route templates"
          );
        }

        const cleanData =
          (
            Array.isArray(data)
              ? data
              : []
          ).map((t) => ({
            ...t,

            day_of_week:
              String(
                t.day_of_week ||
                  ""
              ).trim(),
          }));

        setTemplates(
          cleanData
        );
      } catch (err) {
        console.error(
          "Failed to load templates:",
          err
        );

        setMessage(
          "Failed to load weekly route templates"
        );
      }
    };

  /* =====================================================
     LOAD FLIGHT TEMPLATES
  ===================================================== */

  const loadFlightTemplates =
    async () => {
      try {
        const res =
          await fetch(
            getApiUrl(
              "/api/flight-templates"
            )
          );

        const data =
          await res.json();

        if (!res.ok) {
          throw new Error(
            data.error ||
              "Failed to load flight templates"
          );
        }

        const cleanData =
          (
            Array.isArray(data)
              ? data
              : []
          ).map((t) => ({
            ...t,

            day_of_week:
              String(
                t.day_of_week ||
                  ""
              ).trim(),
          }));

        setFlightTemplates(
          cleanData
        );
      } catch (err) {
        console.error(
          "Failed to load flight templates:",
          err
        );

        setMessage(
          "Failed to load weekly flight templates"
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

    const loginTime =
      Number(
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

    loadTemplates();
    loadFlightTemplates();
  }, [navigate]);

  /* =====================================================
     DEFAULT OPEN DAY
  ===================================================== */

  useEffect(() => {
    if (
      didSetDefaultOpenDay.current
    ) {
      return;
    }

    const todayName =
      new Date().toLocaleDateString(
        "en-US",
        {
          weekday:
            "long",
        }
      );

    const nextOpen = {};

    DAYS.forEach(
      (day) => {
        nextOpen[day] =
          day ===
          todayName;
      }
    );

    setOpenDays(
      nextOpen
    );

    didSetDefaultOpenDay.current =
      true;
  }, []);

  /* =====================================================
     MODE CHANGE
  ===================================================== */

  const changeTemplateMode = (
    mode
  ) => {
    setTemplateMode(
      mode
    );

    setEditingId(
      null
    );

    setMessage("");

    setShowMobileForm(
      false
    );

    resetRouteFormOnly();
    resetFlightFormOnly();
  };

  /* =====================================================
     STATS
  ===================================================== */

  const stats =
    useMemo(() => {
      const activeTemplates =
        templateMode ===
        "FLIGHT"
          ? flightTemplates
          : templates;

      const daysWithRoutes =
        DAYS.filter(
          (day) =>
            activeTemplates.some(
              (t) =>
                t.day_of_week ===
                day
            )
        ).length;

      const times =
        activeTemplates
          .map((t) =>
            templateMode ===
            "FLIGHT"
              ? t.scheduled_arrival_time
              : t.scheduled_departure_time
          )
          .filter(Boolean)
          .sort();

      return {
        daysWithRoutes,

        totalRoutes:
          activeTemplates.length,

        earliest:
          times[0] ||
          "--",

        latest:
          times[
            times.length -
              1
          ] || "--",
      };
    }, [
      templates,
      flightTemplates,
      templateMode,
    ]);

  /* =====================================================
     ROUTE FORM CHANGE
  ===================================================== */

  const handleChange = (
    e
  ) => {
    setForm({
      ...form,

      [e.target.name]:
        e.target.value,
    });
  };

  /* =====================================================
     FLIGHT FORM CHANGE
  ===================================================== */

  const handleFlightChange = (
    e
  ) => {
    setFlightForm({
      ...flightForm,

      [e.target.name]:
        e.target.value,
    });
  };

  /* =====================================================
     RESET ROUTE FORM
  ===================================================== */

  const resetRouteFormOnly =
    () => {
      setForm({
        day_of_week:
          "Monday",

        route_number: "",

        destination: "",

        door_number: "",

        scheduled_departure_time:
          "",

        route_type:
          "OUTBOUND",

        default_status:
          "ON TIME",
      });
    };

  /* =====================================================
     RESET FLIGHT FORM
  ===================================================== */

  const resetFlightFormOnly =
    () => {
      setFlightForm({
        day_of_week:
          "Monday",

        flight_number: "",

        origin: "",

        destination: "",

        scheduled_arrival_time:
          "",

        scheduled_departure_time:
          "",

        position: "",

        default_status:
          "SCHEDULED",

        notes: "",
      });
    };

  /* =====================================================
     RESET FORM
  ===================================================== */

  const resetForm = () => {
    setEditingId(
      null
    );

    resetRouteFormOnly();
    resetFlightFormOnly();

    setShowMobileForm(
      false
    );
  };

  /* =====================================================
     OPEN SAVED DAY
  ===================================================== */

  const openSavedDay = (
    dayToReturn
  ) => {
    setOpenDays(() => {
      const nextOpen =
        {};

      DAYS.forEach(
        (day) => {
          nextOpen[day] =
            day ===
            dayToReturn;
        }
      );

      return nextOpen;
    });

    setTimeout(
      () => {
        document
          .getElementById(
            `day-${dayToReturn}`
          )
          ?.scrollIntoView({
            behavior:
              "smooth",

            block:
              "start",
          });
      },
      100
    );
  };

  /* =====================================================
     SAVE ROUTE TEMPLATE
  ===================================================== */

  const saveTemplate =
    async (e) => {
      e.preventDefault();

      setMessage("");

      if (
        !form.route_number.trim() ||
        !form.destination.trim() ||
        !form.scheduled_departure_time
      ) {
        setMessage(
          "Please complete route number, destination and scheduled time."
        );

        return;
      }

      try {
        const url =
          editingId
            ? getApiUrl(
                `/api/templates/${editingId}`
              )
            : getApiUrl(
                "/api/templates"
              );

        const method =
          editingId
            ? "PATCH"
            : "POST";

        const res =
          await fetch(
            url,
            {
              method,

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify(
                  form
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

        const dayToReturn =
          form.day_of_week;

        setMessage(
          editingId
            ? "Weekly route updated successfully"
            : "Weekly route saved successfully"
        );

        resetForm();

        await loadTemplates();

        openSavedDay(
          dayToReturn
        );
      } catch (err) {
        console.error(
          err
        );

        setMessage(
          "Failed to save weekly route"
        );
      }
    };

  /* =====================================================
     SAVE FLIGHT TEMPLATE
  ===================================================== */

  const saveFlightTemplate =
    async (e) => {
      e.preventDefault();

      setMessage("");

      if (
        !flightForm.flight_number.trim() ||
        !flightForm.origin.trim() ||
        !flightForm.destination.trim() ||
        !flightForm.scheduled_arrival_time ||
        !flightForm.scheduled_departure_time
      ) {
        setMessage(
          "Please complete all required flight fields."
        );

        return;
      }

      try {
        const url =
          editingId
            ? getApiUrl(
                `/api/flight-templates/${editingId}`
              )
            : getApiUrl(
                "/api/flight-templates"
              );

        const method =
          editingId
            ? "PATCH"
            : "POST";

        const body = {
          ...flightForm,

          flight_number:
            flightForm.flight_number
              .trim()
              .toUpperCase(),

          origin:
            flightForm.origin
              .trim()
              .toUpperCase(),

          destination:
            flightForm.destination
              .trim()
              .toUpperCase(),
        };

        const res =
          await fetch(
            url,
            {
              method,

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
          await res.json();

        if (!res.ok) {
          setMessage(
            data.error ||
              "Something went wrong"
          );

          return;
        }

        const dayToReturn =
          flightForm.day_of_week;

        setMessage(
          editingId
            ? "Weekly flight updated successfully"
            : "Weekly flight saved successfully"
        );

        resetForm();

        await loadFlightTemplates();

        openSavedDay(
          dayToReturn
        );
      } catch (err) {
        console.error(
          err
        );

        setMessage(
          "Failed to save weekly flight"
        );
      }
    };

  /* =====================================================
     EDIT ROUTE TEMPLATE
  ===================================================== */

  const startEdit = (
    route
  ) => {
    setTemplateMode(
      "ROUTE"
    );

    setEditingId(
      route.id
    );

    setMessage("");

    setShowMobileForm(
      true
    );

    setForm({
      day_of_week:
        route.day_of_week,

      route_number:
        route.route_number,

      destination:
        route.destination,

      door_number:
        route.door_number ||
        "",

      scheduled_departure_time:
        route.scheduled_departure_time,

      route_type:
        route.route_type ||
        "OUTBOUND",

      default_status:
        route.default_status ||
        "ON TIME",
    });

    window.scrollTo({
      top: 0,

      behavior:
        "smooth",
    });
  };

  /* =====================================================
     EDIT FLIGHT TEMPLATE
  ===================================================== */

  const startFlightEdit = (
    flight
  ) => {
    setTemplateMode(
      "FLIGHT"
    );

    setEditingId(
      flight.id
    );

    setMessage("");

    setShowMobileForm(
      true
    );

    setFlightForm({
      day_of_week:
        flight.day_of_week,

      flight_number:
        flight.flight_number ||
        "",

      origin:
        flight.origin ||
        "",

      destination:
        flight.destination ||
        "",

      scheduled_arrival_time:
        flight.scheduled_arrival_time ||
        "",

      scheduled_departure_time:
        flight.scheduled_departure_time ||
        "",

      position:
        flight.position ||
        "",

      default_status:
        flight.default_status ||
        "SCHEDULED",

      notes:
        flight.notes ||
        "",
    });

    window.scrollTo({
      top: 0,

      behavior:
        "smooth",
    });
  };

  /* =====================================================
     DELETE ROUTE TEMPLATE
  ===================================================== */

  const deleteTemplate =
    async (id) => {
      const ok =
        window.confirm(
          "Delete this weekly route?"
        );

      if (!ok) {
        return;
      }

      try {
        const res =
          await fetch(
            getApiUrl(
              `/api/templates/${id}`
            ),
            {
              method:
                "DELETE",
            }
          );

        const data =
          await res.json();

        if (!res.ok) {
          setMessage(
            data.error ||
              "Failed to delete weekly route"
          );

          return;
        }

        setTemplates(
          (prev) =>
            prev.filter(
              (t) =>
                t.id !==
                id
            )
        );

        setMessage(
          "Weekly route deleted"
        );
      } catch (err) {
        setMessage(
          "Failed to delete weekly route"
        );
      }
    };

  /* =====================================================
     DELETE FLIGHT TEMPLATE
  ===================================================== */

  const deleteFlightTemplate =
    async (id) => {
      const ok =
        window.confirm(
          "Delete this weekly flight?"
        );

      if (!ok) {
        return;
      }

      try {
        const res =
          await fetch(
            getApiUrl(
              `/api/flight-templates/${id}`
            ),
            {
              method:
                "DELETE",
            }
          );

        const data =
          await res.json();

        if (!res.ok) {
          setMessage(
            data.error ||
              "Failed to delete weekly flight"
          );

          return;
        }

        setFlightTemplates(
          (prev) =>
            prev.filter(
              (t) =>
                t.id !==
                id
            )
        );

        setMessage(
          "Weekly flight deleted"
        );
      } catch (err) {
        setMessage(
          "Failed to delete weekly flight"
        );
      }
    };

  /* =====================================================
     LOAD TODAY
  ===================================================== */

  const loadToday =
    async () => {
      try {
        setMessage("");

        const path =
          templateMode ===
          "FLIGHT"
            ? "/api/flights/load-today"
            : "/api/routes/load-today";

        const res =
          await fetch(
            getApiUrl(path),
            {
              method:
                "POST",
            }
          );

        const data =
          await res.json();

        if (!res.ok) {
          throw new Error(
            data.error ||
              "Unable to load schedule"
          );
        }

        setMessage(
          data.message ||
            "Today's schedule loaded"
        );
      } catch (err) {
        console.error(
          err
        );

        setMessage(
          templateMode ===
          "FLIGHT"
            ? "Failed to load today's flights"
            : "Failed to load today's routes"
        );
      }
    };

  /* =====================================================
     TOGGLE DAY
  ===================================================== */

  const toggleDay = (
    day
  ) => {
    setOpenDays(
      (prev) => {
        const isAlreadyOpen =
          !!prev[day];

        const nextOpen =
          {};

        DAYS.forEach(
          (d) => {
            nextOpen[d] =
              false;
          }
        );

        nextOpen[day] =
          !isAlreadyOpen;

        return nextOpen;
      }
    );
  };

  /* =====================================================
     ROUTE FORM CARD
  ===================================================== */

  const RouteFormCard = (
    mobile = false
  ) => (
    <div
      style={
        mobile
          ? mobileFormCard
          : formPanelStyle
      }
      className="tpl-form-panel"
    >
      <div
        style={
          formHeaderStyle
        }
      >
        <div
          style={
            formIconStyle
          }
        >
          {editingId
            ? "✎"
            : "＋"}
        </div>

        <div>
          <div
            style={
              formSmallTitleStyle
            }
          >
            ROUTE TEMPLATE
          </div>

          <h2
            style={
              formTitleStyle
            }
          >
            {editingId
              ? "Edit Weekly Route"
              : "Add Weekly Route"}
          </h2>
        </div>
      </div>

      <form
        onSubmit={
          saveTemplate
        }
        style={
          formStyle
        }
        className="tpl-template-form"
      >
        <div
          style={
            formTwoColStyle
          }
          className="tpl-form-two"
        >
          <div
            style={
              fieldStyle
            }
          >
            <label
              style={
                label
              }
            >
              Select Day
            </label>

            <select
              name="day_of_week"
              value={
                form.day_of_week
              }
              onChange={
                handleChange
              }
              style={
                input
              }
            >
              {DAYS.map(
                (day) => (
                  <option
                    key={
                      day
                    }
                  >
                    {day}
                  </option>
                )
              )}
            </select>
          </div>

          <div
            style={
              fieldStyle
            }
          >
            <label
              style={
                label
              }
            >
              Route Type
            </label>

            <select
              name="route_type"
              value={
                form.route_type
              }
              onChange={
                handleChange
              }
              style={
                input
              }
            >
              <option value="OUTBOUND">
                OUTBOUND -
                Depart
              </option>

              <option value="INBOUND">
                INBOUND -
                Arrive
              </option>
            </select>
          </div>
        </div>

        <div
          style={
            formTwoColStyle
          }
          className="tpl-form-two"
        >
          <div
            style={
              fieldStyle
            }
          >
            <label
              style={
                label
              }
            >
              Route Number
            </label>

            <input
              name="route_number"
              value={
                form.route_number
              }
              onChange={
                handleChange
              }
              placeholder="e.g. YF201"
              style={
                input
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
                label
              }
            >
              Destination
            </label>

            <input
              name="destination"
              value={
                form.destination
              }
              onChange={
                handleChange
              }
              placeholder="e.g. YMX"
              style={
                input
              }
            />
          </div>
        </div>

        <div
          style={
            formTwoColStyle
          }
          className="tpl-form-two"
        >
          <div
            style={
              fieldStyle
            }
          >
            <label
              style={
                label
              }
            >
              Door Number
            </label>

            <input
              name="door_number"
              value={
                form.door_number
              }
              onChange={
                handleChange
              }
              placeholder="e.g. 12"
              style={
                input
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
                label
              }
            >
              Scheduled
              Time
            </label>

            <input
              type="time"
              name="scheduled_departure_time"
              value={
                form.scheduled_departure_time
              }
              onChange={
                handleChange
              }
              style={
                input
              }
            />
          </div>
        </div>

        <div
          style={
            fieldStyle
          }
        >
          <label
            style={
              label
            }
          >
            Status
          </label>

          <select
            name="default_status"
            value={
              form.default_status
            }
            onChange={
              handleChange
            }
            style={
              input
            }
          >
            <option>
              ON TIME
            </option>

            <option>
              LOADING
            </option>

            <option>
              DELAYED
            </option>

            <option>
              CANCELLED
            </option>
          </select>
        </div>

        <FormActions
          mobile={
            mobile
          }
          editingId={
            editingId
          }
          resetForm={
            resetForm
          }
          typeLabel="Route"
        />
      </form>

      {!mobile && (
        <div
          style={
            formTipStyle
          }
        >
          <span>
            ⓘ
          </span>

          <span>
            Add recurring
            departure or arrival
            routes for each day.
          </span>
        </div>
      )}

      {message && (
        <div
          style={
            messageBox
          }
        >
          {message}
        </div>
      )}
    </div>
  );

  /* =====================================================
     FLIGHT FORM CARD
  ===================================================== */

  const FlightFormCard = (
    mobile = false
  ) => (
    <div
      style={
        mobile
          ? mobileFormCard
          : {
              ...formPanelStyle,

              border:
                "1px solid #ddd6fe",
            }
      }
      className="tpl-form-panel"
    >
      <div
        style={
          formHeaderStyle
        }
      >
        <div
          style={
            flightFormIconStyle
          }
        >
          ✈
        </div>

        <div>
          <div
            style={
              flightSmallTitleStyle
            }
          >
            FLIGHT TEMPLATE
          </div>

          <h2
            style={
              formTitleStyle
            }
          >
            {editingId
              ? "Edit Weekly Flight"
              : "Add Weekly Flight"}
          </h2>
        </div>
      </div>

      <form
        onSubmit={
          saveFlightTemplate
        }
        style={
          formStyle
        }
        className="tpl-template-form"
      >
        <div
          style={
            fieldStyle
          }
        >
          <label
            style={
              label
            }
          >
            Select Day
          </label>

          <select
            name="day_of_week"
            value={
              flightForm.day_of_week
            }
            onChange={
              handleFlightChange
            }
            style={
              input
            }
          >
            {DAYS.map(
              (day) => (
                <option
                  key={
                    day
                  }
                >
                  {day}
                </option>
              )
            )}
          </select>
        </div>

        <div
          style={
            fieldStyle
          }
        >
          <label
            style={
              label
            }
          >
            Flight Number *
          </label>

          <input
            name="flight_number"
            value={
              flightForm.flight_number
            }
            onChange={
              handleFlightChange
            }
            placeholder="e.g. FX148"
            style={
              input
            }
          />
        </div>

        <div
          style={
            formTwoColStyle
          }
          className="tpl-form-two"
        >
          <div
            style={
              fieldStyle
            }
          >
            <label
              style={
                label
              }
            >
              Origin *
            </label>

            <input
              name="origin"
              value={
                flightForm.origin
              }
              onChange={
                handleFlightChange
              }
              placeholder="e.g. MEM"
              style={
                input
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
                label
              }
            >
              Destination *
            </label>

            <input
              name="destination"
              value={
                flightForm.destination
              }
              onChange={
                handleFlightChange
              }
              placeholder="e.g. YYZ"
              style={
                input
              }
            />
          </div>
        </div>

        <div
          style={
            formTwoColStyle
          }
          className="tpl-form-two"
        >
          <div
            style={
              fieldStyle
            }
          >
            <label
              style={
                label
              }
            >
              Scheduled
              Arrival *
            </label>

            <input
              type="time"
              name="scheduled_arrival_time"
              value={
                flightForm.scheduled_arrival_time
              }
              onChange={
                handleFlightChange
              }
              style={
                input
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
                label
              }
            >
              Scheduled
              Departure *
            </label>

            <input
              type="time"
              name="scheduled_departure_time"
              value={
                flightForm.scheduled_departure_time
              }
              onChange={
                handleFlightChange
              }
              style={
                input
              }
            />
          </div>
        </div>

        <div
          style={
            fieldStyle
          }
        >
          <label
            style={
              label
            }
          >
            Position / Ramp
          </label>

          <input
            name="position"
            value={
              flightForm.position
            }
            onChange={
              handleFlightChange
            }
            placeholder="e.g. 609"
            style={
              input
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
              label
            }
          >
            Default Status
          </label>

          <select
            name="default_status"
            value={
              flightForm.default_status
            }
            onChange={
              handleFlightChange
            }
            style={
              input
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

        <div
          style={
            fieldStyle
          }
        >
          <label
            style={
              label
            }
          >
            Notes
          </label>

          <textarea
            name="notes"
            value={
              flightForm.notes
            }
            onChange={
              handleFlightChange
            }
            placeholder="Optional note..."
            style={
              textArea
            }
          />
        </div>

        <FormActions
          mobile={
            mobile
          }
          editingId={
            editingId
          }
          resetForm={
            resetForm
          }
          typeLabel="Flight"
        />
      </form>

      {!mobile && (
        <div
          style={
            flightTipStyle
          }
        >
          <span>
            ⓘ
          </span>

          <span>
            These flights can be
            loaded automatically
            into Admin Flights for
            the selected day.
          </span>
        </div>
      )}

      {message && (
        <div
          style={
            messageBox
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
          page
        }
        className="tpl-page"
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <div
          style={
            header
          }
          className="tpl-header"
        >
          <div>
            <div
              style={
                smallHeading
              }
            >
              CTV WEEKLY PLANNING
            </div>

            <h1
              style={
                title
              }
            >
              Weekly Templates
            </h1>

            <p
              style={
                subtitle
              }
            >
              Manage recurring
              routes and flight
              schedules for each
              day of the week.
            </p>
          </div>

          <div
            style={
              headerActions
            }
            className="tpl-header-actions"
          >
            <button
              style={
                templateMode ===
                "FLIGHT"
                  ? flightLoadButton
                  : primaryTopBtn
              }
              onClick={
                loadToday
              }
            >
              ⇩{" "}
              {templateMode ===
              "FLIGHT"
                ? "Load Today's Flights"
                : "Load Today's Routes"}
            </button>

            <button
              type="button"
              style={
                secondaryTopBtn
              }
              onClick={() =>
                setMessage(
                  templateMode ===
                    "FLIGHT"
                    ? "Create weekly flights, then use Load Today's Flights to copy today's templates into Admin Flights."
                    : "Create weekly routes, then use Load Today's Routes to copy today's templates into Admin Routes."
                )
              }
            >
              ⓘ Quick Guide
            </button>
          </div>
        </div>

        {/* =================================================
            MODE SELECTOR
        ================================================= */}

        <div
          style={
            modeSelectorWrap
          }
          className="tpl-mode-selector"
        >
          <button
            type="button"
            style={
              templateMode ===
              "ROUTE"
                ? routeModeActive
                : modeButton
            }
            onClick={() =>
              changeTemplateMode(
                "ROUTE"
              )
            }
          >
            🚚 Route Templates

            <span
              style={
                modeCount
              }
            >
              {
                templates.length
              }
            </span>
          </button>

          <button
            type="button"
            style={
              templateMode ===
              "FLIGHT"
                ? flightModeActive
                : modeButton
            }
            onClick={() =>
              changeTemplateMode(
                "FLIGHT"
              )
            }
          >
            ✈ Flight Templates

            <span
              style={
                modeCount
              }
            >
              {
                flightTemplates.length
              }
            </span>
          </button>
        </div>

        {/* =================================================
            STATS
        ================================================= */}

        <div
          style={
            statsBar
          }
          className="tpl-stats"
        >
          <StatBox
            icon="🗓"
            label={
              templateMode ===
              "FLIGHT"
                ? "Days With Flights"
                : "Days With Routes"
            }
            value={
              stats.daysWithRoutes
            }
            sub="of 7 days"
            color={
              templateMode ===
              "FLIGHT"
                ? "#7c3aed"
                : "#ec2772"
            }
            soft={
              templateMode ===
              "FLIGHT"
                ? "#f5f3ff"
                : "#fff0f6"
            }
          />

          <StatBox
            icon={
              templateMode ===
              "FLIGHT"
                ? "✈"
                : "🔗"
            }
            label={
              templateMode ===
              "FLIGHT"
                ? "Total Flights"
                : "Total Routes"
            }
            value={
              stats.totalRoutes
            }
            sub="this week"
            color="#7c3aed"
            soft="#f5f3ff"
          />

          <StatBox
            icon="◷"
            label={
              templateMode ===
              "FLIGHT"
                ? "Earliest Arrival"
                : "Earliest Time"
            }
            value={
              stats.earliest
            }
            sub="scheduled time"
            color="#0ea5e9"
            soft="#f0f9ff"
          />

          <StatBox
            icon="◷"
            label={
              templateMode ===
              "FLIGHT"
                ? "Latest Arrival"
                : "Latest Time"
            }
            value={
              stats.latest
            }
            sub="scheduled time"
            color="#f97316"
            soft="#fff7ed"
          />

          <StatBox
            icon="✓"
            label="System"
            value="Active"
            sub={
              templateMode ===
              "FLIGHT"
                ? "Flight templates ready"
                : "Route templates ready"
            }
            color="#16a34a"
            soft="#ecfdf3"
          />
        </div>

        {/* =================================================
            MAIN LAYOUT
        ================================================= */}

        <div
          style={
            layout
          }
          className="tpl-layout"
        >
          <div className="tpl-desktop-form">
            {templateMode ===
            "FLIGHT"
              ? FlightFormCard(
                  false
                )
              : RouteFormCard(
                  false
                )}
          </div>

          <div
            style={
              schedulePanelStyle
            }
            className="tpl-schedule-panel"
          >
            {/* HEADER */}

            <div
              style={
                scheduleHeader
              }
              className="tpl-schedule-header"
            >
              <div>
                <div
                  style={
                    scheduleSmallTitle
                  }
                >
                  SAVED TEMPLATES
                </div>

                <h2
                  style={
                    scheduleTitle
                  }
                >
                  {templateMode ===
                  "FLIGHT"
                    ? "Saved Weekly Flights"
                    : "Saved Weekly Routes"}
                </h2>

                <div
                  style={
                    scheduleSubtitle
                  }
                >
                  Open a day to
                  view and manage
                  its recurring{" "}
                  {templateMode ===
                  "FLIGHT"
                    ? "flights"
                    : "routes"}
                  .
                </div>
              </div>

              <div
                style={
                  viewBtns
                }
              >
                <button
                  type="button"
                  onClick={() =>
                    setViewMode(
                      "list"
                    )
                  }
                  style={
                    viewMode ===
                    "list"
                      ? viewActiveBtn
                      : viewBtn
                  }
                >
                  ☰ List View
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setViewMode(
                      "calendar"
                    );

                    setMessage(
                      "Calendar View coming soon. List View is active for now."
                    );
                  }}
                  style={
                    viewMode ===
                    "calendar"
                      ? viewActiveBtn
                      : viewBtn
                  }
                >
                  🗓 Calendar View
                </button>
              </div>
            </div>

            {/* DAYS */}

            <div className="tpl-days-wrap">
              {DAYS.map(
                (day) => {
                  const dayItems =
                    templateMode ===
                    "FLIGHT"
                      ? flightTemplates.filter(
                          (t) =>
                            t.day_of_week ===
                            day
                        )
                      : templates.filter(
                          (t) =>
                            t.day_of_week ===
                            day
                        );

                  const shortDay =
                    day
                      .slice(
                        0,
                        3
                      )
                      .toUpperCase();

                  return (
                    <div
                      key={
                        day
                      }
                      id={`day-${day}`}
                      style={
                        dayBlock
                      }
                      className="tpl-day-block"
                    >
                      {/* DAY HEADER */}

                      <div
                        style={
                          dayHeader
                        }
                        className="tpl-day-header"
                        onClick={() =>
                          toggleDay(
                            day
                          )
                        }
                      >
                        <span
                          style={
                            templateMode ===
                            "FLIGHT"
                              ? flightDayPill
                              : dayPill
                          }
                        >
                          {
                            shortDay
                          }
                        </span>

                        <div>
                          <strong
                            style={
                              dayName
                            }
                          >
                            {day}
                          </strong>

                          <div
                            style={
                              routeCountText
                            }
                          >
                            {dayItems.length ===
                            0
                              ? templateMode ===
                                "FLIGHT"
                                ? "No flights added"
                                : "No routes added"
                              : `${dayItems.length} ${
                                  templateMode ===
                                  "FLIGHT"
                                    ? `flight${
                                        dayItems.length >
                                        1
                                          ? "s"
                                          : ""
                                      }`
                                    : `route${
                                        dayItems.length >
                                        1
                                          ? "s"
                                          : ""
                                      }`
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
                              templateMode ===
                              "FLIGHT"
                                ? flightDayCountBadge
                                : dayCountBadge
                            }
                          >
                            {
                              dayItems.length
                            }
                          </span>

                          <span
                            style={
                              chevron
                            }
                          >
                            {openDays[
                              day
                            ]
                              ? "⌃"
                              : "⌄"}
                          </span>
                        </div>
                      </div>

                      {/* ITEMS */}

                      {openDays[
                        day
                      ] &&
                        dayItems.length >
                          0 && (
                          <div
                            style={
                              routesWrap
                            }
                            className="tpl-routes-grid"
                          >
                            {dayItems.map(
                              (
                                item
                              ) =>
                                templateMode ===
                                "FLIGHT" ? (
                                  <FlightTemplateCard
                                    key={
                                      item.id
                                    }
                                    flight={
                                      item
                                    }
                                    onEdit={
                                      startFlightEdit
                                    }
                                    onDelete={
                                      deleteFlightTemplate
                                    }
                                  />
                                ) : (
                                  <RouteTemplateCard
                                    key={
                                      item.id
                                    }
                                    route={
                                      item
                                    }
                                    onEdit={
                                      startEdit
                                    }
                                    onDelete={
                                      deleteTemplate
                                    }
                                  />
                                )
                            )}
                          </div>
                        )}
                    </div>
                  );
                }
              )}
            </div>
          </div>
        </div>

        {/* =================================================
            INFO
        ================================================= */}

        <div
          style={
            templateMode ===
            "FLIGHT"
              ? flightInfoBox
              : infoBox
          }
          className="tpl-info"
        >
          <div
            style={
              templateMode ===
              "FLIGHT"
                ? flightInfoIcon
                : infoIcon
            }
          >
            ⓘ
          </div>

          <div>
            <strong>
              How it works
            </strong>

            <p
              style={
                infoText
              }
            >
              {templateMode ===
              "FLIGHT"
                ? "Create recurring flights for each weekday. Use Load Today's Flights to copy today's templates into the live Flight Admin page."
                : "Create recurring arrival and departure routes for each weekday. Use Load Today's Routes to copy today's templates into Admin Routes."}
            </p>
          </div>
        </div>

        {/* MOBILE ADD */}

        {!showMobileForm && (
          <button
            className={`tpl-mobile-add-btn ${
              templateMode ===
              "FLIGHT"
                ? "tpl-flight-mobile-add"
                : ""
            }`}
            onClick={() =>
              setShowMobileForm(
                true
              )
            }
          >
            +
          </button>
        )}

        {/* MOBILE FORM */}

        {showMobileForm && (
          <div
            style={
              mobileOverlay
            }
          >
            <div
              style={
                mobileSheet
              }
              className="tpl-mobile-sheet"
            >
              {templateMode ===
              "FLIGHT"
                ? FlightFormCard(
                    true
                  )
                : RouteFormCard(
                    true
                  )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

/* =====================================================
   ROUTE CARD
===================================================== */

function RouteTemplateCard({
  route,
  onEdit,
  onDelete,
}) {
  const theme =
    getRouteTheme(
      route
    );

  const isInbound =
    getRouteType(
      route
    ) ===
    "INBOUND";

  return (
    <div
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
            route
          ).toUpperCase()}
        </span>
      </div>

      <div
        style={
          routeTitle
        }
      >
        {
          route.route_number
        }

        <span
          style={
            arrow
          }
        >
          →
        </span>

        {
          route.destination
        }
      </div>

      <div
        style={{
          ...routeTime,

          color:
            theme.primary,
        }}
      >
        {
          route.scheduled_departure_time
        }
      </div>

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
              {route.door_number ||
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
              {route.default_status ||
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
            {
              route.day_of_week
            }
          </span>
        </div>
      </div>

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
            onEdit(
              route
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
            onDelete(
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

/* =====================================================
   FLIGHT CARD
===================================================== */

function FlightTemplateCard({
  flight,
  onEdit,
  onDelete,
}) {
  return (
    <div
      style={
        flightCard
      }
      className="tpl-route-card"
    >
      <div
        style={
          routeCardTop
        }
      >
        <div
          style={{
            ...routeTypeIcon,

            color:
              "#7c3aed",

            background:
              "#f5f3ff",
          }}
        >
          ✈
        </div>

        <span
          style={
            flightTypeBadge
          }
        >
          FLIGHT
        </span>
      </div>

      <div
        style={
          flightNumberTitle
        }
      >
        {
          flight.flight_number
        }
      </div>

      <div
        style={
          flightRouteTitle
        }
      >
        {
          flight.origin
        }

        <span
          style={
            arrow
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
          flightTimes
        }
      >
        <div>
          <div
            style={
              flightTimeLabel
            }
          >
            ARRIVE
          </div>

          <div
            style={
              flightArrivalTime
            }
          >
            {flight.scheduled_arrival_time ||
              "--:--"}
          </div>
        </div>

        <div>
          <div
            style={
              flightTimeLabel
            }
          >
            DEPART
          </div>

          <div
            style={
              flightDepartureTime
            }
          >
            {flight.scheduled_departure_time ||
              "--:--"}
          </div>
        </div>
      </div>

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
            ⌖
          </span>

          <span>
            Position:{" "}
            <b>
              {flight.position ||
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
              {flight.default_status ||
                "SCHEDULED"}
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
            {
              flight.day_of_week
            }
          </span>
        </div>

        {flight.notes && (
          <div
            style={
              detailRow
            }
          >
            <span>
              ▤
            </span>

            <span>
              {
                flight.notes
              }
            </span>
          </div>
        )}
      </div>

      <div
        style={
          actionRow
        }
      >
        <button
          style={
            flightEditBtn
          }
          onClick={() =>
            onEdit(
              flight
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
            onDelete(
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
   FORM ACTIONS
===================================================== */

function FormActions({
  mobile,
  editingId,
  resetForm,
  typeLabel,
}) {
  if (mobile) {
    return (
      <div
        style={
          mobileActionRow
        }
      >
        <button
          type="button"
          style={
            mobileCancelBtn
          }
          onClick={
            resetForm
          }
        >
          Cancel
        </button>

        <button
          style={
            typeLabel ===
            "Flight"
              ? flightSaveButton
              : button
          }
        >
          {editingId
            ? "Save Update"
            : `Save ${typeLabel}`}
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        style={
          typeLabel ===
          "Flight"
            ? flightSaveButton
            : button
        }
      >
        {editingId
          ? "Save Update"
          : `Save Weekly ${typeLabel}`}
      </button>

      {editingId && (
        <button
          type="button"
          style={
            cancelButton
          }
          onClick={
            resetForm
          }
        >
          Cancel Edit
        </button>
      )}
    </>
  );
}

/* =====================================================
   HELPERS
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
  return getRouteType(
    route
  ) === "INBOUND"
    ? "Arrive"
    : "Depart";
};

const getRouteTheme = (
  route
) => {
  const inbound =
    getRouteType(
      route
    ) === "INBOUND";

  if (inbound) {
    return {
      primary:
        "#059669",

      soft:
        "#ecfdf5",

      background:
        "linear-gradient(145deg,#ffffff 0%,#f3fff9 100%)",

      border:
        "#b7ead4",
    };
  }

  return {
    primary:
      "#ec2772",

    soft:
      "#fff0f6",

    background:
      "linear-gradient(145deg,#ffffff 0%,#fff5f9 100%)",

    border:
      "#f6c3d6",
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
      style={
        statBox
      }
      className="tpl-stat-box"
    >
      <div
        style={{
          ...statIcon,

          background:
            soft,

          color,
        }}
        className="tpl-stat-icon"
      >
        {icon}
      </div>

      <div>
        <div
          style={
            statLabel
          }
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
          style={
            statSub
          }
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
  minHeight:
    "100vh",

  background:
    "linear-gradient(180deg,#fafbfe 0%,#f6f7fb 100%)",

  padding:
    "30px 32px 42px",

  fontFamily:
    "Inter, Arial, sans-serif",

  color:
    "#0f172a",
};

/* =====================================================
   HEADER
===================================================== */

const header = {
  display:
    "flex",

  justifyContent:
    "space-between",

  alignItems:
    "flex-start",

  gap: 20,

  marginBottom:
    18,
};

const smallHeading = {
  color:
    "#ec2772",

  fontSize:
    10,

  fontWeight:
    900,

  letterSpacing:
    ".13em",

  marginBottom:
    7,
};

const title = {
  margin: 0,

  fontSize:
    32,

  color:
    "#172033",

  fontWeight:
    900,

  letterSpacing:
    "-.04em",

  lineHeight:
    1.05,
};

const subtitle = {
  color:
    "#64748b",

  fontSize:
    13,

  marginTop:
    7,

  maxWidth:
    650,

  fontWeight:
    600,

  lineHeight:
    1.5,
};

const headerActions = {
  display:
    "flex",

  gap: 10,

  flexWrap:
    "wrap",
};

const primaryTopBtn = {
  minHeight:
    44,

  border:
    "none",

  borderRadius:
    8,

  padding:
    "0 18px",

  background:
    "linear-gradient(135deg,#ff326c,#e91e63)",

  color:
    "white",

  fontWeight:
    900,

  fontSize:
    11,

  cursor:
    "pointer",

  boxShadow:
    "0 10px 24px rgba(236,39,114,.20)",
};

const flightLoadButton = {
  ...primaryTopBtn,

  background:
    "linear-gradient(135deg,#8b5cf6,#6d28d9)",

  boxShadow:
    "0 10px 24px rgba(124,58,237,.20)",
};

const secondaryTopBtn = {
  ...primaryTopBtn,

  background:
    "#ffffff",

  color:
    "#7c3aed",

  border:
    "1px solid #ddd6fe",

  boxShadow:
    "0 6px 16px rgba(15,23,42,.04)",
};

/* =====================================================
   TEMPLATE MODE SELECTOR
===================================================== */

const modeSelectorWrap = {
  display:
    "inline-flex",

  alignItems:
    "center",

  gap: 6,

  padding:
    5,

  marginBottom:
    20,

  borderRadius:
    10,

  border:
    "1px solid #e5e9f0",

  background:
    "#ffffff",

  boxShadow:
    "0 5px 16px rgba(15,23,42,.035)",
};

const modeButton = {
  minHeight:
    40,

  display:
    "flex",

  alignItems:
    "center",

  gap: 8,

  border:
    "none",

  borderRadius:
    7,

  padding:
    "0 15px",

  background:
    "transparent",

  color:
    "#64748b",

  fontSize:
    10,

  fontWeight:
    900,

  cursor:
    "pointer",
};

const routeModeActive = {
  ...modeButton,

  background:
    "#fff0f6",

  color:
    "#ec2772",

  boxShadow:
    "inset 0 0 0 1px #f9a8c3",
};

const flightModeActive = {
  ...modeButton,

  background:
    "#f5f3ff",

  color:
    "#7c3aed",

  boxShadow:
    "inset 0 0 0 1px #c4b5fd",
};

const modeCount = {
  minWidth:
    22,

  height:
    22,

  borderRadius:
    999,

  padding:
    "0 6px",

  display:
    "grid",

  placeItems:
    "center",

  background:
    "rgba(255,255,255,.75)",

  fontSize:
    8,

  fontWeight:
    900,
};

/* =====================================================
   STATS
===================================================== */

const statsBar = {
  display:
    "grid",

  gridTemplateColumns:
    "repeat(5,minmax(0,1fr))",

  gap: 12,

  marginBottom:
    20,
};

const statBox = {
  minHeight:
    105,

  display:
    "flex",

  alignItems:
    "center",

  gap: 12,

  background:
    "#ffffff",

  border:
    "1px solid #e5e9f0",

  borderRadius:
    10,

  padding: 15,

  boxShadow:
    "0 6px 18px rgba(15,23,42,.035)",
};

const statIcon = {
  width: 42,

  height: 42,

  borderRadius:
    10,

  display:
    "grid",

  placeItems:
    "center",

  fontSize:
    18,

  flexShrink:
    0,
};

const statLabel = {
  textTransform:
    "uppercase",

  color:
    "#64748b",

  fontSize:
    8,

  fontWeight:
    900,

  letterSpacing:
    ".05em",
};

const statValue = {
  fontSize:
    21,

  fontWeight:
    900,

  marginTop:
    3,

  lineHeight:
    1,
};

const statSub = {
  color:
    "#94a3b8",

  fontSize:
    9,

  marginTop:
    4,

  fontWeight:
    600,
};

/* =====================================================
   MAIN LAYOUT
===================================================== */

const layout = {
  display:
    "grid",

  gridTemplateColumns:
    "320px minmax(0,1fr)",

  gap: 18,

  alignItems:
    "start",
};

/* =====================================================
   FORM
===================================================== */

const formPanelStyle = {
  background:
    "#ffffff",

  borderRadius:
    10,

  padding: 18,

  boxShadow:
    "0 7px 24px rgba(15,23,42,.04)",

  border:
    "1px solid #e5e9f0",
};

const formHeaderStyle = {
  display:
    "flex",

  alignItems:
    "center",

  gap: 11,

  marginBottom:
    18,
};

const formIconStyle = {
  width: 42,

  height: 42,

  borderRadius:
    999,

  background:
    "#fff0f6",

  color:
    "#ec2772",

  display:
    "grid",

  placeItems:
    "center",

  fontSize:
    18,

  fontWeight:
    900,
};

const flightFormIconStyle = {
  ...formIconStyle,

  background:
    "#f5f3ff",

  color:
    "#7c3aed",

  fontSize:
    20,
};

const formSmallTitleStyle = {
  color:
    "#ec2772",

  fontSize:
    8,

  fontWeight:
    900,

  letterSpacing:
    ".11em",

  marginBottom:
    3,
};

const flightSmallTitleStyle = {
  ...formSmallTitleStyle,

  color:
    "#7c3aed",
};

const formTitleStyle = {
  margin: 0,

  color:
    "#172033",

  fontSize:
    17,

  fontWeight:
    900,
};

const formStyle = {
  display:
    "flex",

  flexDirection:
    "column",

  gap: 13,
};

const formTwoColStyle = {
  display:
    "grid",

  gridTemplateColumns:
    "1fr 1fr",

  gap: 10,
};

const fieldStyle = {
  display:
    "flex",

  flexDirection:
    "column",

  gap: 6,

  minWidth:
    0,
};

const label = {
  fontSize:
    10,

  fontWeight:
    800,

  color:
    "#334155",
};

const input = {
  width:
    "100%",

  minHeight:
    39,

  padding:
    "9px 11px",

  borderRadius:
    6,

  border:
    "1px solid #dbe1e8",

  fontSize:
    11,

  outline:
    "none",

  background:
    "#ffffff",

  color:
    "#0f172a",

  fontWeight:
    600,

  boxSizing:
    "border-box",
};

const textArea = {
  ...input,

  minHeight:
    78,

  resize:
    "vertical",

  fontFamily:
    "Inter, Arial, sans-serif",
};

const button = {
  minHeight:
    42,

  borderRadius:
    7,

  border:
    "none",

  background:
    "linear-gradient(135deg,#ff326c,#e91e63)",

  color:
    "white",

  fontWeight:
    900,

  fontSize:
    11,

  cursor:
    "pointer",

  boxShadow:
    "0 8px 18px rgba(236,39,114,.18)",
};

const flightSaveButton = {
  ...button,

  background:
    "linear-gradient(135deg,#8b5cf6,#6d28d9)",

  boxShadow:
    "0 8px 18px rgba(124,58,237,.20)",
};

const cancelButton = {
  ...button,

  background:
    "#f1f5f9",

  color:
    "#475569",

  boxShadow:
    "none",
};

const formTipStyle = {
  display:
    "flex",

  gap: 8,

  marginTop:
    16,

  padding: 10,

  borderRadius:
    7,

  background:
    "#f0f8ff",

  border:
    "1px solid #bfdbfe",

  color:
    "#2563eb",

  fontSize:
    9,

  fontWeight:
    700,

  lineHeight:
    1.5,
};

const flightTipStyle = {
  ...formTipStyle,

  background:
    "#f5f3ff",

  border:
    "1px solid #ddd6fe",

  color:
    "#7c3aed",
};

const messageBox = {
  marginTop:
    14,

  padding: 10,

  borderRadius:
    7,

  background:
    "#ecfdf5",

  border:
    "1px solid #bbf7d0",

  color:
    "#15803d",

  fontWeight:
    800,

  fontSize:
    10,
};

/* =====================================================
   SCHEDULE PANEL
===================================================== */

const schedulePanelStyle = {
  background:
    "#ffffff",

  borderRadius:
    10,

  padding: 18,

  border:
    "1px solid #e5e9f0",

  boxShadow:
    "0 7px 24px rgba(15,23,42,.04)",

  minWidth:
    0,
};

const scheduleHeader = {
  display:
    "flex",

  justifyContent:
    "space-between",

  alignItems:
    "flex-start",

  gap: 16,

  marginBottom:
    18,
};

const scheduleSmallTitle = {
  color:
    "#7c3aed",

  fontSize:
    8,

  fontWeight:
    900,

  letterSpacing:
    ".11em",

  marginBottom:
    4,
};

const scheduleTitle = {
  margin: 0,

  color:
    "#172033",

  fontSize:
    18,

  fontWeight:
    900,
};

const scheduleSubtitle = {
  marginTop:
    4,

  color:
    "#94a3b8",

  fontSize:
    9,

  fontWeight:
    600,
};

const viewBtns = {
  display:
    "flex",

  gap: 7,
};

const viewActiveBtn = {
  minHeight:
    34,

  border:
    "none",

  borderRadius:
    6,

  padding:
    "0 11px",

  background:
    "#7c3aed",

  color:
    "white",

  fontWeight:
    800,

  fontSize:
    9,

  cursor:
    "pointer",
};

const viewBtn = {
  ...viewActiveBtn,

  background:
    "#ffffff",

  color:
    "#64748b",

  border:
    "1px solid #dbe1e8",
};

/* =====================================================
   DAYS
===================================================== */

const dayBlock = {
  marginBottom:
    10,

  borderRadius:
    8,

  background:
    "#ffffff",

  border:
    "1px solid #e6e9ef",

  overflow:
    "hidden",
};

const dayHeader = {
  minHeight:
    58,

  display:
    "grid",

  gridTemplateColumns:
    "52px 1fr auto",

  alignItems:
    "center",

  gap: 10,

  padding:
    "0 13px",

  background:
    "linear-gradient(90deg,#fbfcff,#ffffff)",

  cursor:
    "pointer",
};

const dayPill = {
  background:
    "linear-gradient(135deg,#ec2772,#9b3ce7)",

  color:
    "white",

  borderRadius:
    6,

  padding:
    "8px 7px",

  fontSize:
    9,

  fontWeight:
    900,

  textAlign:
    "center",

  width:
    42,
};

const flightDayPill = {
  ...dayPill,

  background:
    "linear-gradient(135deg,#8b5cf6,#6d28d9)",
};

const dayName = {
  color:
    "#172033",

  fontSize:
    13,

  fontWeight:
    900,
};

const routeCountText = {
  color:
    "#94a3b8",

  fontSize:
    9,

  marginTop:
    3,

  fontWeight:
    600,
};

const dayHeaderRight = {
  display:
    "flex",

  alignItems:
    "center",

  gap: 10,
};

const dayCountBadge = {
  minWidth:
    26,

  height:
    26,

  padding:
    "0 7px",

  borderRadius:
    999,

  display:
    "grid",

  placeItems:
    "center",

  background:
    "#fff0f6",

  color:
    "#ec2772",

  fontSize:
    9,

  fontWeight:
    900,
};

const flightDayCountBadge = {
  ...dayCountBadge,

  background:
    "#f5f3ff",

  color:
    "#7c3aed",
};

const chevron = {
  color:
    "#7c3aed",

  fontWeight:
    900,

  fontSize:
    14,
};

/* =====================================================
   GRID
===================================================== */

const routesWrap = {
  display:
    "grid",

  gridTemplateColumns:
    "repeat(3,minmax(0,1fr))",

  gap: 10,

  padding: 11,

  borderTop:
    "1px solid #edf0f5",

  background:
    "#fafbfe",
};

/* =====================================================
   ROUTE CARD
===================================================== */

const routeCard = {
  minWidth:
    0,

  minHeight:
    220,

  display:
    "flex",

  flexDirection:
    "column",

  border:
    "1px solid",

  borderRadius:
    7,

  padding: 12,

  boxShadow:
    "0 4px 12px rgba(15,23,42,.03)",

  transition:
    "transform .15s ease, box-shadow .15s ease",
};

const flightCard = {
  ...routeCard,

  minHeight:
    260,

  background:
    "linear-gradient(145deg,#ffffff 0%,#faf8ff 100%)",

  borderColor:
    "#ddd6fe",
};

const routeCardTop = {
  display:
    "flex",

  justifyContent:
    "space-between",

  alignItems:
    "center",

  gap: 8,

  marginBottom:
    12,
};

const routeTypeIcon = {
  width: 32,

  height: 32,

  borderRadius:
    7,

  display:
    "grid",

  placeItems:
    "center",

  fontSize:
    17,

  fontWeight:
    900,
};

const routeTypeBadge = {
  padding:
    "4px 7px",

  borderRadius:
    999,

  border:
    "1px solid",

  fontSize:
    7,

  fontWeight:
    900,
};

const flightTypeBadge = {
  ...routeTypeBadge,

  color:
    "#7c3aed",

  background:
    "#f5f3ff",

  borderColor:
    "#ddd6fe",
};

const routeTitle = {
  display:
    "flex",

  alignItems:
    "center",

  flexWrap:
    "wrap",

  gap: 5,

  fontSize:
    15,

  fontWeight:
    900,

  color:
    "#172033",

  marginBottom:
    8,

  letterSpacing:
    "-.02em",
};

const flightNumberTitle = {
  color:
    "#7c3aed",

  fontSize:
    18,

  fontWeight:
    900,

  marginBottom:
    3,
};

const flightRouteTitle = {
  ...routeTitle,

  fontSize:
    13,

  marginBottom:
    12,
};

const arrow = {
  color:
    "#94a3b8",

  fontWeight:
    900,
};

const routeTime = {
  fontSize:
    20,

  fontWeight:
    900,

  lineHeight:
    1,

  marginBottom:
    14,
};

const flightTimes = {
  display:
    "grid",

  gridTemplateColumns:
    "1fr 1fr",

  gap: 8,

  marginBottom:
    13,

  paddingBottom:
    11,

  borderBottom:
    "1px dashed #ddd6fe",
};

const flightTimeLabel = {
  color:
    "#94a3b8",

  fontSize:
    7,

  fontWeight:
    900,

  marginBottom:
    3,
};

const flightArrivalTime = {
  color:
    "#7c3aed",

  fontSize:
    16,

  fontWeight:
    900,
};

const flightDepartureTime = {
  color:
    "#172033",

  fontSize:
    16,

  fontWeight:
    900,
};

const routeDetails = {
  display:
    "flex",

  flexDirection:
    "column",

  gap: 7,

  flex: 1,
};

const detailRow = {
  display:
    "flex",

  alignItems:
    "center",

  gap: 6,

  color:
    "#64748b",

  fontSize:
    9,

  fontWeight:
    700,
};

const actionRow = {
  display:
    "grid",

  gridTemplateColumns:
    "1fr 1fr",

  gap: 6,

  marginTop:
    15,
};

const editBtn = {
  minHeight:
    31,

  border:
    "1px solid #f9a8c3",

  borderRadius:
    5,

  background:
    "#ffffff",

  color:
    "#ec2772",

  fontSize:
    8,

  fontWeight:
    900,

  cursor:
    "pointer",
};

const flightEditBtn = {
  ...editBtn,

  border:
    "1px solid #c4b5fd",

  color:
    "#7c3aed",
};

const deleteBtn = {
  ...editBtn,

  borderColor:
    "#fecaca",

  color:
    "#dc2626",
};

/* =====================================================
   INFO
===================================================== */

const infoBox = {
  marginTop:
    18,

  border:
    "1px solid #bfdbfe",

  borderRadius:
    8,

  background:
    "#f0f8ff",

  padding: 13,

  display:
    "flex",

  gap: 10,

  alignItems:
    "center",
};

const flightInfoBox = {
  ...infoBox,

  background:
    "#f5f3ff",

  border:
    "1px solid #ddd6fe",
};

const infoIcon = {
  width: 34,

  height: 34,

  borderRadius:
    999,

  background:
    "#dbeafe",

  color:
    "#2563eb",

  display:
    "grid",

  placeItems:
    "center",

  fontWeight:
    900,

  flexShrink:
    0,
};

const flightInfoIcon = {
  ...infoIcon,

  background:
    "#ede9fe",

  color:
    "#7c3aed",
};

const infoText = {
  margin:
    "4px 0 0",

  color:
    "#64748b",

  fontSize:
    10,

  lineHeight:
    1.5,

  fontWeight:
    600,
};

/* =====================================================
   MOBILE
===================================================== */

const mobileOverlay = {
  position:
    "fixed",

  inset: 0,

  background:
    "rgba(15,23,42,.58)",

  zIndex:
    1000,

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

const mobileSheet = {
  width:
    "100%",

  maxWidth:
    430,

  maxHeight:
    "86vh",

  overflowY:
    "auto",

  background:
    "#ffffff",

  borderRadius:
    14,

  padding:
    "16px 16px 110px",

  boxShadow:
    "0 30px 80px rgba(15,23,42,.35)",
};

const mobileFormCard = {
  background:
    "#ffffff",
};

const mobileActionRow = {
  display:
    "grid",

  gridTemplateColumns:
    "1fr 1fr",

  gap: 9,

  marginTop:
    3,
};

const mobileCancelBtn = {
  minHeight:
    42,

  borderRadius:
    7,

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

  .tpl-mobile-add-btn {
    display: none;
  }

  .tpl-route-card:hover {
    transform: translateY(-2px);

    box-shadow:
      0 9px 20px
      rgba(15,23,42,.07) !important;
  }

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

  @media
    (min-width: 1350px)
    and
    (max-width: 1749px) {

    .tpl-routes-grid {
      grid-template-columns:
        repeat(3,minmax(0,1fr)) !important;
    }
  }

  @media
    (max-width: 1349px) {

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

  @media
    (max-width: 1000px) {

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
          #ff326c,
          #e91e63
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
        rgba(236,39,114,.30);

      z-index:
        900;
    }

    .tpl-flight-mobile-add {
      background:
        linear-gradient(
          135deg,
          #8b5cf6,
          #6d28d9
        ) !important;

      box-shadow:
        0 15px 32px
        rgba(124,58,237,.30) !important;
    }
  }

  @media
    (max-width: 700px) {

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

    .tpl-mode-selector {
      display:
        grid !important;

      grid-template-columns:
        1fr 1fr !important;

      width:
        100% !important;
    }

    .tpl-mode-selector button {
      justify-content:
        center !important;

      padding:
        0 8px !important;
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

    .tpl-template-form
    .tpl-form-two {
      grid-template-columns:
        1fr !important;
    }

    .tpl-mobile-sheet {
      padding-bottom:
        100px !important;
    }
  }

  @media
    (max-width: 430px) {

    .tpl-stats {
      grid-template-columns:
        1fr !important;
    }

    .tpl-routes-grid {
      grid-template-columns:
        1fr !important;
    }

    .tpl-mode-selector {
      grid-template-columns:
        1fr !important;
    }
  }
`;

export default AdminCTVTemplatePage;