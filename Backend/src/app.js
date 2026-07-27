// app.js (VERSION CORRIGÉE)
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import reglementationRoutes from "./routes/reglementation.js";
import auditRoutes from "./routes/audit.js";
import dashboardRoutes from "./routes/dashboard.js";
import authRoutes from "./routes/auth.js";
import usersRoutes from "./routes/users.js";
import reportRoutes from "./routes/reports.js";
import leadRoutes from "./routes/leads.js";
import { pool } from "./db.js";
import path from "path";
import { fileURLToPath } from "url";

// Charger les variables d'environnement
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ================================
// VÉRIFICATIONS DES VARIABLES D'ENVIRONNEMENT
// ================================
const requiredEnvVars = ["JWT_SECRET", "DATABASE_URL"];
const missingEnvVars = requiredEnvVars.filter(
  (varName) => !process.env[varName]
);

if (missingEnvVars.length > 0) {
  console.error("❌ Variables d'environnement manquantes:", missingEnvVars);
  process.exit(1);
}

// ================================
// CONFIGURATION SÉCURITÉ
// ================================
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false, // désactivé pour éviter conflits avec le frontend
  })
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  // 100 req/15min est trop bas pour le développement : une page comme /reglementation
  // déclenche plusieurs appels API par chargement (réglementations, favoris, domaines,
  // responsables), donc quelques rechargements suffisent à épuiser le quota.
  max: process.env.NODE_ENV === "development" ? 2000 : 100,
  message: { error: "Trop de requêtes, réessayez dans 15 minutes" },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

// ================================
// CONFIGURATION CORS
// ================================
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "https://reglo-landing.onrender.com",
  "https://safenext-1.onrender.com",
  "https://safenext-1.onrender.com/recap",
  "https://safenext-1.onrender.com/reglementation",
  "https://safenext-1.onrender.com/profile",
  "https://safenext.onrender.com",
  "https://safenext.onrender.com/recap",
  "https://safenext.onrender.com/reglementation",
  "https://safenext.onrender.com/profile",
  "https://safetysolution.onrender.com",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://0.0.0.0:3000",
  "http://0.0.0.0:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // mobile apps, Postman

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    if (process.env.NODE_ENV === "development") {
      return callback(null, true);
    }

    const msg = `CORS: L'origine ${origin} n'est pas autorisée`;
    return callback(new Error(msg), false);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
    "X-CSRF-Token",
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  maxAge: 86400,
};

app.use(cors(corsOptions));

// ================================
// LOGGING
// ================================
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const origin = req.get("Origin") || "Direct";
  const userAgent = req.get("User-Agent") || "Unknown";

  console.log(`🌐 ${timestamp} - ${req.method} ${req.path}`);
  console.log(`   └─ Origin: ${origin}`);

  if (process.env.NODE_ENV === "development") {
    console.log(`   └─ User-Agent: ${userAgent.substring(0, 50)}...`);
    console.log(`   └─ IP: ${req.ip}`);
  }

  next();
});

// ================================
// MIDDLEWARE PARSING
// ================================
app.use(
  express.json({
    limit: "10mb",
    verify: (req, res, buf) => {
      try {
        JSON.parse(buf);
      } catch (e) {
        res.status(400).json({ error: "JSON invalide" });
        throw new Error("JSON invalide");
      }
    },
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  })
);

// Timeout
app.use((req, res, next) => {
  req.setTimeout(30000, () => {
    res.status(408).json({ error: "Timeout de la requête" });
  });
  next();
});

// ================================
// ROUTES
// ================================
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/reglementation", reglementationRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/leads", leadRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "🚀 API Audit Réglementaire v2.1",
    version: "2.1.0",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    features: [
      "Multi-utilisateurs",
      "Authentification JWT",
      "Gestion des permissions",
      "Réinitialisation mot de passe",
      "Rate limiting",
      "Sécurité renforcée",
    ],
    endpoints: {
      auth: "/api/auth",
      users: "/api/users",
      reglementation: "/api/reglementation",
      audit: "/api/audit",
      dashboard: "/api/dashboard",
      reports: "/api/reports",
      leads: "/api/leads",
      health: "/health",
      status: "/api/status",
    },
    cors: {
      allowedOrigins:
        process.env.NODE_ENV === "development" ? ["*"] : allowedOrigins,
    },
  });
});

