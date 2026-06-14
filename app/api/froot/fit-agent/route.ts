import Anthropic from '@anthropic-ai/sdk'

// ── Conversational Fit-Agent ──
// The chat IS the belief loop. Each turn this route does three jobs at once:
//   (a) PARSE — pull any fit observation the user gave (a bra they own + how it
//       fit) into a structured ping {size, bandFit, cupFit, rating, notes} that
//       the client feeds straight into beliefEngine.refineSizeFromFeedback.
//   (b) ASK — pick the SINGLE most-informative next question (active-learning
//       style: collapse the biggest remaining uncertainty), not a fixed quiz.
//   (c) RECOMMEND — when confident, stop asking and give a size.
//
// It returns ONE structured JSON object (not a token stream) so the client can
// (1) immediately push the parsed ping into the belief engine and re-render the
// sharpening size/confidence, and (2) print the fitter's line + next question.
//
// MUST degrade gracefully with no key: if ANTHROPIC_API_KEY is absent we run a
// deterministic scripted parser + next-question picker so the route never 500s.
// (Mirrors the env-presence guard in app/api/froot/profile/route.ts.)

export const runtime = 'nodejs'

const MODEL = 'claude-sonnet-4-6' // matches app/api/froot/chat/route.ts

// ── The structured shape the client consumes ──
// observation mirrors beliefEngine.FitFeedbackPing (size + bandFit/cupFit/rating
// + notes) so it can be passed verbatim to refineSizeFromFeedback.
interface FitObservation {
  size?: string
  bandFit?: 'too_tight' | 'good' | 'too_loose'
  cupFit?: 'too_small' | 'good' | 'too_big'
  rating?: 'perfect' | 'good' | 'okay' | 'bad'
  notes?: string
}

interface AgentReply {
  say: string // the fitter's warm spoken line
  observation: FitObservation | null // parsed ping for the belief engine (null if none)
  nextQuestion: string | null // the single most-informative follow-up (null when recommending)
  recommend: boolean // true once the agent is confident enough to land a size
  degraded?: boolean // true when we ran the no-key scripted fallback
}

// ── Tool schema — structured JSON so the client gets a clean object, not prose
const TOOL = {
  name: 'record_fit_turn',
  description:
    'Record this conversational turn: any fit observation extracted from the user, the warm spoken reply, and the single most-informative next question (or a recommendation when confident).',
  input_schema: {
    type: 'object' as const,
    properties: {
      say: {
        type: 'string',
        description:
          "The fitter's warm, human spoken reply (1-3 sentences). Reflects what you heard. No emoji, never says 'try', never reveals it is an AI.",
      },
      observation: {
        type: ['object', 'null'],
        description:
          'A fit observation parsed from the user THIS turn — a bra they own and how it fit. null if the user gave no fit data this turn.',
        properties: {
          size: { type: 'string', description: "e.g. '34D', '32DD' — the size they wore" },
          bandFit: { type: 'string', enum: ['too_tight', 'good', 'too_loose'] },
          cupFit: { type: 'string', enum: ['too_small', 'good', 'too_big'] },
          rating: { type: 'string', enum: ['perfect', 'good', 'okay', 'bad'] },
          notes: { type: 'string', description: 'verbatim fit details (spillage, gaping, riding up, etc.)' },
        },
      },
      nextQuestion: {
        type: ['string', 'null'],
        description:
          'The SINGLE most-informative next question that collapses the most uncertainty about their true size. null when you are recommending.',
      },
      recommend: {
        type: 'boolean',
        description: 'true when you have enough to confidently land a size and should stop asking.',
      },
    },
    required: ['say', 'recommend'],
  },
}

