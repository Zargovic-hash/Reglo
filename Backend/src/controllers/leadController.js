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
    `SELECT id, titre AS groupe, exigence AS texte, reference_reglementaire AS ref,
            documents_justificatif AS preuve
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
// Libellés affichés dans le rapport (plus explicites pour un lecteur externe que "oui/non").
const REPONSE_LABEL = { oui: "Conforme", non: "Non conforme", non_applicable: "Non applicable" };
const REPONSE_COLOR = { oui: "#16a34a", non: "#dc2626", non_applicable: "#64748b" };

const niveauColorFor = (niveau) =>
  niveau === "Conforme" ? "#16a34a" : niveau === "Partiellement conforme" ? "#d97706" : "#dc2626";

const BRAND_GREEN_DARK = "#14532d";
const BRAND_GREEN = "#16a34a";
const BRAND_GREEN_LIGHT = "#dcfce7";
const BRAND_BLUE = "#2563eb";

// Coordonnées mises en avant dans le rapport pour proposer un accompagnement.
const CONTACT_EMAIL = "echaouiseifeddine@outlook.com";
const CONTACT_WHATSAPP_DISPLAY = "+213 557 03 89 00";
// Nombre d'exigences dans reglementation_all (cf. database/reglementation_ehs_algerie.csv) — mis à jour
// périodiquement, sert uniquement d'ordre de grandeur dans le texte du rapport.
const TOTAL_EXIGENCES_DB = 670;

// Construit le plan d'action d'une exigence à partir de la réponse et de la preuve documentaire
// attendue (colonne documents_justificatif de reglementation_all) : plan de mise en conformité si
// "non", plan de confirmation si "oui", rien à faire si "non_applicable".
const buildActionPlan = (reponse, preuve) => {
  const preuveTrimmed = preuve && String(preuve).trim();
  if (reponse === "non") {
    return preuveTrimmed
      ? `Réunir et régulariser le justificatif requis : ${preuveTrimmed}. Désigner un responsable et une échéance pour son obtention.`
      : "Engager les démarches nécessaires pour régulariser cette exigence, en désignant un responsable et une échéance.";
  }
  if (reponse === "oui") {
    return preuveTrimmed
      ? `Vérifier que le justificatif suivant est bien disponible, à jour et archivé : ${preuveTrimmed}. À recontrôler lors du prochain audit.`
      : "Conserver la preuve de conformité actuelle et la recontrôler lors du prochain audit périodique.";
  }
  return "Non applicable à votre activité actuelle — aucune action requise. À réévaluer si votre activité évolue.";
};

const drawServiceItem = (doc, service) => {
  doc.fontSize(10.5).fillColor("#1e293b").font("Helvetica-Bold").text(service.label, { continued: false });
  doc.fontSize(9.5).fillColor("#475569").font("Helvetica").text(service.description);
  doc.moveDown(0.4);
};

// Ajoute une page si le bloc à venir (hauteur estimée) ne tient plus sur la page courante — évite
// de couper un encadré ou un tableau positionné en coordonnées absolues au milieu d'une page.
const ensurePageSpace = (doc, neededHeight, onNewPage) => {
  if (doc.y + neededHeight > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
    doc.x = doc.page.margins.left;
    if (onNewPage) onNewPage();
  }
};

// Bandeau de marque en haut de la première page (Smart Safety Services + Reglo+).
const drawBrandHeader = (doc, { nom, currentDate }) => {
  const bandHeight = 78;
  const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  doc.rect(0, 0, doc.page.width, bandHeight).fill(BRAND_GREEN_DARK);

  // Marque vectorielle : carré blanc + coche verte (pas d'image externe)
  const markSize = 30;
  const markX = doc.page.margins.left;
  const markY = 16;
  doc.roundedRect(markX, markY, markSize, markSize, 7).fill("#ffffff");
  doc.lineWidth(2.6).strokeColor(BRAND_GREEN)
    .moveTo(markX + 7, markY + 16).lineTo(markX + 13, markY + 22).lineTo(markX + 24, markY + 8).stroke();

  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(14)
    .text("Smart Safety Services", markX + markSize + 12, markY - 1, { lineBreak: false });
  doc.fillColor(BRAND_GREEN_LIGHT).font("Helvetica").fontSize(8.5)
    .text("Reglo+ — Rapport de conformité environnementale", markX + markSize + 12, markY + 17, { lineBreak: false });

  doc.fillColor("#ffffff").font("Helvetica").fontSize(8)
    .text(currentDate, doc.page.margins.left, markY - 2, { width: usableWidth, align: "right" });
  if (nom) {
    doc.text(`Établissement : ${nom}`, doc.page.margins.left, markY + 12, { width: usableWidth, align: "right" });
  }

  doc.x = doc.page.margins.left;
  doc.y = bandHeight + 20;
};

// Résumé exécutif : score, niveau, et priorités si des non-conformités ont été détectées.
const drawExecutiveSummary = (doc, { score, niveau, recommendedServices }) => {
  const niveauColor = niveauColorFor(niveau);

  doc.fontSize(30).fillColor(niveauColor).font("Helvetica-Bold").text(`${score}%`, { align: "center" });
  doc.fontSize(13).fillColor(niveauColor).font("Helvetica-Bold").text(niveau, { align: "center" });
  doc.moveDown(0.6);

  if (recommendedServices.length) {
    const boxX = doc.page.margins.left;
    const boxWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const boxY = doc.y;

    doc.font("Helvetica").fontSize(9.5);
    const lines = recommendedServices.map((s) => `•  ${s.label}`);
    const textHeight = lines.reduce((h, l) => h + doc.heightOfString(l, { width: boxWidth - 32 }) + 3, 0);
    const boxHeight = textHeight + 34;

    doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 8).fill("#fef2f2");
    doc.fillColor("#b91c1c").fontSize(10).font("Helvetica-Bold").text("Priorités identifiées", boxX + 16, boxY + 10);
    doc.font("Helvetica").fontSize(9.5).fillColor("#7f1d1d");
    let lineY = boxY + 26;
    lines.forEach((l) => {
      doc.text(l, boxX + 16, lineY, { width: boxWidth - 32 });
      lineY = doc.y + 3;
    });

    doc.x = doc.page.margins.left;
    doc.y = boxY + boxHeight + 14;
  }

  doc.moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .strokeColor("#e2e8f0").stroke();
  doc.moveDown(0.8);
};

// ============================
// 📊 TABLEAU DÉTAILLÉ : exigence / réponse / plan d'action
// ============================
const TABLE_HEADERS = ["Exigence réglementaire", "Réponse", "Plan d'action recommandé"];
const TABLE_COL_RATIOS = [0.38, 0.14, 0.48];
const TABLE_PADDING = 8;

const drawRequirementsTable = (doc, questions, answersById) => {
  const startX = doc.page.margins.left;
  const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const colWidths = TABLE_COL_RATIOS.map((r) => usableWidth * r);
  const headerHeight = 22;

  const drawHeaderRow = () => {
    const headerY = doc.y;
    doc.rect(startX, headerY, usableWidth, headerHeight).fill(BRAND_BLUE);
    let x = startX;
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#ffffff");
    TABLE_HEADERS.forEach((h, i) => {
      doc.text(h, x + TABLE_PADDING, headerY + 7, { width: colWidths[i] - TABLE_PADDING * 2, lineBreak: false });
      x += colWidths[i];
    });
    doc.y = headerY + headerHeight;
    doc.x = startX;
  };

  const drawGroupBand = (label) => {
    const bandHeight = 20;
    ensurePageSpace(doc, bandHeight, drawHeaderRow);
    const bandY = doc.y;
    doc.rect(startX, bandY, usableWidth, bandHeight).fill("#eff6ff");
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(BRAND_GREEN_DARK)
      .text(label.toUpperCase(), startX + TABLE_PADDING, bandY + 6, { width: usableWidth - TABLE_PADDING * 2, lineBreak: false });
    doc.y = bandY + bandHeight;
    doc.x = startX;
  };

  doc.fontSize(13).fillColor(BRAND_BLUE).font("Helvetica-Bold").text("Détail de vos réponses et plan d'action");
  doc.moveDown(0.3);
  drawHeaderRow();

  let currentGroupe = null;
  questions.forEach((q, idx) => {
    if (q.groupe !== currentGroupe) {
      currentGroupe = q.groupe;
      drawGroupBand(currentGroupe);
    }

    const reponse = answersById[q.id];
    const planText = buildActionPlan(reponse, q.preuve);
    const reponseLabel = REPONSE_LABEL[reponse] || "N/A";
    const reponseColor = REPONSE_COLOR[reponse] || "#64748b";

    const col1Width = colWidths[0] - TABLE_PADDING * 2;
    const col3Width = colWidths[2] - TABLE_PADDING * 2;

    doc.font("Helvetica-Bold").fontSize(9);
    const texteHeight = doc.heightOfString(q.texte, { width: col1Width });
    doc.font("Helvetica").fontSize(7.5);
    const refHeight = q.ref ? doc.heightOfString(q.ref, { width: col1Width }) : 0;
    doc.font("Helvetica").fontSize(8.5);
    const planHeight = doc.heightOfString(planText, { width: col3Width });

    const col1TotalHeight = texteHeight + (refHeight ? refHeight + 4 : 0);
    const rowHeight = Math.max(col1TotalHeight, planHeight, 14) + TABLE_PADDING * 2;

    ensurePageSpace(doc, rowHeight, drawHeaderRow);

    const rowY = doc.y;
    if (idx % 2 === 1) {
      doc.rect(startX, rowY, usableWidth, rowHeight).fill("#f8fafc");
    }

    let x = startX;
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#0f172a")
      .text(q.texte, x + TABLE_PADDING, rowY + TABLE_PADDING, { width: col1Width });
    if (q.ref) {
      doc.font("Helvetica").fontSize(7.5).fillColor("#64748b")
        .text(q.ref, x + TABLE_PADDING, rowY + TABLE_PADDING + texteHeight + 4, { width: col1Width });
    }
    x += colWidths[0];

    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(reponseColor)
      .text(reponseLabel, x + TABLE_PADDING, rowY + TABLE_PADDING, { width: colWidths[1] - TABLE_PADDING * 2 });
    x += colWidths[1];

    doc.font("Helvetica").fontSize(8.5).fillColor("#334155")
      .text(planText, x + TABLE_PADDING, rowY + TABLE_PADDING, { width: col3Width });

    doc.moveTo(startX, rowY + rowHeight).lineTo(startX + usableWidth, rowY + rowHeight)
      .strokeColor("#e2e8f0").lineWidth(0.5).stroke();

    doc.y = rowY + rowHeight;
    doc.x = startX;
  });

  doc.moveDown(1);
};

// ============================
// 🗂️ APERÇU DE LA PAGE DE SUIVI DES PLANS D'ACTION (plateforme Reglo+)
// ============================
const TRACKING_PREVIEW_ROWS = [
  { action: "Renouveler l'autorisation d'exploitation", priorite: "Critique", couleur: "#dc2626", echeance: "15/09/2026", responsable: "Resp. HSE" },
  { action: "Déclarer la taxe environnementale annuelle", priorite: "Élevée", couleur: "#d97706", echeance: "30/10/2026", responsable: "Resp. Finance" },
  { action: "Archiver le registre du délégué à l'environnement", priorite: "Normale", couleur: "#16a34a", echeance: "—", responsable: "Resp. QHSE" },
];

const drawTrackingPreview = (doc) => {
  ensurePageSpace(doc, 210, () => {});

  doc.fontSize(13).fillColor(BRAND_BLUE).font("Helvetica-Bold")
    .text("Aperçu : le suivi de vos plans d'action sur la plateforme Reglo+");
  doc.moveDown(0.25);
  doc.fontSize(9.5).fillColor("#475569").font("Helvetica").text(
    "Sur la plateforme complète, chaque non-conformité devient une action pilotée : priorité (matrice " +
    "urgence / importance), échéance, responsable assigné et statut d'avancement, regroupées dans un " +
    "tableau de bord dédié."
  );
  doc.moveDown(0.5);

  const startX = doc.page.margins.left;
  const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const widths = [usableWidth * 0.42, usableWidth * 0.18, usableWidth * 0.18, usableWidth * 0.22];
  const headers = ["Action", "Priorité", "Échéance", "Responsable"];
  const rowH = 22;

  const containerTop = doc.y;
  const containerHeight = rowH * (TRACKING_PREVIEW_ROWS.length + 1) + 12;
  doc.roundedRect(startX, containerTop, usableWidth, containerHeight, 6).fillAndStroke("#f8fafc", "#e2e8f0");

  let y = containerTop + 8;
  let x = startX + 10;
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#64748b");
  headers.forEach((h, i) => {
    doc.text(h, x, y, { width: widths[i] - 10, lineBreak: false });
    x += widths[i];
  });
  y += rowH;

  TRACKING_PREVIEW_ROWS.forEach((row) => {
    x = startX + 10;
    doc.font("Helvetica").fontSize(8.5).fillColor("#1e293b")
      .text(row.action, x, y + 3, { width: widths[0] - 14, lineBreak: false });
    x += widths[0];

    doc.font("Helvetica-Bold").fontSize(7.5);
    const pillWidth = doc.widthOfString(row.priorite) + 14;
    doc.roundedRect(x, y, pillWidth, 15, 4).fill(row.couleur);
    doc.fillColor("#ffffff").text(row.priorite, x, y + 4, { width: pillWidth, align: "center", lineBreak: false });
    x += widths[1];

    doc.font("Helvetica").fontSize(8.5).fillColor("#1e293b")
      .text(row.echeance, x, y + 3, { width: widths[2] - 10, lineBreak: false });
    x += widths[2];

    doc.text(row.responsable, x, y + 3, { width: widths[3] - 10, lineBreak: false });
    y += rowH;
  });

  doc.font("Helvetica-Oblique").fontSize(7).fillColor("#94a3b8")
    .text("Exemple illustratif — le contenu réel dépend de vos réponses.", startX + 10, containerTop + containerHeight - 12);

  doc.x = startX;
  doc.y = containerTop + containerHeight + 18;
};

// ============================
// 🤝 ACCOMPAGNEMENT & CONTACT
// ============================
const drawServicesCTA = (doc, recommendedServices) => {
  ensurePageSpace(doc, 120, () => {});

  doc.fontSize(13).fillColor(BRAND_BLUE).font("Helvetica-Bold")
    .text("Comment nous pouvons vous accompagner");
  doc.moveDown(0.3);

  if (recommendedServices.length) {
    recommendedServices.forEach((s) => drawServiceItem(doc, s));
  }
  AUTRES_ETUDES.forEach((s) => drawServiceItem(doc, s));

  doc.moveDown(0.1);
  doc.fontSize(9.5).fillColor("#334155").font("Helvetica").text(
    `Ce test couvre uniquement 3 thématiques (autorisations d'exploitation, taxes environnementales, délégué ` +
    `à l'environnement). Notre base de données réglementaire compte plus de ${TOTAL_EXIGENCES_DB} exigences ` +
    `issues de la réglementation EHS algérienne (air, eau, déchets, produits chimiques, produits dangereux, ` +
    `sécurité, santé au travail...). Si vous souhaitez solliciter nos services, nous pouvons vérifier ` +
    `l'intégralité de ces exigences pour votre établissement.`
  );
};

