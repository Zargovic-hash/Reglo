// controllers/reportController.js
import { pool } from "../db.js";
import puppeteer from "puppeteer";
import ExcelJS from "exceljs";
import moment from "moment";

// ============================
// 📊 GÉNÉRATION RAPPORT PDF
// ============================
export const generatePDFReport = async (req, res) => {
  let browser = null;
  try {
    const { type, filters = {} } = req.body;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    console.log(`📊 Génération rapport PDF - Type: ${type}, Utilisateur: ${userId}`);

    let data, title, filename;
    
    switch (type) {
      case 'audit':
        ({ data, title, filename } = await getAuditData(filters, userId, isAdmin));
        break;
      case 'dashboard':
        ({ data, title, filename } = await getDashboardData(filters, userId, isAdmin));
        break;
      case 'reglementation':
        ({ data, title, filename } = await getReglementationData(filters, userId, isAdmin));
        break;
      default:
        return res.status(400).json({ error: "Type de rapport non supporté" });
    }

    const html = generateHTMLReport(data, title, type, filters);

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'domcontentloaded' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.end(pdfBuffer);

  } catch (err) {
    console.error("❌ Erreur génération PDF:", err.message);
    console.error("Stack trace:", err.stack);
    res.status(500).json({ error: `Erreur lors de la génération du rapport PDF: ${err.message}` });
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error("❌ Erreur fermeture browser:", closeError.message);
      }
    }
  }
};

// ============================
// 📈 GÉNÉRATION RAPPORT EXCEL
// ============================
export const generateExcelReport = async (req, res) => {
  try {
    const { type, filters = {} } = req.body;
    const userId = req.user?.id;
    const isAdmin = req.user?.role === 'admin';

    // Validation des données utilisateur
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifié" });
    }

    console.log(`📈 Génération rapport Excel - Type: ${type}, Utilisateur: ${userId}`);
    console.log(`📈 Filtres reçus:`, JSON.stringify(filters, null, 2));

    let data, title, filename;
    
    try {
      switch (type) {
        case 'audit':
          ({ data, title, filename } = await getAuditData(filters, userId, isAdmin));
          break;
        case 'dashboard':
          ({ data, title, filename } = await getDashboardData(filters, userId, isAdmin));
          break;
        case 'reglementation':
          ({ data, title, filename } = await getReglementationData(filters, userId, isAdmin));
          break;
        default:
          return res.status(400).json({ error: "Type de rapport non supporté" });
      }
    } catch (dataError) {
      console.error("❌ Erreur récupération données:", dataError.message);
      return res.status(500).json({ error: `Erreur lors de la récupération des données: ${dataError.message}` });
    }

    console.log(`📈 Données récupérées: ${Array.isArray(data) ? data.length : 'objet'} éléments`);

    // Vérification des données
    if (!data) {
      return res.status(404).json({ error: "Aucune donnée trouvée pour le rapport" });
    }

    let workbook;
    try {
      workbook = new ExcelJS.Workbook();
      
      // Métadonnées du workbook
      workbook.creator = 'SafeNext';
      workbook.lastModifiedBy = 'SafeNext';
      workbook.created = new Date();
      workbook.modified = new Date();
      workbook.lastPrinted = new Date();

      // Créer différents worksheets selon le type
      if (type === 'dashboard') {
        createDashboardWorksheet(workbook, data);
      } else {
        createDataWorksheet(workbook, data, type, title);
      }

    } catch (workbookError) {
      console.error("❌ Erreur création workbook:", workbookError.message);
      return res.status(500).json({ error: `Erreur lors de la création du fichier Excel: ${workbookError.message}` });
    }

    let buffer;
    try {
      buffer = await workbook.xlsx.writeBuffer();
    } catch (bufferError) {
      console.error("❌ Erreur génération buffer:", bufferError.message);
      return res.status(500).json({ error: `Erreur lors de la génération du buffer Excel: ${bufferError.message}` });
    }

    const excelFilename = filename.replace('.pdf', '.xlsx');

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${excelFilename}"`);
    
    console.log(`✅ Rapport Excel généré: ${excelFilename}, taille: ${buffer.length} bytes`);
    res.send(buffer);

  } catch (err) {
    console.error("❌ Erreur génération Excel:", err.message);
    console.error("Stack trace:", err.stack);
    res.status(500).json({ error: `Erreur lors de la génération du rapport Excel: ${err.message}` });
  }
};

