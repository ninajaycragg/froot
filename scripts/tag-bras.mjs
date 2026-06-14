#!/usr/bin/env node
// tag-bras.mjs — Froot VLM bra-tagger.
//
// Turns a single bra PRODUCT PHOTO (URL or local path) into a structured
// construction feature vector via Claude vision. This is the "construction
// fingerprint" half of the bra tower; the geometry half already lives in
// data/style-measurements.json (cd/cw/wl/bl/sb/gh/wh per size).
//
// RUNNABLE TODAY WITHOUT AN API KEY:
//   node scripts/tag-bras.mjs --dry-run
//   node scripts/tag-bras.mjs --dry-run --image https://example.com/bra.jpg
// --dry-run emits a worked example tag object (no network, no key) so the
// pipeline shape is verifiable before you spend a single token.
//
// REAL RUN (needs ANTHROPIC_API_KEY in the env):
//   node scripts/tag-bras.mjs --image ./photos/freya-deco.jpg
//   node scripts/tag-bras.mjs --image https://www.bratabase.com/.../photo.jpg
//   node scripts/tag-bras.mjs --image ./bra.jpg --elastane 18   # refine stretch
//   node scripts/tag-bras.mjs --image ./bra.jpg --key "Freya|Deco (1234)"
//
// Model: claude-sonnet-4-6 with vision + structured outputs. The exact
// system+user prompt and JSON schema are embedded below (single source of truth;
// also mirrored in notes/froot-lab/vlm_tagger_prompt.txt). Uses @anthropic-ai/sdk
// if installed (it is — see package.json); otherwise documents the raw fetch call.
//
// Research lead: notes/froot-lab/data-frontier.md — Gap 1 (material/fabric is
// absent from all four data files) is exactly what this perception step fills;
// %elastane scraped from brand /products.json (Curvy Kate, Freya, Panache) refines
// the weak visual stretch prior (see fuseStretch below).

import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import process from "node:process";

const MODEL = "claude-sonnet-4-6";

// ─────────────────────────────────────────────────────────────────────────────
// THE PROMPT — system + user. Stable across every call: cache the system block.
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a lingerie construction analyst. You look at a single bra PRODUCT PHOTO
and report only what is VISUALLY VERIFIABLE about how the garment is built. You
are not a stylist and you do not guess brand, price, or flattery. You output one
JSON object matching the provided schema and nothing else.

CORE RULE: every field carries its own confidence. When the photo does not show
what a field needs (back of band hidden, cups collapsed flat, extreme close-up,
lifestyle shot with a body occluding the garment), you LOWER the confidence and
pick the most-likely value — you never invent detail you cannot see, and you
never refuse. A low-confidence honest guess is correct behavior; a confident
wrong answer is the only failure.

DECISION CUES — what each field is read from:

