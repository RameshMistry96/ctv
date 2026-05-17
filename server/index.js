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

function getLocalTodayDate() {
  const now = new Date();

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function getDelayMinutes(routeDate, scheduledTime) {
  if (!routeDate || !scheduledTime) return 0;

  const cleanTime = String(scheduledTime || "").trim();
  const scheduled = new Date(`${routeDate}T${cleanTime}:00`);
  const now = new Date();

  const diff = Math.floor((now - scheduled) / 60000);
  return diff > 0 ? diff : 0;
}

function autoUpdateDelays(callback) {
  const todayDate = getLocalTodayDate();

  db.all(
    `
    SELECT * FROM ctv_daily_routes
    WHERE route_date = ?
    AND status NOT IN ('ARRIVED', 'DEPARTED', 'CANCELLED', 'ENROUTE')
    `,
    [todayDate],
    (err, rows) => {
      if (err) return callback(err);

      const delayedRows = rows.filter((route) => {
        return getDelayMinutes(route.route_date, route.scheduled_departure_time) > 0;
      });

      if (delayedRows.length === 0) return callback(null);

      let completed = 0;

      delayedRows.forEach((route) => {
        const delayMinutes = getDelayMinutes(
          route.route_date,
          route.scheduled_departure_time
        );

        db.run(
          `
          UPDATE ctv_daily_routes
          SET status = 'DELAYED',
              delay_minutes = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
          `,
          [delayMinutes, route.id],
          (err) => {
            if (err) return callback(err);

            completed++;
            if (completed === delayedRows.length) {
              io.emit("routes_updated");
              callback(null);
            }
          }
        );
      });
    }
  );
}

app.get("/", (req, res) => {
  res.send("CTV Backend is running");
});

// Get all routes
app.get("/api/routes", (req, res) => {
  const todayDate = getLocalTodayDate();

  db.all(
    `
    SELECT * FROM ctv_daily_routes
    WHERE route_date = ?
    ORDER BY scheduled_departure_time ASC
    `,
    [todayDate],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Add new route
app.post("/api/routes", (req, res) => {
  const {
    route_number,
    destination,
    scheduled_departure_time,
    route_type,
    status,
    delay_minutes,
    notes,
  } = req.body;

  if (!route_number || !destination || !scheduled_departure_time) {
    return res.status(400).json({
      error: "Route number, destination, and scheduled time are required",
    });
  }

  const today = getLocalTodayDate();

  db.run(
    `
    INSERT INTO ctv_daily_routes 
    (route_date, route_number, destination, scheduled_departure_time, route_type, status, delay_minutes, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      today,
      route_number,
      destination,
      scheduled_departure_time,
      route_type || "OUTBOUND",
      status || "ON TIME",
      delay_minutes || 0,
      notes || "",
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });

      db.get("SELECT * FROM ctv_daily_routes WHERE id = ?", [this.lastID], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        io.emit("routes_updated");
        res.status(201).json(row);
      });
    }
  );
});

// Update route status / time / delay / notes
app.patch("/api/routes/:id", (req, res) => {
  const { id } = req.params;

  const {
    route_number,
    destination,
    scheduled_departure_time,
    route_type,
    status,
    delay_minutes,
    notes,
  } = req.body;

  const actual_departure_time =
    status === "DEPARTED" ? new Date().toTimeString().slice(0, 5) : null;

  db.run(
    `
    UPDATE ctv_daily_routes
    SET
      route_number = COALESCE(?, route_number),
      destination = COALESCE(?, destination),
      scheduled_departure_time = COALESCE(?, scheduled_departure_time),
      route_type = COALESCE(?, route_type),
      status = COALESCE(?, status),
      delay_minutes = COALESCE(?, delay_minutes),
      notes = COALESCE(?, notes),
      actual_departure_time = COALESCE(?, actual_departure_time),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    `,
    [
      route_number,
      destination,
      scheduled_departure_time,
      route_type,
      status,
      delay_minutes,
      notes,
      actual_departure_time,
      id,
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });

      db.get("SELECT * FROM ctv_daily_routes WHERE id = ?", [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        io.emit("routes_updated");
        res.json(row);
      });
    }
  );
});

// Delete route
app.delete("/api/routes/:id", (req, res) => {
  const { id } = req.params;

  db.run("DELETE FROM ctv_daily_routes WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });

    io.emit("routes_updated");
    res.json({ message: "Route deleted", id });
  });
});

// Get weekly route templates
app.get("/api/templates", (req, res) => {
  db.all(
    "SELECT * FROM ctv_route_templates ORDER BY day_of_week ASC, scheduled_departure_time ASC",
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Add weekly route template
app.post("/api/templates", (req, res) => {
  const {
    day_of_week,
    route_number,
    destination,
    scheduled_departure_time,
    route_type,
    default_status,
  } = req.body;

  if (!day_of_week || !route_number || !destination || !scheduled_departure_time) {
    return res.status(400).json({
      error: "Day, route number, destination, and scheduled time are required",
    });
  }

  db.run(
    `
    INSERT INTO ctv_route_templates
    (day_of_week, route_number, destination, scheduled_departure_time, route_type, default_status)
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      day_of_week,
      route_number,
      destination,
      scheduled_departure_time,
      route_type || "OUTBOUND",
      default_status || "ON TIME",
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });

      db.get("SELECT * FROM ctv_route_templates WHERE id = ?", [this.lastID], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        res.status(201).json(row);
      });
    }
  );
});

