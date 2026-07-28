import { createHash } from "crypto";
import { readdirSync, readFileSync } from "fs";
import { join, basename } from "path";
import { db, toVec, ROOT } from "./db.js";
import { embed } from "./embed.js";
import { classifySpan, hasClassifier, type Candidate } from "./classify.js";

const TOP_K = 6;
const SIM_FLOOR = 0.3; // below this cosine similarity, don't even ask the classifier

function chunk(text: string): string[] {
  // Paragraph-level spans, merged up to ~600 chars. Spans, not documents,
  // are the unit of evidence — one review can cut both ways.
  const paras = text.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p.length > 40);
  const spans: string[] = [];
  let buf = "";
  for (const p of paras) {
    if (buf && buf.length + p.length > 600) {
      spans.push(buf);
      buf = p;
    } else {
      buf = buf ? `${buf}\n\n${p}` : p;
    }
  }
  if (buf) spans.push(buf);
  return spans.length > 0 ? spans : text.trim().length > 40 ? [text.trim()] : [];
}

export async function ingestDir(dir = join(ROOT, "data", "corpus")): Promise<void> {
  const files = readdirSync(dir).filter((f) => f.endsWith(".txt")).sort();
  let newDocs = 0;
  let newLinks = 0;
  let skipped = 0;

  for (const file of files) {
    const path = join(dir, file);
    const text = readFileSync(path, "utf8");
    const sha = createHash("sha256").update(text).digest("hex");

    // Incremental: same content, never reprocessed. 500k new docs in
    // discovery only costs you the 500k new docs.
    const existing = await db().query(`SELECT id FROM documents WHERE sha256 = $1`, [sha]);
    if (existing.rows.length > 0) {
      skipped++;
      continue;
    }

    const doc = await db().query<{ id: number }>(
      `INSERT INTO documents (source_path, title, sha256) VALUES ($1, $2, $3) RETURNING id`,
      [path, basename(file, ".txt"), sha],
    );
    const docId = doc.rows[0].id;
    newDocs++;

    const docTextLower = text.toLowerCase();
    const spanTexts = chunk(text);
    const vecs = await embed(spanTexts);

    for (let i = 0; i < spanTexts.length; i++) {
      const span = await db().query<{ id: number }>(
        `INSERT INTO spans (document_id, idx, text, embedding) VALUES ($1, $2, $3, $4::vector) RETURNING id`,
        [docId, i, spanTexts[i], toVec(vecs[i])],
      );
      const spanId = span.rows[0].id;

      // The index FINDS candidate facts; the classifier CONFIRMS stance.
      const nearest = await db().query<{
        fact_id: number; fact_text: string; element_name: string; claim_title: string; sim: number;
      }>(
        `SELECT f.id AS fact_id, f.text AS fact_text, e.name AS element_name, c.title AS claim_title,
                1 - (f.embedding <=> $1::vector) AS sim
         FROM facts f
         JOIN elements e ON e.id = f.element_id
         JOIN claims c ON c.id = e.claim_id
         ORDER BY f.embedding <=> $1::vector
         LIMIT $2`,
        [toVec(vecs[i]), TOP_K],
      );

      // A span only counts as evidence for a product it's actually about.
      // Similarity alone would link every "band rides up" to every bra.
      const candidates = nearest.rows.filter((r) => {
        if (r.sim < SIM_FLOOR) return false;
        const brand = r.claim_title.split(" — ")[0]?.trim().toLowerCase();
        return brand && docTextLower.includes(brand);
      });
      if (candidates.length === 0) continue;

      if (hasClassifier()) {
        const judgments = await classifySpan(
          spanTexts[i],
          candidates.map<Candidate>((r) => ({
            factId: r.fact_id, factText: r.fact_text, elementName: r.element_name, claimTitle: r.claim_title,
          })),
        );
        for (const j of judgments) {
          if (!j.relevant || j.confidence < 0.3) continue;
          await db().query(
            `INSERT INTO evidence_links (span_id, fact_id, stance, confidence, origin)
             VALUES ($1, $2, $3, $4, 'model') ON CONFLICT (span_id, fact_id) DO NOTHING`,
            [spanId, j.factId, j.stance, j.confidence],
          );
          newLinks++;
        }
      } else {
        // No API key: similarity-only links, stance defaults to supports.
        // Weaker, but the demo still runs end-to-end offline.
        for (const r of candidates) {
          await db().query(
            `INSERT INTO evidence_links (span_id, fact_id, stance, confidence, origin)
             VALUES ($1, $2, 'supports', $3, 'model') ON CONFLICT (span_id, fact_id) DO NOTHING`,
            [spanId, r.fact_id, r.sim],
          );
          newLinks++;
        }
      }
    }
  }

  console.log(`Ingest: ${newDocs} new document(s), ${skipped} unchanged (skipped), ${newLinks} evidence link(s) created.`);
  if (!hasClassifier()) {
    console.log(`(No ANTHROPIC_API_KEY — links are similarity-only with default stance. Set the key for real supports/undermines classification.)`);
  }
}
