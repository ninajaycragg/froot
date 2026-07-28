import { initSchema, db } from "./db.js";
import { seedBras } from "./seed/bras.js";
import { buildCorpus } from "./seed/corpus.js";
import { ingestDir } from "./ingest.js";
import { weakElements, linksFor, correct, status } from "./queries.js";

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const cmd = process.argv[2];

async function main() {
  switch (cmd) {
    case "init": {
      await initSchema();
      console.log("Schema ready (pglite + pgvector at data/db).");
      break;
    }
    case "seed": {
      await initSchema();
      await seedBras();
      break;
    }
    case "corpus": {
      buildCorpus();
      break;
    }
    case "ingest": {
      await ingestDir(process.argv[3]);
      break;
    }
    case "weak": {
      const rows = await weakElements(process.argv[3]);
      if (rows.length === 0) {
        console.log("Nothing seeded yet. Run: npm run seed");
        break;
      }
      console.log(
        "score  sup  und  element              claim\n" +
        rows
          .map((r) =>
            `${String(r.score).padStart(5)}  ${String(r.supports).padStart(3)}  ${String(r.undermines).padStart(3)}  ` +
            `${r.element.padEnd(19)}  ${r.claim}`,
          )
          .join("\n"),
      );
      console.log("\nLowest score = weakest element. Zero evidence = unsupported, not refuted — go find out.");
      break;
    }
    case "links": {
      const rows = await linksFor(process.argv[3]);
      for (const r of rows) {
        console.log(
          `#${r.link_id} [${r.stance.toUpperCase()} ${Number(r.confidence).toFixed(2)} ${r.origin}] ` +
          `${r.claim} / ${r.element}\n    "${r.span.replace(/\s+/g, " ").slice(0, 180)}"  (${r.doc})\n`,
        );
      }
      if (rows.length === 0) console.log("No evidence links yet. Run: npm run cli ingest");
      break;
    }
    case "correct": {
      const linkId = parseInt(process.argv[3], 10);
      if (isNaN(linkId)) throw new Error("Usage: correct <linkId> [--stance supports|undermines] [--fact <factId>] [--remove] [--note \"...\"]");
      const result = await correct(linkId, {
        stance: flag("stance") as "supports" | "undermines" | undefined,
        factId: flag("fact") ? parseInt(flag("fact")!, 10) : undefined,
        remove: process.argv.includes("--remove"),
        note: flag("note"),
      });
      console.log(`${result.action}: link #${result.linkId}. This ruling now steers future classification.`);
      break;
    }
    case "status": {
      for (const r of await status()) console.log(`${String(r.n).padStart(6)}  ${r.what}`);
      break;
    }
    default:
      console.log(
        `burden — which elements carry their burden?\n\n` +
        `  init               create schema\n` +
        `  seed               claims/elements/facts from froot measurement data\n` +
        `  corpus             build data/corpus/ from froot stories\n` +
        `  ingest [dir]       incremental: chunk, embed, link new documents\n` +
        `  weak [claim-slug]  THE query: weakest elements first\n` +
        `  links [claim-slug] every evidence link with its receipt\n` +
        `  correct <linkId>   reviewer ruling: --stance, --fact, --remove, --note\n` +
        `  status             row counts\n`,
      );
  }
  await db().close();
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
