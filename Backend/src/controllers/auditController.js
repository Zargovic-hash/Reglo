// controllers/auditController.js (VERSION MISE À JOUR)
import { pool } from "../db.js";

export const saveAudit = async (req, res) => {
  try {
    const { reglementation_id, conformite, prioritée, faisabilite, plan_action, deadline, owner } = req.body;
    const user_id = req.user.id; // Récupérer l'ID de l'utilisateur connecté

    console.log("🔥 Données reçues:", { ...req.body, user_id }); // Debug
        console.log("➡️ Valeur de priorité reçue :", req.body.prioritée);


    if (!reglementation_id) {
      return res.status(400).json({ error: "reglementation_id manquant" });
    }

   const sql = `
  INSERT INTO audit_conformite
    (reglementation_id, conformite, "prioritée", faisabilite, plan_action, deadline, owner, user_id, created_at, updated_at)
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8, NOW(), NOW())
  ON CONFLICT (reglementation_id)
  DO UPDATE SET 
    conformite = EXCLUDED.conformite,
    "prioritée" = EXCLUDED."prioritée",
    faisabilite = EXCLUDED.faisabilite,
    plan_action = EXCLUDED.plan_action,
    deadline = EXCLUDED.deadline,
    owner = EXCLUDED.owner,
    user_id = EXCLUDED.user_id,
    updated_at = NOW()
  RETURNING *;
`;


    const { rows } = await pool.query(sql, [
      reglementation_id,
      conformite || null,
       prioritée || null,
      faisabilite || null,
      plan_action || null,
      deadline || null,
      owner || null,
      user_id
    ]);

    console.log("✅ Audit sauvegardé:", rows[0]); // Debug
    
    res.json({ success: true, audit: rows[0] });
  } catch (err) {
    console.error("❌ Erreur sauvegarde audit:", err);
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
};

// Fonction modifiée pour récupérer un audit en tenant compte des permissions
export const getAudit = async (req, res) => {
  try {
    const { reglementation_id } = req.params;
    const user_id = req.user.id;
    const isAdmin = req.user.role === 'admin';
    
    // Les admins peuvent voir tous les audits, les users seulement les leurs
    let sql, params;
    
    if (isAdmin) {
      sql = `
        SELECT a.*, u.first_name, u.last_name, u.email as user_email
        FROM audit_conformite a
        LEFT JOIN users u ON a.user_id = u.id
        WHERE a.reglementation_id = $1
      `;
      params = [reglementation_id];
    } else {
      sql = `
        SELECT a.*, u.first_name, u.last_name, u.email as user_email
        FROM audit_conformite a
        LEFT JOIN users u ON a.user_id = u.id
        WHERE a.reglementation_id = $1 AND (a.user_id = $2 OR a.user_id IS NULL)
      `;
      params = [reglementation_id, user_id];
    }
    
    const { rows } = await pool.query(sql, params);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: "Audit non trouvé" });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// Nouvelle fonction pour récupérer les audits de l'utilisateur connecté
export const getUserAudits = async (req, res) => {
  try {
    const user_id = req.user.id;
    const isAdmin = req.user.role === 'admin';
    const { page = 1, limit = 20, conformite, domaine } = req.query;
    const offset = (page - 1) * limit;

    let filters = [];
    let values = [];
    let paramIndex = 1;

    // Pour les utilisateurs normaux, filtrer par user_id
    if (!isAdmin) {
      filters.push(`a.user_id = ${paramIndex++}`);
      values.push(user_id);
    }

    if (conformite) {
      filters.push(`a.conformite = ${paramIndex++}`);
      values.push(conformite);
    }

    if (domaine) {
      filters.push(`r.domaine = ${paramIndex++}`);
      values.push(domaine);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

    // Compter le total
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM audit_conformite a
      JOIN reglementation_all r ON a.reglementation_id = r.id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total);

    // Récupérer les audits
    values.push(limit, offset);
    const auditsQuery = `
      SELECT 
        a.*,
        r.domaine, r.titre, r.sous_titre, r.exigence,
        u.first_name, u.last_name, u.email as user_email
      FROM audit_conformite a
      JOIN reglementation_all r ON a.reglementation_id = r.id
      LEFT JOIN users u ON a.user_id = u.id
      ${whereClause}
      ORDER BY a.updated_at DESC
      LIMIT ${paramIndex++} OFFSET ${paramIndex++}
    `;

    const { rows } = await pool.query(auditsQuery, values);

    res.json({
      audits: rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (err) {
    console.error('Erreur récupération audits utilisateur:', err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};