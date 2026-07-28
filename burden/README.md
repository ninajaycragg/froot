# Burden

**Which elements carry their burden?** An argumentation engine for product claims, pointed at bra fit — Froot's reasoning layer.

Reviews answer *"is it good."* This answers *"will it fit this body, and what's the evidence?"*

## The idea

Every bra recommendation is a **claim** ("Panache Tango in 30FF fits you"). A claim decomposes into **elements** — the ABTAF fit taxonomy: band, cup volume, cup shape, gore, straps/wires. Each element rests on **facts** (measured Bratabase dimensions: band stretch, cup depth, gore height). Facts are supported or undermined by **evidence spans** — sentences from real fit reviews, stance-tagged, because one review can praise the cups and damn the band in adjacent sentences. Reviewer **corrections** are stored as data and steer every future classification. Ingest is **incremental** — documents dedupe on content hash, so a new dump of reviews only costs the new reviews.

Postgres is the system of record; the vector index is a derived lens. **The index FINDS, the record CONFIRMS.**

## Run it

```bash
npm install
npx tsx src/cli.ts init      # schema (pglite + pgvector, embedded — zero setup)
npx tsx src/cli.ts seed      # claims/elements/facts from froot_data measurements
npx tsx src/cli.ts corpus    # starter evidence docs from froot's ABTAF stories
npx tsx src/cli.ts ingest    # chunk → embed → retrieve candidates → stance-classify → link
npx tsx src/cli.ts weak      # THE query: weakest elements first, instant SQL
npx tsx src/cli.ts links     # every verdict with its receipt (quoted span)
npx tsx src/cli.ts correct 42 --stance undermines --note "gore doesn't tack on projected shapes"
npx tsx src/cli.ts status
```

Set `ANTHROPIC_API_KEY` to enable real supports/undermines stance classification
(Claude judges each span against candidate facts, with past corrections as few-shot
examples). Without it, ingest falls back to similarity-only links — the pipeline
runs, but every link defaults to "supports," which is exactly the doc-level-stars
failure this engine exists to fix. The contrast is the demo.

## Data sources (all already in the froot project)

| Layer | Source |
|---|---|
| Facts | `froot_data/final_bra_data.csv` — ~224k Bratabase measurement records |
| Elements | `froot/data/fit-diagnostics.json` — ABTAF symptom taxonomy |
| Evidence (starter) | `froot/data/stories.json` — extracted ABTAF quotes |
| Evidence (scale) | `reddit.csv` (r/ABraThatFits corpus — on the other laptop) |
| Corrections | Froot's `FitFeedbackModal`, once wired to the `corrections` table |

Scraped data bootstraps the engine; first-party corrections replace it over time.
Keep the data out of any public repo.

## Honest current state

- End-to-end loop works: seed → corpus → ingest → weak → links → correct, incrementality proven (re-ingest skips 100%).
- Starter corpus is *size journeys*, not fit reviews — emotionally rich, evidentially thin. Most similarity links are relevance noise the classifier should reject; the real corpus is `reddit.csv`.
- Span↔claim matching requires the brand to appear in the document; size proximity is **not** yet enforced (a 34G story can link to a 28D claim). Fix: profile-scoped retrieval (size bucket + shape axes from the quiz).
- Stance classification untested until an API key is present.

## Why this architecture (the four questions it answers)

1. **"Which elements are weakly supported?"** — one SQL query over `claims → elements → facts ← evidence_links`, no LLM at query time.
2. **"This evidence belongs to a different claim."** — `correct` moves the link now and records the ruling; recent corrections are injected into the classifier prompt, sharpening future retrieval.
3. **"One part supports, another undermines."** — links attach spans (not documents) to facts with a stance; the tension is preserved, not averaged away.
4. **"500k new documents arrive."** — content-hash dedupe; only new documents are chunked, embedded, and matched. Nothing is reprocessed.
