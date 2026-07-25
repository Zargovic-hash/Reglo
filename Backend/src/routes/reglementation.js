// routes/reglementation.js (VERSION MISE À JOUR)
import express from "express";
import { getReglementation, getTitres, getSousTitres, getDomaines, getOwners } from "../controllers/reglementationController.js";
import { addFavorite, getFavorites, removeFavorite } from "../controllers/favoriteController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

router.get("/favorites", getFavorites);
router.post("/favorites/:reglementationId", addFavorite);
router.delete("/favorites/:reglementationId", removeFavorite);

// Route recherche et filtres
router.get("/", getReglementation);

// Route pour récupérer les titres uniques (optionnellement filtrés par domaine)
router.get("/titres", getTitres);

// Route pour récupérer les sous-titres uniques (optionnellement filtrés par domaine/titre)
router.get("/sous-titres", getSousTitres);

// Route pour récupérer les domaines uniques
router.get("/domaines", getDomaines);

// Route pour récupérer les responsables (owner) uniques
router.get("/owners", getOwners);

export default router;
