import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import * as motion from "motion/react-client";
import "animate.css";
import { API_BASE } from "../config";

const socket = io(API_BASE);

const spring = {
  type: "spring",
  damping: 20,
  stiffness: 300,
};

const getInitialBoardMode = () => {
  const saved = localStorage.getItem("ctv_board_mode");

  if (
    saved === "DEPARTURE" ||
    saved === "ARRIVAL" ||
    saved === "FLIGHT"
  ) {
    return saved;
  }

  return "DEPARTURE";
};

function CTVBoardPage() {
  const navigate = useNavigate();

  const [routes, setRoutes] = useState([]);
  const [flights, setFlights] = useState([]);

  const [boardMode, setBoardMode] =
    useState(getInitialBoardMode);

  const [now, setNow] = useState(new Date());
  const [lastUpdated, setLastUpdated] = useState(null);
  const [leavingRouteIds, setLeavingRouteIds] = useState([]);

  const tableRef = useRef(null);
  const departedSeenAtRef = useRef({});

  // =====================================================
  // BACK TO ADMIN
  // =====================================================

  const goBackToAdmin = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error(
        "Could not exit fullscreen:",
        err
      );
    }

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

    const validAdminSession =
      isAuth &&
      loginTime &&
      Date.now() - loginTime <=
        eightHours;

    if (validAdminSession) {
      navigate("/ctv-admin");
      return;
    }

    sessionStorage.removeItem(
      "admin_auth"
    );

    sessionStorage.removeItem(
      "admin_login_time"
    );

    navigate(
      "/ctv-admin/login"
    );
  };

  // =====================================================
  // LOAD ROUTES
  // =====================================================

  const loadRoutes = async () => {
    try {
      const res = await fetch(
        window.location.hostname ===
          "localhost"
          ? "http://localhost:5000/api/routes?view=tv"
          : "/api/ctv/api/routes?view=tv"
      );

      const data =
        await res.json();

      const twoMinutes =
        2 * 60 * 1000;

      const departedVisibleTime =
        15 * 1000;

      const currentTime =
        Date.now();

      // =============================================
      // BOARD SEPARATION
      // =============================================

      let requiredRouteType =
        "OUTBOUND";

      if (
        boardMode ===
        "ARRIVAL"
      ) {
        requiredRouteType =
          "INBOUND";
      }

      const boardData =
        data.filter(
          (route) => {
            return (
              getRouteType(
                route
              ) ===
              requiredRouteType
            );
          }
        );

      // =============================================
      // DEPARTURE ONLY
      // =============================================

      if (
        boardMode ===
        "DEPARTURE"
      ) {
        boardData.forEach(
          (route) => {
            const status =
              String(
                route.status ||
                  ""
              ).toUpperCase();

            if (
              status ===
              "DEPARTED"
            ) {
              if (
                !departedSeenAtRef
                  .current[
                  route.id
                ]
              ) {
                departedSeenAtRef.current[
                  route.id
                ] =
                  currentTime;
              }
            } else {
              delete departedSeenAtRef
                .current[
                route.id
              ];
            }
          }
        );
      }

      const cleaned =
        boardData
          .filter(
            (route) => {
              const status =
                String(
                  route.status ||
                    ""
                ).toUpperCase();

              // =============================================
              // DEPARTURE SCREEN ONLY
              // =============================================

              if (
                boardMode ===
                "DEPARTURE"
              ) {
                if (
                  status !==
                  "DEPARTED"
                ) {
                  return true;
                }

                const seenAt =
                  departedSeenAtRef
                    .current[
                    route.id
                  ] ||
                  currentTime;

                return (
                  currentTime -
                    seenAt <=
                  departedVisibleTime +
                    500
                );
              }

              // =============================================
              // ARRIVAL SCREEN ONLY
              // =============================================

              if (
                boardMode ===
                "ARRIVAL"
              ) {
                if (
                  status !==
                  "ARRIVED"
                ) {
                  return true;
                }

                const updatedTime =
                  new Date(
                    route.updated_at ||
                      route.created_at ||
                      0
                  ).getTime();

                if (
                  !updatedTime
                ) {
                  return false;
                }

                return (
                  currentTime -
                    updatedTime <=
                  twoMinutes
                );
              }

              return true;
            }
          )
          .sort(
            (a, b) => {
              return String(
                a.scheduled_departure_time ||
                  ""
              ).localeCompare(
                String(
                  b.scheduled_departure_time ||
                    ""
                )
              );
            }
          );

      // =============================================
      // DEPARTURE EXIT ANIMATION ONLY
      // =============================================

      let departingIds = [];

      if (
        boardMode ===
        "DEPARTURE"
      ) {
        departingIds =
          boardData
            .filter(
              (route) => {
                const status =
                  String(
                    route.status ||
                      ""
                  ).toUpperCase();

                if (
                  status !==
                  "DEPARTED"
                ) {
                  return false;
                }

                const seenAt =
                  departedSeenAtRef
                    .current[
                    route.id
                  ];

                if (
                  !seenAt
                ) {
                  return false;
                }

                const age =
                  currentTime -
                  seenAt;

                return (
                  age >=
                    departedVisibleTime &&
                  age <
                    departedVisibleTime +
                      500
                );
              }
            )
            .map(
              (route) =>
                route.id
            );
      }

      setLeavingRouteIds(
        departingIds
      );

      if (
        departingIds.length >
        0
      ) {
        setTimeout(
          () => {
            setLeavingRouteIds(
              []
            );

            loadRoutes();
          },
          1000
        );
      }

      setRoutes(cleaned);

      setLastUpdated(
        new Date()
      );
    } catch (err) {
      console.error(
        "Failed to load routes:",
        err
      );
    }
  };

  // =====================================================
  // LOAD FLIGHTS
  // =====================================================

  const loadFlights =
    async () => {
      try {
        const res =
          await fetch(
            window.location.hostname ===
              "localhost"
              ? "http://localhost:5000/api/flights?view=tv"
              : "/api/ctv/api/flights?view=tv"
          );

        const data =
          await res.json();

        if (!res.ok) {
          throw new Error(
            data.error ||
              "Failed to load flights"
          );
        }

        const cleaned =
          (
            Array.isArray(
              data
            )
              ? data
              : []
          ).sort(
            (a, b) => {
              return String(
                a.scheduled_arrival_time ||
                  ""
              ).localeCompare(
                String(
                  b.scheduled_arrival_time ||
                    ""
                )
              );
            }
          );

        setFlights(
          cleaned
        );

        setLastUpdated(
          new Date()
        );
      } catch (err) {
        console.error(
          "Failed to load flights:",
          err
        );

        setFlights([]);
      }
    };

  // =====================================================
  // TV AUTH
  // =====================================================

  useEffect(() => {
    const isAuth =
      sessionStorage.getItem(
        "tv_auth"
      );

    const loginTime =
      Number(
        sessionStorage.getItem(
          "tv_login_time"
        )
      );

    const eightHours =
      8 * 60 * 60 * 1000;

    if (
      !isAuth ||
      !loginTime ||
      Date.now() -
        loginTime >
        eightHours
    ) {
      sessionStorage.removeItem(
        "tv_auth"
      );

      sessionStorage.removeItem(
        "tv_login_time"
      );

      navigate(
        "/tv-login"
      );

      return;
    }

    departedSeenAtRef.current =
      {};

    setLeavingRouteIds(
      []
    );

    // =============================================
    // FLIGHT BOARD
    // =============================================

    if (
      boardMode ===
      "FLIGHT"
    ) {
      loadFlights();

      socket.on(
        "flights_updated",
        loadFlights
      );

      const refreshTimer =
        setInterval(
          loadFlights,
          1000
        );

      const clockTimer =
        setInterval(
          () =>
            setNow(
              new Date()
            ),
          1000
        );

      return () => {
        socket.off(
          "flights_updated",
          loadFlights
        );

        clearInterval(
          refreshTimer
        );

        clearInterval(
          clockTimer
        );
      };
    }

    // =============================================
    // DEPARTURE / ARRIVAL
    // =============================================

    loadRoutes();

    socket.on(
      "routes_updated",
      loadRoutes
    );

    const refreshTimer =
      setInterval(
        loadRoutes,
        1000
      );

    const clockTimer =
      setInterval(
        () =>
          setNow(
            new Date()
          ),
        1000
      );

    return () => {
      socket.off(
        "routes_updated",
        loadRoutes
      );

      clearInterval(
        refreshTimer
      );

      clearInterval(
        clockTimer
      );
    };
  }, [
    navigate,
    boardMode,
  ]);

  useEffect(() => {
    localStorage.setItem(
      "ctv_board_mode",
      boardMode
    );
  }, [boardMode]);

  // =====================================================
  // STATUS COUNTS
  // =====================================================

  const statusCounts =
    useMemo(() => {
      const counts = {};

      const items =
        boardMode ===
        "FLIGHT"
          ? flights
          : routes;

      items.forEach(
        (item) => {
          const status =
            String(
              item.status ||
                ""
            ).toUpperCase();

          counts[status] =
            (counts[
              status
            ] || 0) + 1;
        }
      );

      return counts;
    }, [
      routes,
      flights,
      boardMode,
    ]);

  const getBoardTimeHeader =
    () => {
      if (
        boardMode ===
        "ARRIVAL"
      ) {
        return "◷ ARRIVE";
      }

      if (
        boardMode ===
        "FLIGHT"
      ) {
        return "◷ FLIGHT TIME";
      }

      return "◷ DEPART";
    };

  const getEmptyMessage =
    () => {
      if (
        boardMode ===
        "ARRIVAL"
      ) {
        return "No active arrival routes loaded";
      }

      if (
        boardMode ===
        "FLIGHT"
      ) {
        return "No active flight information loaded";
      }

      return "No active departure routes loaded";
    };

  const summaryStatuses =
    boardMode ===
    "FLIGHT"
      ? [
          "SCHEDULED",
          "ENROUTE",
          "DELAYED",
          "LANDED",
          "ON THE GROUND",
          "ARRIVED",
          "LOADING",
          "DEPARTED",
          "CANCELLED",
        ]
      : [
          "NOT STARTED",
          "ON TIME",
          "LOADING",
          "DELAYED",
          "ENROUTE",
          "ARRIVED",
          "CANCELLED",
          "DEPARTED",
        ];

  return (
    <div style={pageStyle}>
      <style>{`
        @keyframes rowFadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes delayedGlow {
          0%, 100% {
            box-shadow:
              inset 0 0 0 rgba(249,115,22,0),
              0 0 0 rgba(249,115,22,0);

            filter: brightness(1);
          }

          50% {
            box-shadow:
              inset 0 0 60px rgba(249,115,22,.22),
              0 0 30px rgba(249,115,22,.25);

            filter: brightness(1.08);
          }
        }

        @keyframes cancelledGlow {
          0%, 100% {
            box-shadow:
              inset 0 0 0 rgba(220,38,38,0),
              0 0 0 rgba(220,38,38,0);
          }

          50% {
            box-shadow:
              inset 0 0 26px rgba(220,38,38,.20),
              0 0 22px rgba(220,38,38,.20);
          }
        }

        @keyframes twoMinuteGlow {
          0%, 100% {
            box-shadow:
              inset 0 0 0 rgba(56,189,248,0),
              0 0 0 rgba(56,189,248,0);
          }

          50% {
            box-shadow:
              inset 0 0 28px rgba(56,189,248,.20),
              0 0 24px rgba(56,189,248,.22);
          }
        }

        @keyframes statusPulse {
          0%, 100% {
            transform: scale(1);
          }

          50% {
            transform: scale(1.04);
          }
        }

        .ctv-scroll-area::-webkit-scrollbar {
          width: 0;
          display: none;
        }

        .ctv-scroll-area {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .ctv-admin-back:hover {
          background: #ffffff !important;
          color: #0f172a !important;
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(255,255,255,.16);
        }

        .ctv-admin-back:active {
          transform: translateY(0);
        }

        @media (max-width: 1200px) {
          .ctv-top-actions {
            gap: 8px !important;
          }

          .ctv-admin-back {
            padding: 10px 12px !important;
            font-size: 12px !important;
          }
        }
      `}</style>

      {/* =================================================
          TOP HEADER
      ================================================= */}

      <div
        style={
          topHeaderStyle
        }
      >
        <div
          style={
            brandWrapStyle
          }
        >
          <div
            style={
              planeIconStyle
            }
          >
            <img
              src="/favicon.ico"
              alt="CTV"
              style={{
                width: 44,
                height: 44,
                objectFit:
                  "contain",
              }}
            />
          </div>

          <div>
            <h1
              style={
                titleStyle
              }
            >
              CTV ROUTE BOARD
            </h1>

            <div
              style={
                subtitleStyle
              }
            >
              Live Route Status —
              All Times Local
            </div>
          </div>
        </div>

        <div
          style={
            clockWrapStyle
          }
          className="ctv-top-actions"
        >
          <button
            type="button"
            className="ctv-admin-back"
            onClick={
              goBackToAdmin
            }
            style={
              backToAdminStyle
            }
            title="Return to Admin Panel"
          >
            ← Back to Admin
          </button>

          <select
            value={
              boardMode
            }
            onChange={(e) =>
              setBoardMode(
                e.target.value
              )
            }
            style={
              boardSelectStyle
            }
          >
            <option value="DEPARTURE">
              DEPARTURE
            </option>

            <option value="ARRIVAL">
              ARRIVAL
            </option>

            <option value="FLIGHT">
              FLIGHT
            </option>
          </select>

          <button
            onClick={() => {
              if (
                !document.fullscreenElement
              ) {
                document.documentElement.requestFullscreen();
              } else {
                document.exitFullscreen();
              }
            }}
            style={
              fullScreenButtonStyle
            }
            title="Full Screen"
          >
            ⛶
          </button>

          <div
            style={
              clockIconStyle
            }
          >
            ◷
          </div>

          <div>
            <div
              style={
                clockStyle
              }
            >
              {now.toLocaleTimeString(
                [],
                {
                  hour:
                    "2-digit",
                  minute:
                    "2-digit",
                  second:
                    "2-digit",
                }
              )}
            </div>

            <div
              style={
                dateStyle
              }
            >
              {now.toLocaleDateString(
                [],
                {
                  weekday:
                    "long",
                  month:
                    "long",
                  day:
                    "numeric",
                  year:
                    "numeric",
                }
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =================================================
          STATUS SUMMARY
      ================================================= */}

        <div
          style={{
            ...statusSummaryStyle,
            gridTemplateColumns:
              boardMode === "FLIGHT"
                ? "repeat(9, 1fr)"
                : "repeat(8, 1fr)",
          }}
        >
        {summaryStatuses.map(
          (status) => (
            <div
              key={
                status
              }
              style={
                summaryItemStyle
              }
            >
              <div
                style={{
                  ...summaryIconStyle,

                  background:
                    boardMode ===
                    "FLIGHT"
                      ? flightStatusColor(
                          status
                        )
                      : statusColor(
                          status
                        ),
                }}
              >
                {statusIcon(
                  status
                )}
              </div>

              <div>
                <div
                  style={
                    summaryLabelStyle
                  }
                >
                  {status}
                </div>

                <div
                  style={
                    summaryCountStyle
                  }
                >
                  {statusCounts[
                    status
                  ] || 0}
                </div>
              </div>
            </div>
          )
        )}
      </div>

      {/* =================================================
          LIVE BOARD TABLE
      ================================================= */}

      {boardMode ===
      "FLIGHT" ? (
        <div
          ref={
            tableRef
          }
          className="ctv-scroll-area"
          style={
            tableStyle
          }
        >
          <div
            style={{
              ...tableHeaderStyle,

              gridTemplateColumns:
                "1.15fr 1fr 1fr 1fr 1fr .9fr 1.35fr 1fr 2fr",
            }}
          >
            <div>
              ✈ FLIGHT
            </div>

            <div>
              FROM
            </div>

            <div>
              TO
            </div>

            <div>
              ◷ ARRIVE
            </div>

            <div>
              ◷ DEPART
            </div>

            <div>
              ⌖ POSITION
            </div>

            <div>
              ◉ STATUS
            </div>

            <div>
              ◷ DELAY
            </div>

            <div>
              ▤ NOTES / COMMENT
            </div>
          </div>

          {flights.length ===
          0 ? (
            <div
              style={
                emptyStyle
              }
            >
              No active flight
              information loaded
            </div>
          ) : (
            flights.map(
              (
                flight,
                index
              ) => (
                <motion.div
                  layout
                  transition={
                    spring
                  }
                  key={
                    flight.id
                  }
                  style={{
                    ...rowStyle,

                    gridTemplateColumns:
                      "1.15fr 1fr 1fr 1fr 1fr .9fr 1.35fr 1fr 2fr",

                    animation:
                      flight.status ===
                      "DELAYED"
                        ? "rowFadeIn .35s ease both, delayedGlow 3s ease-in-out infinite"
                        : flight.status ===
                          "CANCELLED"
                        ? "rowFadeIn .35s ease both, cancelledGlow 2.4s ease-in-out infinite"
                        : "rowFadeIn .35s ease both",

                    animationDelay: `${
                      index *
                      0.04
                    }s`,

                    borderColor:
                      flightStatusColor(
                        flight.status
                      ),

                    background:
                      flightRowBackground(
                        flight.status
                      ),
                  }}
                >
                  <div
                    style={{
                      ...routeCellStyle,
                      color:
                        "#c4b5fd",
                    }}
                  >
                    {flight.flight_number ||
                      "--"}
                  </div>

                  <div
                    style={
                      destinationCellStyle
                    }
                  >
                    {flight.origin ||
                      "--"}
                  </div>

                  <div
                    style={
                      destinationCellStyle
                    }
                  >
                    {flight.destination ||
                      "--"}
                  </div>

                  <div
                    style={
                      flightBoardTimeStyle
                    }
                  >
                    {flight.scheduled_arrival_time ||
                      "--:--"}

                    {flight.actual_arrival_time && (
                      <span
                        style={
                          actualTimeBoardStyle
                        }
                      >
                        ACT{" "}
                        {
                          flight.actual_arrival_time
                        }
                      </span>
                    )}
                  </div>

                  <div
                    style={
                      flightBoardTimeStyle
                    }
                  >
                    {flight.scheduled_departure_time ||
                      "--:--"}

                    {flight.actual_departure_time && (
                      <span
                        style={
                          actualDepartureBoardStyle
                        }
                      >
                        ACT{" "}
                        {
                          flight.actual_departure_time
                        }
                      </span>
                    )}
                  </div>

                  <div>
                    <span
                      style={
                        flightPositionStyle
                      }
                    >
                      {flight.position ||
                        "--"}
                    </span>
                  </div>

                  <div>
                    <span
                      style={{
                        ...statusBadgeStyle,

                        background:
                          flightStatusColor(
                            flight.status
                          ),

                        animation:
                          flight.status ===
                            "DELAYED" ||
                          flight.status ===
                            "CANCELLED"
                            ? "statusPulse 1.5s ease-in-out infinite"
                            : "none",
                      }}
                    >
                      {
                        flight.status
                      }
                    </span>
                  </div>

                  <div
                    style={
                      delayCellStyle
                    }
                  >
                    {Number(
                      flight.delay_minutes
                    ) > 0
                      ? `+${flight.delay_minutes} min`
                      : "--"}
                  </div>

                  <div
                    style={
                      noteCellStyle
                    }
                  >
                    {flight.notes ||
                      "--"}
                  </div>
                </motion.div>
              )
            )
          )}
        </div>
      ) : (
        <div
          ref={
            tableRef
          }
          className="ctv-scroll-area"
          style={
            tableStyle
          }
        >
          <div
            style={
              tableHeaderStyle
            }
          >
            <div>
              {
                getBoardTimeHeader()
              }
            </div>

            <div>
              ✈ ROUTE
            </div>

            <div>
              ⌖ DESTINATION
            </div>

            <div>
              🚪 DOOR
            </div>

            <div>
              ◉ STATUS
            </div>

            <div>
              ◷ DELAY
            </div>

            <div>
              ▤ NOTES / COMMENT
            </div>
          </div>

          {routes.length ===
          0 ? (
            <div
              style={
                emptyStyle
              }
            >
              {
                getEmptyMessage()
              }
            </div>
          ) : (
            routes.map(
              (
                route,
                index
              ) => {
                const isTwoMinuteWarning =
                  isWithinTwoMinuteWarning(
                    route,
                    now
                  );

                return (
                  <motion.div
                    layout
                    transition={
                      spring
                    }
                    key={
                      route.id
                    }
                    className={
                      leavingRouteIds.includes(
                        route.id
                      )
                        ? "animate__animated animate__backOutDown"
                        : ""
                    }
                    style={{
                      ...rowStyle,

                      animation:
                        leavingRouteIds.includes(
                          route.id
                        )
                          ? undefined
                          : getAutoDelayMinutes(
                              route,
                              now
                            ) > 0
                          ? "rowFadeIn .35s ease both, delayedGlow 3s ease-in-out infinite"
                          : route.status ===
                            "CANCELLED"
                          ? "rowFadeIn .35s ease both, cancelledGlow 2.4s ease-in-out infinite"
                          : isTwoMinuteWarning
                          ? "rowFadeIn .35s ease both, twoMinuteGlow 1.8s ease-in-out infinite"
                          : "rowFadeIn .35s ease both",

                      animationDelay: `${
                        index *
                        0.04
                      }s`,

                      borderColor:
                        statusColor(
                          route.status
                        ),

                      background:
                        rowBackground(
                          route.status
                        ),
                    }}
                  >
                    <div
                      style={
                        departCellStyle
                      }
                    >
                      {
                        route.scheduled_departure_time
                      }

                      <span
                        style={timeLabelStyle(
                          getTimeLabel(
                            route
                          )
                        )}
                      >
                        {getTimeLabel(
                          route
                        )}
                      </span>
                    </div>

                    <div
                      style={
                        routeCellStyle
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
                    </div>

                    <div
                      style={
                        destinationCellStyle
                      }
                    >
                      {
                        route.destination
                      }
                    </div>

                    <div>
                      <span
                        style={
                          doorBadgeStyle
                        }
                      >
                        {route.door_number ||
                          "--"}
                      </span>
                    </div>

                    <div>
                      <span
                        style={{
                          ...statusBadgeStyle,

                          background:
                            statusColor(
                              route.status
                            ),

                          animation:
                            route.status ===
                              "DELAYED" ||
                            route.status ===
                              "CANCELLED"
                              ? "statusPulse 1.5s ease-in-out infinite"
                              : "none",
                        }}
                      >
                        {
                          route.status
                        }
                      </span>
                    </div>

                    <div
                      style={
                        delayCellStyle
                      }
                    >
                      {(() => {
                        const delay =
                          getAutoDelayMinutes(
                            route,
                            now
                          );

                        return delay ===
                          null
                          ? "--"
                          : `${delay} min`;
                      })()}
                    </div>

                    <div
                      style={
                        noteCellStyle
                      }
                    >
                      {getDisplayNotes(
                        route,
                        now
                      )}
                    </div>
                  </motion.div>
                );
              }
            )
          )}
        </div>
      )}

      {/* =================================================
          FOOTER
      ================================================= */}

      <div
        style={
          footerStyle
        }
      >
        <div>
          <strong>
            Information
          </strong>

          <div>
            All times are local.
            Please check with ground
            staff for latest updates.
          </div>
        </div>

        <div
          style={
            footerBrandStyle
          }
        >
          <div>
            <strong>
              Last Updated
            </strong>

            <div>
              {lastUpdated
                ? lastUpdated.toLocaleTimeString(
                    [],
                    {
                      hour:
                        "2-digit",
                      minute:
                        "2-digit",
                      second:
                        "2-digit",
                    }
                  )
                : "--"}
            </div>
          </div>

          <div
            style={
              planeSmallStyle
            }
          >
            <img
              src="/favicon.ico"
              alt="CTV"
              style={{
                width: 34,
                height: 34,
                objectFit:
                  "contain",
              }}
            />
          </div>

          <div>
            <strong>
              CTV AIRPORT
            </strong>

            <div>
              Safe. Reliable. On Time.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// ROUTE TYPE
// =====================================================

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
  const type =
    getRouteType(
      route
    );

  if (
    type ===
    "INBOUND"
  ) {
    return "ARRIVE";
  }

  if (
    type ===
    "FLIGHT"
  ) {
    return "FLIGHT";
  }

  return "DEPART";
};

// =====================================================
// FINAL STATUS
// =====================================================

const getFinalStatus = (
  route
) => {
  const routeType =
    getRouteType(
      route
    );

  if (
    routeType ===
    "INBOUND"
  ) {
    return "ARRIVED";
  }

  if (
    routeType ===
    "OUTBOUND"
  ) {
    return "DEPARTED";
  }

  return null;
};

// =====================================================
// SCHEDULED TIME
// =====================================================

const getScheduledDate = (
  route,
  now
) => {
  const scheduled =
    route.scheduled_departure_time;

  if (!scheduled) {
    return null;
  }

  const [hh, mm] =
    scheduled
      .split(":")
      .map(Number);

  if (
    Number.isNaN(hh) ||
    Number.isNaN(mm)
  ) {
    return null;
  }

  const scheduledDate =
    new Date(now);

  scheduledDate.setHours(
    hh,
    mm,
    0,
    0
  );

  return scheduledDate;
};

// =====================================================
// ACTUAL TIME
// =====================================================

const getActualDate = (
  route,
  now
) => {
  const routeType =
    getRouteType(
      route
    );

  let actualTime =
    null;

  if (
    routeType ===
    "OUTBOUND"
  ) {
    actualTime =
      route.actual_departure_time;
  }

  if (
    routeType ===
    "INBOUND"
  ) {
    actualTime =
      route.actual_arrival_time;
  }

  if (
    actualTime &&
    String(
      actualTime
    ).includes(":")
  ) {
    const [hh, mm] =
      String(
        actualTime
      )
        .split(":")
        .map(Number);

    if (
      !Number.isNaN(
        hh
      ) &&
      !Number.isNaN(
        mm
      )
    ) {
      const actualDate =
        new Date(now);

      actualDate.setHours(
        hh,
        mm,
        0,
        0
      );

      return actualDate;
    }
  }

  const updatedTime =
    route.updated_at ||
    route.created_at;

  if (
    updatedTime
  ) {
    const updatedDate =
      new Date(
        updatedTime
      );

    if (
      !Number.isNaN(
        updatedDate.getTime()
      )
    ) {
      return updatedDate;
    }
  }

  return null;
};

// =====================================================
// DELAY
// =====================================================

const getAutoDelayMinutes = (
  route,
  now
) => {
  const status =
    String(
      route.status ||
        ""
    ).toUpperCase();

  const finalStatus =
    getFinalStatus(
      route
    );

  const scheduledDate =
    getScheduledDate(
      route,
      now
    );

  if (
    !scheduledDate
  ) {
    return (
      Number(
        route.delay_minutes
      ) || 0
    );
  }

  if (
    finalStatus &&
    status ===
      finalStatus
  ) {
    const actualDate =
      getActualDate(
        route,
        now
      );

    if (
      actualDate
    ) {
      return Math.max(
        0,
        Math.floor(
          (actualDate -
            scheduledDate) /
            60000
        )
      );
    }

    return (
      Number(
        route.delay_minutes
      ) || 0
    );
  }

  const diffMinutes =
    Math.floor(
      (now -
        scheduledDate) /
        60000
    );

  if (
    diffMinutes <
    0
  ) {
    return null;
  }

  return Math.max(
    0,
    diffMinutes
  );
};

// =====================================================
// NOTES
// =====================================================

const getDisplayNotes = (
  route,
  now
) => {
  const status =
    String(
      route.status ||
        ""
    ).toUpperCase();

  const finalStatus =
    getFinalStatus(
      route
    );

  if (
    finalStatus &&
    status ===
      finalStatus
  ) {
    return (
      route.notes ||
      "--"
    );
  }

  const scheduledDate =
    getScheduledDate(
      route,
      now
    );

  const adminDelay =
    Number(
      route.delay_minutes
    ) || 0;

  if (
    !scheduledDate
  ) {
    return (
      route.notes ||
      "--"
    );
  }

  const diffMinutes =
    Math.floor(
      (now -
        scheduledDate) /
        60000
    );

  if (
    diffMinutes <
      0 &&
    adminDelay >
      0
  ) {
    return `Expected Delay: ${adminDelay} min`;
  }

  return (
    route.notes ||
    "--"
  );
};

// =====================================================
// 2-MINUTE WARNING
// =====================================================

const isWithinTwoMinuteWarning =
  (
    route,
    now
  ) => {
    const status =
      String(
        route.status ||
          ""
      ).toUpperCase();

    const finalStatus =
      getFinalStatus(
        route
      );

    if (
      status ===
      "CANCELLED"
    ) {
      return false;
    }

    if (
      finalStatus &&
      status ===
        finalStatus
    ) {
      return false;
    }

    const scheduledDate =
      getScheduledDate(
        route,
        now
      );

    if (
      !scheduledDate
    ) {
      return false;
    }

    const diff =
      scheduledDate -
      now;

    return (
      diff > 0 &&
      diff <=
        2 *
          60 *
          1000
    );
  };

// =====================================================
// ROUTE UI HELPERS
// =====================================================

const rowBackground = (
  status
) => {
  if (
    status ===
    "DELAYED"
  ) {
    return "linear-gradient(90deg, rgba(249,115,22,.28), rgba(15,23,42,.82))";
  }

  if (
    status ===
    "CANCELLED"
  ) {
    return "linear-gradient(90deg, rgba(220,38,38,.26), rgba(15,23,42,.82))";
  }

  if (
    status ===
    "ARRIVED"
  ) {
    return "linear-gradient(90deg, rgba(15,118,110,.22), rgba(15,23,42,.82))";
  }

  if (
    status ===
    "ENROUTE"
  ) {
    return "linear-gradient(90deg, rgba(124,58,237,.22), rgba(15,23,42,.82))";
  }

  if (
    status ===
    "LOADING"
  ) {
    return "linear-gradient(90deg, rgba(11,126,215,.22), rgba(15,23,42,.82))";
  }

  return "linear-gradient(90deg, rgba(15,23,42,.95), rgba(15,23,42,.82))";
};

const statusColor = (
  status
) =>
  ({
    "NOT STARTED":
      "#64748b",

    "ON TIME":
      "#16a34a",

    LOADING:
      "#0b7ed7",

    DELAYED:
      "#f97316",

    ENROUTE:
      "#7c3aed",

    ARRIVED:
      "#0f766e",

    CANCELLED:
      "#dc2626",

    DEPARTED:
      "#334155",
  }[status] ||
  "#94a3b8");

// =====================================================
// FLIGHT STATUS COLORS
// =====================================================

const flightStatusColor = (
  status
) =>
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
      "#0284c7",

    ARRIVED:
      "#16a34a",

    LOADING:
      "#0b7ed7",

    DEPARTED:
      "#0f766e",

    CANCELLED:
      "#dc2626",
  }[
    String(
      status ||
        ""
    ).toUpperCase()
  ] ||
  "#94a3b8");

