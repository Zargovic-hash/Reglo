-- Accélère les filtres et la recherche de GET /api/reglementation.
-- À exécuter une seule fois avec un compte PostgreSQL autorisé à créer des index.

CREATE INDEX IF NOT EXISTS idx_reglementation_all_domaine_chapitre
  ON reglementation_all (domaine, chapitre, sous_chapitre);

CREATE INDEX IF NOT EXISTS idx_reglementation_all_titre
  ON reglementation_all (titre);

CREATE INDEX IF NOT EXISTS idx_reglementation_all_search_french
  ON reglementation_all
  USING GIN (
    to_tsvector(
      'french',
      coalesce(titre, '') || ' ' ||
      coalesce(exigence, '') || ' ' ||
      coalesce(lois, '') || ' ' ||
      coalesce(documents, '')
    )
  );

CREATE INDEX IF NOT EXISTS idx_audit_conformite_user_reglementation
  ON audit_conformite (user_id, reglementation_id);

CREATE INDEX IF NOT EXISTS idx_audit_conformite_conformite
  ON audit_conformite (conformite);

CREATE INDEX IF NOT EXISTS idx_audit_conformite_prioritee
  ON audit_conformite ("prioritée");

CREATE INDEX IF NOT EXISTS idx_audit_conformite_owner
  ON audit_conformite (owner);

CREATE INDEX IF NOT EXISTS idx_audit_conformite_deadline
  ON audit_conformite (deadline);
