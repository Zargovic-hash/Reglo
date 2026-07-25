import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import nodemailer from "nodemailer";
import { pool } from "../db.js";


const SALT_ROUNDS = 12;
const JWT_EXPIRES_IN = "24h";
const RESET_TOKEN_EXPIRES_IN = 15 * 60 * 1000; // 15 minutes

// ============================
// 🚀 CONFIGURATION NODEMAILER CORRIGÉE
// ============================
const createTransporter = async () => {
  try {
    // En développement, utiliser Ethereal Email pour les tests
    if (process.env.NODE_ENV === "development" && !process.env.SMTP_HOST) {
      const testAccount = await nodemailer.createTestAccount();
      console.log("📧 Compte de test Ethereal généré:", testAccount.user);
      
      return nodemailer.createTransport({  // ✅ CORRECTION: createTransport (pas createTransporter)
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
    }

    // Vérifier la configuration SMTP
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn("⚠️ Configuration SMTP incomplète - emails désactivés");
      return null;
    }

    console.log("🔧 Configuration SMTP:", {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === "true",
      user: process.env.SMTP_USER
    });

    // Configuration SMTP production/développement
    const transporter = nodemailer.createTransport({  // ✅ CORRECTION: createTransport
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      // Configuration additionnelle pour Gmail
      ...(process.env.SMTP_HOST === 'smtp.gmail.com' && {
        service: 'gmail'
      }),
      // Options de debug
      debug: process.env.NODE_ENV === 'development',
      logger: process.env.NODE_ENV === 'development'
    });

    // Vérifier la connexion SMTP
    console.log("🔍 Test de connexion SMTP...");
    await transporter.verify();
    console.log("✅ Configuration SMTP vérifiée avec succès");
    
    return transporter;
    
  } catch (err) {
    console.error("❌ Erreur configuration Nodemailer:");
    console.error("   └─ Message:", err.message);
    console.error("   └─ Code:", err.code);
    
    // En cas d'erreur, retourner un transporteur de test pour le développement
    if (process.env.NODE_ENV === 'development') {
      console.log("🔄 Création d'un transporteur de test...");
      try {
        const testAccount = await nodemailer.createTestAccount();
        return nodemailer.createTransport({
          host: "smtp.ethereal.email",
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass
          }
        });
      } catch (testErr) {
        console.error("❌ Impossible de créer un transporteur de test:", testErr.message);
        return null;
      }
    }
    
    return null;
  }
};

// ============================
// 📧 FONCTION D'ENVOI D'EMAIL SÉCURISÉE
// ============================
const sendEmail = async (to, subject, html) => {
  console.log(`📤 Tentative d'envoi d'email à: ${to}`);
  
  const transporter = await createTransporter();
  
  if (!transporter) {
    throw new Error("Service email indisponible - Impossible de créer le transporteur");
  }

  try {
    const mailOptions = {
      from: process.env.FROM_EMAIL || process.env.SMTP_USER,
      to,
      subject,
      html
    };

    console.log("📧 Options d'email:", {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject
    });

    const info = await transporter.sendMail(mailOptions);

    // Log du mail de test en développement
    if (process.env.NODE_ENV === "development") {
      console.log("📧 Email envoyé avec succès:");
      console.log("   └─ Message ID:", info.messageId);
      if (info.response) {
        console.log("   └─ Réponse:", info.response);
      }
      // Lien de prévisualisation pour Ethereal
      const previewURL = nodemailer.getTestMessageUrl(info);
      if (previewURL) {
        console.log("🔗 Aperçu email:", previewURL);
      }
    }

    return info;
  } catch (error) {
    console.error("❌ Erreur envoi email:");
    console.error("   └─ Message:", error.message);
    console.error("   └─ Code:", error.code);
    throw new Error(`Erreur lors de l'envoi de l'email: ${error.message}`);
  }
};