const flightRowBackground = (
  status
) => {
  const s =
    String(
      status ||
        ""
    ).toUpperCase();

  if (
    s ===
    "DELAYED"
  ) {
    return "linear-gradient(90deg, rgba(249,115,22,.28), rgba(15,23,42,.82))";
  }

  if (
    s ===
    "CANCELLED"
  ) {
    return "linear-gradient(90deg, rgba(220,38,38,.26), rgba(15,23,42,.82))";
  }

  if (
    s ===
    "ARRIVED"
  ) {
    return "linear-gradient(90deg, rgba(22,163,74,.22), rgba(15,23,42,.82))";
  }

  if (
    s ===
    "ON THE GROUND"
  ) {
    return "linear-gradient(90deg, rgba(2,132,199,.24), rgba(15,23,42,.82))";
  }

  if (
    s ===
    "LANDED"
  ) {
    return "linear-gradient(90deg, rgba(37,99,235,.22), rgba(15,23,42,.82))";
  }

  if (
    s ===
    "ENROUTE"
  ) {
    return "linear-gradient(90deg, rgba(124,58,237,.22), rgba(15,23,42,.82))";
  }

  if (
    s ===
    "LOADING"
  ) {
    return "linear-gradient(90deg, rgba(11,126,215,.22), rgba(15,23,42,.82))";
  }

  return "linear-gradient(90deg, rgba(15,23,42,.95), rgba(15,23,42,.82))";
};

