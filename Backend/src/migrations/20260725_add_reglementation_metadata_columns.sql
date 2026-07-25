-- Ajoute des métadonnées de suivi sur les textes réglementaires :
-- date de mise à jour du texte, numéro d'article, et lien vers le texte source.
-- Colonnes nullables : aucune donnée existante n'est modifiée, aucun impact sur les requêtes en cours.

ALTER TABLE reglementation_all
  ADD COLUMN IF NOT EXISTS date_maj DATE,
  ADD COLUMN IF NOT EXISTS numero_article TEXT,
  ADD COLUMN IF NOT EXISTS lien_texte TEXT;
