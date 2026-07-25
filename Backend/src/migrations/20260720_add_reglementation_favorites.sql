CREATE TABLE IF NOT EXISTS reglementation_favorites (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reglementation_id INTEGER NOT NULL REFERENCES reglementation_all(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, reglementation_id)
);

CREATE INDEX IF NOT EXISTS idx_reglementation_favorites_user
  ON reglementation_favorites (user_id, created_at DESC);