const statusIcon = (
  status
) =>
  ({
    "NOT STARTED":
      "⌛",

    "ON TIME":
      "✓",

    SCHEDULED:
      "◷",

    LOADING:
      "🚚",

    DELAYED:
      "◷",

    ENROUTE:
      "✈",

    LANDED:
      "↓",

    "ON THE GROUND":
      "●",

    ARRIVED:
      "✓",

    CANCELLED:
      "×",

    DEPARTED:
      "→",
  }[status] ||
  "•");

// =====================================================
// STYLES
// =====================================================

const pageStyle = {
  minHeight:
    "100vh",

  height:
    "100vh",

  overflow:
    "hidden",

  boxSizing:
    "border-box",

  background:
    "radial-gradient(circle at top left, #0f2a4a, #020617 45%, #000814)",

  color:
    "white",

  padding: 20,

  fontFamily:
    "Inter, Arial, sans-serif",

  cursor:
    "none",
};

const topHeaderStyle = {
  display:
    "flex",

  justifyContent:
    "space-between",

  alignItems:
    "center",

  borderBottom:
    "2px solid #0ea5e9",

  paddingBottom:
    15,
};

const brandWrapStyle = {
  display:
    "flex",

  alignItems:
    "center",

  gap: 18,
};

const planeIconStyle = {
  width: 68,
  height: 68,

  borderRadius:
    16,

  background:
    "linear-gradient(135deg, #1e293b, #b45309, #fb923c)",

  border:
    "2px solid rgba(255,255,255,.22)",

  boxShadow:
    "0 10px 26px rgba(251,146,60,.22)",

  display:
    "grid",

  placeItems:
    "center",

  fontSize: 40,
};

