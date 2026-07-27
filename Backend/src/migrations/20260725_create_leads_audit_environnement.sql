CREATE TABLE IF NOT EXISTS leads_audit_environnement (
  id SERIAL PRIMARY KEY,
  nom TEXT,
  telephone TEXT NOT NULL,
  email TEXT NOT NULL,
  score INTEGER NOT NULL,
  niveau TEXT NOT NULL,
  reponses JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_audit_environnement_created_at
  ON leads_audit_environnement (created_at DESC);
