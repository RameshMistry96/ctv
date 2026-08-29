const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const db = require("./database");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

app.use(cors());
app.use(express.json());

/* =====================================================
   TORONTO DATE / TIME HELPERS
===================================================== */

function getLocalTodayDate() {
  const now = new Date();

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function getLocalCurrentTime() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

/* =====================================================
   ROUTE DELAY HELPERS
===================================================== */

function getDelayMinutes(routeDate, scheduledTime) {
  if (!routeDate || !scheduledTime) {
    return 0;
  }

  const cleanTime = String(
    scheduledTime || ""
  ).trim();

  const [scheduledHour, scheduledMinute] =
    cleanTime.split(":").map(Number);

  if (
    Number.isNaN(scheduledHour) ||
    Number.isNaN(scheduledMinute)
  ) {
    return 0;
  }

  const torontoNow = new Date(
    new Date().toLocaleString("en-US", {
      timeZone: "America/Toronto",
    })
  );

  const nowMinutes =
    torontoNow.getHours() * 60 +
    torontoNow.getMinutes();

  const scheduledMinutes =
    scheduledHour * 60 +
    scheduledMinute;

  const diff =
    nowMinutes - scheduledMinutes;

  return diff > 0 ? diff : 0;
}

function autoUpdateDelays(callback) {
  const todayDate =
    getLocalTodayDate();

  db.all(
    `
    SELECT *
    FROM ctv_daily_routes
    WHERE route_date = ?
    AND status IN ('ON TIME', 'NOT STARTED')
    `,
    [todayDate],
    (err, rows) => {
      if (err) {
        return callback(err);
      }

      const delayedRows =
        rows.filter((route) => {
          return (
            getDelayMinutes(
              route.route_date,
              route.scheduled_departure_time
            ) > 0
          );
        });

      if (
        delayedRows.length === 0
      ) {
        return callback(null);
      }

      let completed = 0;

      delayedRows.forEach(
        (route) => {
          const delayMinutes =
            getDelayMinutes(
              route.route_date,
              route.scheduled_departure_time
            );

          db.run(
            `
            UPDATE ctv_daily_routes
            SET
              status = 'DELAYED',
              delay_minutes = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            `,
            [
              delayMinutes,
              route.id,
            ],
            (err) => {
              if (err) {
                return callback(
                  err
                );
              }

              completed++;

              if (
                completed ===
                delayedRows.length
              ) {
                io.emit(
                  "routes_updated"
                );

                callback(null);
              }
            }
          );
        }
      );
    }
  );
}

/* =====================================================
   ROOT
===================================================== */

app.get("/", (req, res) => {
  res.send(
    "CTV Backend is running"
  );
});

/* =====================================================
   ROUTES - GET TODAY
===================================================== */

app.get(
  "/api/routes",
  (req, res) => {
    const todayDate =
      getLocalTodayDate();

    const isTvView =
      req.query.view === "tv";

    autoUpdateDelays(() => {
      db.all(
        `
        SELECT *
        FROM ctv_daily_routes
        WHERE route_date = ?
        ${
          isTvView
            ? `
            AND (
              status != 'DEPARTED'
              OR datetime(updated_at) >= datetime('now', '-15 seconds')
            )
            `
            : ""
        }
        ORDER BY scheduled_departure_time ASC
        `,
        [todayDate],
        (err, rows) => {
          if (err) {
            return res
              .status(500)
              .json({
                error:
                  err.message,
              });
          }

          res.json(rows);
        }
      );
    });
  }
);

/* =====================================================
   ROUTES - ADD
===================================================== */

app.post(
  "/api/routes",
  (req, res) => {
    const {
      route_number,
      destination,
      scheduled_departure_time,
      route_type,
      status,
      delay_minutes,
      door_number,
      notes,
    } = req.body;

    if (
      !route_number ||
      !destination ||
      !scheduled_departure_time
    ) {
      return res
        .status(400)
        .json({
          error:
            "Route number, destination, and scheduled time are required",
        });
    }

    const today =
      getLocalTodayDate();

    db.run(
      `
      INSERT INTO ctv_daily_routes
      (
        route_date,
        route_number,
        destination,
        scheduled_departure_time,
        route_type,
        status,
        delay_minutes,
        door_number,
        notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        today,
        route_number,
        destination,
        scheduled_departure_time,
        route_type ||
          "OUTBOUND",
        status ||
          "ON TIME",
        delay_minutes || 0,
        door_number || "",
        notes || "",
      ],
      function (err) {
        if (err) {
          return res
            .status(500)
            .json({
              error:
                err.message,
            });
        }

        db.get(
          `
          SELECT *
          FROM ctv_daily_routes
          WHERE id = ?
          `,
          [this.lastID],
          (err, row) => {
            if (err) {
              return res
                .status(500)
                .json({
                  error:
                    err.message,
                });
            }

            io.emit(
              "routes_updated"
            );

            res
              .status(201)
              .json(row);
          }
        );
      }
    );
  }
);

/* =====================================================
   ROUTES - UPDATE
===================================================== */

app.patch(
  "/api/routes/:id",
  (req, res) => {
    const { id } =
      req.params;

    const {
      route_number,
      destination,
      scheduled_departure_time,
      route_type,
      status,
      delay_minutes,
      door_number,
      notes,
    } = req.body;

    db.get(
      `
      SELECT *
      FROM ctv_daily_routes
      WHERE id = ?
      `,
      [id],
      (
        err,
        existingRoute
      ) => {
        if (err) {
          return res
            .status(500)
            .json({
              error:
                err.message,
            });
        }

        if (!existingRoute) {
          return res
            .status(404)
            .json({
              error:
                "Route not found",
            });
        }

        const effectiveRouteType =
          String(
            route_type ||
              existingRoute.route_type ||
              "OUTBOUND"
          ).toUpperCase();

        const requestedStatus =
          status
            ? String(
                status
              ).toUpperCase()
            : null;

        const existingStatus =
          String(
            existingRoute.status ||
              ""
          ).toUpperCase();

        let actual_departure_time =
          null;

        let actual_arrival_time =
          null;

        // OUTBOUND ONLY
        if (
          effectiveRouteType ===
            "OUTBOUND" &&
          requestedStatus ===
            "DEPARTED" &&
          existingStatus !==
            "DEPARTED"
        ) {
          actual_departure_time =
            getLocalCurrentTime();
        }

        // INBOUND ONLY
        if (
          effectiveRouteType ===
            "INBOUND" &&
          requestedStatus ===
            "ARRIVED" &&
          existingStatus !==
            "ARRIVED"
        ) {
          actual_arrival_time =
            getLocalCurrentTime();
        }

        db.run(
          `
          UPDATE ctv_daily_routes
          SET
            route_number =
              COALESCE(?, route_number),

            destination =
              COALESCE(?, destination),

            scheduled_departure_time =
              COALESCE(?, scheduled_departure_time),

            route_type =
              COALESCE(?, route_type),

            status =
              COALESCE(?, status),

            delay_minutes =
              COALESCE(?, delay_minutes),

            door_number =
              COALESCE(?, door_number),

            notes =
              COALESCE(?, notes),

            actual_departure_time =
              COALESCE(?, actual_departure_time),

            actual_arrival_time =
              COALESCE(?, actual_arrival_time),

            updated_at =
              CURRENT_TIMESTAMP

          WHERE id = ?
          `,
          [
            route_number,
            destination,
            scheduled_departure_time,
            route_type,
            status,
            delay_minutes,
            door_number,
            notes,
            actual_departure_time,
            actual_arrival_time,
            id,
          ],
          function (err) {
            if (err) {
              return res
                .status(500)
                .json({
                  error:
                    err.message,
                });
            }

            db.get(
              `
              SELECT *
              FROM ctv_daily_routes
              WHERE id = ?
              `,
              [id],
              (
                err,
                row
              ) => {
                if (err) {
                  return res
                    .status(500)
                    .json({
                      error:
                        err.message,
                    });
                }

                io.emit(
                  "routes_updated"
                );

                res.json(row);
              }
            );
          }
        );
      }
    );
  }
);

/* =====================================================
   ROUTES - DELETE
===================================================== */

app.delete(
  "/api/routes/:id",
  (req, res) => {
    const { id } =
      req.params;

    db.run(
      `
      DELETE FROM ctv_daily_routes
      WHERE id = ?
      `,
      [id],
      function (err) {
        if (err) {
          return res
            .status(500)
            .json({
              error:
                err.message,
            });
        }

        io.emit(
          "routes_updated"
        );

        res.json({
          message:
            "Route deleted",
          id,
        });
      }
    );
  }
);

/* =====================================================
   ROUTE TEMPLATES - GET
===================================================== */

app.get(
  "/api/templates",
  (req, res) => {
    db.all(
      `
      SELECT *
      FROM ctv_route_templates
      ORDER BY
        day_of_week ASC,
        scheduled_departure_time ASC
      `,
      [],
      (err, rows) => {
        if (err) {
          return res
            .status(500)
            .json({
              error:
                err.message,
            });
        }

        res.json(rows);
      }
    );
  }
);

/* =====================================================
   ROUTE TEMPLATES - ADD
===================================================== */

app.post(
  "/api/templates",
  (req, res) => {
    const {
      day_of_week,
      route_number,
      destination,
      scheduled_departure_time,
      route_type,
      default_status,
      door_number,
    } = req.body;

    if (
      !day_of_week ||
      !route_number ||
      !destination ||
      !scheduled_departure_time
    ) {
      return res
        .status(400)
        .json({
          error:
            "Day, route number, destination, and scheduled time are required",
        });
    }

    db.run(
      `
      INSERT INTO ctv_route_templates
      (
        day_of_week,
        route_number,
        destination,
        scheduled_departure_time,
        route_type,
        default_status,
        door_number
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        day_of_week,
        route_number,
        destination,
        scheduled_departure_time,
        route_type ||
          "OUTBOUND",
        default_status ||
          "ON TIME",
        door_number || "",
      ],
      function (err) {
        if (err) {
          return res
            .status(500)
            .json({
              error:
                err.message,
            });
        }

        db.get(
          `
          SELECT *
          FROM ctv_route_templates
          WHERE id = ?
          `,
          [this.lastID],
          (
            err,
            row
          ) => {
            if (err) {
              return res
                .status(500)
                .json({
                  error:
                    err.message,
                });
            }

            res
              .status(201)
              .json(row);
          }
        );
      }
    );
  }
);

/* =====================================================
   ROUTE TEMPLATES - UPDATE
===================================================== */

app.patch(
  "/api/templates/:id",
  (req, res) => {
    const { id } =
      req.params;

    const {
      day_of_week,
      route_number,
      destination,
      scheduled_departure_time,
      route_type,
      default_status,
      door_number,
    } = req.body;

    const todayDate =
      getLocalTodayDate();

    db.run(
      `
      UPDATE ctv_route_templates
      SET
        day_of_week =
          COALESCE(?, day_of_week),

        route_number =
          COALESCE(?, route_number),

        destination =
          COALESCE(?, destination),

        scheduled_departure_time =
          COALESCE(?, scheduled_departure_time),

        route_type =
          COALESCE(?, route_type),

        default_status =
          COALESCE(?, default_status),

        door_number =
          COALESCE(?, door_number)

      WHERE id = ?
      `,
      [
        day_of_week,
        route_number,
        destination,
        scheduled_departure_time,
        route_type,
        default_status,
        door_number,
        id,
      ],
      function (err) {
        if (err) {
          return res
            .status(500)
            .json({
              error:
                err.message,
            });
        }

        db.get(
          `
          SELECT *
          FROM ctv_route_templates
          WHERE id = ?
          `,
          [id],
          (
            err,
            template
          ) => {
            if (err) {
              return res
                .status(500)
                .json({
                  error:
                    err.message,
                });
            }

            if (!template) {
              return res
                .status(404)
                .json({
                  error:
                    "Template not found",
                });
            }

            db.run(
              `
              UPDATE ctv_daily_routes
              SET
                route_number = ?,
                destination = ?,
                scheduled_departure_time = ?,
                route_type = ?,
                status = ?,
                door_number = ?,
                updated_at = CURRENT_TIMESTAMP

              WHERE route_template_id = ?
              AND route_date = ?
              AND status != 'DEPARTED'
              `,
              [
                template.route_number,
                template.destination,
                template.scheduled_departure_time,
                template.route_type ||
                  "OUTBOUND",
                template.default_status ||
                  "ON TIME",
                template.door_number ||
                  "",
                id,
                todayDate,
              ],
              function (err) {
                if (err) {
                  return res
                    .status(500)
                    .json({
                      error:
                        err.message,
                    });
                }

                io.emit(
                  "routes_updated"
                );

                res.json(
                  template
                );
              }
            );
          }
        );
      }
    );
  }
);

/* =====================================================
   ROUTE TEMPLATES - DELETE
===================================================== */

app.delete(
  "/api/templates/:id",
  (req, res) => {
    const { id } =
      req.params;

    const todayDate =
      getLocalTodayDate();

    db.run(
      `
      DELETE FROM ctv_route_templates
      WHERE id = ?
      `,
      [id],
      function (err) {
        if (err) {
          return res
            .status(500)
            .json({
              error:
                err.message,
            });
        }

        db.run(
          `
          DELETE FROM ctv_daily_routes
          WHERE route_template_id = ?
          AND route_date = ?
          AND status != 'DEPARTED'
          `,
          [
            id,
            todayDate,
          ],
          function (err) {
            if (err) {
              return res
                .status(500)
                .json({
                  error:
                    err.message,
                });
            }

            io.emit(
              "routes_updated"
            );

            res.json({
              message:
                "Weekly template and today's route deleted",
              id,
            });
          }
        );
      }
    );
  }
);

/* =====================================================
   ROUTES - LOAD TODAY
===================================================== */

app.post(
  "/api/routes/load-today",
  (req, res) => {
    const todayDate =
      getLocalTodayDate();

    const todayDay =
      new Intl.DateTimeFormat(
        "en-US",
        {
          timeZone:
            "America/Toronto",
          weekday:
            "long",
        }
      ).format(
        new Date()
      );

    db.all(
      `
      SELECT *
      FROM ctv_route_templates
      WHERE day_of_week = ?
      `,
      [todayDay],
      (
        err,
        templates
      ) => {
        if (err) {
          return res
            .status(500)
            .json({
              error:
                err.message,
            });
        }

        if (
          templates.length ===
          0
        ) {
          return res.json({
            message:
              "No templates found for today",
            date:
              todayDate,
            day:
              todayDay,
          });
        }

        db.all(
          `
          SELECT *
          FROM ctv_daily_routes
          WHERE route_date = ?
          `,
          [todayDate],
          (
            err,
            existingRoutes
          ) => {
            if (err) {
              return res
                .status(500)
                .json({
                  error:
                    err.message,
                });
            }

            const missingTemplates =
              templates.filter(
                (template) => {
                  return !existingRoutes.some(
                    (
                      route
                    ) => {
                      return (
                        route.route_template_id ===
                          template.id ||
                        (route.route_number ===
                          template.route_number &&
                          route.destination ===
                            template.destination &&
                          route.scheduled_departure_time ===
                            template.scheduled_departure_time)
                      );
                    }
                  );
                }
              );

            if (
              missingTemplates.length ===
              0
            ) {
              return res.json({
                message:
                  "Today's routes already up to date",
                date:
                  todayDate,
                day:
                  todayDay,
                added: 0,
              });
            }

            const stmt =
              db.prepare(`
                INSERT OR IGNORE INTO ctv_daily_routes
                (
                  route_template_id,
                  route_date,
                  route_number,
                  destination,
                  scheduled_departure_time,
                  route_type,
                  status,
                  door_number
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              `);

            missingTemplates.forEach(
              (t) => {
                stmt.run([
                  t.id,
                  todayDate,
                  t.route_number,
                  t.destination,
                  t.scheduled_departure_time,
                  t.route_type ||
                    "OUTBOUND",
                  t.default_status ||
                    "ON TIME",
                  t.door_number ||
                    "",
                ]);
              }
            );

            stmt.finalize(
              (err) => {
                if (err) {
                  return res
                    .status(500)
                    .json({
                      error:
                        err.message,
                    });
                }

                io.emit(
                  "routes_updated"
                );

                res.json({
                  message: `${missingTemplates.length} new route(s) loaded for today`,
                  date:
                    todayDate,
                  day:
                    todayDay,
                  added:
                    missingTemplates.length,
                });
              }
            );
          }
        );
      }
    );
  }
);

/* =====================================================
   =====================================================
   FLIGHT SYSTEM
   SEPARATE FROM ROUTES
   =====================================================
===================================================== */

/* =====================================================
   FLIGHTS - GET TODAY
===================================================== */

app.get(
  "/api/flights",
  (req, res) => {
    const todayDate =
      getLocalTodayDate();

    const isTvView =
      req.query.view ===
      "tv";

    db.all(
      `
      SELECT *
      FROM ctv_daily_flights
      WHERE flight_date = ?

      ${
        isTvView
          ? `
          AND (
            status != 'DEPARTED'
            OR datetime(updated_at) >= datetime('now', '-30 seconds')
          )
          `
          : ""
      }

      ORDER BY
        scheduled_arrival_time ASC,
        scheduled_departure_time ASC
      `,
      [todayDate],
      (err, rows) => {
        if (err) {
          return res
            .status(500)
            .json({
              error:
                err.message,
            });
        }

        res.json(rows);
      }
    );
  }
);

/* =====================================================
   FLIGHTS - ADD
===================================================== */

app.post(
  "/api/flights",
  (req, res) => {
    const {
      flight_number,
      origin,
      destination,
      scheduled_arrival_time,
      scheduled_departure_time,
      position,
      status,
      delay_minutes,
      notes,
    } = req.body;

    if (
      !flight_number ||
      !origin ||
      !destination ||
      !scheduled_arrival_time ||
      !scheduled_departure_time
    ) {
      return res
        .status(400)
        .json({
          error:
            "Flight number, origin, destination, scheduled arrival, and scheduled departure are required",
        });
    }

    const todayDate =
      getLocalTodayDate();

    db.run(
      `
      INSERT INTO ctv_daily_flights
      (
        flight_date,
        flight_number,
        origin,
        destination,
        scheduled_arrival_time,
        scheduled_departure_time,
        position,
        status,
        delay_minutes,
        notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        todayDate,

        String(
          flight_number
        )
          .trim()
          .toUpperCase(),

        String(origin)
          .trim()
          .toUpperCase(),

        String(
          destination
        )
          .trim()
          .toUpperCase(),

        scheduled_arrival_time,

        scheduled_departure_time,

        position || "",

        status ||
          "SCHEDULED",

        Number(
          delay_minutes
        ) || 0,

        notes || "",
      ],
      function (err) {
        if (err) {
          return res
            .status(500)
            .json({
              error:
                err.message,
            });
        }

        db.get(
          `
          SELECT *
          FROM ctv_daily_flights
          WHERE id = ?
          `,
          [this.lastID],
          (
            err,
            flight
          ) => {
            if (err) {
              return res
                .status(500)
                .json({
                  error:
                    err.message,
                });
            }

            io.emit(
              "flights_updated"
            );

            res
              .status(201)
              .json(
                flight
              );
          }
        );
      }
    );
  }
);

/* =====================================================
   FLIGHTS - UPDATE
===================================================== */

app.patch(
  "/api/flights/:id",
  (req, res) => {
    const { id } =
      req.params;

    const {
      flight_number,
      origin,
      destination,
      scheduled_arrival_time,
      scheduled_departure_time,
      position,
      status,
      delay_minutes,
      notes,
    } = req.body;

    db.get(
      `
      SELECT *
      FROM ctv_daily_flights
      WHERE id = ?
      `,
      [id],
      (
        err,
        existingFlight
      ) => {
        if (err) {
          return res
            .status(500)
            .json({
              error:
                err.message,
            });
        }

        if (
          !existingFlight
        ) {
          return res
            .status(404)
            .json({
              error:
                "Flight not found",
            });
        }

        const existingStatus =
          String(
            existingFlight.status ||
              ""
          ).toUpperCase();

        const requestedStatus =
          status
            ? String(
                status
              ).toUpperCase()
            : null;

        let actualArrivalTime =
          null;

        let actualDepartureTime =
          null;

        // =============================================
        // ACTUAL ARRIVAL
        // Only when flight becomes ARRIVED
        // =============================================

        if (
          requestedStatus ===
            "ARRIVED" &&
          existingStatus !==
            "ARRIVED"
        ) {
          actualArrivalTime =
            getLocalCurrentTime();
        }

        // =============================================
        // ACTUAL DEPARTURE
        // Only when flight becomes DEPARTED
        // =============================================

        if (
          requestedStatus ===
            "DEPARTED" &&
          existingStatus !==
            "DEPARTED"
        ) {
          actualDepartureTime =
            getLocalCurrentTime();
        }

        db.run(
          `
          UPDATE ctv_daily_flights
          SET
            flight_number =
              COALESCE(?, flight_number),

            origin =
              COALESCE(?, origin),

            destination =
              COALESCE(?, destination),

            scheduled_arrival_time =
              COALESCE(?, scheduled_arrival_time),

            scheduled_departure_time =
              COALESCE(?, scheduled_departure_time),

            position =
              COALESCE(?, position),

            status =
              COALESCE(?, status),

            delay_minutes =
              COALESCE(?, delay_minutes),

            notes =
              COALESCE(?, notes),

            actual_arrival_time =
              COALESCE(?, actual_arrival_time),

            actual_departure_time =
              COALESCE(?, actual_departure_time),

            updated_at =
              CURRENT_TIMESTAMP

          WHERE id = ?
          `,
          [
            flight_number,
            origin,
            destination,
            scheduled_arrival_time,
            scheduled_departure_time,
            position,
            status,
            delay_minutes,
            notes,
            actualArrivalTime,
            actualDepartureTime,
            id,
          ],
          function (err) {
            if (err) {
              return res
                .status(500)
                .json({
                  error:
                    err.message,
                });
            }

            db.get(
              `
              SELECT *
              FROM ctv_daily_flights
              WHERE id = ?
              `,
              [id],
              (
                err,
                flight
              ) => {
                if (err) {
                  return res
                    .status(500)
                    .json({
                      error:
                        err.message,
                    });
                }

                io.emit(
                  "flights_updated"
                );

                res.json(
                  flight
                );
              }
            );
          }
        );
      }
    );
  }
);

/* =====================================================
   FLIGHTS - DELETE
===================================================== */

app.delete(
  "/api/flights/:id",
  (req, res) => {
    const { id } =
      req.params;

    db.run(
      `
      DELETE FROM ctv_daily_flights
      WHERE id = ?
      `,
      [id],
      function (err) {
        if (err) {
          return res
            .status(500)
            .json({
              error:
                err.message,
            });
        }

        io.emit(
          "flights_updated"
        );

        res.json({
          message:
            "Flight deleted",
          id,
        });
      }
    );
  }
);

/* =====================================================
   FLIGHT TEMPLATES - GET
===================================================== */

app.get(
  "/api/flight-templates",
  (req, res) => {
    db.all(
      `
      SELECT *
      FROM ctv_flight_templates
      ORDER BY
        day_of_week ASC,
        scheduled_arrival_time ASC
      `,
      [],
      (err, rows) => {
        if (err) {
          return res
            .status(500)
            .json({
              error:
                err.message,
            });
        }

        res.json(rows);
      }
    );
  }
);

/* =====================================================
   FLIGHT TEMPLATES - ADD
===================================================== */

app.post(
  "/api/flight-templates",
  (req, res) => {
    const {
      day_of_week,
      flight_number,
      origin,
      destination,
      scheduled_arrival_time,
      scheduled_departure_time,
      position,
      default_status,
      notes,
    } = req.body;

    if (
      !day_of_week ||
      !flight_number ||
      !origin ||
      !destination ||
      !scheduled_arrival_time ||
      !scheduled_departure_time
    ) {
      return res
        .status(400)
        .json({
          error:
            "Day, flight number, origin, destination, scheduled arrival, and scheduled departure are required",
        });
    }

    db.run(
      `
      INSERT INTO ctv_flight_templates
      (
        day_of_week,
        flight_number,
        origin,
        destination,
        scheduled_arrival_time,
        scheduled_departure_time,
        position,
        default_status,
        notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        day_of_week,

        String(
          flight_number
        )
          .trim()
          .toUpperCase(),

        String(origin)
          .trim()
          .toUpperCase(),

        String(
          destination
        )
          .trim()
          .toUpperCase(),

        scheduled_arrival_time,

        scheduled_departure_time,

        position || "",

        default_status ||
          "SCHEDULED",

        notes || "",
      ],
      function (err) {
        if (err) {
          return res
            .status(500)
            .json({
              error:
                err.message,
            });
        }

        db.get(
          `
          SELECT *
          FROM ctv_flight_templates
          WHERE id = ?
          `,
          [this.lastID],
          (
            err,
            template
          ) => {
            if (err) {
              return res
                .status(500)
                .json({
                  error:
                    err.message,
                });
            }

            res
              .status(201)
              .json(
                template
              );
          }
        );
      }
    );
  }
);

/* =====================================================
   FLIGHT TEMPLATES - UPDATE
===================================================== */

app.patch(
  "/api/flight-templates/:id",
  (req, res) => {
    const { id } = req.params;

    const {
      day_of_week,
      flight_number,
      origin,
      destination,
      scheduled_arrival_time,
      scheduled_departure_time,
      position,
      default_status,
      notes,
    } = req.body;

    const todayDate =
      getLocalTodayDate();

    db.get(
      `
      SELECT *
      FROM ctv_flight_templates
      WHERE id = ?
      `,
      [id],
      (err, existingTemplate) => {
        if (err) {
          return res
            .status(500)
            .json({
              error: err.message,
            });
        }

        if (!existingTemplate) {
          return res
            .status(404)
            .json({
              error:
                "Flight template not found",
            });
        }

        db.run(
          `
          UPDATE ctv_flight_templates
          SET
            day_of_week =
              COALESCE(?, day_of_week),

            flight_number =
              COALESCE(?, flight_number),

            origin =
              COALESCE(?, origin),

            destination =
              COALESCE(?, destination),

            scheduled_arrival_time =
              COALESCE(?, scheduled_arrival_time),

            scheduled_departure_time =
              COALESCE(?, scheduled_departure_time),

            position =
              COALESCE(?, position),

            default_status =
              COALESCE(?, default_status),

            notes =
              COALESCE(?, notes)

          WHERE id = ?
          `,
          [
            day_of_week,
            flight_number
              ? String(flight_number)
                  .trim()
                  .toUpperCase()
              : null,

            origin
              ? String(origin)
                  .trim()
                  .toUpperCase()
              : null,

            destination
              ? String(destination)
                  .trim()
                  .toUpperCase()
              : null,

            scheduled_arrival_time,
            scheduled_departure_time,
            position,
            default_status,
            notes,
            id,
          ],
          function (err) {
            if (err) {
              return res
                .status(500)
                .json({
                  error: err.message,
                });
            }

            db.get(
              `
              SELECT *
              FROM ctv_flight_templates
              WHERE id = ?
              `,
              [id],
              (err, template) => {
                if (err) {
                  return res
                    .status(500)
                    .json({
                      error:
                        err.message,
                    });
                }

                /*
                  If today's flight was loaded
                  from this template, update it too.

                  Do not update a flight that has
                  already DEPARTED.
                */

                db.run(
                  `
                  UPDATE ctv_daily_flights
                  SET
                    flight_number = ?,
                    origin = ?,
                    destination = ?,
                    scheduled_arrival_time = ?,
                    scheduled_departure_time = ?,
                    position = ?,
                    status = ?,
                    notes = ?,
                    updated_at = CURRENT_TIMESTAMP

                  WHERE flight_template_id = ?
                  AND flight_date = ?
                  AND status != 'DEPARTED'
                  `,
                  [
                    template.flight_number,
                    template.origin,
                    template.destination,
                    template.scheduled_arrival_time,
                    template.scheduled_departure_time,
                    template.position || "",
                    template.default_status ||
                      "SCHEDULED",
                    template.notes || "",
                    id,
                    todayDate,
                  ],
                  function (err) {
                    if (err) {
                      return res
                        .status(500)
                        .json({
                          error:
                            err.message,
                        });
                    }

                    io.emit(
                      "flights_updated"
                    );

                    res.json(
                      template
                    );
                  }
                );
              }
            );
          }
        );
      }
    );
  }
);

/* =====================================================
   FLIGHT TEMPLATES - DELETE
===================================================== */

app.delete(
  "/api/flight-templates/:id",
  (req, res) => {
    const { id } = req.params;

    const todayDate =
      getLocalTodayDate();

    db.get(
      `
      SELECT *
      FROM ctv_flight_templates
      WHERE id = ?
      `,
      [id],
      (err, template) => {
        if (err) {
          return res
            .status(500)
            .json({
              error: err.message,
            });
        }

        if (!template) {
          return res
            .status(404)
            .json({
              error:
                "Flight template not found",
            });
        }

        db.run(
          `
          DELETE FROM ctv_flight_templates
          WHERE id = ?
          `,
          [id],
          function (err) {
            if (err) {
              return res
                .status(500)
                .json({
                  error:
                    err.message,
                });
            }

            /*
              Also remove today's flight if it
              came from this template and has
              not departed yet.
            */

            db.run(
              `
              DELETE FROM ctv_daily_flights
              WHERE flight_template_id = ?
              AND flight_date = ?
              AND status != 'DEPARTED'
              `,
              [
                id,
                todayDate,
              ],
              function (err) {
                if (err) {
                  return res
                    .status(500)
                    .json({
                      error:
                        err.message,
                    });
                }

                io.emit(
                  "flights_updated"
                );

                res.json({
                  message:
                    "Flight template deleted",
                  id,
                });
              }
            );
          }
        );
      }
    );
  }
);

/* =====================================================
   FLIGHTS - LOAD TODAY FROM WEEKLY TEMPLATE
===================================================== */

app.post(
  "/api/flights/load-today",
  (req, res) => {
    const todayDate =
      getLocalTodayDate();

    const todayDay =
      new Intl.DateTimeFormat(
        "en-US",
        {
          timeZone:
            "America/Toronto",
          weekday:
            "long",
        }
      ).format(
        new Date()
      );

    db.all(
      `
      SELECT *
      FROM ctv_flight_templates
      WHERE day_of_week = ?
      `,
      [todayDay],
      (
        err,
        templates
      ) => {
        if (err) {
          return res
            .status(500)
            .json({
              error:
                err.message,
            });
        }

        if (
          templates.length ===
          0
        ) {
          return res.json({
            message:
              "No flight templates found for today",
            date:
              todayDate,
            day:
              todayDay,
            added: 0,
          });
        }

        db.all(
          `
          SELECT *
          FROM ctv_daily_flights
          WHERE flight_date = ?
          `,
          [todayDate],
          (
            err,
            existingFlights
          ) => {
            if (err) {
              return res
                .status(500)
                .json({
                  error:
                    err.message,
                });
            }

            const missingTemplates =
              templates.filter(
                (
                  template
                ) => {
                  return !existingFlights.some(
                    (
                      flight
                    ) => {
                      return (
                        flight.flight_template_id ===
                          template.id ||
                        (flight.flight_number ===
                          template.flight_number &&
                          flight.origin ===
                            template.origin &&
                          flight.destination ===
                            template.destination &&
                          flight.scheduled_arrival_time ===
                            template.scheduled_arrival_time &&
                          flight.scheduled_departure_time ===
                            template.scheduled_departure_time)
                      );
                    }
                  );
                }
              );

            if (
              missingTemplates.length ===
              0
            ) {
              return res.json({
                message:
                  "Today's flights already up to date",
                date:
                  todayDate,
                day:
                  todayDay,
                added: 0,
              });
            }

            const stmt =
              db.prepare(`
                INSERT OR IGNORE INTO ctv_daily_flights
                (
                  flight_template_id,
                  flight_date,
                  flight_number,
                  origin,
                  destination,
                  scheduled_arrival_time,
                  scheduled_departure_time,
                  position,
                  status,
                  delay_minutes,
                  notes
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `);

            missingTemplates.forEach(
              (template) => {
                stmt.run([
                  template.id,
                  todayDate,
                  template.flight_number,
                  template.origin,
                  template.destination,
                  template.scheduled_arrival_time,
                  template.scheduled_departure_time,
                  template.position ||
                    "",
                  template.default_status ||
                    "SCHEDULED",
                  0,
                  template.notes ||
                    "",
                ]);
              }
            );

            stmt.finalize(
              (err) => {
                if (err) {
                  return res
                    .status(500)
                    .json({
                      error:
                        err.message,
                    });
                }

                io.emit(
                  "flights_updated"
                );

                res.json({
                  message: `${missingTemplates.length} new flight(s) loaded for today`,
                  date:
                    todayDate,
                  day:
                    todayDay,
                  added:
                    missingTemplates.length,
                });
              }
            );
          }
        );
      }
    );
  }
);

/* =====================================================
   SERVER
===================================================== */

const PORT = 5000;

server.listen(
  PORT,
  () => {
    console.log(
      `CTV server running on http://localhost:${PORT}`
    );
  }
);