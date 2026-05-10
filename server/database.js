const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./ctv.db", (err) => {
  if (err) {
    console.error("Database connection error:", err.message);
  } else {
    console.log("Connected to CTV database");
  }
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS ctv_route_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      day_of_week TEXT NOT NULL,
      route_number TEXT NOT NULL,
      destination TEXT NOT NULL,
      scheduled_departure_time TEXT NOT NULL,
      route_type TEXT DEFAULT 'OUTBOUND',
      default_status TEXT DEFAULT 'ON TIME',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

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
      status TEXT DEFAULT 'ON TIME',
      delay_minutes INTEGER DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ✅ Add route_type column to old existing database if missing
  db.run(`ALTER TABLE ctv_route_templates ADD COLUMN route_type TEXT DEFAULT 'OUTBOUND'`, (err) => {
    if (err && !err.message.includes("duplicate column name")) {
      console.error("Template route_type migration error:", err.message);
    }
  });

  db.run(`ALTER TABLE ctv_daily_routes ADD COLUMN route_type TEXT DEFAULT 'OUTBOUND'`, (err) => {
    if (err && !err.message.includes("duplicate column name")) {
      console.error("Daily route_type migration error:", err.message);
    }
  });

  // Clean duplicate daily routes before adding protection
  db.run(`
    DELETE FROM ctv_daily_routes
    WHERE id NOT IN (
      SELECT MIN(id)
      FROM ctv_daily_routes
      GROUP BY route_date, route_template_id, route_number, destination, scheduled_departure_time
    )
  `);

  // Prevent same template from loading twice on same date
  db.run(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_daily_template_route
    ON ctv_daily_routes(route_date, route_template_id)
    WHERE route_template_id IS NOT NULL
  `);

  // Prevent duplicate weekly templates
  db.run(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_weekly_template
    ON ctv_route_templates(day_of_week, route_number, destination, scheduled_departure_time)
  `);
});

module.exports = db;