app.get("/health", async (req, res) => {
  const healthCheck = {
    status: "unknown",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    checks: {
      database: "unknown",
      memory: process.memoryUsage(),
      version: process.version,
    },
  };

  try {
    const start = Date.now();
    await pool.query("SELECT 1 as test");
    const dbResponseTime = Date.now() - start;

    healthCheck.status = "healthy";
    healthCheck.checks.database = {
      status: "connected",
      responseTime: `${dbResponseTime}ms`,
    };

    res.status(200).json(healthCheck);
  } catch (err) {
    console.error("❌ Health check failed:", err.message);

    healthCheck.status = "unhealthy";
    healthCheck.checks.database = {
      status: "disconnected",
      error: err.message,
    };

    res.status(503).json(healthCheck);
  }
});

app.get("/api/status", (req, res) => {
  res.json({
    api: "operational",
    timestamp: new Date().toISOString(),
    version: "2.1.0",
    endpoints_available: [
      "POST /api/auth/login",
      "POST /api/auth/register",
      "GET /api/auth/profile",
      "POST /api/auth/forgot-password",
      "POST /api/auth/reset-password/:token",
    ],
  });
});

// ================================
// GESTION D'ERREURS
// ================================
app.use((err, req, res, next) => {
  console.error("🚨 Erreur serveur:");
  console.error("   └─ Message:", err.message);
  console.error("   └─ Stack:", err.stack);
  console.error("   └─ Route:", req.method, req.path);
  console.error("   └─ Body:", JSON.stringify(req.body, null, 2));

  if (err.message === "JSON invalide") {
    return res.status(400).json({
      error: "Format JSON invalide dans la requête",
      timestamp: new Date().toISOString(),
    });
  }

  if (err.message.includes("CORS")) {
    return res.status(403).json({
      error: "Origine non autorisée",
      timestamp: new Date().toISOString(),
    });
  }

  res.status(500).json({
    error: "Erreur interne du serveur",
    timestamp: new Date().toISOString(),
    requestId: req.headers["x-request-id"] || "unknown",
  });
});

app.use((req, res) => {
  console.log(`⚠️ Route non trouvée: ${req.method} ${req.path}`);

  res.status(404).json({
    error: "Route non trouvée",
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
    suggestion: "Vérifiez l'URL et la méthode HTTP",
  });
});

// ================================
// INITIALISATION DB
// ================================
const initializeDatabase = async () => {
  try {
    const client = await pool.connect();
    console.log("✅ Connexion à la base de données établie");

    const result = await client.query("SELECT NOW() as current_time");
    console.log(`⏰ Heure serveur DB: ${result.rows[0].current_time}`);

    client.release();
    return true;
  } catch (err) {
    console.error("❌ Erreur de connexion à la base de données:");
    console.error("   └─ Message:", err.message);
    console.error("   └─ Code:", err.code);
    return false;
  }
};

// ================================
// DÉMARRAGE SERVEUR
// ================================
const startServer = async () => {
  const dbConnected = await initializeDatabase();

  if (!dbConnected && process.env.NODE_ENV === "production") {
    console.error("❌ Impossible de démarrer sans connexion DB en production");
    process.exit(1);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log("🚀 ========================================");
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
    console.log(`🚀 Environnement: ${process.env.NODE_ENV || "development"}`);
    console.log(`🚀 URL locale: http://localhost:${PORT}`);
    console.log(`🚀 Health check: http://localhost:${PORT}/health`);
    console.log("🚀 ========================================");
  });
};

app.set("trust proxy", 1);

process.on("SIGTERM", async () => {
  console.log("🔄 Arrêt du serveur en cours...");
  await pool.end();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("🔄 Arrêt du serveur en cours...");
  await pool.end();
  process.exit(0);
});

startServer().catch((err) => {
  console.error("❌ Erreur fatale:", err);
  process.exit(1);
});

export default app;