const titleStyle = {
  margin: 0,

  fontSize: 42,

  fontWeight:
    950,

  letterSpacing: 1,
};

const subtitleStyle = {
  color:
    "#7dd3fc",

  fontSize: 20,

  marginTop: 4,
};

const clockWrapStyle = {
  display:
    "flex",

  alignItems:
    "center",

  gap: 12,

  flexWrap:
    "nowrap",
};

const backToAdminStyle = {
  minHeight: 42,

  padding:
    "10px 16px",

  borderRadius: 8,

  border:
    "1px solid rgba(255,255,255,.30)",

  background:
    "rgba(255,255,255,.10)",

  color:
    "#ffffff",

  fontSize: 13,

  fontWeight:
    900,

  cursor:
    "pointer",

  whiteSpace:
    "nowrap",

  transition:
    "all .18s ease",

  backdropFilter:
    "blur(8px)",
};

const boardSelectStyle = {
  padding:
    "11px 38px 11px 16px",

  borderRadius: 8,

  border:
    "1px solid #38bdf8",

  background:
    "#0f3b70",

  color:
    "#ffffff",

  fontSize: 15,

  fontWeight:
    900,

  outline:
    "none",

  cursor:
    "pointer",

  letterSpacing:
    ".5px",
};

const fullScreenButtonStyle = {
  width: 42,
  height: 42,

  display:
    "grid",

  placeItems:
    "center",

  background:
    "#2563eb",

  color:
    "white",

  border:
    "none",

  borderRadius:
    8,

  fontWeight:
    900,

  fontSize: 20,

  cursor:
    "pointer",
};

