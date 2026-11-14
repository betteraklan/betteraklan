-- Admin Audit Log
-- Migration: 006_admin_audit_log.sql
--
-- Restores the admin_audit_log table, which was only defined in
-- db/migrations/archive/003_admin_audit_log.sql and so was missing from
-- databases built from the current migrations. Used by
-- functions/utils/audit-log.ts, the Audit Log admin page and the persons
-- deletion queue. Same definition as the archived migration; IF NOT EXISTS
-- makes it a no-op on databases that already have the table.

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  performed_by TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  details TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action
  ON admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_performed_by
  ON admin_audit_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target
  ON admin_audit_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at
  ON admin_audit_log(created_at DESC);
