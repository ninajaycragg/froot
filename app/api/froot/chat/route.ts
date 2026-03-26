import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const { messages, context } = await req.json()

  // Build the system prompt with all user context
  const systemParts: string[] = [
    `You are froot's personal fitting advisor — warm, knowledgeable, and direct. You talk like a best friend who happens to be an expert bra fitter. Never clinical, never hedging. You're confident, empowering, and occasionally funny.`,
    ``,
    `RULES:`,
    `- Keep responses concise — 2-4 sentences max unless they ask for detail`,
    `- Never say "try" — say "go with" or "you want"`,
    `- Never hedge with "it depends" — give a clear recommendation, then add nuance`,
    `- Reference their specific shape/measurements when relevant`,
    `- If they ask about a brand you don't have data on, be honest but still helpful`,
    `- You can use casual language, contractions, em dashes`,
    `- No emojis unless they use them first`,
    `- Never reveal you're an AI. You're "froot's fitting advisor"`,
  ]

  if (context.sizeResult) {
    systemParts.push(``)
    systemParts.push(`THIS PERSON'S PROFILE:`)
    systemParts.push(`Size: ${context.sizeResult.sizeUK} (UK) / ${context.sizeResult.sizeUS} (US)`)
    systemParts.push(`Band: ${context.sizeResult.bandSize} | Cup: ${context.sizeResult.cupUK}`)
    systemParts.push(`Sister sizes: ${context.sizeResult.sisterUp?.uk} (sister up), ${context.sizeResult.sisterDown?.uk} (sister down)`)
  }

  if (context.shapeProfile) {
    systemParts.push(`Shape: ${context.shapeProfile.projection} projection, ${context.shapeProfile.fullness} fullness, ${context.shapeProfile.rootWidth} roots`)
  }

  if (context.aestheticGoal) {
    systemParts.push(`Goal: ${context.aestheticGoal}`)
  }

  if (context.measurements) {
    const m = context.measurements
    systemParts.push(`Measurements (${m.unit}): underbust ${m.looseUnderbust}/${m.snugUnderbust}/${m.tightUnderbust}, bust ${m.standingBust}/${m.leaningBust}/${m.lyingBust}`)
  }

  if (context.fitCheckData) {
    const fc = context.fitCheckData
    systemParts.push(`Currently wearing: ${fc.currentBrand} ${fc.currentSize}`)
    systemParts.push(`Band fit: ${fc.bandFit}, Cup fit: ${fc.cupFit}`)
    if (fc.issues?.length) systemParts.push(`Issues: ${fc.issues.join(', ')}`)
  }

  if (context.topMatches?.length) {
    systemParts.push(``)
    systemParts.push(`TOP MATCHES WE RECOMMENDED:`)
    for (const match of context.topMatches.slice(0, 5)) {
      systemParts.push(`- ${match.brand} ${match.style} in ${match.bestSize} (score: ${match.score}, tags: ${match.tags?.join(', ') || 'n/a'})`)
    }
  }

  if (context.notes?.length) {
    systemParts.push(``)
    systemParts.push(`FIT NOTES: ${context.notes.join(' ')}`)
  }

  const system = systemParts.join('\n')

  // Stream the response
  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    system,
    messages: messages.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  })

  // Return as a ReadableStream
  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }
        controller.close()
      } catch (err) {
        controller.error(err)
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  })
}
