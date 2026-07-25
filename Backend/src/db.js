import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" 
    ? { rejectUnauthorized: false } 
    : false,
});

console.log("✅ Connected to database");

// Fermeture propre du pool
process.on("SIGINT", async () => {
  await pool.end();
  console.log("🔒 Database connection closed");
  process.exit();
});
