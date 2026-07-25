import { pool } from "../db.js";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

const firstQueryValue = (value) => Array.isArray(value) ? value[0] : value;

const optionalText = (value) => {
  const text = firstQueryValue(value)?.trim();
  return text || null;
};

const parsePositiveInteger = (value, fallback, maximum) => {
  const parsed = Number.parseInt(firstQueryValue(value), 10);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, maximum);
};

const parseDate = (value, name) => {
  const date = optionalText(value);
  if (!date) return null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    throw new Error(`Le paramètre ${name} doit respecter le format YYYY-MM-DD.`);
  }

  return date;
};

// Construit une requête entièrement paramétrée pour faciliter sa vérification et ses tests.
export const buildReglementationQuery = (query, user) => {
  const userId = user.id;
  const isAdmin = user.role === "admin";
  const page = parsePositiveInteger(query.page, 1, Number.MAX_SAFE_INTEGER);
  const limit = parsePositiveInteger(query.limit, DEFAULT_LIMIT, MAX_LIMIT);
  const offset = (page - 1) * limit;
  const deadlineFrom = parseDate(query.deadline_from, "deadline_from");
  const deadlineTo = parseDate(query.deadline_to, "deadline_to");

  if (deadlineFrom && deadlineTo && deadlineFrom > deadlineTo) {
    throw new Error("deadline_from doit être antérieur ou égal à deadline_to.");
  }

  const values = [];
  const filters = [];
  const addValue = (value) => {
    values.push(value);
    return `$${values.length}`;
  };

  // Un utilisateur non administrateur ne peut voir et filtrer que ses propres audits.
  const auditJoin = isAdmin
    ? "LEFT JOIN audit_conformite a ON r.id = a.reglementation_id"
    : `LEFT JOIN audit_conformite a ON r.id = a.reglementation_id AND a.user_id = ${addValue(userId)}`;

  const addExactFilter = (column, value) => {
    const text = optionalText(value);
    if (text) filters.push(`${column} = ${addValue(text)}`);
  };

  addExactFilter("r.titre", query.titre);
  addExactFilter("r.domaine", query.domaine);
  addExactFilter("r.sous_titre", query.sous_titre);
  addExactFilter("a.conformite", query.conformite);
  addExactFilter('a."prioritée"', query.priorite ?? query.prioritée);
  addExactFilter("a.owner", query.owner);

  const search = optionalText(query.search);
  if (search) {
    filters.push(`to_tsvector('french',
      coalesce(r.titre, '') || ' ' ||
      coalesce(r.sous_titre, '') || ' ' ||
      coalesce(r.exigence, '') || ' ' ||
      coalesce(r.reference_reglementaire, '') || ' ' ||
      coalesce(r.documents_justificatif, '')
    ) @@ plainto_tsquery('french', ${addValue(search)})`);
  }

  if (deadlineFrom) filters.push(`a.deadline >= ${addValue(deadlineFrom)}`);
  if (deadlineTo) filters.push(`a.deadline <= ${addValue(deadlineTo)}`);

  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const userFields = isAdmin
    ? "u.first_name, u.last_name, u.email AS user_email"
    : "NULL AS first_name, NULL AS last_name, NULL AS user_email";
  const userJoin = isAdmin ? "LEFT JOIN users u ON a.user_id = u.id" : "";
  const from = `
    FROM reglementation_all r
    ${auditJoin}
    ${userJoin}
    ${where}
  `;
  const countQuery = `SELECT COUNT(*)::int AS total_count ${from};`;
  const dataQuery = `
    SELECT
      r.id, r.domaine, r.titre, r.sous_titre, r.reference_reglementaire, r.id_article,
      r.exigence, r.documents_justificatif, r.lien_1, r.lien_2, r.lien_3, r.lien_4,
      r.derniere_verification_jo,
      a.conformite, a."prioritée" AS "prioritée", a.faisabilite, a.plan_action, a.deadline, a.owner,
      ${userFields}
    ${from}
    ORDER BY r.id
    LIMIT ${addValue(limit)} OFFSET ${addValue(offset)};
  `;

  return { countQuery, dataQuery, values, page, limit };
};

// Recherche full-text, filtres d'audit et pagination côté serveur.
export const getReglementation = async (req, res) => {
  try {
    const { countQuery, dataQuery, values, page, limit } = buildReglementationQuery(req.query, req.user);
    const countValues = values.slice(0, values.length - 2);
    const [countResult, dataResult] = await Promise.all([
      pool.query(countQuery, countValues),
      pool.query(dataQuery, values),
    ]);

    const totalCount = countResult.rows[0].total_count;
    res.json({
      items: dataResult.rows,
      total_count: totalCount,
      page,
      limit,
      total_pages: Math.ceil(totalCount / limit),
    });
  } catch (err) {
    if (err.message?.startsWith("Le paramètre") || err.message?.startsWith("deadline_from")) {
      return res.status(400).json({ error: err.message });
    }

    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// Récupérer les titres uniques, éventuellement filtrés par domaine.
export const getTitres = async (req, res) => {
  try {
    const domaine = optionalText(req.query.domaine);
    const values = [];
    let sql = `SELECT DISTINCT titre FROM reglementation_all WHERE titre IS NOT NULL`;
    if (domaine) {
      values.push(domaine);
      sql += ` AND domaine = $${values.length}`;
    }
    sql += ` ORDER BY titre;`;
    const { rows } = await pool.query(sql, values);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// Récupérer les sous-titres uniques, éventuellement filtrés par domaine et/ou titre.
export const getSousTitres = async (req, res) => {
  try {
    const domaine = optionalText(req.query.domaine);
    const titre = optionalText(req.query.titre);
    const values = [];
    const filters = ["sous_titre IS NOT NULL"];
    if (domaine) {
      values.push(domaine);
      filters.push(`domaine = $${values.length}`);
    }
    if (titre) {
      values.push(titre);
      filters.push(`titre = $${values.length}`);
    }
    const sql = `SELECT DISTINCT sous_titre FROM reglementation_all WHERE ${filters.join(" AND ")} ORDER BY sous_titre;`;
    const { rows } = await pool.query(sql, values);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// Récupérer tous les domaines uniques
export const getDomaines = async (req, res) => {
  try {
    const sql = `SELECT DISTINCT domaine FROM reglementation_all ORDER BY domaine;`;
    const { rows } = await pool.query(sql);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// Récupérer les responsables (owner) uniques déjà utilisés dans les audits.
// Un utilisateur non administrateur ne voit que les responsables qu'il a lui-même renseignés.
export const getOwners = async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin";
    const sql = isAdmin
      ? `SELECT DISTINCT owner FROM audit_conformite WHERE owner IS NOT NULL AND owner <> '' ORDER BY owner;`
      : `SELECT DISTINCT owner FROM audit_conformite WHERE owner IS NOT NULL AND owner <> '' AND user_id = $1 ORDER BY owner;`;
    const { rows } = await pool.query(sql, isAdmin ? [] : [req.user.id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};