cup_construction — how the cup is formed.
  molded   = one smooth seamless dome, pre-shaped, holds a rounded cup shape with
             nothing in it. Foam-y but the surface is a single continuous piece.
  foam     = molded AND visibly thick/spacer-padded (T-shirt bra), often a thicker
             rolled top edge, completely opaque, adds projection. Use when padding
             is the defining feature, not just smoothness.
  seamed   = the cup is built from 2 or 3 fabric panels stitched together; you can
             see seam lines crossing the cup (vertical, horizontal, or diagonal).
             This is the classic full-bust / supportive construction.
  unlined  = a single layer of fabric (often sheer lace or mesh), no padding, no
             molding; you can sense it would be see-through, cup shape comes only
             from the seams and the body. Frequently overlaps with seamed+lace.
  If a cup is BOTH seamed AND clearly unlined sheer fabric, prefer "seamed" if the
  panel seams are the dominant structural story, "unlined" if sheerness/single-layer
  is. Note the tension in \`notes\`.

coverage — how high up the breast the cup comes (top edge line).
  full        = cup covers most of the breast, top edge high, straps set wide.
  balconette  = horizontal-ish top edge, cups cut straight across, straps wider set,
                lifts and squares off the top — "shelf" look.
  demi        = covers ~half, top edge lower than full, straps closer to center than
                balconette. (demi vs balconette: balconette top edge is flatter/
                more horizontal and wider-set; demi is a gentler lower scoop.)
  plunge      = deep V center gore, cups angled inward, very low/narrow center,
                straps set close to the middle.
  Read primarily from the top edge and the center gore depth.

material — the dominant face fabric.
  lace        = visible openwork floral/geometric pattern, scalloped edges.
  mesh        = sheer flat net, even tiny holes, no floral motif (often power mesh
                wings or sheer cups).
  microfiber  = smooth matte/satin opaque synthetic, no texture, the default
                "plain T-shirt bra" fabric. Use this for smooth molded cups with
                no lace/mesh/visible weave.
  cotton      = matte woven/knit with visible fabric texture, opaque, casual,
                often jersey-looking, no sheen.
  If multiple fabrics, report the DOMINANT one on the cups and list the rest in
  \`secondary_materials\`.

wire — the underwire.
  underwire   = a defined seam/casing arc runs UNDER and around each cup; cups have
                structured lift and separation; rigid cradle at the base.
  wireless     = soft bottom edge, no casing arc, cups droop/conform, bralette-like.
  Then judge wire WIDTH (only meaningful if underwire):
  wide        = cups set far apart, low flat center gore, wires sweep out toward
                the sides (plunge/balconette tend wide).
  narrow      = cups close together, tall narrow center gore, wires sit close to
                center (full-bust / close-set tend narrow).
  If wireless, set wire_width to "n/a".

stretch_estimate — how much the CUP fabric gives. VISION IS A WEAK SIGNAL HERE;
  default to lower confidence on this field than the others and lean on fabric type.
  rigid     = molded foam cups, firm seamed cut-and-sewn cups, satin/microfiber that
              looks structured — holds its shape off-body.
  moderate  = lace with some give, single-layer constructions, most everyday bras.
  stretchy  = obvious knit/jersey, ribbed cotton, bralette stretch lace, fabric that
              looks like it would pull and recover.
  This field is REFINED downstream by a scraped %-elastane number; your job is the
  visual prior, so confidence here should rarely exceed 0.7.

support_level — overall structural support the construction implies.
  high     = underwire + seamed/foam + full/balconette coverage + firm fabric (full-
             bust supportive bra).
  medium   = underwire + molded demi/plunge, or a structured wireless.
  low      = wireless bralette, unlined sheer, stretchy knit, minimal structure.
  Derive this from the OTHER fields you just decided — it is the summary judgment.

CONFIDENCE SCALE (use the same scale for every field):
  0.9–1.0  unambiguous, the defining feature is in clear view.
  0.7–0.89 clearly the most likely, one alternative is plausible.
  0.4–0.69 a real guess between two values; the deciding cue is partly hidden.
  0.0–0.39 mostly inferred from fabric/silhouette; the direct cue is not visible.

If the image is NOT a single bra product photo (multiple garments, a swimsuit,
shapewear, a packaging shot with no garment, an unrelated image), set
\`is_bra_product_photo\` to false, set every tag to its best-effort value with
confidence 0.0, and explain in \`notes\`. Do not refuse.

CALIBRATION EXAMPLES — these describe what you'd SEE and the correct JSON.

Example A — "smooth opaque nude T-shirt bra, single seamless dome per cup, thick
rolled top edge, defined wire casing arc under each cup, cups angled into a deep
narrow center V, straps close to center, no pattern, slight satin sheen."
{
  "is_bra_product_photo": true,
  "cup_construction": {"value": "foam", "confidence": 0.92},
  "coverage": {"value": "plunge", "confidence": 0.86},
  "material": {"value": "microfiber", "confidence": 0.9},
  "secondary_materials": [],
  "wire": {"value": "underwire", "confidence": 0.95},
  "wire_width": {"value": "wide", "confidence": 0.6},
  "stretch_estimate": {"value": "rigid", "confidence": 0.65},
  "support_level": {"value": "medium", "confidence": 0.8},
  "notes": "Foam+plunge reads medium support; wire_width wide vs narrow is a judgment call from gore depth."
}

Example B — "black sheer cups built from three stitched lace panels with floral
openwork, scalloped top edge, you can see through the fabric, defined underwire
casing, cups set close with a tall center gore, top edge comes up high and wide."
{
  "is_bra_product_photo": true,
  "cup_construction": {"value": "seamed", "confidence": 0.85},
  "coverage": {"value": "full", "confidence": 0.8},
  "material": {"value": "lace", "confidence": 0.95},
  "secondary_materials": ["mesh"],
  "wire": {"value": "underwire", "confidence": 0.9},
  "wire_width": {"value": "narrow", "confidence": 0.7},
  "stretch_estimate": {"value": "moderate", "confidence": 0.55},
  "support_level": {"value": "high", "confidence": 0.78},
  "notes": "Seamed vs unlined was close — three panels (seamed) dominate the single-layer sheerness."
}

Example C — "soft triangular ribbed-knit cup, no casing arc under the cup, bottom
edge is a soft elastic band, cups conform with no fixed shape, wide-set thin
straps, opaque textured cotton-looking fabric, pulls over the head."
{
  "is_bra_product_photo": true,
  "cup_construction": {"value": "unlined", "confidence": 0.8},
  "coverage": {"value": "demi", "confidence": 0.5},
  "material": {"value": "cotton", "confidence": 0.75},
  "secondary_materials": [],
  "wire": {"value": "wireless", "confidence": 0.93},
  "wire_width": {"value": "n/a", "confidence": 1.0},
  "stretch_estimate": {"value": "stretchy", "confidence": 0.7},
  "support_level": {"value": "low", "confidence": 0.85},
  "notes": "Bralette. Coverage low confidence — soft triangle reads between demi and full depending on fit."
}`;

