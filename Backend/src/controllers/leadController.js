import PDFDocument from "pdfkit";
import moment from "moment";
import { pool } from "../db.js";

// ============================
// 📋 EXIGENCES RÉELLES — chargées dynamiquement depuis reglementation_all
// (domaine "Autorisations et gouvernance Environnementales", Titres
// "Taxes et frais environnementaux", "Autorisation d exploitation" et
// "Délégués pour l'environnement").
// Toute modification faite dans l'app Reglo+ se reflète automatiquement ici.
// ============================
const DOMAINE = "Autorisations et gouvernance Environnementales";
const TITRES = [
  "Taxes et frais environnementaux",
  "Autorisation d exploitation",
  "Délégués pour l’environnement",
];

const fetchQuestions = async () => {
  const { rows } = await pool.query(
    `SELECT id, titre AS groupe, exigence AS texte, reference_reglementaire AS ref
     FROM reglementation_all
     WHERE domaine = $1 AND titre = ANY($2::text[])
     ORDER BY titre, id`,
    [DOMAINE, TITRES]
  );
  return rows;
};

const SCORE_VALUES = { oui: 1, non: 0 };
const VALID_REPONSES = new Set([...Object.keys(SCORE_VALUES), "non_applicable"]);

// ============================
// 🎯 ÉTUDES RECOMMANDÉES — déclenchées quand le lead répond "non" sur au
// moins une question du groupe (titre) correspondant.
// ============================
const SERVICES_BY_GROUPE = {
  "Autorisation d exploitation": {
    label: "Étude & dossier d'autorisation d'exploitation",
    description:
      "Constitution et dépôt de votre dossier de demande d'autorisation d'exploitation auprès de la Direction de l'Environnement de wilaya.",
  },
  "Taxes et frais environnementaux": {
    label: "Mise en conformité fiscale environnementale",
    description:
      "Calcul et sécurisation de vos déclarations de taxes et redevances environnementales pour éviter tout redressement.",
  },
  "Délégués pour l’environnement": {
    label: "Désignation du délégué à l'environnement",
    description:
      "Accompagnement pour la désignation et la déclaration de votre délégué à l'environnement conformément à la réglementation en vigueur.",
  },
};

// Études toujours proposées, indépendamment du quiz, car non couvertes par
// ses questions actuelles (audit environnemental global, étude de danger,
// produits dangereux).
const AUTRES_ETUDES = [
  {
    label: "Audit environnemental complet",
    description:
      "Diagnostic complet de votre conformité sur l'ensemble des domaines EHS (air, eau, déchets, produits chimiques, sécurité...).",
  },
  {
    label: "Étude de danger",
    description:
      "Analyse des risques industriels et des scénarios d'accidents majeurs, exigée pour les installations classées à risque.",
  },
  {
    label: "Rapport sur les produits dangereux",
    description:
      "Inventaire, classification et plan de gestion des matières et produits chimiques dangereux présents sur site.",
  },
];

