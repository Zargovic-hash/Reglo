import { pool } from "../db.js";

export const getFavorites = async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT reglementation_id FROM reglementation_favorites WHERE user_id = $1 ORDER BY created_at DESC",
      [req.user.id],
    );
    res.json({ items: rows.map(({ reglementation_id }) => reglementation_id) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la récupération des favoris" });
  }
};

export const addFavorite = async (req, res) => {
  try {
    const regulationId = Number.parseInt(req.params.reglementationId, 10);
    if (!Number.isInteger(regulationId) || regulationId < 1) {
      return res.status(400).json({ error: "Identifiant de réglementation invalide" });
    }

    await pool.query(
      `INSERT INTO reglementation_favorites (user_id, reglementation_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, reglementation_id) DO NOTHING`,
      [req.user.id, regulationId],
    );
    res.status(201).json({ success: true });
  } catch (err) {
    if (err.code === "23503") return res.status(404).json({ error: "Réglementation introuvable" });
    console.error(err);
    res.status(500).json({ error: "Erreur lors de l'ajout aux favoris" });
  }
};

export const removeFavorite = async (req, res) => {
  try {
    const regulationId = Number.parseInt(req.params.reglementationId, 10);
    if (!Number.isInteger(regulationId) || regulationId < 1) {
      return res.status(400).json({ error: "Identifiant de réglementation invalide" });
    }

    await pool.query(
      "DELETE FROM reglementation_favorites WHERE user_id = $1 AND reglementation_id = $2",
      [req.user.id, regulationId],
    );
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la suppression du favori" });
  }
};