const USER_PROMPT = `Tag this bra product photo. Return ONLY the JSON object defined by the schema.

For every tagged attribute: choose the single best value, then a confidence in
[0,1] reflecting how directly the photo supports it. Use the decision cues from
your instructions. Lower confidence rather than inventing detail you can't see.
Put any read that was hard, ambiguous, or where two values were close in notes
(<= 240 chars). Do not mention the brand, do not editorialize.`;

// ─────────────────────────────────────────────────────────────────────────────
// THE SCHEMA — passed as output_config.format. Structured outputs guarantee the
// first text block is schema-valid JSON, so json parse never throws.
// (claude-sonnet-4-6 supports structured outputs; assistant prefill is rejected
// with a 400 — that's why we use output_config.format, not a prefill.)
// ─────────────────────────────────────────────────────────────────────────────

const TAGGED_FIELD = (enumValues) => ({
  type: "object",
  additionalProperties: false,
  required: ["value", "confidence"],
  properties: {
    value: { type: "string", enum: enumValues },
    confidence: { type: "number" },
  },
});

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "is_bra_product_photo",
    "cup_construction",
    "coverage",
    "material",
    "secondary_materials",
    "wire",
    "wire_width",
    "stretch_estimate",
    "support_level",
    "notes",
  ],
  properties: {
    is_bra_product_photo: { type: "boolean" },
    cup_construction: TAGGED_FIELD(["molded", "seamed", "unlined", "foam"]),
    coverage: TAGGED_FIELD(["full", "balconette", "plunge", "demi"]),
    material: TAGGED_FIELD(["lace", "microfiber", "mesh", "cotton"]),
    secondary_materials: {
      type: "array",
      items: { type: "string", enum: ["lace", "microfiber", "mesh", "cotton"] },
    },
    wire: TAGGED_FIELD(["underwire", "wireless"]),
    wire_width: TAGGED_FIELD(["wide", "narrow", "n/a"]),
    stretch_estimate: TAGGED_FIELD(["rigid", "moderate", "stretchy"]),
    support_level: TAGGED_FIELD(["high", "medium", "low"]),
    notes: { type: "string" },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// %elastane → stretch refinement. Scraped composition beats the weak visual prior,
// so when present it is fused in at high trust. See notes/froot-lab/vlm_tagger.md §4
// and data-frontier.md Gap 1 (Curvy Kate / Freya / Panache /products.json).
// ─────────────────────────────────────────────────────────────────────────────

function elastaneToStretch(pct) {
  if (pct === null || pct === undefined) return null;
  if (pct < 5) return { scalar: 0.15, value: "rigid" };
  if (pct < 12) return { scalar: 0.5, value: "moderate" };
  return { scalar: 0.85, value: "stretchy" };
}

// Fuse the VLM's stretch read with a scraped %elastane number. The prompt caps the
// visual confidence at ~0.7, so a present elastane number reliably dominates; a
// missing one (the common case) leaves the honest visual prior in place.
function fuseStretch(stretchField, elastanePct) {
  const VISUAL = { rigid: 0.15, moderate: 0.5, stretchy: 0.85 };
  const visualScalar = VISUAL[stretchField.value];
  const scraped = elastaneToStretch(elastanePct);
  if (scraped === null) {
    return {
      value: stretchField.value,
      scalar: visualScalar,
      confidence: stretchField.confidence,
      source: "vision",
    };
  }
  const w = 0.85; // scraped composition is high-trust
  return {
    value: scraped.value,
    scalar: w * scraped.scalar + (1 - w) * visualScalar,
    confidence: Math.max(stretchField.confidence, 0.9),
    source: "elastane+vision",
    elastane_pct: elastanePct,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Build the per-image message content (image block first, user text second).
// ─────────────────────────────────────────────────────────────────────────────

function mediaTypeFor(pathOrUrl) {
  const lower = pathOrUrl.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

async function buildImageSource(image) {
  // URL images can be passed by reference; local files are base64-encoded.
  if (/^https?:\/\//i.test(image)) {
    return { type: "url", url: image };
  }
  const bytes = await readFile(image);
  return {
    type: "base64",
    media_type: mediaTypeFor(image),
    data: bytes.toString("base64"),
  };
}

function buildRequestBody(imageSource) {
  return {
    model: MODEL,
    max_tokens: 2000,
    // System prompt is stable across every call — cache it. On a 1,499-style
    // backfill this makes the whole instruction prefix ~free after the first call.
    system: [
      { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
    ],
    // Structured outputs: guarantees a schema-valid JSON first text block.
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: imageSource },
          { type: "text", text: USER_PROMPT },
        ],
      },
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// The real call. Prefers @anthropic-ai/sdk; documents the raw fetch otherwise.
// ─────────────────────────────────────────────────────────────────────────────

async function callClaude(body) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY not set. Run with --dry-run to get a worked example with no key.",
    );
  }

  // Try the official SDK first.
  let Anthropic = null;
  try {
    ({ default: Anthropic } = await import("@anthropic-ai/sdk"));
  } catch {
    Anthropic = null;
  }

  if (Anthropic) {
    const client = new Anthropic({ apiKey });
    const resp = await client.messages.create(body);
    const text = resp.content.find((b) => b.type === "text")?.text;
    return JSON.parse(text);
  }

  // Fallback: raw HTTP (documented for environments without the SDK).
  // POST https://api.anthropic.com/v1/messages
  //   headers: x-api-key, anthropic-version: 2023-06-01, content-type: application/json
  //   body:    the request object built above (model/system/output_config/messages)
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const text = data.content.find((b) => b.type === "text")?.text;
  return JSON.parse(text);
}

// ─────────────────────────────────────────────────────────────────────────────
// The worked example used by --dry-run (matches calibration Example B: a black
// three-panel sheer lace full-coverage underwire bra). No network, no key.
// ─────────────────────────────────────────────────────────────────────────────

const DRY_RUN_TAGS = {
  is_bra_product_photo: true,
  cup_construction: { value: "seamed", confidence: 0.85 },
  coverage: { value: "full", confidence: 0.8 },
  material: { value: "lace", confidence: 0.95 },
  secondary_materials: ["mesh"],
  wire: { value: "underwire", confidence: 0.9 },
  wire_width: { value: "narrow", confidence: 0.7 },
  stretch_estimate: { value: "moderate", confidence: 0.55 },
  support_level: { value: "high", confidence: 0.78 },
  notes:
    "Seamed vs unlined was close — three lace panels (seamed) dominate the single-layer sheerness.",
};

// ─────────────────────────────────────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { dryRun: false, image: null, key: null, elastane: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--image") args.image = argv[++i];
    else if (a === "--key") args.key = argv[++i];
    else if (a === "--elastane") args.elastane = Number(argv[++i]);
    else if (a === "-h" || a === "--help") args.help = true;
  }
  return args;
}

