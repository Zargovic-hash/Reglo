// routes/reports.js
import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { generatePDFReport, generateExcelReport } from '../controllers/reportController.js';

const router = express.Router();

// ============================
// 📊 ROUTES POUR LES RAPPORTS
// ============================

// Générer un rapport PDF
router.post('/pdf', authenticateToken, generatePDFReport);

// Générer un rapport Excel
router.post('/excel', authenticateToken, generateExcelReport);

// Route de test pour vérifier que le module fonctionne
router.get('/test', authenticateToken, (req, res) => {
  res.json({
    message: 'Module de rapports opérationnel',
    user: req.user.email,
    availableTypes: ['audit', 'dashboard', 'reglementation'],
    formats: ['pdf', 'excel']
  });
});

export default router;
