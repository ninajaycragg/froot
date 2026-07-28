import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { ROOT } from "../db.js";

// Turn froot's extracted ABTAF stories into corpus documents.
// This is the starter evidence layer; reddit.csv replaces it at scale
// with zero code changes — ingest just reads data/corpus/*.txt.

type Journey = {
  from?: string; to?: string; quote?: string; title?: string;
  brands?: string[]; shapes?: string[];
};

export function buildCorpus(): void {
  const raw = JSON.parse(readFileSync(join(ROOT, "data", "seed", "stories.json"), "utf8")) as Record<
    string,
    { journeys?: Journey[] }
  >;
  const dir = join(ROOT, "data", "corpus");
  mkdirSync(dir, { recursive: true });

  let count = 0;
  for (const [bucket, payload] of Object.entries(raw)) {
    const journeys = payload.journeys ?? [];
    for (let i = 0; i < journeys.length; i++) {
      const j = journeys[i];
      const quote = (j.quote ?? "").trim();
      if (quote.length < 60) continue; // titles-only carry no fit evidence

      const lines = [
        j.title && j.title !== j.quote ? `Title: ${j.title}` : null,
        `Size bucket: ${bucket}.` + (j.from && j.to ? ` Size journey: ${j.from} to ${j.to}.` : ""),
        j.brands?.length ? `Brands mentioned: ${j.brands.join(", ")}.` : null,
        j.shapes?.length ? `Shape notes: ${j.shapes.join(", ")}.` : null,
        "",
        quote,
      ].filter((l): l is string => l !== null);

      const slug = bucket.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      writeFileSync(join(dir, `story-${slug}-${String(i).padStart(3, "0")}.txt`), lines.join("\n"));
      count++;
    }
  }
  console.log(`Corpus: wrote ${count} story documents to data/corpus/.`);
}