// ============================
// 📋 RÉCUPÉRATION DES DONNÉES D'AUDIT
// ============================
const getAuditData = async (filters, userId, isAdmin) => {
  try {
    let filtersArray = [];
    let values = [];
    let index = 1;

    console.log("🔍 Filtres reçus pour audit:", JSON.stringify(filters, null, 2));

    // Filtre utilisateur (obligatoire si pas admin)
    if (!isAdmin) {
      filtersArray.push(`a.user_id = $${index++}`);
      values.push(userId);
    } else if (filters.user_id) {
      filtersArray.push(`a.user_id = $${index++}`);
      values.push(filters.user_id);
    }

    // Filtre Domaine
    if (filters.domaine) {
      filtersArray.push(`r.domaine = $${index++}`);
      values.push(filters.domaine);
    }

    // Filtre Conformité
    if (filters.conformite) {
      filtersArray.push(`a.conformite = $${index++}`);
      values.push(filters.conformite);
    }

    // Filtre Priorité
    if (filters.prioritée) {
      filtersArray.push(`a."prioritée" = $${index++}`);
      values.push(filters.prioritée);
    }

    // Filtre Propriétaire (Owner)
    if (filters.owner) {
      filtersArray.push(`a.owner = $${index++}`);
      values.push(filters.owner);
    }

    // Filtre Échéance proche
    if (filters.deadlineProche) {
      const today = new Date();
      
      switch (filters.deadlineProche) {
        case '7':
          const sevenDays = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
          filtersArray.push(`a.deadline >= $${index++} AND a.deadline <= $${index++}`);
          values.push(today.toISOString().split('T')[0]);
          values.push(sevenDays.toISOString().split('T')[0]);
          break;
        case '30':
          const thirtyDays = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
          filtersArray.push(`a.deadline >= $${index++} AND a.deadline <= $${index++}`);
          values.push(today.toISOString().split('T')[0]);
          values.push(thirtyDays.toISOString().split('T')[0]);
          break;
        case '90':
          const ninetyDays = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
          filtersArray.push(`a.deadline >= $${index++} AND a.deadline <= $${index++}`);
          values.push(today.toISOString().split('T')[0]);
          values.push(ninetyDays.toISOString().split('T')[0]);
          break;
        case 'expired':
          filtersArray.push(`a.deadline < $${index++}`);
          values.push(today.toISOString().split('T')[0]);
          break;
      }
    }

    // Recherche textuelle
    if (filters.search) {
      filtersArray.push(`(
        r.titre ILIKE $${index} OR 
        r.exigence ILIKE $${index} OR 
        r.domaine ILIKE $${index} OR
        a.plan_action ILIKE $${index}
      )`);
      values.push(`%${filters.search}%`);
      index++;
    }

    // Filtres de dates
    if (filters.date_debut) {
      filtersArray.push(`a.created_at >= $${index++}`);
      values.push(filters.date_debut);
    }

    if (filters.date_fin) {
      filtersArray.push(`a.created_at <= $${index++}`);
      values.push(filters.date_fin + ' 23:59:59');
    }

    // Forcer que les audits aient une conformité définie
    if (!filtersArray.some(f => f.includes('a.conformite'))) {
      filtersArray.push(`a.conformite IS NOT NULL`);
      filtersArray.push(`a.conformite != 'Non audité'`);
    }

    const whereClause = filtersArray.length > 0 ? `WHERE ${filtersArray.join(' AND ')}` : '';
    
    const sql = `
      SELECT
        r.id, r.domaine, r.titre, r.sous_titre, r.exigence,
        a.conformite,
        a."prioritée",
        a.faisabilite,
        a.plan_action, 
        a.deadline, 
        a.owner,
        a.created_at, 
        a.updated_at, 
        a.user_id,
        u.first_name, 
        u.last_name, 
        u.email as user_email
      FROM reglementation_all r
      JOIN audit_conformite a ON r.id = a.reglementation_id
      LEFT JOIN users u ON a.user_id = u.id
      ${whereClause}
      ORDER BY a.updated_at DESC
      LIMIT 10000
    `;

    console.log("📊 SQL Audit:", sql);
    console.log("📊 Values:", values);

    const { rows } = await pool.query(sql, values);
    
    console.log(`✅ ${rows.length} lignes retournées après filtrage`);

    return {
      data: rows,
      title: 'Rapport d\'Audit Réglementaire',
      filename: `rapport_audit_${moment().format('YYYY-MM-DD_HH-mm-ss')}.pdf`
    };
  } catch (error) {
    console.error("❌ Erreur getAuditData:", error.message);
    throw new Error(`Erreur lors de la récupération des données d'audit: ${error.message}`);
  }
};

