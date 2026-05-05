-- Core-Hogar — notifications table.
-- Idempotent (CREATE IF NOT EXISTS) so it's safe to apply on every boot.
-- Owned by Core-Hogar; other apps reach it only through HTTP endpoints.

CREATE TABLE IF NOT EXISTS notifications (
    id          BIGSERIAL PRIMARY KEY,
    user_id     INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_app  TEXT        NOT NULL,
    message     TEXT        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read        BOOLEAN     NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
    ON notifications (user_id, created_at DESC);
