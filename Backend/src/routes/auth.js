// routes/auth.js
import express from "express";
import { 
  register, 
  login, 
  getProfile, 
  updateProfile, 
  logout,
  forgotPassword,
  resetPassword,
  validateResetToken
} from "../controllers/authController.js";
import { authenticateToken } from "../middleware/auth.js";
import { deleteAccount } from '../controllers/authController.js';

const router = express.Router();

// Routes publiques
router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.get("/validate-reset-token/:token", validateResetToken);


// Routes protégées
router.get("/profile", authenticateToken, getProfile);
router.put("/profile", authenticateToken, updateProfile);
router.post("/logout", authenticateToken, logout);
router.delete('/delete-account', authenticateToken, deleteAccount);


export default router;