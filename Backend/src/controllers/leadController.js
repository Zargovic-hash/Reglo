import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import nodemailer from "nodemailer";
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
// 🚀 TRANSPORTEUR NODEMAILER (même config SMTP que authController.js)
// ============================
const createTransporter = async () => {
  if (process.env.NODE_ENV === "development" && !process.env.SMTP_HOST) {
    const testAccount = await nodemailer.createTestAccount();
    console.log("📧 Compte de test Ethereal généré:", testAccount.user);
    return nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
  }

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("Configuration SMTP incomplète");
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    ...(process.env.SMTP_HOST === "smtp.gmail.com" && { service: "gmail" }),
  });
};

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
// 🎨 HTML DU RAPPORT PDF
// ============================
const buildReportHTML = ({ nom, score, niveau, answersById, questions }) => {
  const currentDate = moment().format("DD/MM/YYYY à HH:mm");
  const niveauColor = niveau === "Conforme" ? "#22c55e" : niveau === "Partiellement conforme" ? "#f59e0b" : "#ef4444";
  const reponseLabel = { oui: "Oui", non: "Non", non_applicable: "Non applicable" };

  const nonConformGroupes = computeNonConformGroupes(questions, answersById);
  const recommendedServices = nonConformGroupes
    .map((groupe) => SERVICES_BY_GROUPE[groupe])
    .filter(Boolean);

  const serviceItemHTML = (s) => `
    <div class="reco-item">
      <strong>${s.label}</strong>
      <p>${s.description}</p>
    </div>
  `;

  const recoSectionHTML = recommendedServices.length
    ? `
      <div class="reco-section">
        <h2>Nos recommandations pour vous mettre en conformité</h2>
        ${recommendedServices.map(serviceItemHTML).join("")}
      </div>
    `
    : "";

  const otherSectionHTML = `
    <div class="reco-section other-section">
      <h2>D'autres vérifications réglementaires à ne pas négliger</h2>
      <p>
        Ce test couvre uniquement les autorisations d'exploitation et les taxes environnementales.
        Notre base de données réglementaire couvre bien d'autres domaines (air, eau, déchets, produits
        chimiques, sécurité, santé au travail...) sur lesquels votre établissement peut également être exposé.
      </p>
      ${AUTRES_ETUDES.map(serviceItemHTML).join("")}
      <p class="platform-note">
        <strong>Notre bureau peut vous accompagner</strong> sur l'ensemble de ces démarches, et vous donner accès
        à la plateforme Reglo+ : une base de données réglementaire complète ainsi qu'un outil de planification et
        de suivi de vos actions correctives.
      </p>
    </div>
  `;

  const rows = questions.map((q) => {
    const reponse = answersById[q.id];
    return `
      <tr>
        <td>${q.groupe}</td>
        <td>${q.texte}</td>
        <td>${q.ref}</td>
        <td style="text-align:center;font-weight:bold;">${reponseLabel[reponse] || "N/A"}</td>
      </tr>
    `;
  }).join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Rapport de conformité Reglo+</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; line-height: 1.6; }
        .header { text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { color: #3b82f6; margin: 0; font-size: 24px; }
        .header p { color: #666; margin: 5px 0 0 0; font-size: 14px; }
        .score-box { text-align: center; margin-bottom: 30px; }
        .score-value { font-size: 42px; font-weight: bold; color: ${niveauColor}; }
        .score-label { font-size: 18px; font-weight: bold; color: ${niveauColor}; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
        th, td { border: 1px solid #dee2e6; padding: 6px; text-align: left; vertical-align: top; }
        th { background: #3b82f6; color: white; }
        tr:nth-child(even) { background: #f8f9fa; }
        .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #666; border-top: 1px solid #dee2e6; padding-top: 10px; }
        .reco-section { margin-top: 30px; padding: 18px 20px; border: 1px solid #dee2e6; border-radius: 8px; background: #f8f9fa; page-break-inside: avoid; }
        .reco-section h2 { font-size: 16px; color: #1d4ed8; margin: 0 0 10px; }
        .reco-section p { font-size: 12px; margin: 0 0 12px; }
        .reco-item { margin-bottom: 10px; }
        .reco-item strong { font-size: 13px; color: #1e293b; }
        .reco-item p { font-size: 12px; color: #475569; margin: 2px 0 0; }
        .other-section { background: #eff6ff; }
        .platform-note { margin-top: 14px; font-size: 12px; color: #1e293b; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Rapport de conformité — Autorisation & Taxes environnementales</h1>
        <p>${nom ? `Établissement : ${nom}` : ""}</p>
        <p>Généré le ${currentDate}</p>
        <p>Reglo+ - Système d'Audit Réglementaire</p>
      </div>
      <div class="score-box">
        <div class="score-value">${score}%</div>
        <div class="score-label">${niveau}</div>
      </div>
      <table>
        <thead>
          <tr><th>Titre</th><th>Exigence</th><th>Référence réglementaire</th><th>Réponse</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      ${recoSectionHTML}
      ${otherSectionHTML}
      <div class="footer">
        <p>Ce rapport est une auto-évaluation basée sur vos réponses et ne remplace pas un audit réglementaire complet réalisé par Reglo+.</p>
        <p>© ${new Date().getFullYear()} Reglo+ - Tous droits réservés</p>
      </div>
    </body>
    </html>
  `;
};

const generateReportPDF = async (lead) => {
  const html = buildReportHTML(lead);
  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      defaultViewport: chromium.defaultViewport,
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    return await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", right: "15mm", bottom: "20mm", left: "15mm" },
    });
  } finally {
    if (browser) await browser.close();
  }
};

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
// 📥 CRÉATION D'UN LEAD + ENVOI AUTOMATIQUE DU RAPPORT
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

    const { score, niveau, answersById } = computeScore(reponses, questions);

    const { rows } = await pool.query(
      `INSERT INTO leads_audit_environnement (nom, telephone, email, score, niveau, reponses)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [nom || null, telephone.trim(), email.trim(), score, niveau, JSON.stringify(reponses)]
    );
    const leadId = rows[0].id;

    let emailSent = false;
    try {
      const pdfBuffer = await generateReportPDF({ nom, score, niveau, answersById, questions });
      const transporter = await createTransporter();

      await transporter.sendMail({
        from: process.env.FROM_EMAIL || process.env.SMTP_USER,
        to: email.trim(),
        subject: "Votre rapport de conformité Reglo+",
        html: `
          <p>Bonjour${nom ? ` ${nom}` : ""},</p>
          <p>Merci d'avoir réalisé votre audit de conformité "Autorisation & gouvernance environnementale" avec Reglo+.</p>
          <p><strong>Votre niveau de conformité : ${niveau} (${score}%)</strong></p>
          <p>Vous trouverez le détail de votre audit dans le rapport PDF ci-joint, ainsi que nos recommandations
          personnalisées et les autres vérifications réglementaires à ne pas négliger.</p>
          <p>Notre bureau peut vous accompagner dans la préparation de vos études de mise en conformité
          (autorisation d'exploitation, audit environnemental, étude de danger, produits dangereux) et vous donner
          accès à la plateforme Reglo+ pour suivre vos actions correctives. Répondez à cet email pour en discuter.</p>
          <p>L'équipe Reglo+</p>
        `,
        attachments: [
          {
            filename: `rapport_conformite_reglo_plus_${moment().format("YYYY-MM-DD")}.pdf`,
            content: pdfBuffer,
            contentType: "application/pdf",
          },
        ],
      });
      emailSent = true;
    } catch (emailError) {
      console.error("❌ Erreur envoi email rapport de conformité:", emailError.message);
    }

    res.status(201).json({ success: true, leadId, emailSent });
  } catch (err) {
    console.error("❌ Erreur createLeadAuditEnvironnement:", err.message);
    console.error("Stack trace:", err.stack);
    res.status(500).json({ error: "Erreur lors du traitement de votre demande." });
  }
};