const computeNonConformGroupes = (questions, answersById) => {
  const groupes = new Set();
  questions.forEach((q) => {
    if (answersById[q.id] === "non") groupes.add(q.groupe);
  });
  return [...groupes];
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TELEPHONE_REGEX = /^[0-9+()\s.-]{8,20}$/;

// ============================
// ✅ VALIDATION
// ============================
const validatePayload = ({ telephone, email, reponses }, questionsById) => {
  if (!telephone || !TELEPHONE_REGEX.test(String(telephone).trim())) {
    return "Numéro de téléphone obligatoire et valide requis.";
  }
  if (!email || !EMAIL_REGEX.test(String(email).trim())) {
    return "Email obligatoire et valide requis.";
  }
  if (!Array.isArray(reponses) || reponses.length === 0) {
    return "Réponses au questionnaire manquantes.";
  }
  for (const { questionId, reponse } of reponses) {
    if (!questionsById[questionId]) {
      return `Question inconnue: ${questionId}`;
    }
    if (!VALID_REPONSES.has(reponse)) {
      return `Réponse invalide pour ${questionId}`;
    }
  }
  return null;
};

// ============================
// 📊 CALCUL DU SCORE (côté serveur, ne fait pas confiance au client)
// ============================
const computeScore = (reponses, questions) => {
  const answersById = Object.fromEntries(reponses.map((r) => [r.questionId, r.reponse]));
  let total = 0;
  let applicableCount = 0;
  questions.forEach((q) => {
    const reponse = answersById[q.id];
    if (reponse === "non_applicable") return;
    applicableCount++;
    total += SCORE_VALUES[reponse] ?? 0;
  });
  const score = applicableCount > 0 ? Math.round((total / applicableCount) * 100) : 0;
  let niveau = "Non conforme";
  if (score >= 80) niveau = "Conforme";
  else if (score >= 50) niveau = "Partiellement conforme";
  return { score, niveau, answersById };
};

// ============================
// 📄 GÉNÉRATION DU RAPPORT PDF (pdfkit — pas de navigateur, léger en mémoire)
// ============================
const REPONSE_LABEL = { oui: "Oui", non: "Non", non_applicable: "Non applicable" };
const REPONSE_COLOR = { oui: "#16a34a", non: "#dc2626", non_applicable: "#64748b" };

const niveauColorFor = (niveau) =>
  niveau === "Conforme" ? "#16a34a" : niveau === "Partiellement conforme" ? "#d97706" : "#dc2626";

const BRAND_GREEN_DARK = "#14532d";
const BRAND_GREEN = "#16a34a";
const BRAND_GREEN_LIGHT = "#dcfce7";
const BRAND_BLUE = "#2563eb";

const drawServiceItem = (doc, service) => {
  doc.fontSize(11).fillColor("#1e293b").font("Helvetica-Bold").text(service.label, { continued: false });
  doc.fontSize(10).fillColor("#475569").font("Helvetica").text(service.description);
  doc.moveDown(0.5);
};

// Petite pastille colorée (Oui / Non / Non applicable), plus rapide à scanner qu'un texte simple.
const drawReponsePill = (doc, reponse) => {
  const label = REPONSE_LABEL[reponse] || "N/A";
  const color = REPONSE_COLOR[reponse] || "#64748b";
  const paddingX = 8;
  const pillHeight = 16;

  doc.font("Helvetica-Bold").fontSize(8.5);
  const pillWidth = doc.widthOfString(label) + paddingX * 2;
  const x = doc.page.margins.left;
  const y = doc.y;

  doc.roundedRect(x, y, pillWidth, pillHeight, 4).fill(color);
  doc.fillColor("#ffffff").text(label, x, y + 3.5, { width: pillWidth, align: "center", lineBreak: false });

  doc.x = doc.page.margins.left;
  doc.y = y + pillHeight + 8;
};

// Bandeau de marque en haut de la première page (Smart Safety Services + Reglo+).
const drawBrandHeader = (doc, { nom, currentDate }) => {
  const bandHeight = 92;
  const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  doc.rect(0, 0, doc.page.width, bandHeight).fill(BRAND_GREEN_DARK);

  // Marque vectorielle : carré blanc + coche verte (pas d'image externe)
  const markSize = 34;
  const markX = doc.page.margins.left;
  const markY = 20;
  doc.roundedRect(markX, markY, markSize, markSize, 8).fill("#ffffff");
  doc.lineWidth(3).strokeColor(BRAND_GREEN)
    .moveTo(markX + 8, markY + 18).lineTo(markX + 15, markY + 25).lineTo(markX + 27, markY + 9).stroke();

  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(15)
    .text("Smart Safety Services", markX + markSize + 12, markY, { lineBreak: false });
  doc.fillColor(BRAND_GREEN_LIGHT).font("Helvetica").fontSize(9)
    .text("Reglo+ — Rapport de conformité environnementale", markX + markSize + 12, markY + 19, { lineBreak: false });

  doc.fillColor("#ffffff").font("Helvetica").fontSize(8.5)
    .text(currentDate, doc.page.margins.left, markY + 2, { width: usableWidth, align: "right" });
  if (nom) {
    doc.text(`Établissement : ${nom}`, doc.page.margins.left, markY + 16, { width: usableWidth, align: "right" });
  }

  doc.x = doc.page.margins.left;
  doc.y = bandHeight + 24;
};

// Résumé exécutif : score, niveau, et priorités si des non-conformités ont été détectées.
const drawExecutiveSummary = (doc, { score, niveau, recommendedServices }) => {
  const niveauColor = niveauColorFor(niveau);

  doc.fontSize(34).fillColor(niveauColor).font("Helvetica-Bold").text(`${score}%`, { align: "center" });
  doc.fontSize(14).fillColor(niveauColor).font("Helvetica-Bold").text(niveau, { align: "center" });
  doc.moveDown(0.8);

  if (recommendedServices.length) {
    const boxX = doc.page.margins.left;
    const boxWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const boxY = doc.y;

    doc.font("Helvetica").fontSize(10);
    const lines = recommendedServices.map((s) => `•  ${s.label}`);
    const textHeight = lines.reduce((h, l) => h + doc.heightOfString(l, { width: boxWidth - 32 }) + 4, 0);
    const boxHeight = textHeight + 40;

    doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 8).fill("#fef2f2");
    doc.fillColor("#b91c1c").fontSize(11).text("Priorités identifiées", boxX + 16, boxY + 12);
    doc.font("Helvetica").fontSize(10).fillColor("#7f1d1d");
    let lineY = boxY + 30;
    lines.forEach((l) => {
      doc.text(l, boxX + 16, lineY, { width: boxWidth - 32 });
      lineY = doc.y + 4;
    });

    doc.x = doc.page.margins.left;
    doc.y = boxY + boxHeight + 16;
  }

  doc.moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .strokeColor("#e2e8f0").stroke();
  doc.moveDown(1);
};