// ============================
// 📊 RÉCUPÉRATION DES DONNÉES DASHBOARD
// ============================
const getDashboardData = async (filters, userId, isAdmin) => {
  try {
    let statsValues = [];
    let statsQuery = `
      SELECT 
        COUNT(*) as total_audits,
        COUNT(CASE WHEN conformite = 'Conforme' THEN 1 END) as conformes,
        COUNT(CASE WHEN conformite = 'Non Conforme' THEN 1 END) as non_conformes,
        COUNT(CASE WHEN conformite = 'En Cours' THEN 1 END) as en_cours,
        COUNT(CASE WHEN conformite = 'Non Applicable' THEN 1 END) as non_applicables
      FROM audit_conformite a
    `;
    
    let domainQuery = `
      SELECT 
        r.domaine,
        COUNT(*) as total,
        COUNT(CASE WHEN a.conformite = 'Conforme' THEN 1 END) as conformes,
        COUNT(CASE WHEN a.conformite = 'Non Conforme' THEN 1 END) as non_conformes
      FROM reglementation_all r
      JOIN audit_conformite a ON r.id = a.reglementation_id
    `;

    if (!isAdmin) {
      statsQuery += ` WHERE a.user_id = $1`;
      domainQuery += ` WHERE a.user_id = $1`;
      statsValues = [userId];
    }

    domainQuery += ` GROUP BY r.domaine ORDER BY r.domaine`;

    console.log("SQL Stats:", statsQuery);
    console.log("SQL Domains:", domainQuery);
    console.log("Values:", statsValues);

    const { rows: stats } = await pool.query(statsQuery, statsValues);
    const { rows: domains } = await pool.query(domainQuery, statsValues);

    return {
      data: { stats: stats[0], domains },
      title: 'Rapport Dashboard',
      filename: `rapport_dashboard_${moment().format('YYYY-MM-DD_HH-mm-ss')}.pdf`
    };
  } catch (error) {
    console.error("❌ Erreur getDashboardData:", error.message);
    throw new Error(`Erreur lors de la récupération des données dashboard: ${error.message}`);
  }
};