const clockIconStyle = {
  width: 60,
  height: 60,

  borderRadius:
    "50%",

  border:
    "5px solid #bfdbfe",

  display:
    "grid",

  placeItems:
    "center",

  fontSize: 32,

  color:
    "#bfdbfe",
};

const clockStyle = {
  fontSize: 42,

  fontWeight:
    950,
};

const dateStyle = {
  color:
    "#7dd3fc",

  fontSize: 17,

  textAlign:
    "right",
};

const statusSummaryStyle = {
  display:
    "grid",

  gridTemplateColumns:
    "repeat(8, 1fr)",

  gap: 12,

  padding:
    "18px 0",
};

const summaryItemStyle = {
  display:
    "flex",

  alignItems:
    "center",

  gap: 11,

  borderRight:
    "1px solid rgba(148,163,184,.25)",

  paddingRight:
    10,
};

const summaryIconStyle = {
  width: 48,
  height: 48,

  borderRadius:
    "50%",

  display:
    "grid",

  placeItems:
    "center",

  fontSize: 25,

  fontWeight:
    900,
};

const summaryLabelStyle = {
  fontSize: 13,

  fontWeight:
    900,

  color:
    "#cbd5e1",
};

const summaryCountStyle = {
  fontSize: 24,

  fontWeight:
    950,
};

