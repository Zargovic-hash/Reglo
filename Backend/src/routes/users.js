// routes/users.js
import express from "express";
import { 
  getAllUsers, 
  getUserById, 
  updateUser, 
  deleteUser, 
  getUserStats 
} from "../controllers/userController.js";
import { authenticateToken, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// Toutes les routes nécessitent une authentification et des privilèges admin
router.use(authenticateToken, requireAdmin);

// GET /api/users - Liste tous les utilisateurs
router.get("/", getAllUsers);

// GET /api/users/stats - Statistiques des utilisateurs
router.get("/stats", getUserStats);

// GET /api/users/:userId - Détails d'un utilisateur
router.get("/:userId", getUserById);

// PUT /api/users/:userId - Modifier un utilisateur
router.put("/:userId", updateUser);

// DELETE /api/users/:userId - Supprimer un utilisateur
router.delete("/:userId", deleteUser);

export default router;