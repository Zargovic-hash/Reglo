import PDFDocument from "pdfkit";
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
// 📄 GÉNÉRATION DU RAPPORT PDF (pdfkit — pas de navigateur, léger en mémoire)
// ============================
const REPONSE_LABEL = { oui: "Oui", non: "Non", non_applicable: "Non applicable" };
const REPONSE_COLOR = { oui: "#16a34a", non: "#dc2626", non_applicable: "#64748b" };

const niveauColorFor = (niveau) =>
  niveau === "Conforme" ? "#16a34a" : niveau === "Partiellement conforme" ? "#d97706" : "#dc2626";

const drawServiceItem = (doc, service) => {
  doc.fontSize(11).fillColor("#1e293b").font("Helvetica-Bold").text(service.label, { continued: false });
  doc.fontSize(10).fillColor("#475569").font("Helvetica").text(service.description);
  doc.moveDown(0.5);
};

const generateReportPDF = ({ nom, score, niveau, answersById, questions }) =>
  new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 45 });
      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const currentDate = moment().format("DD/MM/YYYY à HH:mm");
      const niveauColor = niveauColorFor(niveau);

      // Header
      doc.fontSize(18).fillColor("#2563eb").font("Helvetica-Bold")
        .text("Rapport de conformité — Reglo+", { align: "center" });
      doc.fontSize(10).fillColor("#666666").font("Helvetica")
        .text("Autorisation d'exploitation, taxes environnementales & délégué à l'environnement", { align: "center" });
      if (nom) doc.text(`Établissement : ${nom}`, { align: "center" });
      doc.text(`Généré le ${currentDate}`, { align: "center" });
      doc.moveDown(1);

      // Score box
      doc.fontSize(34).fillColor(niveauColor).font("Helvetica-Bold")
        .text(`${score}%`, { align: "center" });
      doc.fontSize(14).fillColor(niveauColor).font("Helvetica-Bold")
        .text(niveau, { align: "center" });
      doc.moveDown(1);
      doc.moveTo(doc.page.margins.left, doc.y)
        .lineTo(doc.page.width - doc.page.margins.right, doc.y)
        .strokeColor("#e2e8f0").stroke();
      doc.moveDown(1);

      // Questions grouped by groupe
      let currentGroupe = null;
      questions.forEach((q) => {
        if (q.groupe !== currentGroupe) {
          currentGroupe = q.groupe;
          doc.moveDown(0.5);
          doc.fontSize(12).fillColor("#2563eb").font("Helvetica-Bold").text(currentGroupe.toUpperCase());
          doc.moveDown(0.2);
        }
        const reponse = answersById[q.id];
        doc.fontSize(10).fillColor("#0f172a").font("Helvetica-Bold").text(q.texte);
        doc.fontSize(8.5).fillColor("#64748b").font("Helvetica").text(q.ref);
        doc.fontSize(10).fillColor(REPONSE_COLOR[reponse] || "#64748b").font("Helvetica-Bold")
          .text(`Réponse : ${REPONSE_LABEL[reponse] || "N/A"}`);
        doc.moveDown(0.6);
      });

      // Recommendations
      const nonConformGroupes = computeNonConformGroupes(questions, answersById);
      const recommendedServices = nonConformGroupes.map((g) => SERVICES_BY_GROUPE[g]).filter(Boolean);

      if (recommendedServices.length) {
        doc.moveDown(0.5);
        doc.fontSize(13).fillColor("#1d4ed8").font("Helvetica-Bold")
          .text("Nos recommandations pour vous mettre en conformité");
        doc.moveDown(0.3);
        recommendedServices.forEach((s) => drawServiceItem(doc, s));
      }

      doc.moveDown(0.5);
      doc.fontSize(13).fillColor("#1d4ed8").font("Helvetica-Bold")
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

      // Footer
      doc.moveDown(1.5);
      doc.fontSize(8).fillColor("#94a3b8").font("Helvetica").text(
        "Ce rapport est une auto-évaluation basée sur vos réponses et ne remplace pas un audit réglementaire complet réalisé par Reglo+.",
        { align: "center" }
      );
      doc.text(`© ${new Date().getFullYear()} Reglo+ - Tous droits réservés`, { align: "center" });

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
