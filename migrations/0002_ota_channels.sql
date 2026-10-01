PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS ota_feeds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'Other',
  feed_url TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  last_synced_at TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ota_blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  feed_id INTEGER NOT NULL,
  external_uid TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (feed_id) REFERENCES ota_feeds(id) ON DELETE CASCADE,
  UNIQUE(feed_id, external_uid, start_date, end_date)
);

CREATE INDEX IF NOT EXISTS idx_ota_blocks_dates ON ota_blocks(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_ota_blocks_feed ON ota_blocks(feed_id);
