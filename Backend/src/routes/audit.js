// routes/audit.js (VERSION MISE À JOUR)
import express from "express";
import { saveAudit, getAudit, getUserAudits } from "../controllers/auditController.js";
import { authenticateToken, checkOwnership } from "../middleware/auth.js";

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// POST pour sauvegarder un audit
router.post("/", saveAudit);

// GET pour récupérer un audit spécifique
router.get("/:reglementation_id", getAudit);

// GET pour récupérer tous les audits de l'utilisateur connecté
router.get("/", getUserAudits);

export default router;