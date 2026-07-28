import { readFileSync } from "fs";
import { join } from "path";
import { db, toVec, ROOT } from "../db.js";
import { embed } from "../embed.js";

// Brands with real ABTAF/Bratabase review presence — the evidence corpus
// can actually speak to these.
const BRANDS = [
  "Panache", "Cleo", "Freya", "Elomi", "Curvy Kate", "Comexim",
  "Ewa Michalak", "Natori", "Wacoal", "Bravissimo", "Fantasie",
];
const STYLES_TO_SEED = 5;
const SIZES_PER_STYLE = 3;

const MEASUREMENTS_CSV = "/Users/ninajaycragg/Desktop/baby/froot_data/final_bra_data.csv";

// The element decomposition of the claim "this bra fits" — straight from
// the ABTAF fit taxonomy (see data/seed/fit-diagnostics.json).
// Descriptions deliberately use the community's symptom vocabulary so
// review spans embed close to their element.
const ELEMENTS = [
  {
    name: "band",
    description:
      "The band provides most of the support and must be snug, level, and parallel to the floor. A band that rides up in the back, or that you can pull more than two inches away, runs loose; a band that digs in or leaves welts runs tight.",
  },
  {
    name: "cup volume",
    description:
      "Cups must contain all breast tissue after swoop and scoop. Overflow, spillage, or quadboob means the cup is too small; gaping, wrinkling, or empty space at the top means too big.",
  },
  {
    name: "cup shape",
    description:
      "The cup's profile must match the breast shape — projected versus shallow, full-on-top versus full-on-bottom. The wrong shape causes gaping or cutting-in even when the volume is right.",
  },
  {
    name: "gore",
    description:
      "The center gore must tack flat against the sternum. A floating or lifting gore means the cups are too small or too projected for the shape.",
  },
  {
    name: "straps and wires",
    description:
      "Straps should stay on the shoulders doing minimal work — falling straps or digging straps signal band or cup problems. Wires must follow the inframammary fold without poking at the armpit or sitting on breast tissue.",
  },
] as const;

type Agg = {
  brand: string; style: string; size: string; n: number;
  sb?: number; bl?: number; cw?: number; cd?: number; wl?: number; gh?: number; wh?: number;
};

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

function loadAggregates(): Agg[] {
  const text = readFileSync(MEASUREMENTS_CSV, "utf8");
  const lines = text.split("\n");
  const header = parseCsvLine(lines[0]);
  const col = (name: string) => header.indexOf(name);
  const ci = {
    brand: col("Brand Name"), style: col("Bra Style"), size: col("Size"),
    sb: col("Stretched Band"), bl: col("Band length"), cw: col("Cup width"),
    cd: col("Cup depth"), wl: col("Wire length"), gh: col("Gore height"), wh: col("Wing height"),
  };

  type Acc = { n: number; measured: number; sums: Record<string, { total: number; count: number }> };
  const groups = new Map<string, Acc>();

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const row = parseCsvLine(lines[i]);
    const brand = row[ci.brand]?.trim();
    const style = row[ci.style]?.trim();
    const size = row[ci.size]?.trim().toUpperCase();
    if (!brand || !style || !size) continue;
    if (!BRANDS.some((b) => brand.toLowerCase() === b.toLowerCase())) continue;
    if (!/^(28|30|32|34|36|38|40|42|44)[A-K]{1,2}$/.test(size)) continue; // UK bands only for v1

    const key = `${brand}|${style}|${size}`;
    const acc = groups.get(key) ?? { n: 0, measured: 0, sums: {} };
    acc.n++;
    let fields = 0;
    for (const f of ["sb", "bl", "cw", "cd", "wl", "gh", "wh"] as const) {
      const v = parseFloat(row[ci[f]] ?? "");
      if (!isNaN(v) && v > 0) {
        fields++;
        acc.sums[f] = acc.sums[f] ?? { total: 0, count: 0 };
        acc.sums[f].total += v;
        acc.sums[f].count++;
      }
    }
    if (fields >= 3) acc.measured++;
    groups.set(key, acc);
  }

  const aggs: Agg[] = [];
  for (const [key, acc] of groups) {
    if (acc.measured === 0) continue; // a size with no real measurements can't yield facts
    const [brand, style, size] = key.split("|");
    const agg: Agg = { brand, style, size, n: acc.measured };
    for (const f of ["sb", "bl", "cw", "cd", "wl", "gh", "wh"] as const) {
      const s = acc.sums[f];
      if (s && s.count > 0) agg[f] = Math.round((s.total / s.count) * 10) / 10;
    }
    aggs.push(agg);
  }
  return aggs;
}

function bandVerdict(size: string, sb?: number): string {
  if (sb === undefined) return "";
  const band = parseInt(size, 10);
  const diff = sb - band;
  const verdict = diff < 0 ? "runs tight" : diff <= 3 ? "is true to size" : "runs loose";
  return `It ${verdict} for a ${band} band.`;
}

