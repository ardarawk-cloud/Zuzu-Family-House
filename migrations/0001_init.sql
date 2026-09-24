PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  nightly_rate INTEGER NOT NULL DEFAULT 3500000,
  service_rate REAL NOT NULL DEFAULT 0.05,
  tax_rate REAL NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO settings (id, nightly_rate, service_rate, tax_rate) VALUES (1, 3500000, 0.05, 0);

CREATE TABLE IF NOT EXISTS reservations (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  checkin TEXT NOT NULL,
  checkout TEXT NOT NULL,
  guests INTEGER NOT NULL,
  nights INTEGER NOT NULL,
  subtotal INTEGER NOT NULL,
  service INTEGER NOT NULL,
  tax INTEGER NOT NULL,
  total INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Confirmed','Paid','Cancelled')),
  source TEXT NOT NULL DEFAULT 'Direct',
  campaign TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_reservations_dates ON reservations(checkin, checkout);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_created ON reservations(created_at DESC);

CREATE TABLE IF NOT EXISTS seasonal_rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  nightly_rate INTEGER NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_seasonal_dates ON seasonal_rates(start_date, end_date, active);

CREATE TABLE IF NOT EXISTS blocked_dates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'Owner',
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_blocks_dates ON blocked_dates(start_date, end_date);

CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  category TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ad_spend (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  meta INTEGER NOT NULL DEFAULT 0,
  instagram INTEGER NOT NULL DEFAULT 0,
  google INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO ad_spend (id, meta, instagram, google) VALUES (1, 0, 0, 0);
