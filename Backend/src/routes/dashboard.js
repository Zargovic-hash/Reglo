// routes/dashboard.js (VERSION MISE À JOUR)
import express from "express";
import { getDashboardStats, getAuditReport, bulkSaveAudits, exportAudits } from "../controllers/dashboardController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// GET /api/dashboard/stats - Statistiques générales
router.get("/stats", getDashboardStats);

// GET /api/dashboard/report - Rapport détaillé avec filtres
router.get("/report", getAuditReport);

// POST /api/dashboard/bulk-save - Sauvegarde en lot
router.post("/bulk-save", bulkSaveAudits);

// GET /api/dashboard/export - Export des données
router.get("/export", exportAudits);

export default router;