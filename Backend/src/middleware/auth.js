// middleware/auth.js
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';

// Middleware pour vérifier le token JWT
export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Token d\'accès requis' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Vérifier que l'utilisateur existe toujours
    const { rows } = await pool.query(
      'SELECT id, email, first_name, last_name, role, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (rows.length === 0 || !rows[0].is_active) {
      return res.status(401).json({ error: 'Utilisateur non trouvé ou inactif' });
    }

    req.user = rows[0];
    next();
  } catch (err) {
    console.error('Erreur JWT:', err.message);
    return res.status(403).json({ error: 'Token invalide' });
  }
};

// Middleware pour vérifier les permissions admin
export const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès administrateur requis' });
  }
  next();
};

// Middleware pour vérifier que l'utilisateur peut accéder à ses propres données
export const checkOwnership = (req, res, next) => {
  // Les admins peuvent accéder à tout
  if (req.user.role === 'admin') {
    return next();
  }

  // Pour les utilisateurs normaux, vérifier l'ownership via query params ou body
  const targetUserId = req.params.userId || req.body.user_id || req.query.user_id;
  
  if (targetUserId && parseInt(targetUserId) !== req.user.id) {
    return res.status(403).json({ error: 'Accès non autorisé' });
  }

  next();
};