// Pied de page (coordonnées + identifiants légaux + numérotation), répété sur chaque page.
const drawFooters = (doc) => {
  const range = doc.bufferedPageRange();
  const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const bottomY = doc.page.height - doc.page.margins.bottom + 14;

    doc.moveTo(doc.page.margins.left, bottomY - 6)
      .lineTo(doc.page.width - doc.page.margins.right, bottomY - 6)
      .strokeColor("#e2e8f0").stroke();

    // Écrire sous la marge basse déclenche normalement un saut de page automatique chez
    // pdfkit (même en position absolue) : on désactive temporairement cette marge.
    const originalBottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;

    doc.font("Helvetica").fontSize(7.5).fillColor("#94a3b8").text(
      "Smart Safety Services — Agrément N° à compléter · RC à compléter · NIF à compléter · AI à compléter",
      doc.page.margins.left,
      bottomY,
      { width: usableWidth, align: "center" }
    );
    doc.text(
      `Page ${i - range.start + 1} / ${range.count} — © ${new Date().getFullYear()} Reglo+`,
      doc.page.margins.left,
      bottomY + 10,
      { width: usableWidth, align: "center" }
    );

    doc.page.margins.bottom = originalBottomMargin;
  }
};

const generateReportPDF = ({ nom, score, niveau, answersById, questions }) =>
  new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 45, bufferPages: true });
      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const currentDate = moment().format("DD/MM/YYYY à HH:mm");
      const nonConformGroupes = computeNonConformGroupes(questions, answersById);
      const recommendedServices = nonConformGroupes.map((g) => SERVICES_BY_GROUPE[g]).filter(Boolean);

      drawBrandHeader(doc, { nom, currentDate });
      drawExecutiveSummary(doc, { score, niveau, recommendedServices });

      // Questions grouped by groupe
      let currentGroupe = null;
      questions.forEach((q) => {
        if (q.groupe !== currentGroupe) {
          currentGroupe = q.groupe;
          doc.moveDown(0.5);
          doc.fontSize(12).fillColor(BRAND_BLUE).font("Helvetica-Bold").text(currentGroupe.toUpperCase());
          doc.moveDown(0.2);
        }
        const reponse = answersById[q.id];
        doc.fontSize(10).fillColor("#0f172a").font("Helvetica-Bold").text(q.texte);
        doc.fontSize(8.5).fillColor("#64748b").font("Helvetica").text(q.ref);
        doc.moveDown(0.3);
        drawReponsePill(doc, reponse);
      });

      // Recommendations
      if (recommendedServices.length) {
        doc.moveDown(0.5);
        doc.fontSize(13).fillColor(BRAND_BLUE).font("Helvetica-Bold")
          .text("Nos recommandations pour vous mettre en conformité");
        doc.moveDown(0.3);
        recommendedServices.forEach((s) => drawServiceItem(doc, s));
      }

      doc.moveDown(0.5);
      doc.fontSize(13).fillColor(BRAND_BLUE).font("Helvetica-Bold")
        .text("D'autres vérifications réglementaires à ne pas négliger");
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor("#334155").font("Helvetica").text(
        "Ce test couvre uniquement les autorisations d'exploitation, les taxes environnementales et le délégué " +
        "à l'environnement. Notre base de données réglementaire couvre bien d'autres domaines (air, eau, déchets, " +
        "produits chimiques, sécurité, santé au travail...) sur lesquels votre établissement peut également être exposé."
      );
      doc.moveDown(0.4);
      AUTRES_ETUDES.forEach((s) => drawServiceItem(doc, s));

      doc.fontSize(10).fillColor("#0f172a").font("Helvetica-Bold").text(
        "Notre bureau peut vous accompagner sur l'ensemble de ces démarches, et vous donner accès à la " +
        "plateforme Reglo+ : une base de données réglementaire complète ainsi qu'un outil de planification et " +
        "de suivi de vos actions correctives.",
        { font: "Helvetica" }
      );

      drawFooters(doc);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });

