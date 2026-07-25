-- Restructure reglementation_all pour correspondre au nouveau schéma source (CSV) :
-- Domaine, Titre, Sous_Titre, Référence_Reglementaire, ID_Article, Exigence,
-- Documents_Justificatif, Lien_1, Lien_2, Lien_3, Lien_4, Derniere_verification_JO.
--
-- ATTENTION :
--   - Les colonnes chapitre, sous_chapitre, lois, documents, date_maj, numero_article,
--     lien_texte sont supprimées (remplacées par les nouvelles colonnes ci-dessous).
--   - Cette migration ne modifie QUE la structure de la table, pas son contenu.
--     Le rechargement des données depuis le CSV se fait séparément via
--     scripts/importReglementationCsv.js (qui vide reglementation_all et, en cascade,
--     audit_conformite / reglementation_favorites).
--   - À exécuter avant le script d'import.

ALTER TABLE reglementation_all
  ADD COLUMN IF NOT EXISTS sous_titre TEXT,
  ADD COLUMN IF NOT EXISTS reference_reglementaire TEXT,
  ADD COLUMN IF NOT EXISTS id_article TEXT,
  ADD COLUMN IF NOT EXISTS documents_justificatif TEXT,
  ADD COLUMN IF NOT EXISTS lien_1 TEXT,
  ADD COLUMN IF NOT EXISTS lien_2 TEXT,
  ADD COLUMN IF NOT EXISTS lien_3 TEXT,
  ADD COLUMN IF NOT EXISTS lien_4 TEXT,
  ADD COLUMN IF NOT EXISTS derniere_verification_jo DATE;

ALTER TABLE reglementation_all
  DROP COLUMN IF EXISTS chapitre,
  DROP COLUMN IF EXISTS sous_chapitre,
  DROP COLUMN IF EXISTS lois,
  DROP COLUMN IF EXISTS documents,
  DROP COLUMN IF EXISTS date_maj,
  DROP COLUMN IF EXISTS numero_article,
  DROP COLUMN IF EXISTS lien_texte;

-- Les DROP COLUMN ci-dessus font automatiquement tomber les anciens index qui en dépendaient
-- (idx_reglementation_all_domaine_chapitre et idx_reglementation_all_search_french) : on les recrée
-- avec les nouvelles colonnes.
CREATE INDEX IF NOT EXISTS idx_reglementation_all_domaine_titre
  ON reglementation_all (domaine, titre, sous_titre);

CREATE INDEX IF NOT EXISTS idx_reglementation_all_search_french
  ON reglementation_all
  USING GIN (
    to_tsvector(
      'french',
      coalesce(titre, '') || ' ' ||
      coalesce(sous_titre, '') || ' ' ||
      coalesce(exigence, '') || ' ' ||
      coalesce(reference_reglementaire, '') || ' ' ||
      coalesce(documents_justificatif, '')
    )
  );