const HELP = `tag-bras.mjs — Froot VLM bra-tagger (model: ${MODEL})

Usage:
  node scripts/tag-bras.mjs --dry-run [--image URL_OR_PATH] [--elastane PCT]
  node scripts/tag-bras.mjs --image URL_OR_PATH [--key "Brand|Style (id)"] [--elastane PCT]

Flags:
  --dry-run        Emit a worked example tag object. No API key, no network.
  --image  PATH    Local path or http(s) URL of ONE bra product photo.
  --key    STR     Style key to attach (joins to style-measurements.json).
  --elastane PCT   Scraped %elastane; refines stretch_estimate (see fuseStretch).
  -h, --help       Show this help.

Output: one JSON object — the schema-valid tags plus a "_meta" block (model,
image ref, style key) and, when --elastane is given, a fused "stretch_refined".`;

function attachMeta(tags, { image, key, elastane }) {
  const out = { ...tags };
  out._meta = {
    model: MODEL,
    image: image ? (/^https?:\/\//i.test(image) ? image : basename(image)) : null,
    style_key: key ?? null,
    tagged_at: new Date().toISOString(),
  };
  if (elastane !== null && elastane !== undefined && !Number.isNaN(elastane)) {
    out.stretch_refined = fuseStretch(tags.stretch_estimate, elastane);
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(HELP);
    return;
  }

  let tags;
  if (args.dryRun) {
    // No key, no network — emit the worked example so the pipeline is runnable today.
    tags = DRY_RUN_TAGS;
  } else {
    if (!args.image) {
      console.error("Error: --image is required for a real run (or use --dry-run).\n");
      console.error(HELP);
      process.exitCode = 1;
      return;
    }
    const imageSource = await buildImageSource(args.image);
    const body = buildRequestBody(imageSource);
    tags = await callClaude(body);
  }

  const result = attachMeta(tags, args);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err.message ?? String(err));
  process.exitCode = 1;
});

// Exported for the batch backfill harness and unit tests.
export {
  MODEL,
  SYSTEM_PROMPT,
  USER_PROMPT,
  SCHEMA,
  buildRequestBody,
  buildImageSource,
  callClaude,
  elastaneToStretch,
  fuseStretch,
};
