import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite/vector";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(__dirname, "..");

let _db: PGlite | null = null;

export function db(): PGlite {
  if (!_db) {
    _db = new PGlite(join(ROOT, "data", "db"), { extensions: { vector } });
  }
  return _db;
}

export async function initSchema() {
  const sql = readFileSync(join(ROOT, "schema.sql"), "utf8");
  await db().exec(sql);
}

export function toVec(v: number[]): string {
  return JSON.stringify(v);
}
