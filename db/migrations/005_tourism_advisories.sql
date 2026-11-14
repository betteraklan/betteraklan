-- Tourism Advisories
-- Migration: 005_tourism_advisories.sql
--
-- Stores travel advisories (closures, access changes, events) shown on the
-- tourism Explore map and municipality pages. Mirrors the `Advisory` type in
-- src/types/tourism.ts so the API can return rows without reshaping.

CREATE TABLE IF NOT EXISTS tourism_advisories (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('closure', 'access', 'event')),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  -- Municipality slug from src/data/tourism/municipalities.json; NULL means province-wide
  municipality TEXT,
  -- Optional named place within the municipality (beach, port, resort)
  place TEXT,
  issuer TEXT NOT NULL,
  source_url TEXT NOT NULL,
  -- ISO 8601 timestamps
  published_at TEXT NOT NULL,
  ends_at TEXT,
  is_published INTEGER NOT NULL DEFAULT 1 CHECK (is_published IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (ends_at IS NULL OR ends_at >= published_at)
);

-- Public feed: published, not yet ended, newest first
CREATE INDEX IF NOT EXISTS idx_tourism_advisories_active
  ON tourism_advisories(is_published, ends_at, published_at DESC);

-- Per-municipality lookups (?municipality=kalibo)
CREATE INDEX IF NOT EXISTS idx_tourism_advisories_municipality
  ON tourism_advisories(municipality, is_published, ends_at);
