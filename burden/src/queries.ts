import { db } from "./db.js";

// THE query: which elements are weakly supported — instant, plain SQL.
// Human-corrected links count double; undermining evidence subtracts.
export async function weakElements(claimSlug?: string) {
  const res = await db().query<{
    claim: string; element: string; supports: number; undermines: number;
    score: number; facts: number;
  }>(
    `SELECT c.title AS claim,
            e.name AS element,
            COUNT(*) FILTER (WHERE l.stance = 'supports') AS supports,
            COUNT(*) FILTER (WHERE l.stance = 'undermines') AS undermines,
            COALESCE(SUM(
              CASE WHEN l.stance = 'supports' THEN l.confidence ELSE -l.confidence END
              * CASE WHEN l.origin = 'human' THEN 2.0 ELSE 1.0 END
            ), 0)::numeric(10,2) AS score,
            COUNT(DISTINCT f.id) AS facts
     FROM elements e
     JOIN claims c ON c.id = e.claim_id
     LEFT JOIN facts f ON f.element_id = e.id
     LEFT JOIN evidence_links l ON l.fact_id = f.id
     WHERE ($1::text IS NULL OR c.slug = $1)
     GROUP BY c.id, c.title, e.id, e.name
     ORDER BY score ASC, supports ASC`,
    [claimSlug ?? null],
  );
  return res.rows;
}

export async function linksFor(claimSlug?: string) {
  const res = await db().query<{
    link_id: number; claim: string; element: string; stance: string;
    confidence: number; origin: string; span: string; doc: string;
  }>(
    `SELECT l.id AS link_id, c.title AS claim, e.name AS element, l.stance,
            l.confidence, l.origin, s.text AS span, d.title AS doc
     FROM evidence_links l
     JOIN facts f ON f.id = l.fact_id
     JOIN elements e ON e.id = f.element_id
     JOIN claims c ON c.id = e.claim_id
     JOIN spans s ON s.id = l.span_id
     JOIN documents d ON d.id = s.document_id
     WHERE ($1::text IS NULL OR c.slug = $1)
     ORDER BY c.id, e.idx, l.stance, l.confidence DESC`,
    [claimSlug ?? null],
  );
  return res.rows;
}

// The correction loop: the reviewer's ruling moves the link NOW and is
// recorded as data that steers every future classification (see classify.ts).
export async function correct(
  linkId: number,
  opts: { factId?: number; stance?: "supports" | "undermines"; remove?: boolean; note?: string },
) {
  const link = await db().query<{ id: number; span_id: number; fact_id: number; stance: string }>(
    `SELECT id, span_id, fact_id, stance FROM evidence_links WHERE id = $1`,
    [linkId],
  );
  if (link.rows.length === 0) throw new Error(`No evidence link with id ${linkId}`);
  const l = link.rows[0];

  await db().query(
    `INSERT INTO corrections (link_id, span_id, old_fact_id, new_fact_id, old_stance, new_stance, note)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      l.id, l.span_id, l.fact_id,
      opts.remove ? null : (opts.factId ?? l.fact_id),
      l.stance,
      opts.remove ? null : (opts.stance ?? l.stance),
      opts.note ?? null,
    ],
  );

  if (opts.remove) {
    await db().query(`DELETE FROM evidence_links WHERE id = $1`, [linkId]);
    return { action: "removed", linkId };
  }

  await db().query(
    `UPDATE evidence_links SET fact_id = $2, stance = $3, confidence = 1.0, origin = 'human' WHERE id = $1`,
    [linkId, opts.factId ?? l.fact_id, opts.stance ?? l.stance],
  );
  return { action: "corrected", linkId };
}

export async function status() {
  const res = await db().query<{ what: string; n: number }>(
    `SELECT 'claims' AS what, COUNT(*)::int AS n FROM claims
     UNION ALL SELECT 'elements', COUNT(*)::int FROM elements
     UNION ALL SELECT 'facts', COUNT(*)::int FROM facts
     UNION ALL SELECT 'documents', COUNT(*)::int FROM documents
     UNION ALL SELECT 'spans', COUNT(*)::int FROM spans
     UNION ALL SELECT 'evidence_links', COUNT(*)::int FROM evidence_links
     UNION ALL SELECT 'corrections', COUNT(*)::int FROM corrections`,
  );
  return res.rows;
}
