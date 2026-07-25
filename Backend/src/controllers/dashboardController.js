// controllers/dashboardController.js (VERSION MISE À JOUR)
import { pool } from "../db.js";

// 📊 Dashboard avec statistiques complètes (adapté aux permissions)
export const getDashboardStats = async (req, res) => {
  try {
    const user_id = req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Filtres selon les permissions
    const userFilter = isAdmin ? '' : 'WHERE a.user_id = $1';
    const userValues = isAdmin ? [] : [user_id];

    // Statistiques générales
    const totalreglementation = await pool.query('SELECT COUNT(*) as total FROM reglementation_all');
    
    const totalAuditsQuery = isAdmin 
      ? 'SELECT COUNT(*) as total FROM audit_conformite'
      : 'SELECT COUNT(*) as total FROM audit_conformite WHERE user_id = $1';
    const totalAudits = await pool.query(totalAuditsQuery, userValues);
    
    // Répartition par conformité
    const conformiteQuery = `
      SELECT conformite, COUNT(*) as count 
      FROM audit_conformite a
      ${userFilter}
      ${isAdmin ? 'WHERE' : 'AND'} conformite IS NOT NULL
      GROUP BY conformite
    `;
    const conformiteStats = await pool.query(
      conformiteQuery, 
      isAdmin ? [] : [...userValues]
    );

    // Répartition par risque
    const risqueQuery = `
      SELECT risque, COUNT(*) as count 
      FROM audit_conformite a
      ${userFilter}
      ${isAdmin ? 'WHERE' : 'AND'} risque IS NOT NULL
      GROUP BY risque
    `;
    const risqueStats = await pool.query(
      risqueQuery, 
      isAdmin ? [] : [...userValues]
    );

    // Répartition par domaine
    const domaineQuery = `
      SELECT r.domaine, 
             COUNT(*) as total,
             COUNT(a.id) as audites,
             COUNT(CASE WHEN a.conformite = 'Conforme' THEN 1 END) as conformes,
             COUNT(CASE WHEN a.conformite = 'Non Conforme' THEN 1 END) as non_conformes
      FROM reglementation_all r
      LEFT JOIN audit_conformite a ON r.id = a.reglementation_id ${isAdmin ? '' : 'AND a.user_id = $1'}
      GROUP BY r.domaine
      ORDER BY total DESC
    `;
    const domaineStats = await pool.query(domaineQuery, userValues);

    // Échéances proches (30 jours)
    const echeancesQuery = `
      SELECT r.titre, r.domaine, a.deadline, a.owner, a.conformite
      FROM audit_conformite a
      JOIN reglementation_all r ON a.reglementation_id = r.id
      WHERE a.deadline BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
      AND a.conformite != 'Conforme'
      ${isAdmin ? '' : 'AND a.user_id = $1'}
      ORDER BY a.deadline ASC
    `;
    const echeancesProches = await pool.query(echeancesQuery, userValues);

    // Évolution mensuelle des audits
    const evolutionQuery = `
      SELECT 
        DATE_TRUNC('month', created_at) as mois,
        COUNT(*) as nouveaux_audits
      FROM audit_conformite
      WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
      ${isAdmin ? '' : 'AND user_id = $1'}
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY mois DESC
    `;
    const evolutionMensuelle = await pool.query(evolutionQuery, userValues);

    // Statistiques utilisateur spécifiques (pour les non-admins)
    let userSpecificStats = {};
    if (!isAdmin) {
      const userStatsQuery = `
        SELECT 
          COUNT(*) as mes_audits,
          COUNT(CASE WHEN conformite = 'Conforme' THEN 1 END) as mes_conformes,
          COUNT(CASE WHEN conformite = 'Non Conforme' THEN 1 END) as mes_non_conformes,
          COUNT(CASE WHEN deadline < CURRENT_DATE AND conformite != 'Conforme' THEN 1 END) as en_retard
        FROM audit_conformite 
        WHERE user_id = $1
      `;
      const userStats = await pool.query(userStatsQuery, [user_id]);
      userSpecificStats = userStats.rows[0];
    }

    res.json({
      totaux: {
        reglementation: parseInt(totalreglementation.rows[0].total),
        audits: parseInt(totalAudits.rows[0].total),
        taux_audit: totalreglementation.rows[0].total > 0 
          ? Math.round((totalAudits.rows[0].total / totalreglementation.rows[0].total) * 100) 
          : 0
      },
      conformite: conformiteStats.rows,
      risque: risqueStats.rows,
      domaines: domaineStats.rows,
      echeances_proches: echeancesProches.rows,
      evolution: evolutionMensuelle.rows,
      ...(isAdmin ? {} : { user_stats: userSpecificStats })
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// 📈 Rapport d'audit détaillé (adapté aux permissions)
export const getAuditReport = async (req, res) => {
  try {
    const { domaine, owner, conformite, date_debut, date_fin, user_id_filter } = req.query;
    const current_user_id = req.user.id;
    const isAdmin = req.user.role === 'admin';
    
    let filters = [];
    let values = [];
    let index = 1;

    // Pour les non-admins, filtrer automatiquement par leur user_id
    if (!isAdmin) {
      filters.push(`a.user_id = $${index++}`);
      values.push(current_user_id);
    } else if (user_id_filter) {
      // Les admins peuvent filtrer par utilisateur spécifique
      filters.push(`a.user_id = $${index++}`);
      values.push(user_id_filter);
    }

    if (domaine) {
      filters.push(`r.domaine = $${index++}`);
      values.push(domaine);
    }
    
    if (owner) {
      filters.push(`a.owner = $${index++}`);
      values.push(owner);
    }
    
    if (conformite) {
      filters.push(`a.conformite = $${index++}`);
      values.push(conformite);
    }
    
    if (date_debut) {
      filters.push(`a.created_at >= $${index++}`);
      values.push(date_debut);
    }
    
    if (date_fin) {
      filters.push(`a.created_at <= $${index++}`);
      values.push(date_fin + ' 23:59:59');
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

    const sql = `
      SELECT
        r.id, r.domaine, r.titre, r.sous_titre, r.exigence,
        a.conformite, a.risque, a.faisabilite, a.plan_action, a.deadline, a.owner,
        a.created_at, a.updated_at, a.user_id,
        u.first_name, u.last_name, u.email as user_email
      FROM reglementation_all r
      JOIN audit_conformite a ON r.id = a.reglementation_id
      LEFT JOIN users u ON a.user_id = u.id
      ${whereClause}
      ORDER BY a.updated_at DESC
    `;

    const { rows } = await pool.query(sql, values);
    res.json(rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// 📄 Sauvegarde en lot (modifiée pour inclure l'utilisateur)
export const bulkSaveAudits = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { audits } = req.body; // Array d'audits
    const user_id = req.user.id;
    
    if (!Array.isArray(audits) || audits.length === 0) {
      return res.status(400).json({ error: "Données invalides" });
    }

    await client.query('BEGIN');

    const results = [];
    
    for (const audit of audits) {
      const { reglementation_id, conformite, risque, faisabilite, plan_action, deadline, owner } = audit;
      
      if (!reglementation_id) continue;

      const sql = `
        INSERT INTO audit_conformite
          (reglementation_id, conformite, risque, faisabilite, plan_action, deadline, owner, user_id, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8, NOW(), NOW())
        ON CONFLICT (reglementation_id)
        DO UPDATE SET 
          conformite = EXCLUDED.conformite,
          risque = EXCLUDED.risque,
          faisabilite = EXCLUDED.faisabilite,
          plan_action = EXCLUDED.plan_action,
          deadline = EXCLUDED.deadline,
          owner = EXCLUDED.owner,
          user_id = EXCLUDED.user_id,
          updated_at = NOW()
        RETURNING *;
      `;

      const result = await client.query(sql, [
        reglementation_id,
        conformite || null,
        risque || null,
        faisabilite || null,
        plan_action || null,
        deadline || null,
        owner || null,
        user_id
      ]);

      results.push(result.rows[0]);
    }

    await client.query('COMMIT');
    res.json({ success: true, saved: results.length, audits: results });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la sauvegarde en lot" });
  } finally {
    client.release();
  }
};

// 📤 Export des données (adapté aux permissions)
export const exportAudits = async (req, res) => {
  try {
    const { format = 'csv', domaine, conformite } = req.query;
    const user_id = req.user.id;
    const isAdmin = req.user.role === 'admin';
    
    let filters = [];
    let values = [];
    let index = 1;

    // Pour les non-admins, filtrer par leur user_id
    if (!isAdmin) {
      filters.push(`a.user_id = $${index++}`);
      values.push(user_id);
    }

    if (domaine) {
      filters.push(`r.domaine = $${index++}`);
      values.push(domaine);
    }
    
    if (conformite) {
      filters.push(`a.conformite = $${index++}`);
      values.push(conformite);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

    const sql = `
      SELECT 
        r.domaine as "Domaine",
        r.titre as "Titre",
        r.sous_titre as "Sous-Titre",
        r.exigence as "Exigence",
        a.conformite as "Conformité",
        a.risque as "Risque",
        a.faisabilite as "Faisabilité",
        a.plan_action as "Plan d'Action",
        a.deadline as "Échéance",
        a.owner as "Responsable",
        ${isAdmin ? 'CONCAT(u.first_name, \' \', u.last_name) as "Auditeur",' : ''}
        a.created_at as "Date Création",
        a.updated_at as "Dernière Modification"
      FROM reglementation_all r
      LEFT JOIN audit_conformite a ON r.id = a.reglementation_id
      ${isAdmin ? 'LEFT JOIN users u ON a.user_id = u.id' : ''}
      ${whereClause}
      ORDER BY r.domaine, r.titre, r.sous_titre
    `;

    const { rows } = await pool.query(sql, values);

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=audit_export.json');
      return res.json(rows);
    }

    // Format CSV par défaut
    if (rows.length === 0) {
      return res.status(404).json({ error: "Aucune donnée à exporter" });
    }

    const headers = Object.keys(rows[0]);
    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        headers.map(header => {
          const value = row[header];
          return value ? `"${String(value).replace(/"/g, '""')}"` : '';
        }).join(',')
      )
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=audit_export.csv');
    res.send('\ufeff' + csvContent); // BOM pour UTF-8

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de l'export" });
  }
};