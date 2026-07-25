// Recharge reglementation_all depuis le CSV source (nouveau schéma).
//
// ATTENTION : ce script VIDE reglementation_all puis, en cascade (contraintes de clé
// étrangère), audit_conformite et reglementation_favorites, avant de recharger les
// données du CSV. À n'utiliser que si aucune donnée d'audit réelle n'a besoin d'être
// préservée (décision déjà validée pour ce projet).
//
// Usage : node ./scripts/importReglementationCsv.js [chemin_vers_le_csv]
// Par défaut : ../database/reglementation_ehs_algerie.csv

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";
import { pool } from "../src/db.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultCsvPath = path.join(currentDirectory, "..", "..", "database", "reglementation_ehs_algerie.csv");
const csvPath = process.argv[2] || defaultCsvPath;

// Une valeur vide ou "0" signifie "non renseigné" dans ce CSV (confirmé pour Lien_1..4).
const toNullable = (value) => {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "0") return null;
  return trimmed;
};

// Convertit une date DD/MM/YYYY (format du CSV) en YYYY-MM-DD (format SQL).
const parseDateFr = (value) => {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "0") return null;

  const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) {
    console.warn(`  ⚠ Date ignorée (format inattendu) : "${trimmed}"`);
    return null;
  }

  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
};

try {
  const raw = await readFile(csvPath, "utf8");
  const content = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw; // retire le BOM UTF-8

  const rows = parse(content, {
    columns: true,
    delimiter: ";",
    skip_empty_lines: true,
    relax_column_count: true,
  });

  console.log(`${rows.length} lignes lues depuis ${csvPath}`);

  await pool.query("BEGIN");
  try {
    await pool.query("TRUNCATE TABLE reglementation_all RESTART IDENTITY CASCADE");
    console.log("reglementation_all vidée (et, en cascade, audit_conformite / reglementation_favorites).");

    const insertSql = `
      INSERT INTO reglementation_all (
        domaine, titre, sous_titre, reference_reglementaire, id_article,
        exigence, documents_justificatif, lien_1, lien_2, lien_3, lien_4,
        derniere_verification_jo
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    `;

    let inserted = 0;
    for (const row of rows) {
      await pool.query(insertSql, [
        toNullable(row.Domaine),
        toNullable(row.Titre),
        toNullable(row.Sous_Titre),
        toNullable(row.Référence_Reglementaire),
        toNullable(row.ID_Article),
        toNullable(row.Exigence),
        toNullable(row.Documents_Justificatif),
        toNullable(row.Lien_1),
        toNullable(row.Lien_2),
        toNullable(row.Lien_3),
        toNullable(row.Lien_4),
        parseDateFr(row.Derniere_verification_JO),
      ]);
      inserted++;
    }

    await pool.query("COMMIT");
    console.log(`Import terminé : ${inserted} réglementations chargées.`);
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  }
} finally {
  await pool.end();
}