function buildSystem(ctx: Record<string, unknown> | undefined): string {
  const parts: string[] = [
    `You are froot's fitting advisor — a warm, brilliant bra fitter talking like a trusted best friend, not a clinician. Your JOB each turn is to run a belief loop, not a quiz:`,
    ``,
    `1. EXTRACT — if the user named a bra they own and how it fits, parse it into the observation object: size (band+cup like "34D"), bandFit (too_tight/good/too_loose), cupFit (too_small/good/too_big), rating (perfect/good/okay/bad), and notes (their exact words about spillage, gaping, wires, straps). If they gave no fit data this turn, observation is null.`,
    `2. ASK ONE THING — pick the SINGLE most-informative next question to collapse the biggest remaining uncertainty about their true size. Do NOT run a fixed checklist. If band fit is unknown, ask how the band feels at the loosest hook. If cup fit is unknown, ask about spillage or gaping. Adapt to what they've already told you.`,
    `3. RECOMMEND — once two solid observations point the same way (or one "perfect" fit), set recommend=true, stop asking (nextQuestion=null), and say the size warmly.`,
    ``,
    `VOICE: 1-3 sentences. Warm and confident. Never say "try" — say "go with" / "you want". Never hedge with "it depends". No emoji unless they use one first. Never reveal you're an AI — you're "froot's fitting advisor".`,
    `Always call the record_fit_turn tool. Never answer in plain prose.`,
  ]
  const belief = ctx?.belief as Record<string, unknown> | undefined
  if (belief && (belief.sizeUK || belief.nPings)) {
    parts.push(``)
    parts.push(`CURRENT BELIEF (ground truth from the engine — reason over THESE numbers, don't invent):`)
    if (belief.sizeUK) parts.push(`- Best guess: ${belief.sizeUK} (band ${belief.bandSize}, cup ${belief.cupUK})`)
    if (belief.confidence != null) parts.push(`- Confidence: ${belief.confidence} (0..1 — higher is tighter)`)
    if (belief.nPings != null) parts.push(`- Bras logged so far: ${belief.nPings}`)
    if (Array.isArray(belief.sisters) && belief.sisters.length)
      parts.push(`- Sister sizes worth probing: ${(belief.sisters as string[]).join(', ')}`)
    parts.push(
      `Use this to decide whether to keep asking or recommend: confidence under ~0.3 or fewer than 2 bras → ask one more; otherwise lean toward recommending.`,
    )
  }
  if (ctx?.calculatorSize) parts.push(`\nTheir calculator size (a prior, not gospel): ${ctx.calculatorSize}`)
  return parts.join('\n')
}

// ── Deterministic no-key fallback ──────────────────────────────────────────
// Parses the user's latest message for a size + directional fit cues, and picks
// the next question from what's still missing. Never throws, never 500s.
const SIZE_RE = /\b(\d{2,3})\s*([A-Ka-k]{1,3})\b/