// ============================
// 📋 RÉCUPÉRATION DES DONNÉES RÉGLEMENTATION
// ============================
const getReglementationData = async (filters, userId, isAdmin) => {
  try {
    let filtersArray = [];
    let values = [];
    let index = 1;

    console.log("🔍 Filtres reçus pour réglementation:", JSON.stringify(filters, null, 2));
    console.log("👤 User ID:", userId, "| Admin:", isAdmin);

    // ✅ CORRECTION MAJEURE : Filtre utilisateur (obligatoire si pas admin)
    // Seuls les audits de l'utilisateur connecté sont affichés pour les non-admins
    if (!isAdmin) {
      filtersArray.push(`a.user_id = $${index++}`);
      values.push(userId);
      console.log("🔒 Filtre utilisateur appliqué: user_id =", userId);
    } else if (filters.user_id) {
      // Les admins peuvent filtrer par utilisateur spécifique
      filtersArray.push(`a.user_id = $${index++}`);
      values.push(filters.user_id);
      console.log("🔒 Filtre utilisateur admin appliqué: user_id =", filters.user_id);
    }

    // ✅ CORRECTION MAJEURE : Exclure les audits vides
    // N'afficher que les audits renseignés (partiellement ou complètement)
    filtersArray.push(`(
      a.conformite IS NOT NULL OR 
      a."prioritée" IS NOT NULL OR 
      a.faisabilite IS NOT NULL OR 
      a.plan_action IS NOT NULL OR 
      a.deadline IS NOT NULL OR 
      a.owner IS NOT NULL
    )`);
    console.log("✅ Filtre audits renseignés appliqué");

    // Filtre Domaine
    if (filters.domaine) {
      filtersArray.push(`r.domaine = $${index++}`);
      values.push(filters.domaine);
    }

    // Filtre Titre
    if (filters.titre) {
      filtersArray.push(`r.titre ILIKE $${index++}`);
      values.push(`%${filters.titre}%`);
    }

    // Filtre Conformité (statut)
    if (filters.conformite) {
      filtersArray.push(`a.conformite = $${index++}`);
      values.push(filters.conformite);
    }

    // Filtre Priorité
    if (filters.prioritée) {
      filtersArray.push(`a."prioritée" = $${index++}`);
      values.push(filters.prioritée);
    }

    // Filtre Propriétaire (Owner)
    if (filters.owner) {
      filtersArray.push(`a.owner = $${index++}`);
      values.push(filters.owner);
    }

    // Filtre Échéance proche
    if (filters.deadlineProche) {
      const today = new Date();
      let deadlineCondition = '';
      
      switch (filters.deadlineProche) {
        case '7':
          const sevenDays = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
          filtersArray.push(`a.deadline >= $${index++} AND a.deadline <= $${index++}`);
          values.push(today.toISOString().split('T')[0]);
          values.push(sevenDays.toISOString().split('T')[0]);
          break;
        case '30':
          const thirtyDays = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
          filtersArray.push(`a.deadline >= $${index++} AND a.deadline <= $${index++}`);
          values.push(today.toISOString().split('T')[0]);
          values.push(thirtyDays.toISOString().split('T')[0]);
          break;
        case '90':
          const ninetyDays = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
          filtersArray.push(`a.deadline >= $${index++} AND a.deadline <= $${index++}`);
          values.push(today.toISOString().split('T')[0]);
          values.push(ninetyDays.toISOString().split('T')[0]);
          break;
        case 'expired':
          filtersArray.push(`a.deadline < $${index++}`);
          values.push(today.toISOString().split('T')[0]);
          break;
      }
    }

    // Recherche textuelle globale
    if (filters.search) {
      filtersArray.push(`(
        r.titre ILIKE $${index} OR
        r.exigence ILIKE $${index} OR
        r.reference_reglementaire ILIKE $${index} OR
        r.documents_justificatif ILIKE $${index} OR
        r.domaine ILIKE $${index}
      )`);
      values.push(`%${filters.search}%`);
      index++;
    }

    // Filtres de dates personnalisées
    if (filters.date_debut) {
      filtersArray.push(`a.created_at >= $${index++}`);
      values.push(filters.date_debut);
    }

    if (filters.date_fin) {
      filtersArray.push(`a.created_at <= $${index++}`);
      values.push(filters.date_fin + ' 23:59:59');
    }

    const whereClause = filtersArray.length > 0 ? `WHERE ${filtersArray.join(' AND ')}` : '';
    
    // ✅ CORRECTION : Utiliser INNER JOIN au lieu de LEFT JOIN
    // Cela garantit qu'on ne récupère que les réglementations avec audits
    let sql = `
      SELECT
        r.id, r.domaine, r.titre, r.sous_titre, r.exigence, r.reference_reglementaire, r.documents_justificatif,
        a.conformite, a."prioritée", a.faisabilite, a.plan_action, a.deadline, a.owner
      FROM reglementation_all r
      INNER JOIN audit_conformite a ON r.id = a.reglementation_id
    `;

    sql += ` ${whereClause} ORDER BY r.domaine, r.titre, r.id LIMIT 10000`;

    console.log("📊 SQL Reglementation:", sql);
    console.log("📊 Values:", values);

    const { rows } = await pool.query(sql, values);
    
    console.log(`✅ ${rows.length} réglementations trouvées pour l'utilisateur ${userId}`);

    return {
      data: rows,
      title: 'Rapport Réglementation',
      filename: `rapport_reglementation_${moment().format('YYYY-MM-DD_HH-mm-ss')}.pdf`
    };
  } catch (error) {
    console.error("❌ Erreur getReglementationData:", error.message);
    throw new Error(`Erreur lors de la récupération des données réglementation: ${error.message}`);
  }
};

