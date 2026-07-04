import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

const client = new Anthropic()

export const runtime = 'nodejs'

// ── Types ──

interface SearchEntry {
  id: number
  t: string   // title
  s: string   // snippet
  d: string   // date
  k: string   // tags csv
  c: number   // comment count
}

interface FitIssueEntry {
  title: string
  snippet: string
  date: string
  topComment: string
}

type FitIssuesData = Record<string, FitIssueEntry[]>

// ── Load data once at module level ──

let searchIndex: SearchEntry[] | null = null
let fitIssues: FitIssuesData | null = null

function getSearchIndex(): SearchEntry[] {
  if (!searchIndex) {
    const filePath = join(process.cwd(), 'data', 'froot', 'search-index.json')
    searchIndex = JSON.parse(readFileSync(filePath, 'utf-8'))
  }
  return searchIndex!
}

function getFitIssues(): FitIssuesData {
  if (!fitIssues) {
    const filePath = join(process.cwd(), 'data', 'froot', 'fit-issues.json')
    fitIssues = JSON.parse(readFileSync(filePath, 'utf-8'))
  }
  return fitIssues!
}

// ── Keyword extraction and scoring ──

const STOP_WORDS = new Set([
  'i', 'me', 'my', 'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'to', 'of', 'in', 'for', 'on', 'with',
  'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'and',
  'but', 'or', 'nor', 'not', 'so', 'yet', 'both', 'either', 'neither', 'each',
  'every', 'all', 'any', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
  'only', 'own', 'same', 'than', 'too', 'very', 'just', 'because', 'if', 'when',
  'where', 'how', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those',
  'am', 'it', 'its', 'they', 'them', 'their', 'we', 'us', 'our', 'you', 'your',
  'he', 'him', 'his', 'she', 'her', 'up', 'out', 'about', 'then', 'here', 'there',
  'also', 'like', 'really', 'always', 'never', 'still', 'even', 'much', 'way',
  'get', 'got', 'make', 'made', 'feel', 'go', 'going', 'went', 'try', 'tried',
  'know', 'think', 'want', 'need', 'look', 'find', 'give', 'tell', 'say', 'said',
  'seem', 'come', 'take', 'keep', 'let', 'help', 'show', 'thing', 'things',
])

// Map common user phrases to fit-issue tags and search terms
const SYNONYM_MAP: Record<string, string[]> = {
  'gap': ['gapping', 'gap', 'gaping'],
  'gapping': ['gapping', 'gap', 'gaping'],
  'gapes': ['gapping', 'gap', 'gaping'],
  'spill': ['spillage', 'spill', 'spilling', 'overflow', 'quadboob'],
  'spillage': ['spillage', 'spill', 'spilling', 'overflow'],
  'overflow': ['spillage', 'overflow', 'quadboob', 'quad'],
  'quadboob': ['spillage', 'quadboob', 'quad-boob', 'quad'],
  'quad': ['spillage', 'quadboob'],
  'strap': ['straps-falling', 'strap', 'straps', 'slipping'],
  'straps': ['straps-falling', 'strap', 'straps', 'slipping'],
  'falling': ['straps-falling', 'falling', 'slipping'],
  'slipping': ['straps-falling', 'slipping', 'falling'],
  'dig': ['band-too-tight', 'underwire-pain', 'digging', 'dig'],
  'digging': ['band-too-tight', 'underwire-pain', 'digging'],
  'tight': ['band-too-tight', 'tight'],
  'loose': ['band-too-loose', 'loose', 'riding'],
  'riding': ['band-too-loose', 'riding', 'rides'],
  'underwire': ['underwire-pain', 'underwire', 'wire', 'poking'],
  'wire': ['underwire-pain', 'wire', 'underwire', 'poking'],
  'poke': ['underwire-pain', 'poking', 'poke'],
  'poking': ['underwire-pain', 'poking', 'wire'],
  'pain': ['underwire-pain', 'pain', 'painful', 'hurts', 'hurt'],
  'hurt': ['underwire-pain', 'pain', 'hurt', 'hurts'],
  'hurts': ['underwire-pain', 'pain', 'hurts'],
  'uncomfortable': ['underwire-pain', 'uncomfortable', 'pain'],
  'shape': ['shape-mismatch', 'shape', 'projection', 'shallow'],
  'shallow': ['shape-mismatch', 'shallow', 'projection'],
  'projected': ['shape-mismatch', 'projected', 'projection'],
  'projection': ['shape-mismatch', 'projection', 'projected'],
  'wide': ['shape-mismatch', 'wide', 'root', 'roots'],
  'narrow': ['shape-mismatch', 'narrow', 'root', 'roots'],
  'root': ['shape-mismatch', 'root', 'roots', 'wide', 'narrow'],
  'size': ['sizing-confusion', 'size', 'sizing'],
  'sizing': ['sizing-confusion', 'sizing', 'size', 'calculator'],
  'calculator': ['sizing-confusion', 'calculator', 'measure'],
  'measure': ['sizing-confusion', 'measure', 'measurement'],
  'strapless': ['strapless'],
  'nursing': ['nursing', 'breastfeeding', 'pumping'],
  'breastfeeding': ['nursing', 'breastfeeding'],
  'sports': ['sports-bra', 'sports', 'workout', 'running', 'exercise'],
  'sport': ['sports-bra', 'sports'],
  'running': ['sports-bra', 'running', 'workout'],
  'workout': ['sports-bra', 'workout', 'exercise'],
  'exercise': ['sports-bra', 'exercise', 'workout'],
  'small': ['small-bust', 'small'],
  'large': ['large-bust', 'large', 'big'],
  'big': ['large-bust', 'big', 'large'],
  'band': ['band-too-tight', 'band-too-loose', 'band'],
  'cup': ['gapping', 'spillage', 'cup'],
  'first': ['first-bra', 'first'],
  'bralette': ['small-bust', 'bralette'],
}

