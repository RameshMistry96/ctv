const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./ctv.db", (err) => {
  if (err) {
    console.error(
      "Database connection error:",
      err.message
    );
  } else {
    console.log(
      "Connected to CTV database"
    );
  }
});

db.serialize(() => {
  /* =====================================================
     EXISTING ROUTE TEMPLATES
  ===================================================== */

  db.run(`
    CREATE TABLE IF NOT EXISTS ctv_route_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      day_of_week TEXT NOT NULL,
      route_number TEXT NOT NULL,
      destination TEXT NOT NULL,
      scheduled_departure_time TEXT NOT NULL,
      route_type TEXT DEFAULT 'OUTBOUND',
      default_status TEXT DEFAULT 'ON TIME',
      door_number TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  /* =====================================================
     EXISTING DAILY ROUTES
  ===================================================== */

  db.run(`
    CREATE TABLE IF NOT EXISTS ctv_daily_routes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      route_template_id INTEGER,
      route_date TEXT NOT NULL,
      route_number TEXT NOT NULL,
      destination TEXT NOT NULL,
      scheduled_departure_time TEXT NOT NULL,
      route_type TEXT DEFAULT 'OUTBOUND',

      actual_departure_time TEXT,
      actual_arrival_time TEXT,

      status TEXT DEFAULT 'ON TIME',
      delay_minutes INTEGER DEFAULT 0,
      door_number TEXT,
      notes TEXT,

      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  /* =====================================================
     NEW FLIGHT TEMPLATES
  ===================================================== */

  db.run(`
    CREATE TABLE IF NOT EXISTS ctv_flight_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      day_of_week TEXT NOT NULL,

      flight_number TEXT NOT NULL,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,

      scheduled_arrival_time TEXT NOT NULL,
      scheduled_departure_time TEXT NOT NULL,

      position TEXT,

      default_status TEXT DEFAULT 'SCHEDULED',

      notes TEXT,

      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  /* =====================================================
     NEW DAILY FLIGHTS
  ===================================================== */

  db.run(`
    CREATE TABLE IF NOT EXISTS ctv_daily_flights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      flight_template_id INTEGER,

      flight_date TEXT NOT NULL,

      flight_number TEXT NOT NULL,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,

      scheduled_arrival_time TEXT NOT NULL,
      scheduled_departure_time TEXT NOT NULL,

      actual_arrival_time TEXT,
      actual_departure_time TEXT,

      position TEXT,

      status TEXT DEFAULT 'SCHEDULED',

      delay_minutes INTEGER DEFAULT 0,

      notes TEXT,

      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  /* =====================================================
     EXISTING ROUTE MIGRATIONS
  ===================================================== */

  db.run(
    `
    ALTER TABLE ctv_route_templates
    ADD COLUMN door_number TEXT
    `,
    (err) => {
      if (
        err &&
        !err.message.includes(
          "duplicate column name"
        )
      ) {
        console.error(
          "Template door_number migration error:",
          err.message
        );
      }
    }
  );

  db.run(
    `
    ALTER TABLE ctv_daily_routes
    ADD COLUMN door_number TEXT
    `,
    (err) => {
      if (
        err &&
        !err.message.includes(
          "duplicate column name"
        )
      ) {
        console.error(
          "Daily door_number migration error:",
          err.message
        );
      }
    }
  );

  db.run(
    `
    ALTER TABLE ctv_route_templates
    ADD COLUMN route_type TEXT
    DEFAULT 'OUTBOUND'
    `,
    (err) => {
      if (
        err &&
        !err.message.includes(
          "duplicate column name"
        )
      ) {
        console.error(
          "Template route_type migration error:",
          err.message
        );
      }
    }
  );

  db.run(
    `
    ALTER TABLE ctv_daily_routes
    ADD COLUMN route_type TEXT
    DEFAULT 'OUTBOUND'
    `,
    (err) => {
      if (
        err &&
        !err.message.includes(
          "duplicate column name"
        )
      ) {
        console.error(
          "Daily route_type migration error:",
          err.message
        );
      }
    }
  );

  db.run(
    `
    ALTER TABLE ctv_daily_routes
    ADD COLUMN actual_arrival_time TEXT
    `,
    (err) => {
      if (
        err &&
        !err.message.includes(
          "duplicate column name"
        )
      ) {
        console.error(
          "Daily actual_arrival_time migration error:",
          err.message
        );
      }
    }
  );

  /* =====================================================
     CLEAN EXISTING ROUTE DUPLICATES
  ===================================================== */

  db.run(`
    DELETE FROM ctv_daily_routes
    WHERE id NOT IN (
      SELECT MIN(id)
      FROM ctv_daily_routes
      GROUP BY
        route_date,
        route_template_id,
        route_number,
        destination,
        scheduled_departure_time
    )
  `);

  /* =====================================================
     EXISTING ROUTE INDEXES
  ===================================================== */

  db.run(`
    CREATE UNIQUE INDEX IF NOT EXISTS
    idx_unique_daily_template_route

    ON ctv_daily_routes(
      route_date,
      route_template_id
    )

    WHERE route_template_id IS NOT NULL
  `);

  db.run(`
    CREATE UNIQUE INDEX IF NOT EXISTS
    idx_unique_weekly_template

    ON ctv_route_templates(
      day_of_week,
      route_number,
      destination,
      scheduled_departure_time
    )
  `);

  /* =====================================================
     NEW FLIGHT INDEXES
  ===================================================== */

  db.run(`
    CREATE UNIQUE INDEX IF NOT EXISTS
    idx_unique_daily_flight_template

    ON ctv_daily_flights(
      flight_date,
      flight_template_id
    )

    WHERE flight_template_id IS NOT NULL
  `);

  db.run(`
    CREATE UNIQUE INDEX IF NOT EXISTS
    idx_unique_weekly_flight_template

    ON ctv_flight_templates(
      day_of_week,
      flight_number,
      origin,
      destination,
      scheduled_arrival_time,
      scheduled_departure_time
    )
  `);

  /* =====================================================
     USEFUL FLIGHT DATE INDEX
  ===================================================== */

  db.run(`
    CREATE INDEX IF NOT EXISTS
    idx_daily_flights_date

    ON ctv_daily_flights(
      flight_date
    )
  `);
});

module.exports = db;