function shapeVerdict(cw?: number, cd?: number): string {
  if (!cw || !cd) return "";
  const ratio = cd / cw;
  if (ratio > 1.45) return "a relatively projected profile — suits projected shapes, may gape on shallow shapes";
  if (ratio < 1.25) return "a relatively shallow profile — suits shallow shapes, may overflow on projected shapes";
  return "a moderate profile between projected and shallow";
}

function factsFor(a: Agg): { element: string; text: string }[] {
  const id = `${a.brand} ${a.style} in ${a.size}`;
  const facts: { element: string; text: string }[] = [];

  if (a.sb || a.bl) {
    facts.push({
      element: "band",
      text:
        `${id}: the band measures ${a.bl ?? "?"}" unstretched and stretches to ${a.sb ?? "?"}" ` +
        `(${a.n} measured). ${bandVerdict(a.size, a.sb)} A loose band rides up in the back and lets the straps fall; a tight band digs in.`,
    });
  }
  if (a.cw || a.cd || a.wl) {
    facts.push({
      element: "cup volume",
      text:
        `${id}: cup width ${a.cw ?? "?"}", cup depth ${a.cd ?? "?"}", wire length ${a.wl ?? "?"}" ` +
        `(${a.n} measured). If this volume runs small for the size, expect overflow or quadboob; if large, expect gaping at the top.`,
    });
    facts.push({
      element: "cup shape",
      text: `${id}: depth ${a.cd ?? "?"}" against width ${a.cw ?? "?"}" gives ${shapeVerdict(a.cw, a.cd)}.`,
    });
  }
  if (a.gh) {
    facts.push({
      element: "gore",
      text:
        `${id}: gore height ${a.gh}" (${a.n} measured). The gore must tack flat against the sternum — ` +
        `reports of a floating or lifting gore undermine the fit for projected or close-set shapes.`,
    });
  }
  if (a.wh) {
    facts.push({
      element: "straps and wires",
      text:
        `${id}: wing height ${a.wh}" (${a.n} measured). Falling straps usually trace back to a loose band; ` +
        `wires poking at the armpit suggest the wing or wire is too tall for a short root.`,
    });
  }
  return facts;
}

export async function seedBras(): Promise<void> {
  const aggs = loadAggregates();

  // Pick the styles with the deepest measurement coverage, then their
  // best-covered sizes.
  const byStyle = new Map<string, Agg[]>();
  for (const a of aggs) {
    const k = `${a.brand}|${a.style}`;
    byStyle.set(k, [...(byStyle.get(k) ?? []), a]);
  }
  // Rank by measured coverage; cap 2 styles per brand so the demo isn't
  // one brand's catalog.
  const ranked = [...byStyle.entries()].sort(
    (x, y) => y[1].reduce((s, a) => s + a.n, 0) - x[1].reduce((s, a) => s + a.n, 0),
  );
  const perBrand = new Map<string, number>();
  const topStyles: typeof ranked = [];
  for (const entry of ranked) {
    const brand = entry[0].split("|")[0];
    const used = perBrand.get(brand) ?? 0;
    if (used >= 2) continue;
    perBrand.set(brand, used + 1);
    topStyles.push(entry);
    if (topStyles.length >= STYLES_TO_SEED) break;
  }

  let claimCount = 0;
  let factCount = 0;

  for (const [, sizes] of topStyles) {
    const picked = sizes.sort((x, y) => y.n - x.n).slice(0, SIZES_PER_STYLE);
    for (const a of picked) {
      const slug = `${a.brand}-${a.style}-${a.size}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const claim = await db().query<{ id: number }>(
        `INSERT INTO claims (slug, title, body) VALUES ($1, $2, $3)
         ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title RETURNING id`,
        [
          slug,
          `${a.brand} — ${a.style} (${a.size})`,
          `${a.brand} ${a.style} in size ${a.size} fits a body that measures into ${a.size}.`,
        ],
      );
      const claimId = claim.rows[0].id;
      claimCount++;

      const elementIds = new Map<string, number>();
      for (let i = 0; i < ELEMENTS.length; i++) {
        const el = await db().query<{ id: number }>(
          `INSERT INTO elements (claim_id, idx, name, description) VALUES ($1, $2, $3, $4)
           ON CONFLICT (claim_id, idx) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
          [claimId, i, ELEMENTS[i].name, ELEMENTS[i].description],
        );
        elementIds.set(ELEMENTS[i].name, el.rows[0].id);
      }

      const facts = factsFor(a);
      const vecs = await embed(facts.map((f) => f.text));
      for (let i = 0; i < facts.length; i++) {
        await db().query(
          `INSERT INTO facts (element_id, text, embedding) VALUES ($1, $2, $3::vector)`,
          [elementIds.get(facts[i].element), facts[i].text, toVec(vecs[i])],
        );
        factCount++;
      }
    }
  }

  console.log(`Seeded ${claimCount} claims (style × size), ${claimCount * ELEMENTS.length} elements, ${factCount} measured facts.`);
}
