// controllers/userController.js
import bcrypt from 'bcrypt';
import { pool } from '../db.js';

const SALT_ROUNDS = 12;

// 👥 Liste tous les utilisateurs (Admin seulement)
export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role } = req.query;
    const offset = (page - 1) * limit;

    let filters = [];
    let values = [];
    let paramIndex = 1;

    if (search) {
      filters.push(`(first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`);
      values.push(`%${search}%`);
      paramIndex++;
    }

    if (role) {
      filters.push(`role = $${paramIndex++}`);
      values.push(role);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

    // Compter le total
    const countQuery = `SELECT COUNT(*) as total FROM users ${whereClause}`;
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total);

    // Récupérer les utilisateurs
    values.push(limit, offset);
    const usersQuery = `
      SELECT id, email, first_name, last_name, role, is_active, created_at, last_login,
             (SELECT COUNT(*) FROM audit_conformite WHERE user_id = users.id) as audits_count
      FROM users 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const { rows } = await pool.query(usersQuery, values);

    res.json({
      users: rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (err) {
    console.error('Erreur liste utilisateurs:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
  }
};

// 👤 Détails d'un utilisateur
export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const { rows } = await pool.query(`
      SELECT id, email, first_name, last_name, role, is_active, created_at, last_login,
             (SELECT COUNT(*) FROM audit_conformite WHERE user_id = users.id) as audits_count,
             (SELECT COUNT(*) FROM audit_conformite WHERE user_id = users.id AND conformite = 'Conforme') as audits_conformes,
             (SELECT COUNT(*) FROM audit_conformite WHERE user_id = users.id AND conformite = 'Non Conforme') as audits_non_conformes
      FROM users 
      WHERE id = $1
    `, [userId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Erreur détails utilisateur:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'utilisateur' });
  }
};

// ✏️ Modifier un utilisateur (Admin)
export const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { first_name, last_name, email, role, is_active, new_password } = req.body;

    // Vérifier que l'utilisateur existe
    const existingUser = await pool.query('SELECT id, email FROM users WHERE id = $1', [userId]);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Vérifier l'unicité de l'email si modifié
    if (email && email !== existingUser.rows[0].email) {
      const emailCheck = await pool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, userId]);
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Cet email est déjà utilisé' });
      }
    }

    let updateFields = [];
    let values = [];
    let paramIndex = 1;

    if (first_name !== undefined) {
      updateFields.push(`first_name = $${paramIndex++}`);
      values.push(first_name);
    }

    if (last_name !== undefined) {
      updateFields.push(`last_name = $${paramIndex++}`);
      values.push(last_name);
    }

    if (email !== undefined) {
      updateFields.push(`email = $${paramIndex++}`);
      values.push(email);
    }

    if (role !== undefined) {
      updateFields.push(`role = $${paramIndex++}`);
      values.push(role);
    }

    if (is_active !== undefined) {
      updateFields.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }

    if (new_password) {
      if (new_password.length < 6) {
        return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
      }
      const password_hash = await bcrypt.hash(new_password, SALT_ROUNDS);
      updateFields.push(`password_hash = $${paramIndex++}`);
      values.push(password_hash);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'Aucune modification à apporter' });
    }

    updateFields.push(`updated_at = NOW()`);
    values.push(userId);

    const sql = `
      UPDATE users 
      SET ${updateFields.join(', ')} 
      WHERE id = $${paramIndex}
      RETURNING id, email, first_name, last_name, role, is_active, updated_at
    `;

    const { rows } = await pool.query(sql, values);
    res.json({ message: 'Utilisateur mis à jour', user: rows[0] });

  } catch (err) {
    console.error('Erreur mise à jour utilisateur:', err);
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
};

// 🗑️ Supprimer un utilisateur (Admin)
export const deleteUser = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { userId } = req.params;

    // Vérifier que l'utilisateur existe
    const existingUser = await client.query('SELECT id, email FROM users WHERE id = $1', [userId]);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Empêcher la suppression du dernier admin
    const adminCount = await client.query('SELECT COUNT(*) as count FROM users WHERE role = \'admin\' AND is_active = true');
    const currentUser = await client.query('SELECT role FROM users WHERE id = $1', [userId]);
    
    if (parseInt(adminCount.rows[0].count) <= 1 && currentUser.rows[0].role === 'admin') {
      return res.status(400).json({ error: 'Impossible de supprimer le dernier administrateur' });
    }

    await client.query('BEGIN');

    // Les audits seront automatiquement mis à jour (user_id = NULL) grâce à ON DELETE SET NULL
    await client.query('DELETE FROM users WHERE id = $1', [userId]);

    await client.query('COMMIT');
    res.json({ message: 'Utilisateur supprimé avec succès' });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erreur suppression utilisateur:', err);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  } finally {
    client.release();
  }
};

// 📊 Statistiques des utilisateurs
export const getUserStats = async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count,
        COUNT(CASE WHEN role = 'user' THEN 1 END) as user_count,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
        COUNT(CASE WHEN last_login >= NOW() - INTERVAL '30 days' THEN 1 END) as active_last_month
      FROM users
    `);

    const recentUsers = await pool.query(`
      SELECT id, email, first_name, last_name, role, created_at
      FROM users 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    res.json({
      stats: stats.rows[0],
      recent_users: recentUsers.rows
    });

  } catch (err) {
    console.error('Erreur statistiques utilisateurs:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
};