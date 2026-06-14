# tag-bras.mjs — the VLM bra-tagger

Turns a single bra **product photo** into a structured construction feature
vector via Claude vision (`claude-sonnet-4-6`). This is the missing half of the
**bra tower**: Froot already has a complete *geometric* fingerprint for ~1,499
styles (`cd / cw / wl / bl / sb / gh / wh` per size, in
`data/style-measurements.json`), but **zero material/construction signal** —
no fiber, no fabric, no lining, and construction is tagged on only ~33% of
styles. The geometry tells you how a bra *fits*; it says nothing about how it
*feels* or what it's *made of*. (See `notes/froot-lab/data-frontier.md` → Gap 1:
material/fabric is absent from all four data files.)

The non-obvious move: the data we're missing is exactly the data a human reads
off a product image in half a second. We don't scrape spec sheets that mostly
don't exist — we put a VLM in the loop as the **perception step** and let it look.

## Run it today (no API key)

```bash
node scripts/tag-bras.mjs --dry-run
node scripts/tag-bras.mjs --dry-run --elastane 18      # see the stretch fusion
```

`--dry-run` emits a worked example tag object with no network call and no key —
the pipeline shape is verifiable before you spend a token.

## Real run

```bash
export ANTHROPIC_API_KEY=sk-ant-...
node scripts/tag-bras.mjs --image ./photos/freya-deco.jpg
node scripts/tag-bras.mjs --image https://www.bratabase.com/.../photo.jpg --key "Freya|Deco (1234)"
node scripts/tag-bras.mjs --image ./bra.jpg --elastane 18   # refine stretch with scraped %elastane
```

It uses `@anthropic-ai/sdk` (already a dependency); if the SDK isn't importable
it falls back to a documented raw `fetch` against `POST /v1/messages`.

## What it extracts

Six construction attributes, each as `{value, confidence}`, plus a self-check and
free-text `notes`. Closed enums per field:

| field | enum | read from |
|---|---|---|
| `cup_construction` | molded / seamed / unlined / foam | cup surface: dome vs panels vs single layer vs thick pad |
| `coverage` | full / balconette / plunge / demi | top-edge line + center-gore depth |
| `material` | lace / microfiber / mesh / cotton | dominant face fabric (+ `secondary_materials[]`) |
| `wire` | underwire / wireless | casing arc under the cup (+ `wire_width`: wide / narrow / n/a) |
| `stretch_estimate` | rigid / moderate / stretchy | fabric prior — **weak from vision, refined downstream** |
| `support_level` | high / medium / low | summary judgment derived from the others |

Plus `is_bra_product_photo`: a self-check so a swimsuit / packaging shot /
lifestyle crop degrades to all-zero-confidence values **instead of a refusal or a
hallucination**. The model never refuses — it always emits the object.

**Confidence is per-field, not per-image.** A photo can show the cup surface
crisply (high `material` confidence) while hiding the band back (low `wire`
confidence). That independence is what makes the output safe to fuse into a
vector rather than treat as a coin flip.

The exact system + user prompt and the `output_config.format` JSON schema are
embedded in `tag-bras.mjs` (single source of truth; mirrored in
`notes/froot-lab/vlm_tagger_prompt.txt`). Structured outputs guarantee the first
text block is schema-valid JSON, so the parse never throws. (Assistant prefill is
rejected with a 400 on `claude-sonnet-4-6` — that's why we use
`output_config.format`, not a prefill.) The stable system prompt + three
calibration examples carry a `cache_control` breakpoint, so on a 1,499-style
backfill the instruction prefix reads from cache after the first call.

## From tags → the bra-tower feature vector

The tagger produces the **construction fingerprint** that bolts onto the existing
**fit fingerprint**. Concatenate them per style:

```
bra_vector(style) =
  [ geometry     ]  cd, cw, wl, bl, sb, gh, wh              # style-measurements.json (per size)
  [ construction ]  one-hot(cup_construction) × confidence  # ← VLM
                    one-hot(coverage)         × confidence  # ← VLM
                    one-hot(material)         × confidence  # ← VLM
                    is_underwire              × confidence  # ← VLM
                    one-hot(wire_width)       × confidence  # ← VLM
                    stretch_scalar ∈ [0,1]                  # ← VLM prior, then refined ↓
                    support_scalar ∈ {0,.5,1} × confidence  # ← VLM
```

**Confidence is baked into the encoding, not discarded.** Each categorical
attribute is a one-hot vector *scaled by its confidence* — a 0.5-confidence
"lace" contributes half-weight, so a blurry read pulls the vector toward the
origin (uninformative) instead of asserting a crisp wrong category. "lace @0.95"
and "lace @0.45" then sit further apart than two "lace @0.95" reads, which is
exactly right. Nearest-neighbor / cosine similarity over the tower automatically
discounts the uncertain dimensions — no extra masking logic.

Rows are keyed by the same `"Brand|Style (id)"` key the geometry uses, so the two
halves join trivially. `is_bra_product_photo: false` rows are dropped to a review
queue, never fused.

## How scraped %elastane refines `stretch_estimate`

Vision is a **weak** signal for stretch, so the prompt caps that field's
confidence at ~0.7. When a fabric composition *is* scrapeable for a style — a
brand `/products.json` that lists "82% nylon, 18% elastane" (Curvy Kate, Freya,
Panache are the live structured sources in `data-frontier.md`) — that number
beats the visual prior and overrides it. The map and the confidence fuse live in
`tag-bras.mjs`:

```js
elastaneToStretch(pct):   // < 5% → rigid (0.15), < 12% → moderate (0.50), else → stretchy (0.85)
fuseStretch(stretchField, elastanePct):
  // no scrape  → keep the visual read at its own confidence (the common case)
  // has scrape → weight composition 0.85, visual 0.15; bump confidence to ≥ 0.90
```

Because the visual confidence is capped low, a *present* elastane number reliably
dominates — but a *missing* one (the majority of styles) still leaves a usable,
honestly-weak estimate in the tower instead of a hole. The same fuse pattern
generalizes: any scraped structured field (a `wireless` flag, a `padded` tag) can
override the matching VLM field at a high trust weight.

Pass `--elastane PCT` to apply the fuse for a single image; the output then
carries a `stretch_refined` block alongside the raw `stretch_estimate`.

## Batch backfill

At 1,499 styles this is a textbook **Batches API** job — 50% cheaper, not
latency-sensitive. `buildRequestBody()` is exported as the per-item params:
build one request per style image with `custom_id = styleKey`, submit via
`client.messages.batches.create(...)`, poll, collect. Cached system prefix makes
the shared instructions ~free after the first item. Pipeline: resolve each
style's photo from the bratabase `url` in `style-measurements.json` → batch-tag →
drop `is_bra_product_photo:false` to review → scrape %elastane where available
and run `fuseStretch` → encode confidence-scaled one-hots → concat onto geometry
→ persist as `data/froot/style-construction.json`.

**Quality loop:** the `notes` field + per-field confidences make a natural review
queue. Sort by lowest min-confidence, hand-verify the bottom slice; any
systematic confusion (e.g. demi over-called as balconette) is a one-line edit to
the decision cue in the prompt — re-run only the affected slice.

## Files

- `scripts/tag-bras.mjs` — the tagger (CLI + exported helpers + embedded prompt/schema).
- `data/froot/bra-tags.sample.json` — 6 realistic example tagged bras.
- `notes/froot-lab/vlm_tagger.md` / `vlm_tagger_prompt.txt` — design + prompt source.
- `notes/froot-lab/data-frontier.md` — where the fabric/composition data lives (Gap 1).