// ============================
// 📋 LISTE DES QUESTIONS (route publique, consommée par la landing page)
// ============================
export const getQuestionsAuditEnvironnement = async (req, res) => {
  try {
    const questions = await fetchQuestions();
    res.json({ questions });
  } catch (err) {
    console.error("❌ Erreur getQuestionsAuditEnvironnement:", err.message);
    res.status(500).json({ error: "Impossible de charger le questionnaire." });
  }
};

// ============================
// 📥 CRÉATION D'UN LEAD (le rapport PDF est téléchargé directement, pas d'email)
// ============================
export const createLeadAuditEnvironnement = async (req, res) => {
  try {
    const { nom, telephone, email, reponses } = req.body;

    const questions = await fetchQuestions();
    const questionsById = Object.fromEntries(questions.map((q) => [q.id, q]));

    const validationError = validatePayload({ telephone, email, reponses }, questionsById);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const { score, niveau } = computeScore(reponses, questions);

    const { rows } = await pool.query(
      `INSERT INTO leads_audit_environnement (nom, telephone, email, score, niveau, reponses)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [nom || null, telephone.trim(), email.trim(), score, niveau, JSON.stringify(reponses)]
    );
    const leadId = rows[0].id;

    res.status(201).json({ success: true, leadId });
  } catch (err) {
    console.error("❌ Erreur createLeadAuditEnvironnement:", err.message);
    console.error("Stack trace:", err.stack);
    res.status(500).json({ error: "Erreur lors du traitement de votre demande." });
  }
};

// ============================
// 📋 LISTE DES LEADS (admin uniquement — panneau d'administration)
// ============================
export const getLeads = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, nom, telephone, email, score, niveau, created_at
       FROM leads_audit_environnement
       ORDER BY created_at DESC`
    );
    res.json({ leads: rows });
  } catch (err) {
    console.error("❌ Erreur getLeads:", err.message);
    res.status(500).json({ error: "Impossible de charger les leads." });
  }
};

// ============================
// 📄 TÉLÉCHARGEMENT DU RAPPORT PDF D'UN LEAD (regénéré à la demande)
// ============================
export const downloadLeadReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `SELECT nom, score, niveau, reponses FROM leads_audit_environnement WHERE id = $1`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Rapport introuvable." });
    }

    const lead = rows[0];
    const reponses = typeof lead.reponses === "string" ? JSON.parse(lead.reponses) : lead.reponses;
    const answersById = Object.fromEntries(reponses.map((r) => [r.questionId, r.reponse]));
    const questions = await fetchQuestions();

    const pdfBuffer = await generateReportPDF({
      nom: lead.nom,
      score: lead.score,
      niveau: lead.niveau,
      answersById,
      questions,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="rapport_conformite_reglo_plus_${id}.pdf"`);
    res.end(pdfBuffer);
  } catch (err) {
    console.error("❌ Erreur downloadLeadReport:", err.message);
    res.status(500).json({ error: "Impossible de générer le rapport PDF." });
  }
};