const tableStyle = {
  border:
    "1px solid #0369a1",

  borderRadius:
    14,

  overflow:
    "hidden auto",

  scrollBehavior:
    "smooth",

  maxHeight:
    "calc(100vh - 255px)",
};

const tableHeaderStyle = {
  display:
    "grid",

  gridTemplateColumns:
    "1.1fr 1.25fr 1.65fr .85fr 1.25fr 1fr 2.2fr",

  background:
    "linear-gradient(90deg,#0f3b70,#082f5f)",

  color:
    "#dbeafe",

  fontWeight:
    900,

  fontSize: 16,

  padding:
    "15px 20px",

  justifyItems:
    "start",
};

const rowStyle = {
  display:
    "grid",

  gridTemplateColumns:
    "1.1fr 1.25fr 1.65fr .85fr 1.25fr 1fr 2.2fr",

  alignItems:
    "center",

  minHeight: 70,

  padding:
    "0 20px",

  borderLeft:
    "7px solid",

  borderBottom:
    "1px solid rgba(148,163,184,.18)",

  transition:
    "all .35s ease",
};

const emptyStyle = {
  padding: 50,

  textAlign:
    "center",

  fontSize: 28,

  color:
    "#93c5fd",

  fontWeight:
    900,
};

const timeLabelStyle = (
  label
) => ({
  display:
    "inline-block",

  alignSelf:
    "flex-start",

  fontSize: 15,

  fontWeight:
    950,

  color:
    "#dbeafe",

  letterSpacing:
    1.2,

  padding:
    "4px 12px",

  borderRadius:
    999,

  lineHeight:
    1.1,

  background:
    label ===
    "ARRIVE"
      ? "rgba(16,185,129,.20)"
      : "rgba(14,165,233,.18)",

  border:
    label ===
    "ARRIVE"
      ? "1px solid rgba(52,211,153,.40)"
      : "1px solid rgba(125,211,252,.38)",

  boxShadow:
    label ===
    "ARRIVE"
      ? "0 0 12px rgba(16,185,129,.18)"
      : "0 0 12px rgba(14,165,233,.14)",
});