// ============================
// 📧 MOT DE PASSE OUBLIÉ CORRIGÉ
// ============================
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Validation
    if (!email) {
      return res.status(400).json({ error: "Email requis" });
    }
    
    if (!email.includes('@')) {
      return res.status(400).json({ error: "Format d'email invalide" });
    }

    console.log(`🔄 Demande de réinitialisation pour: ${email}`);

    // Chercher l'utilisateur (toujours répondre positivement pour la sécurité)
    const { rows } = await pool.query(
      "SELECT id, email, first_name FROM users WHERE email = $1 AND is_active = true",
      [email.toLowerCase()]
    );

    // Réponse générique pour éviter l'énumération des comptes
    const genericResponse = {
      message: "Si cet email existe dans notre base, un lien de réinitialisation a été envoyé.",
      debug: process.env.NODE_ENV === 'development' ? { emailFound: rows.length > 0 } : undefined
    };

    if (rows.length === 0) {
      console.log(`⚠️ Email non trouvé: ${email}`);
      return res.json(genericResponse);
    }

    const user = rows[0];
    const resetToken = uuidv4();
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRES_IN);

    // Transaction pour sécuriser l'opération
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      
      // Supprimer les anciens tokens
      await client.query(
        "DELETE FROM password_reset_tokens WHERE user_id = $1",
        [user.id]
      );
      
      // Créer le nouveau token
      await client.query(
        "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
        [user.id, resetToken, expiresAt]
      );
      
      await client.query("COMMIT");
      console.log("✅ Token de réinitialisation créé en base");
      
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    // Construire le lien de réinitialisation
    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    console.log("🔗 Lien de réinitialisation:", resetLink);

    // Template d'email amélioré
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .button { 
            display: inline-block; 
            background: #3b82f6; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 6px; 
            margin: 20px 0;
          }
          .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
          .warning { background: #fef3cd; border: 1px solid #fbbf24; padding: 10px; border-radius: 4px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🔐 Réinitialisation de mot de passe</h2>
          </div>
          <div class="content">
            <p>Bonjour ${user.first_name},</p>
            <p>Vous avez demandé la réinitialisation de votre mot de passe pour votre compte Audit Réglementaire.</p>
            
            <div style="text-align: center;">
              <a href="${resetLink}" class="button">Réinitialiser mon mot de passe</a>
            </div>
            
            <div class="warning">
              <strong>⚠️ Important :</strong>
              <ul>
                <li>Ce lien est valide pendant 15 minutes seulement</li>
                <li>Si vous n'avez pas fait cette demande, ignorez cet email</li>
                <li>Ne partagez jamais ce lien avec quelqu'un d'autre</li>
              </ul>
            </div>
            
            <p>Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :</p>
            <p style="word-break: break-all; color: #3b82f6;">${resetLink}</p>
          </div>
          <div class="footer">
            <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
            <p>© ${new Date().getFullYear()} Audit Réglementaire - Tous droits réservés</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Envoyer l'email
    try {
      await sendEmail(email, "Réinitialisation de votre mot de passe", emailHtml);
      console.log(`✅ Email de réinitialisation envoyé à: ${email}`);
      
      res.json({
        ...genericResponse,
        success: true
      });
      
    } catch (emailError) {
      console.error("❌ Erreur envoi email:", emailError.message);
      
      // En développement, afficher l'erreur détaillée
      if (process.env.NODE_ENV === 'development') {
        return res.status(500).json({ 
          error: "Erreur lors de l'envoi de l'email",
          details: emailError.message,
          resetToken: resetToken, // Pour debug seulement !
          resetLink: resetLink    // Pour debug seulement !
        });
      }
      
      // En production, réponse générique
      return res.status(500).json({ 
        error: "Erreur lors de l'envoi du lien de réinitialisation" 
      });
    }

  } catch (err) {
    console.error("❌ Erreur forgotPassword:", err.message);
    res.status(500).json({ 
      error: "Erreur lors du traitement de la demande de réinitialisation",
      ...(process.env.NODE_ENV === 'development' && { details: err.message })
    });
  }
};

// ============================
// 🔄 RÉINITIALISATION DU MOT DE PASSE
// ============================
export const resetPassword = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    // Validations
    if (!token) {
      return res.status(400).json({ error: "Token requis" });
    }

    if (!password || !confirmPassword) {
      return res.status(400).json({ error: "Mot de passe et confirmation requis" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Les mots de passe ne correspondent pas" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Le mot de passe doit contenir au moins 6 caractères" });
    }

    console.log(`🔄 Tentative de réinitialisation avec token: ${token.substring(0, 8)}...`);

    await client.query("BEGIN");

    // Vérifier le token
    const { rows } = await client.query(
      `SELECT rt.user_id, u.email, u.first_name 
       FROM password_reset_tokens rt
       JOIN users u ON rt.user_id = u.id
       WHERE rt.token = $1 AND rt.expires_at > NOW() AND u.is_active = true`,
      [token]
    );

    if (rows.length === 0) {
      await client.query("ROLLBACK");
      console.log(`❌ Token invalide ou expiré: ${token.substring(0, 8)}...`);
      return res.status(400).json({ error: "Token invalide ou expiré" });
    }

    const { user_id, email, first_name } = rows[0];

    // Hacher le nouveau mot de passe
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    // Mettre à jour le mot de passe
    await client.query(
      "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
      [password_hash, user_id]
    );

    // Supprimer tous les tokens de réinitialisation pour cet utilisateur
    await client.query(
      "DELETE FROM password_reset_tokens WHERE user_id = $1",
      [user_id]
    );

    await client.query("COMMIT");

    console.log(`✅ Mot de passe réinitialisé pour: ${email}`);

    res.json({ message: "Mot de passe réinitialisé avec succès" });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Erreur resetPassword:", err.message);
    res.status(500).json({ error: "Erreur lors de la réinitialisation du mot de passe" });
  } finally {
    client.release();
  }
};

