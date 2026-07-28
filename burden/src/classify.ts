import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { db } from "./db.js";

export type Candidate = { factId: number; factText: string; elementName: string; claimTitle: string };
export type Judgment = { factId: number; relevant: boolean; stance: "supports" | "undermines"; confidence: number };

const JudgmentSchema = z.object({
  judgments: z.array(
    z.object({
      fact_id: z.number(),
      relevant: z.boolean().describe("Does this span bear on this fact at all?"),
      stance: z.enum(["supports", "undermines"]).describe("If relevant: does the span make the fact more or less likely to be true?"),
      confidence: z.number().describe("0 to 1"),
    }),
  ),
});

export function hasClassifier(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

// Applied corrections become few-shot examples — the reviewer's judgment
// steers every future classification, not just the one link it fixed.
async function correctionExamples(limit = 8): Promise<string> {
  const res = await db().query<{ span: string; fact: string; stance: string | null; removed: boolean }>(
    `SELECT s.text AS span,
            f.text AS fact,
            c.new_stance AS stance,
            (c.new_fact_id IS NULL) AS removed
     FROM corrections c
     JOIN spans s ON s.id = c.span_id
     LEFT JOIN facts f ON f.id = COALESCE(c.new_fact_id, c.old_fact_id)
     ORDER BY c.created_at DESC
     LIMIT $1`,
    [limit],
  );
  if (res.rows.length === 0) return "";
  const lines = res.rows.map((r) => {
    if (r.removed) return `- SPAN: "${r.span.slice(0, 200)}" → reviewer ruled it does NOT bear on: "${r.fact?.slice(0, 150)}"`;
    return `- SPAN: "${r.span.slice(0, 200)}" → reviewer ruled it ${r.stance?.toUpperCase()} the fact: "${r.fact?.slice(0, 150)}"`;
  });
  return `\n\nReviewer corrections from this matter (treat these rulings as ground truth for similar spans):\n${lines.join("\n")}`;
}

export async function classifySpan(spanText: string, candidates: Candidate[]): Promise<Judgment[]> {
  const client = new Anthropic();
  const examples = await correctionExamples();

  const system =
    `You are an evidence analyst. Given a span from a document production and candidate facts ` +
    `(each fact is something a legal team must establish to prove an element of a claim), judge for each fact: ` +
    `is the span relevant to it, and if so does it SUPPORT the fact (makes it more likely true) or UNDERMINE it ` +
    `(makes it less likely true). The same span may support one fact and undermine another. ` +
    `Judge only what the text says — do not infer beyond it. Be conservative: relevance requires the span to ` +
    `actually bear on the fact, not merely share vocabulary with it.` +
    examples;

  const candidateBlock = candidates
    .map((c) => `fact_id ${c.factId} [claim: ${c.claimTitle} / element: ${c.elementName}]: ${c.factText}`)
    .join("\n");

  const response = await client.messages.parse({
    model: "claude-opus-4-8",
    max_tokens: 2048,
    system,
    messages: [
      {
        role: "user",
        content: `SPAN:\n"""${spanText}"""\n\nCANDIDATE FACTS:\n${candidateBlock}\n\nReturn one judgment per candidate fact.`,
      },
    ],
    output_config: { format: zodOutputFormat(JudgmentSchema) },
  });

  const parsed = response.parsed_output;
  if (!parsed) return [];
  return parsed.judgments.map((j) => ({
    factId: j.fact_id,
    relevant: j.relevant,
    stance: j.stance,
    confidence: Math.max(0, Math.min(1, j.confidence)),
  }));
}