// ============================
// 📇 PAGE DE CLÔTURE — coordonnées de contact (toujours sur une page dédiée, pour un
// rendu propre et prévisible quel que soit le nombre de questions/services en amont).
// ============================
const drawContactPage = (doc, { nom }) => {
  doc.addPage();
  const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const left = doc.page.margins.left;

  const markSize = 46;
  const markX = doc.page.width / 2 - markSize / 2;
  const markY = 130;
  doc.roundedRect(markX, markY, markSize, markSize, 10).fill(BRAND_GREEN_DARK);
  doc.lineWidth(3.4).strokeColor("#ffffff")
    .moveTo(markX + 11, markY + 25).lineTo(markX + 20, markY + 34).lineTo(markX + 37, markY + 13).stroke();

  doc.y = markY + markSize + 26;
  doc.fontSize(18).fillColor(BRAND_GREEN_DARK).font("Helvetica-Bold")
    .text("Envie de vérifier l'ensemble de votre conformité EHS ?", left, doc.y, { width: usableWidth, align: "center" });
  doc.moveDown(0.6);
  const paraWidth = usableWidth * 0.6;
  doc.fontSize(10.5).fillColor("#475569").font("Helvetica").text(
    `Smart Safety Services peut auditer l'intégralité des plus de ${TOTAL_EXIGENCES_DB} exigences de notre base ` +
    `réglementaire EHS algérienne pour votre établissement${nom ? ` (${nom})` : ""}, et vous donner accès à la ` +
    `plateforme Reglo+ pour en assurer le suivi.`,
    left + (usableWidth - paraWidth) / 2,
    doc.y,
    { width: paraWidth, align: "center" }
  );

  doc.moveDown(1.4);
  doc.fontSize(13).fillColor(BRAND_GREEN_DARK).font("Helvetica-Bold")
    .text(`Email : ${CONTACT_EMAIL}`, left, doc.y, { width: usableWidth, align: "center" });
  doc.moveDown(0.35);
  doc.fontSize(13).fillColor(BRAND_GREEN_DARK).font("Helvetica-Bold")
    .text(`WhatsApp : ${CONTACT_WHATSAPP_DISPLAY}`, left, doc.y, { width: usableWidth, align: "center" });

  doc.moveDown(1.8);
  doc.fontSize(9).fillColor("#94a3b8").font("Helvetica-Oblique")
    .text("Smart Safety Services — l'ingénierie de la conformité, pensée pour l'Algérie", left, doc.y, {
      width: usableWidth,
      align: "center",
    });
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
      const doc = new PDFDocument({ size: "A4", margin: 40, layout: "landscape", bufferPages: true });
      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const currentDate = moment().format("DD/MM/YYYY à HH:mm");
      const nonConformGroupes = computeNonConformGroupes(questions, answersById);
      const recommendedServices = nonConformGroupes.map((g) => SERVICES_BY_GROUPE[g]).filter(Boolean);

      drawBrandHeader(doc, { nom, currentDate });
      drawExecutiveSummary(doc, { score, niveau, recommendedServices });
      drawRequirementsTable(doc, questions, answersById);
      drawTrackingPreview(doc);
      drawServicesCTA(doc, recommendedServices);
      drawContactPage(doc, { nom });

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