// ============================
// 🔍 VÉRIFIER LA VALIDITÉ DU TOKEN
// ============================
export const validateResetToken = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ error: "Token requis" });
    }

    const { rows } = await pool.query(
      `SELECT rt.expires_at, u.email 
       FROM password_reset_tokens rt
       JOIN users u ON rt.user_id = u.id
       WHERE rt.token = $1 AND rt.expires_at > NOW() AND u.is_active = true`,
      [token]
    );

    if (rows.length === 0) {
      console.log(`❌ Token validation failed: ${token.substring(0, 8)}...`);
      return res.status(400).json({ error: "Token invalide ou expiré" });
    }

    const { expires_at } = rows[0];
    console.log(`✅ Token valide jusqu'à: ${expires_at}`);

    res.json({ 
      valid: true, 
      expiresAt: expires_at 
    });

  } catch (err) {
    console.error("❌ Erreur validateResetToken:", err.message);
    res.status(500).json({ error: "Erreur lors de la validation du token" });
  }
};

// Les autres fonctions restent identiques...
// ============================
// 📝 INSCRIPTION
// ============================
export const register = async (req, res) => {
  try {
    const { email, password, first_name, last_name, role = "user" } = req.body;

    // Validations
    if (!email || !password || !first_name || !last_name) {
      return res.status(400).json({ error: "Tous les champs sont requis" });
    }

    if (!email.includes('@')) {
      return res.status(400).json({ error: "Format d'email invalide" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Le mot de passe doit contenir au moins 6 caractères" });
    }

    // Vérifier si l'email existe déjà
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: "Cet email est déjà utilisé" });
    }

    // Déterminer le rôle
    const userRole = req.user?.role === "admin" && role === "admin" ? "admin" : "user";
    
    // Hacher le mot de passe
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    // Créer l'utilisateur
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, first_name, last_name, role, created_at`,
      [email.toLowerCase(), password_hash, first_name, last_name, userRole]
    );

    const newUser = rows[0];

    // Générer le token JWT
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    console.log(`✅ Nouvel utilisateur créé: ${email} (${userRole})`);

    res.status(201).json({
      message: "Inscription réussie",
      token,
      user: newUser
    });

  } catch (err) {
    console.error("❌ Erreur register:", err.message);
    res.status(500).json({ error: "Erreur lors de l'inscription" });
  }
};

// ============================
// 🔐 CONNEXION
// ============================
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validations
    if (!email || !password) {
      return res.status(400).json({ error: "Email et mot de passe requis" });
    }

    console.log(`🔄 Tentative de connexion: ${email}`);

    // Chercher l'utilisateur
    const { rows } = await pool.query(
      `SELECT id, email, password_hash, first_name, last_name, role, is_active, last_login
       FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (rows.length === 0) {
      console.log(`❌ Email non trouvé: ${email}`);
      return res.status(401).json({ error: "Email ou mot de passe incorrect" });
    }

    const user = rows[0];

    // Vérifier si le compte est actif
    if (!user.is_active) {
      console.log(`❌ Compte désactivé: ${email}`);
      return res.status(401).json({ error: "Compte désactivé" });
    }

    // Vérifier le mot de passe
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      console.log(`❌ Mot de passe incorrect: ${email}`);
      return res.status(401).json({ error: "Email ou mot de passe incorrect" });
    }

    // Mettre à jour la dernière connexion
    await pool.query(
      "UPDATE users SET last_login = NOW() WHERE id = $1",
      [user.id]
    );

    // Générer le token JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Préparer les données utilisateur
    const userData = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      last_login: user.last_login
    };

    console.log(`✅ Connexion réussie: ${email} (${user.role})`);

    res.json({
      message: "Connexion réussie",
      token,
      user: userData
    });

  } catch (err) {
    console.error("❌ Erreur login:", err.message);
    res.status(500).json({ error: "Erreur lors de la connexion" });
  }
};

// ============================
// 👤 PROFIL UTILISATEUR
// ============================
export const getProfile = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, email, first_name, last_name, role, created_at, last_login, updated_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    res.json(rows[0]);

  } catch (err) {
    console.error("❌ Erreur getProfile:", err.message);
    res.status(500).json({ error: "Erreur lors de la récupération du profil" });
  }
};