const departCellStyle = {
  fontSize: 29,

  fontWeight:
    950,

  color:
    "#ffffff",

  display:
    "flex",

  flexDirection:
    "column",

  justifyContent:
    "center",

  gap: 9,

  padding:
    "8px 0",
};

const routeCellStyle = {
  fontSize: 24,

  fontWeight:
    950,
};

const arrowStyle = {
  color:
    "#93c5fd",

  margin:
    "0 13px",
};

const destinationCellStyle = {
  fontSize: 23,

  fontWeight:
    950,
};

const doorBadgeStyle = {
  display:
    "inline-block",

  minWidth: 44,

  textAlign:
    "center",

  padding:
    "8px 14px",

  borderRadius: 8,

  fontWeight:
    950,

  fontSize: 16,

  background:
    "#6d28d9",

  color:
    "white",

  border:
    "1px solid rgba(255,255,255,.18)",

  boxShadow:
    "inset 0 0 0 1px rgba(255,255,255,.10)",
};

const statusBadgeStyle = {
  display:
    "inline-block",

  padding:
    "9px 24px",

  borderRadius: 8,

  fontWeight:
    950,

  fontSize: 16,

  boxShadow:
    "inset 0 0 0 1px rgba(255,255,255,.25)",
};

const delayCellStyle = {
  fontSize: 21,

  fontWeight:
    900,

  color:
    "#fb923c",
};