function extractKeywords(query: string): string[] {
  const words = query
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w))

  const expanded = new Set<string>()
  for (const word of words) {
    expanded.add(word)
    const synonyms = SYNONYM_MAP[word]
    if (synonyms) {
      for (const syn of synonyms) expanded.add(syn)
    }
  }

  return Array.from(expanded)
}

function detectFitIssueKeys(keywords: string[]): string[] {
  const issueKeys = [
    'shape-mismatch', 'sports-bra', 'large-bust', 'first-bra',
    'straps-falling', 'nursing', 'small-bust', 'strapless',
    'sizing-confusion', 'gapping', 'spillage', 'band-too-loose',
    'underwire-pain', 'band-too-tight'
  ]
  const matched: string[] = []
  for (const key of issueKeys) {
    const parts = key.split('-')
    if (keywords.some(kw => parts.includes(kw) || kw === key)) {
      matched.push(key)
    }
  }
  return matched
}

function scoreEntry(entry: SearchEntry, keywords: string[]): number {
  let score = 0
  const titleLower = entry.t.toLowerCase()
  const snippetLower = entry.s.toLowerCase()
  const tagsLower = entry.k.toLowerCase()

  for (const kw of keywords) {
    // Tag match is strongest signal
    if (tagsLower.includes(kw)) score += 3
    // Title match is strong
    if (titleLower.includes(kw)) score += 2
    // Snippet match
    if (snippetLower.includes(kw)) score += 1
  }

  // Boost posts with actual content (non-empty snippet, has comments)
  if (entry.s.length > 50) score += 1
  if (entry.c > 5) score += 1

  return score
}

// ── API Handler ──