// ============================
// ✏️ MISE À JOUR PROFIL
// ============================
export const updateProfile = async (req, res) => {
  try {
    const { first_name, last_name, current_password, new_password } = req.body;
    const userId = req.user.id;

    let updateFields = [];
    let values = [];
    let paramIndex = 1;

    if (first_name) {
      updateFields.push(`first_name = $${paramIndex++}`);
      values.push(first_name);
    }

    if (last_name) {
      updateFields.push(`last_name = $${paramIndex++}`);
      values.push(last_name);
    }

    if (new_password) {
      if (!current_password) {
        return res.status(400).json({ error: "Mot de passe actuel requis pour le changement" });
      }

      if (new_password.length < 6) {
        return res.status(400).json({ error: "Le nouveau mot de passe doit contenir au moins 6 caractères" });
      }

      const { rows: userRows } = await pool.query(
        "SELECT password_hash FROM users WHERE id = $1",
        [userId]
      );

      const isValidCurrentPassword = await bcrypt.compare(current_password, userRows[0].password_hash);
      if (!isValidCurrentPassword) {
        return res.status(400).json({ error: "Mot de passe actuel incorrect" });
      }

      const newPasswordHash = await bcrypt.hash(new_password, SALT_ROUNDS);
      updateFields.push(`password_hash = $${paramIndex++}`);
      values.push(newPasswordHash);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: "Aucune modification à apporter" });
    }

    updateFields.push("updated_at = NOW()");
    values.push(userId);

    const { rows } = await pool.query(
      `UPDATE users SET ${updateFields.join(", ")} 
       WHERE id = $${paramIndex} 
       RETURNING id, email, first_name, last_name, role, updated_at`,
      values
    );

    console.log(`✅ Profil mis à jour: ${req.user.email}`);

    res.json({
      message: "Profil mis à jour avec succès",
      user: rows[0]
    });

  } catch (err) {
    console.error("❌ Erreur updateProfile:", err.message);
    res.status(500).json({ error: "Erreur lors de la mise à jour du profil" });
  }
};

// Ajouter cette fonction dans authController.js

// ============================
// 🗑️ SUPPRESSION DE COMPTE
// ============================
export const deleteAccount = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { current_password } = req.body;
    const userId = req.user.id;
    const userEmail = req.user.email;

    console.log(`🗑️ Demande de suppression de compte: ${userEmail}`);
    console.log("📩 Body reçu (deleteAccount):", req.body);

    if (!current_password) {
      return res.status(400).json({ 
        error: "Mot de passe actuel requis pour supprimer le compte" 
      });
    }

    await client.query("BEGIN");

    // Vérifier le mot de passe actuel
    const { rows: userRows } = await client.query(
      "SELECT password_hash FROM users WHERE id = $1 AND is_active = true",
      [userId]
    );

    if (userRows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    const isValidPassword = await bcrypt.compare(
      current_password, 
      userRows[0].password_hash
    );

    if (!isValidPassword) {
      await client.query("ROLLBACK");
      console.log(`❌ Mot de passe incorrect pour suppression: ${userEmail}`);
      return res.status(401).json({ error: "Mot de passe incorrect" });
    }

    // Suppression des données liées
    const { rowCount: deletedAudits } = await client.query(
      "DELETE FROM audit_conformite WHERE user_id = $1",
      [userId]
    );

    const { rowCount: deletedTokens } = await client.query(
      "DELETE FROM password_reset_tokens WHERE user_id = $1",
      [userId]
    );

    // Soft delete de l'utilisateur
    await client.query(
      "UPDATE users SET is_active = false, email = CONCAT(email, '_deleted_', EXTRACT(epoch FROM NOW())), updated_at = NOW() WHERE id = $1",
      [userId]
    );

    await client.query("COMMIT");

    console.log(`✅ Compte désactivé avec succès: ${userEmail}`);
    console.log(`   ├─ Audits supprimés: ${deletedAudits}`);
    console.log(`   └─ Tokens supprimés: ${deletedTokens}`);

    res.json({
      message: "Votre compte a été désactivé et toutes vos données associées supprimées",
      deleted_data: {
        audits: deletedAudits,
        reset_tokens: deletedTokens,
        user_account: true
      },
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Erreur suppression de compte:", err.message);
    
    res.status(500).json({ 
      error: "Erreur lors de la suppression du compte",
      ...(process.env.NODE_ENV === 'development' && { details: err.message })
    });
  } finally {
    client.release();
  }
};


// ============================
// 🚪 DÉCONNEXION
// ============================
export const logout = async (req, res) => {
  try {
    console.log(`🚪 Déconnexion: ${req.user.email}`);
    res.json({ message: "Déconnexion réussie" });
  } catch (err) {
    console.error("❌ Erreur logout:", err.message);
    res.status(500).json({ error: "Erreur lors de la déconnexion" });
  }
};