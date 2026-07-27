// routes/leads.js
import express from "express";
import rateLimit from "express-rate-limit";
import { createLeadAuditEnvironnement, getQuestionsAuditEnvironnement } from "../controllers/leadController.js";

const router = express.Router();

// ============================
// 🛡️ RATE LIMIT DÉDIÉ (route publique, sans authentification)
// ============================
const leadsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "development" ? 200 : 20,
  message: { error: "Trop de demandes, merci de réessayer plus tard." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get("/questions-audit-environnement", leadsLimiter, getQuestionsAuditEnvironnement);
router.post("/audit-environnement", leadsLimiter, createLeadAuditEnvironnement);

export default router;