export async function POST(req: Request) {
  try {
    const { query } = await req.json()

    if (!query || typeof query !== 'string' || query.trim().length < 3) {
      return NextResponse.json(
        { error: 'Please describe what you are experiencing so we can help.' },
        { status: 400 }
      )
    }
    if (query.length > 2000) {
      return NextResponse.json(
        { error: 'Query is too long. Please keep it under 2000 characters.' },
        { status: 400 }
      )
    }

    const keywords = extractKeywords(query.trim())
    const issueKeys = detectFitIssueKeys(keywords)
    const index = getSearchIndex()
    const issues = getFitIssues()

    // Score and rank search index entries
    const scored = index
      .map(entry => ({ entry, score: scoreEntry(entry, keywords) }))
      .filter(({ score }) => score > 2)
      .sort((a, b) => b.score - a.score)
      .slice(0, 30) // Take top 30 for Claude to pick from

    // Also pull stories from fit-issues for matched categories
    const issueStories: { title: string; snippet: string; date: string; topComment: string; source: string }[] = []
    for (const key of issueKeys) {
      const entries = issues[key]
      if (entries) {
        for (const entry of entries.slice(0, 5)) {
          if (entry.snippet && entry.snippet.length > 20) {
            issueStories.push({ ...entry, source: key })
          }
        }
      }
    }

    // Combine and deduplicate by title
    const seenTitles = new Set<string>()
    const candidates: { title: string; snippet: string; date: string; commentCount: number; tags: string; topComment?: string }[] = []

    for (const { entry } of scored) {
      const titleKey = entry.t.toLowerCase().slice(0, 60)
      if (!seenTitles.has(titleKey)) {
        seenTitles.add(titleKey)
        candidates.push({
          title: entry.t,
          snippet: entry.s.slice(0, 300),
          date: entry.d,
          commentCount: entry.c,
          tags: entry.k,
        })
      }
    }

    for (const story of issueStories) {
      const titleKey = story.title.toLowerCase().slice(0, 60)
      if (!seenTitles.has(titleKey)) {
        seenTitles.add(titleKey)
        candidates.push({
          title: story.title,
          snippet: story.snippet.slice(0, 300),
          date: story.date,
          commentCount: 0,
          tags: story.source,
          topComment: story.topComment,
        })
      }
    }

    if (candidates.length === 0) {
      return NextResponse.json({
        stories: [],
        summary: "We couldn't find stories that match exactly what you're describing, but that doesn't mean you're alone in this. The r/ABraThatFits community is incredibly welcoming -- posting your situation there will get you real, personalized help from people who've been through it.",
      })
    }

    // Use Claude to select the best stories and write empathetic commentary
    const candidateText = candidates.slice(0, 20).map((c, i) =>
      `[${i}] "${c.title}" (${c.date}, ${c.commentCount} comments, tags: ${c.tags})\nSnippet: ${c.snippet}${c.topComment ? `\nTop comment: ${c.topComment}` : ''}`
    ).join('\n\n')

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      system: `You are the Fit Oracle — a warm, empathetic voice that helps people feel less alone in their bra fit struggles. You've read thousands of stories from r/ABraThatFits and you connect people with others who've been through similar experiences.

Your job:
1. Read the user's query and the candidate stories
2. Pick the 5-8 most relevant stories that will make this person feel understood and hopeful
3. For each story, write a short "insight" (1-2 sentences) explaining why this story is relevant to them — in a warm, conversational tone
4. Write a summary paragraph (2-4 sentences) that ties everything together with empathy and hope

Tone: like a knowledgeable friend who gets it. Never clinical. Never condescending. Use "you" language. It's okay to be a little informal.

Respond ONLY with valid JSON in this exact format:
{
  "summary": "Your empathetic summary here...",
  "picks": [
    { "index": 0, "insight": "Why this story matters for them..." },
    { "index": 2, "insight": "..." }
  ]
}`,
      messages: [
        {
          role: 'user',
          content: `The person said:
<user_input>
${query}
</user_input>

Here are the candidate stories from r/ABraThatFits:

${candidateText}

Pick the 5-8 best matches and write insights for each. Remember — this person is probably frustrated and looking for someone who gets it.`,
        },
      ],
    })

    // Parse Claude's response
    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    let parsed: { summary: string; picks: { index: number; insight: string }[] }

    try {
      // Handle potential markdown code blocks in the response
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text)
    } catch {
      // Fallback if Claude's response isn't clean JSON
      return NextResponse.json({
        stories: candidates.slice(0, 6).map(c => ({
          title: c.title,
          snippet: c.snippet,
          date: c.date,
          commentCount: c.commentCount,
          insight: '',
        })),
        summary: "We found some stories from people who've dealt with similar fit issues. You're not alone in this.",
      })
    }

    const stories = parsed.picks
      .filter(p => p.index >= 0 && p.index < candidates.length)
      .map(p => {
        const c = candidates[p.index]
        return {
          title: c.title,
          snippet: c.snippet,
          date: c.date,
          commentCount: c.commentCount,
          insight: p.insight,
        }
      })

    return NextResponse.json({
      stories,
      summary: parsed.summary,
    })
  } catch (error) {
    console.error('Oracle error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