// Update weekly route template AND today's route if already loaded
app.patch("/api/templates/:id", (req, res) => {
  const { id } = req.params;

  const {
    day_of_week,
    route_number,
    destination,
    scheduled_departure_time,
    route_type,
    default_status,
  } = req.body;

  const todayDate = getLocalTodayDate();

  db.run(
    `
    UPDATE ctv_route_templates
    SET
      day_of_week = COALESCE(?, day_of_week),
      route_number = COALESCE(?, route_number),
      destination = COALESCE(?, destination),
      scheduled_departure_time = COALESCE(?, scheduled_departure_time),
      route_type = COALESCE(?, route_type),
      default_status = COALESCE(?, default_status)
    WHERE id = ?
    `,
    [
      day_of_week,
      route_number,
      destination,
      scheduled_departure_time,
      route_type,
      default_status,
      id,
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });

      db.get("SELECT * FROM ctv_route_templates WHERE id = ?", [id], (err, template) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!template) return res.status(404).json({ error: "Template not found" });

        db.run(
          `
          UPDATE ctv_daily_routes
          SET
            route_number = ?,
            destination = ?,
            scheduled_departure_time = ?,
            route_type = ?,
            status = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE route_template_id = ?
          AND route_date = ?
          AND status != 'DEPARTED'
          `,
          [
            template.route_number,
            template.destination,
            template.scheduled_departure_time,
            template.route_type || "OUTBOUND",
            template.default_status || "ON TIME",
            id,
            todayDate,
          ],
          function (err) {
            if (err) return res.status(500).json({ error: err.message });

            io.emit("routes_updated");
            res.json(template);
          }
        );
      });
    }
  );
});

// Delete weekly route template AND today's route if already loaded
app.delete("/api/templates/:id", (req, res) => {
  const { id } = req.params;
  const todayDate = getLocalTodayDate();

  db.run("DELETE FROM ctv_route_templates WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });

    db.run(
      `
      DELETE FROM ctv_daily_routes
      WHERE route_template_id = ?
      AND route_date = ?
      AND status != 'DEPARTED'
      `,
      [id, todayDate],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });

        io.emit("routes_updated");
        res.json({ message: "Weekly template and today's route deleted", id });
      }
    );
  });
});

// Auto-load today's routes from weekly template
app.post("/api/routes/load-today", (req, res) => {
  const todayDate = getLocalTodayDate();

  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  const todayDay = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Toronto",
    weekday: "long",
  }).format(new Date());

  db.all(
    "SELECT * FROM ctv_route_templates WHERE day_of_week = ?",
    [todayDay],
    (err, templates) => {
      if (err) return res.status(500).json({ error: err.message });

      if (templates.length === 0) {
        return res.json({
          message: "No templates found for today",
          date: todayDate,
          day: todayDay,
        });
      }

      db.all(
        "SELECT * FROM ctv_daily_routes WHERE route_date = ?",
        [todayDate],
        (err, existingRoutes) => {
          if (err) return res.status(500).json({ error: err.message });

          const missingTemplates = templates.filter((template) => {
            return !existingRoutes.some((route) => {
              return (
                route.route_template_id === template.id ||
                (route.route_number === template.route_number &&
                  route.destination === template.destination &&
                  route.scheduled_departure_time === template.scheduled_departure_time)
              );
            });
          });

          if (missingTemplates.length === 0) {
            return res.json({
              message: "Today's routes already up to date",
              date: todayDate,
              day: todayDay,
              added: 0,
            });
          }

          const stmt = db.prepare(`
            INSERT OR IGNORE INTO ctv_daily_routes
            (route_template_id, route_date, route_number, destination, scheduled_departure_time, route_type, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `);

          missingTemplates.forEach((t) => {
            stmt.run([
              t.id,
              todayDate,
              t.route_number,
              t.destination,
              t.scheduled_departure_time,
              t.route_type || "OUTBOUND",
              t.default_status || "ON TIME",
            ]);
          });

          stmt.finalize((err) => {
            if (err) return res.status(500).json({ error: err.message });

            io.emit("routes_updated");

            res.json({
              message: `${missingTemplates.length} new route(s) loaded for today`,
              date: todayDate,
              day: todayDay,
              added: missingTemplates.length,
            });
          });
        }
      );
    }
  );
});

const PORT = 5000;

server.listen(PORT, () => {
  console.log(`CTV server running on http://localhost:${PORT}`);
});