const noteCellStyle = {
  fontSize: 18,

  fontWeight:
    700,
};

// =====================================================
// FLIGHT BOARD STYLES
// =====================================================

const flightBoardTimeStyle = {
  display:
    "flex",

  flexDirection:
    "column",

  gap: 4,

  fontSize: 22,

  fontWeight:
    950,

  color:
    "#ffffff",
};

const actualTimeBoardStyle = {
  display:
    "inline-block",

  width:
    "fit-content",

  padding:
    "3px 7px",

  borderRadius: 5,

  background:
    "rgba(22,163,74,.20)",

  border:
    "1px solid rgba(74,222,128,.35)",

  color:
    "#86efac",

  fontSize: 11,

  fontWeight:
    900,
};

const actualDepartureBoardStyle = {
  ...actualTimeBoardStyle,

  background:
    "rgba(15,118,110,.20)",

  border:
    "1px solid rgba(45,212,191,.35)",

  color:
    "#5eead4",
};

const flightPositionStyle = {
  display:
    "inline-block",

  padding:
    "8px 11px",

  borderRadius: 7,

  background:
    "#6d28d9",

  border:
    "1px solid rgba(255,255,255,.18)",

  color:
    "#ffffff",

  fontSize: 15,

  fontWeight:
    950,
};

const footerStyle = {
  marginTop: 16,

  border:
    "1px solid #0369a1",

  borderRadius: 14,

  padding: 16,

  display:
    "flex",

  justifyContent:
    "space-between",

  alignItems:
    "center",

  background:
    "rgba(2,6,23,.55)",

  color:
    "#bfdbfe",

  fontSize: 16,
};

const footerBrandStyle = {
  display:
    "flex",

  alignItems:
    "center",

  gap: 16,
};

const planeSmallStyle = {
  width: 54,
  height: 54,

  borderRadius: 14,

  background:
    "linear-gradient(135deg, #1e293b, #b45309, #fb923c)",

  border:
    "1px solid rgba(255,255,255,.18)",

  boxShadow:
    "0 8px 20px rgba(251,146,60,.20)",

  display:
    "grid",

  placeItems:
    "center",

  fontSize: 33,
};

export default CTVBoardPage;