function scriptedParse(text: string): FitObservation | null {
  const t = (text || '').toLowerCase()
  const m = SIZE_RE.exec(text || '')
  const obs: FitObservation = {}
  if (m) obs.size = `${m[1]}${m[2].toUpperCase()}`

  // band cues
  if (/(too tight|can'?t breathe|digs? in|leaves? marks|red marks|tight band)/.test(t)) obs.bandFit = 'too_tight'
  else if (/(rides? up|too loose|loose band|slides? around|move(s)? around|hooks? on the tightest)/.test(t))
    obs.bandFit = 'too_loose'
  else if (/(band (is|feels)? )?(fine|good|fits|perfect|snug)/.test(t)) obs.bandFit = 'good'

  // cup cues
  if (/(spill|quad|overflow|popping out|four ?boob|too small|busting out|wires? sit on)/.test(t)) obs.cupFit = 'too_small'
  else if (/(gap|gaping|wrinkl|fold|empty|too big|swimming|extra room)/.test(t)) obs.cupFit = 'too_big'
  else if (/(cup (is|feels)? )?(fine|good|fits|perfect|smooth)/.test(t)) obs.cupFit = 'good'

  // rating cues
  if (/(perfect|love it|best bra|fits perfectly|amazing)/.test(t)) obs.rating = 'perfect'
  else if (/(hate|terrible|awful|never wear|so uncomfortable)/.test(t)) obs.rating = 'bad'

  if (text && text.trim()) obs.notes = text.trim().slice(0, 240)

  // only an observation if we actually pinned a size or a directional cue
  if (obs.size || obs.bandFit || obs.cupFit || obs.rating) return obs
  return null
}

function scriptedReply(
  obs: FitObservation | null,
  belief: Record<string, unknown> | undefined,
  history: Array<{ role: string; content: string }>,
): AgentReply {
  const nPings = Number(belief?.nPings ?? 0)
  const confidence = Number(belief?.confidence ?? 0)
  const sizeUK = belief?.sizeUK as string | undefined

  // confident enough → recommend
  if (sizeUK && (confidence >= 0.32 || nPings >= 2)) {
    return {
      say: `Okay — I've got a clear read now. Go with ${sizeUK}; that's where everything you've told me points.`,
      observation: obs,
      nextQuestion: null,
      recommend: true,
      degraded: true,
    }
  }

  // no observation yet at all → invite the first bra
  if (!obs && nPings === 0) {
    return {
      say: `Let's start from a bra you actually own. Name one you wear a lot — what size is on the tag?`,
      observation: null,
      nextQuestion: `What size does that bra say, and does the band feel snug or loose on the loosest hook?`,
      recommend: false,
      degraded: true,
    }
  }

  // pick the single most-informative gap
  const knowsBand = obs?.bandFit || history.some((h) => /band/i.test(h.content))
  const knowsCup = obs?.cupFit || history.some((h) => /(cup|spill|gap)/i.test(h.content))

  let nextQuestion: string
  let say: string
  if (!obs?.size && !sizeUK) {
    say = `Got it. To anchor this, I need a real size on a tag.`
    nextQuestion = `What size is printed on a bra you wear often?`
  } else if (!knowsBand) {
    say = obs?.size ? `${obs.size} — good anchor. Band first, that's what holds everything up.` : `Band first.`
    nextQuestion = `On the loosest hook, does the band feel snug and level across your back, or does it ride up / slide around?`
  } else if (!knowsCup) {
    say = `Helpful. Now the cup.`
    nextQuestion = `In that bra, do you spill over the top or sides at all, or is there empty space and wrinkling in the cup?`
  } else {
    say = `That's a useful read. One more bra sharpens this a lot.`
    nextQuestion = `Tell me about one more bra you own and how it fits — different brand if you can.`
  }

  return { say, observation: obs, nextQuestion, recommend: false, degraded: true }
}

export async function POST(req: Request) {
  let body: {
    messages?: Array<{ role: string; content: string }>
    context?: Record<string, unknown>
  }
  try {
    body = await req.json()
  } catch {
    return Response.json(
      {
        say: 'Tell me about a bra you own and how it fits.',
        observation: null,
        nextQuestion: 'What size is on the tag of a bra you wear often?',
        recommend: false,
        degraded: true,
      } satisfies AgentReply,
      { status: 200 },
    )
  }

  const messages = Array.isArray(body.messages) ? body.messages : []
  const context = body.context
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content ?? ''
  const belief = context?.belief as Record<string, unknown> | undefined

  // ── No key → deterministic scripted agent (never 500s) ──
  if (!process.env.ANTHROPIC_API_KEY) {
    const obs = scriptedParse(lastUser)
    return Response.json(scriptedReply(obs, belief, messages) satisfies AgentReply, { status: 200 })
  }

  // ── Key present → LLM does parse + active-learning question in one tool call ──
  try {
    const client = new Anthropic()
    const result = await client.messages.create({
      model: MODEL,
      max_tokens: 600,
      system: buildSystem(context),
      tools: [TOOL],
      tool_choice: { type: 'tool', name: 'record_fit_turn' },
      messages: messages.map((m) => ({
        role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
        content: m.content,
      })),
    })

    const toolBlock = result.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === 'record_fit_turn',
    )
    if (!toolBlock) throw new Error('no tool_use returned')

    const out = toolBlock.input as {
      say?: string
      observation?: FitObservation | null
      nextQuestion?: string | null
      recommend?: boolean
    }

    // normalize: empty observation object → null so the client doesn't ping the
    // belief engine with nothing.
    let observation: FitObservation | null = out.observation ?? null
    if (observation && !observation.size && !observation.bandFit && !observation.cupFit && !observation.rating) {
      observation = null
    }

    const reply: AgentReply = {
      say: out.say || 'Tell me a little more about how that one fits.',
      observation,
      nextQuestion: out.recommend ? null : out.nextQuestion ?? null,
      recommend: Boolean(out.recommend),
    }
    return Response.json(reply, { status: 200 })
  } catch {
    // any LLM/stream error → fall back to the scripted agent rather than 500
    const obs = scriptedParse(lastUser)
    return Response.json(scriptedReply(obs, belief, messages) satisfies AgentReply, { status: 200 })
  }
}