// ============================
// 🎨 GÉNÉRATION HTML POUR PDF
// ============================
const generateHTMLReport = (data, title, type, filters) => {
  const currentDate = moment().format('DD/MM/YYYY à HH:mm');
  
  let content = '';
  
  try {
    if (type === 'dashboard') {
      content = generateDashboardHTML(data);
    } else if (type === 'audit') {
      content = generateAuditHTML(data);
    } else {
      content = generateReglementationHTML(data);
    }
  } catch (error) {
    console.error("❌ Erreur génération HTML:", error.message);
    content = `<p>Erreur lors de la génération du contenu: ${error.message}</p>`;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          margin: 0; 
          padding: 20px; 
          color: #333;
          line-height: 1.6;
        }
        .header { 
          text-align: center; 
          border-bottom: 2px solid #3b82f6; 
          padding-bottom: 20px; 
          margin-bottom: 30px;
        }
        .header h1 { 
          color: #3b82f6; 
          margin: 0; 
          font-size: 24px;
        }
        .header p { 
          color: #666; 
          margin: 5px 0 0 0; 
          font-size: 14px;
        }
        .filters { 
          background: #f8f9fa; 
          padding: 15px; 
          border-radius: 5px; 
          margin-bottom: 20px;
          font-size: 12px;
        }
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-top: 20px;
          font-size: 10px;
        }
        th, td { 
          border: 1px solid #dee2e6; 
          padding: 4px; 
          text-align: left;
          vertical-align: top;
        }
        th { 
          background: #3b82f6; 
          color: white; 
          font-weight: bold;
        }
        tr:nth-child(even) { 
          background: #f8f9fa; 
        }
        .stats-grid { 
          display: grid; 
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
          gap: 15px; 
          margin-bottom: 20px;
        }
        .stat-card { 
          background: #f8f9fa; 
          padding: 15px; 
          border-radius: 5px; 
          text-align: center;
          border-left: 4px solid #3b82f6;
        }
        .stat-number { 
          font-size: 24px; 
          font-weight: bold; 
          color: #3b82f6;
        }
        .stat-label { 
          font-size: 12px; 
          color: #666; 
          margin-top: 5px;
        }
        .footer { 
          margin-top: 30px; 
          text-align: center; 
          font-size: 10px; 
          color: #666;
          border-top: 1px solid #dee2e6;
          padding-top: 10px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${title}</h1>
        <p>Généré le ${currentDate}</p>
        <p>SafeNext - Système d'Audit Réglementaire</p>
      </div>
      
      ${Object.keys(filters).length > 0 ? `
        <div class="filters">
          <h3>Filtres appliqués :</h3>
          ${Object.entries(filters).map(([key, value]) => 
            `<span><strong>${key}:</strong> ${value}</span>`
          ).join(' • ')}
        </div>
      ` : ''}
      
      ${content}
      
      <div class="footer">
        <p>Rapport généré automatiquement par SafeNext</p>
        <p>© ${new Date().getFullYear()} SafeNext - Tous droits réservés</p>
      </div>
    </body>
    </html>
  `;
};

// ============================
// 📊 HTML DASHBOARD
// ============================
const generateDashboardHTML = (data) => {
  const { stats, domains } = data;
  
  return `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-number">${stats?.total_audits || 0}</div>
        <div class="stat-label">Total Audits</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${stats?.conformes || 0}</div>
        <div class="stat-label">Conformes</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${stats?.non_conformes || 0}</div>
        <div class="stat-label">Non Conformes</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${stats?.en_cours || 0}</div>
        <div class="stat-label">En Cours</div>
      </div>
    </div>
    
    <h3>Répartition par Domaine</h3>
    <table>
      <thead>
        <tr>
          <th>Domaine</th>
          <th>Total</th>
          <th>Conformes</th>
          <th>Non Conformes</th>
          <th>Taux</th>
        </tr>
      </thead>
      <tbody>
        ${domains?.map(domain => `
          <tr>
            <td>${domain?.domaine || 'N/A'}</td>
            <td>${domain?.total || 0}</td>
            <td>${domain?.conformes || 0}</td>
            <td>${domain?.non_conformes || 0}</td>
            <td>${domain?.total > 0 ? Math.round((domain.conformes / domain.total) * 100) : 0}%</td>
          </tr>
        `).join('') || '<tr><td colspan="5">Aucune donnée disponible</td></tr>'}
      </tbody>
    </table>
  `;
};

// ============================
// 📋 HTML AUDIT
// ============================
const generateAuditHTML = (data) => {
  return `
    <h3>Détail des Audits (${data?.length || 0} éléments)</h3>
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Domaine</th>
          <th>Titre</th>
          <th>Conformité</th>
          <th>Priorité</th>
          <th>Faisabilité</th>
          <th>Responsable</th>
          <th>Échéance</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
        ${data?.map(audit => `
          <tr>
            <td>${audit?.id || 'N/A'}</td>
            <td>${audit?.domaine || 'N/A'}</td>
            <td>${audit?.titre || 'N/A'}</td>
            <td>${audit?.conformite || 'N/A'}</td>
            <td>${audit?.prioritée || 'N/A'}</td>
            <td>${audit?.faisabilite || 'N/A'}</td>
            <td>${audit?.owner || 'N/A'}</td>
            <td>${audit?.deadline ? moment(audit.deadline).format('DD/MM/YYYY') : 'N/A'}</td>
            <td>${audit?.created_at ? moment(audit.created_at).format('DD/MM/YYYY') : 'N/A'}</td>
          </tr>
        `).join('') || '<tr><td colspan="9">Aucune donnée disponible</td></tr>'}
      </tbody>
    </table>
  `;
};

// ============================
// 📋 HTML RÉGLEMENTATION
// ============================
const generateReglementationHTML = (data) => {
  return `
    <h3>Réglementation (${data?.length || 0} éléments)</h3>
    <table>
      <thead>
        <tr>
          <th>Titre</th>
          <th>Exigence</th>
          <th>Conformité</th>
          <th>Priorité</th>
          <th>Faisabilité</th>
          <th>Plan Action</th>
          <th>Responsable</th>
          <th>Échéance</th>
        </tr>
      </thead>
      <tbody>
        ${data?.map(reg => `
          <tr>
            <td>${reg?.titre || 'N/A'}</td>
            <td>${reg?.exigence ? (reg.exigence.length > 100 ? reg.exigence.substring(0, 100) + '...' : reg.exigence) : 'N/A'}</td>
            <td>${reg?.conformite || 'N/A'}</td>
            <td>${reg?.prioritée || 'N/A'}</td>
            <td>${reg?.faisabilite || 'N/A'}</td>
            <td>${reg?.plan_action ? (reg.plan_action.length > 100 ? reg.plan_action.substring(0, 100) + '...' : reg.plan_action) : 'N/A'}</td>
            <td>${reg?.owner || 'N/A'}</td>
            <td>${reg?.deadline ? moment(reg.deadline).format('DD/MM/YYYY') : 'N/A'}</td>
          </tr>
        `).join('') || '<tr><td colspan="8">Aucune donnée disponible</td></tr>'}
      </tbody>
    </table>
  `;
};

// ============================
// 📊 CRÉATION WORKSHEET DASHBOARD
// ============================
const createDashboardWorksheet = (workbook, data) => {
  try {
    const worksheet = workbook.addWorksheet('Dashboard');
    
    // En-têtes
    worksheet.addRow(['Métrique', 'Valeur']);
    
    // Statistiques générales
    const stats = data?.stats || {};
    worksheet.addRow(['Total Audits', stats.total_audits || 0]);
    worksheet.addRow(['Conformes', stats.conformes || 0]);
    worksheet.addRow(['Non Conformes', stats.non_conformes || 0]);
    worksheet.addRow(['En Cours', stats.en_cours || 0]);
    worksheet.addRow(['Non Applicables', stats.non_applicables || 0]);
    
    // Ligne vide
    worksheet.addRow(['', '']);
    
    // En-têtes pour domaines
    worksheet.addRow(['Domaine', 'Total', 'Conformes', 'Non Conformes', 'Taux']);
    
    // Données par domaine
    if (data?.domains && Array.isArray(data.domains)) {
      data.domains.forEach(domain => {
        const taux = domain?.total > 0 ? Math.round((domain.conformes / domain.total) * 100) : 0;
        worksheet.addRow([
          domain?.domaine || 'N/A',
          domain?.total || 0,
          domain?.conformes || 0,
          domain?.non_conformes || 0,
          `${taux}%`
        ]);
      });
    }
    
    // Styliser
    styleWorksheet(worksheet);
  } catch (error) {
    console.error("❌ Erreur createDashboardWorksheet:", error.message);
    throw error;
  }
};

// ============================
// 📊 CRÉATION WORKSHEET DATA
// ============================
const createDataWorksheet = (workbook, data, type, title) => {
  try {
    const worksheet = workbook.addWorksheet(title.substring(0, 31)); // Excel limite à 31 caractères
    
    if (!Array.isArray(data)) {
      worksheet.addRow(['Erreur', 'Les données ne sont pas dans le bon format']);
      return;
    }

    if (data.length === 0) {
      worksheet.addRow(['Information', 'Aucune donnée disponible']);
      return;
    }
    
    if (type === 'audit') {
      // En-têtes audit
      worksheet.addRow(['ID', 'Domaine', 'Titre', 'Conformité', 'Priorité', 'Faisabilité', 'Plan Action', 'Responsable', 'Échéance', 'Date Création']);
      
      // Données audit
      data.forEach(audit => {
        worksheet.addRow([
          audit?.id || 'N/A',
          audit?.domaine || 'N/A',
          audit?.titre || 'N/A',
          audit?.conformite || 'N/A',
          audit?.prioritée || 'N/A',
          audit?.faisabilite || 'N/A',
          audit?.plan_action || 'N/A',
          audit?.owner || 'N/A',
          audit?.deadline ? moment(audit.deadline).format('DD/MM/YYYY') : 'N/A',
          audit?.created_at ? moment(audit.created_at).format('DD/MM/YYYY') : 'N/A'
        ]);
      });
    } else {
      // ✅ En-têtes réglementation (colonnes simplifiées)
      worksheet.addRow(['Titre', 'Exigence', 'Conformité', 'Priorité', 'Faisabilité', 'Plan Action', 'Responsable', 'Échéance']);
      
      // ✅ Données réglementation (colonnes simplifiées)
      data.forEach(reg => {
        worksheet.addRow([
          reg?.titre || 'N/A',
          reg?.exigence || 'N/A',
          reg?.conformite || 'N/A',
          reg?.prioritée || 'N/A',
          reg?.faisabilite || 'N/A',
          reg?.plan_action || 'N/A',
          reg?.owner || 'N/A',
          reg?.deadline ? moment(reg.deadline).format('DD/MM/YYYY') : 'N/A'
        ]);
      });
    }
    
    // Styliser
    styleWorksheet(worksheet);
  } catch (error) {
    console.error("❌ Erreur createDataWorksheet:", error.message);
    throw error;
  }
};

// ============================
// 🎨 STYLISATION WORKSHEET
// ============================
const styleWorksheet = (worksheet) => {
  try {
    // Style en-têtes
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3B82F6' }
    };
    
    // Bordures et alignement
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.alignment = { 
          vertical: 'middle', 
          horizontal: 'left',
          wrapText: true 
        };
      });
    });
    
    // Auto-ajuster colonnes
    worksheet.columns.forEach(column => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        if (cell.value) {
          const columnLength = cell.value.toString().length;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        }
      });
      column.width = maxLength < 10 ? 10 : maxLength > 50 ? 50 : maxLength + 2;
    });
  } catch (error) {
    console.error("❌ Erreur styleWorksheet:", error.message);
    // Ne pas rethrow pour éviter de bloquer la génération
  }
};