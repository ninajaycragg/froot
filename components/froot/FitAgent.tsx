'use client'

// ── FitAgent — the radar-as-chat ──
// The chat IS the belief loop, not a sidebar bot. Each user turn POSTs to
// /api/froot/fit-agent, which returns a STRUCTURED reply: a parsed observation
// (the bra they just described), a warm spoken line, and the single most-
// informative next question (active-learning, not a fixed quiz).
//
// When the reply carries an observation, we surface it via onObservation(obs)
// so the parent can fold it into the belief (refineSizeFromFeedback) and re-run
// fit-twins. We ALSO show the belief sharpening inline: a tiny live size +
// confidence meter that tightens as each ping lands — you watch the radar
// narrow in the same surface you're talking in.

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// mirrors beliefEngine.FitFeedbackPing — passed straight to refineSizeFromFeedback
export interface FitObservation {
  size?: string
  bandFit?: 'too_tight' | 'good' | 'too_loose'
  cupFit?: 'too_small' | 'good' | 'too_big'
  rating?: 'perfect' | 'good' | 'okay' | 'bad'
  notes?: string
}

// The live belief the parent owns and threads back in for sharpening display.
export interface LiveBelief {
  sizeUK?: string
  bandSize?: number
  cupUK?: string
  confidence?: number // 0..1
  nPings?: number
  sisters?: string[]
}

interface AgentReply {
  say: string
  observation: FitObservation | null
  nextQuestion: string | null
  recommend: boolean
  degraded?: boolean
}

interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
  // for assistant turns: the structured extras we render as chips
  observation?: FitObservation | null
  nextQuestion?: string | null
  recommend?: boolean
}

interface FitAgentProps {
  // the live belief (parent recomputes from refineSizeFromFeedback after each ping)
  belief?: LiveBelief
  // the calculator size to seed the agent's prior, if any
  calculatorSize?: string
  // fired whenever the agent extracts a fit observation — parent submits it to
  // the belief engine and updates `belief`
  onObservation?: (obs: FitObservation) => void
  // fired when the agent lands a confident recommendation
  onRecommend?: (sizeUK: string | undefined) => void
}

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]
const INK = '#1A0808'
const BONE = '#FAF6EE'
const POPPY = '#C5352C'

const OPENER =
  "I fit by listening, not by tape. Name one bra you actually own — what's on the tag, and how does it sit on you?"

function obsSummary(o: FitObservation): string {
  const bits: string[] = []
  if (o.size) bits.push(o.size)
  if (o.bandFit) bits.push(`band ${o.bandFit.replace('_', ' ')}`)
  if (o.cupFit) bits.push(`cup ${o.cupFit.replace('_', ' ')}`)
  if (o.rating) bits.push(o.rating)
  return bits.join(' · ')
}

export default function FitAgent({
  belief,
  calculatorSize,
  onObservation,
  onRecommend,
}: FitAgentProps) {
  const [turns, setTurns] = useState<ChatTurn[]>([
    { role: 'assistant', content: OPENER, nextQuestion: null, recommend: false },
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [turns, busy])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const send = useCallback(
    async (text: string) => {
      const msg = text.trim()
      if (!msg || busy) return

      const userTurn: ChatTurn = { role: 'user', content: msg }
      const history = [...turns, userTurn]
      setTurns(history)
      setInput('')
      setBusy(true)

      try {
        const resp = await fetch('/api/froot/fit-agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: history.map((t) => ({ role: t.role, content: t.content })),
            context: { belief, calculatorSize },
          }),
        })
        if (!resp.ok) throw new Error('agent failed')
        const reply = (await resp.json()) as AgentReply

        // 1. hand any parsed observation up to the belief engine
        if (reply.observation) onObservation?.(reply.observation)
        // 2. recommendation event
        if (reply.recommend) onRecommend?.(belief?.sizeUK)

        // 3. render the spoken line + structured chips
        const line = [reply.say, reply.nextQuestion].filter(Boolean).join(' ')
        setTurns((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: line || 'Tell me a little more about how that one fits.',
            observation: reply.observation,
            nextQuestion: reply.nextQuestion,
            recommend: reply.recommend,
          },
        ])
      } catch {
        setTurns((prev) => [
          ...prev,
          { role: 'assistant', content: 'I lost the thread for a second — say that once more?' },
        ])
      } finally {
        setBusy(false)
      }
    },
    [turns, busy, belief, calculatorSize, onObservation, onRecommend],
  )

  const conf = Math.max(0, Math.min(1, belief?.confidence ?? 0))
  const nPings = belief?.nPings ?? 0
  const hasBelief = nPings > 0 && !!belief?.sizeUK

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '560px',
        margin: '0 auto',
        background: BONE,
        borderRadius: '22px',
        // tactile object: warm gradient + layered shadow, not a flat fill
        backgroundImage: 'linear-gradient(180deg, #FBF8F1 0%, #F5EFE3 100%)',
        boxShadow:
          '0 1px 0 rgba(255,255,255,0.7) inset, 0 18px 50px -20px rgba(26,8,8,0.4), 0 0 0 1px rgba(26,8,8,0.05)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '420px',
        maxHeight: 'min(78vh, 680px)',
        overflow: 'hidden',
      }}
    >
      {/* ── Header: the live belief radar, sharpening in place ── */}
      <div
        style={{
          flexShrink: 0,
          padding: '16px 20px 14px',
          borderBottom: '1px solid rgba(26,8,8,0.07)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--font-space-mono), monospace',
              fontSize: '9px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'rgba(26,8,8,0.4)',
            }}
          >
            the read, sharpening
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '8px',
              marginTop: '3px',
            }}
          >
            <AnimatePresence mode="popLayout">
              <motion.span
                key={belief?.sizeUK ?? 'unknown'}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.32, ease: EASE }}
                style={{
                  fontFamily: 'var(--font-dm-serif), Georgia, serif',
                  fontStyle: 'italic',
                  fontSize: '26px',
                  lineHeight: 1,
                  color: hasBelief ? INK : 'rgba(26,8,8,0.25)',
                }}
              >
                {hasBelief ? belief?.sizeUK : '— —'}
              </motion.span>
            </AnimatePresence>
            {hasBelief && belief?.sisters && belief.sisters.length > 0 && (
              <span
                style={{
                  fontFamily: 'var(--font-space-mono), monospace',
                  fontSize: '9px',
                  color: 'rgba(26,8,8,0.35)',
                  letterSpacing: '0.04em',
                }}
              >
                or {belief.sisters.slice(0, 2).join(' / ')}
              </span>
            )}
          </div>
        </div>

        {/* confidence meter — the radar narrowing */}
        <div style={{ flexShrink: 0, width: '92px', textAlign: 'right' }}>
          <div
            style={{
              fontFamily: 'var(--font-space-mono), monospace',
              fontSize: '9px',
              letterSpacing: '0.1em',
              color: 'rgba(26,8,8,0.4)',
            }}
          >
            {nPings} {nPings === 1 ? 'bra' : 'bras'} · {Math.round(conf * 100)}%
          </div>
          <div
            style={{
              marginTop: '5px',
              height: '5px',
              borderRadius: '3px',
              background: 'rgba(26,8,8,0.08)',
              overflow: 'hidden',
            }}
          >
            <motion.div
              animate={{ width: `${Math.round(conf * 100)}%` }}
              transition={{ duration: 0.5, ease: EASE }}
              style={{
                height: '100%',
                borderRadius: '3px',
                background: `linear-gradient(90deg, ${POPPY}, #E0573F)`,
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Conversation ── */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        {turns.map((t, i) => (
          <div
            key={i}
            style={{
              alignSelf: t.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '86%',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              alignItems: t.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                padding: '11px 15px',
                borderRadius:
                  t.role === 'user' ? '16px 16px 5px 16px' : '16px 16px 16px 5px',
                background: t.role === 'user' ? INK : 'rgba(26,8,8,0.035)',
                boxShadow:
                  t.role === 'user'
                    ? '0 3px 12px -4px rgba(26,8,8,0.45)'
                    : '0 1px 3px rgba(26,8,8,0.05)',
                color: t.role === 'user' ? BONE : INK,
                fontFamily:
                  t.role === 'assistant'
                    ? 'var(--font-dm-serif), Georgia, serif'
                    : 'var(--font-space-mono), monospace',
                fontStyle: t.role === 'assistant' ? 'italic' : 'normal',
                fontSize: t.role === 'assistant' ? '14px' : '11px',
                lineHeight: 1.55,
              }}
            >
              {t.content}
            </div>

            {/* the parsed observation, shown as a tangible "ping" chip */}
            {t.role === 'assistant' && t.observation && (
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.28, ease: EASE }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '999px',
                  background: 'rgba(197,53,44,0.08)',
                  boxShadow: '0 0 0 1px rgba(197,53,44,0.18)',
                  fontFamily: 'var(--font-space-mono), monospace',
                  fontSize: '9px',
                  letterSpacing: '0.06em',
                  color: POPPY,
                }}
              >
                <span
                  style={{
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    background: POPPY,
                    display: 'inline-block',
                  }}
                />
                logged: {obsSummary(t.observation)}
              </motion.div>
            )}

            {t.role === 'assistant' && t.recommend && (
              <span
                style={{
                  fontFamily: 'var(--font-space-mono), monospace',
                  fontSize: '9px',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'rgba(26,8,8,0.4)',
                }}
              >
                that&apos;s your size
              </span>
            )}
          </div>
        ))}

        {busy && (
          <div style={{ alignSelf: 'flex-start' }}>
            <div
              style={{
                padding: '11px 15px',
                borderRadius: '16px 16px 16px 5px',
                background: 'rgba(26,8,8,0.035)',
                display: 'flex',
                gap: '4px',
              }}
            >
              {[0, 1, 2].map((d) => (
                <motion.span
                  key={d}
                  animate={{ opacity: [0.25, 1, 0.25] }}
                  transition={{ duration: 1, repeat: Infinity, delay: d * 0.18, ease: 'easeInOut' }}
                  style={{
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    background: 'rgba(26,8,8,0.4)',
                    display: 'inline-block',
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Input ── */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
        style={{
          flexShrink: 0,
          padding: '12px 16px',
          borderTop: '1px solid rgba(26,8,8,0.07)',
          display: 'flex',
          gap: '8px',
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="a bra you own + how it fits…"
          disabled={busy}
          style={{
            flex: 1,
            minWidth: 0,
            padding: '11px 15px',
            borderRadius: '13px',
            border: 'none',
            background: 'rgba(26,8,8,0.04)',
            boxShadow: '0 1px 3px rgba(26,8,8,0.05) inset',
            fontFamily: 'var(--font-space-mono), monospace',
            fontSize: '11px',
            color: INK,
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={!input.trim() || busy}
          style={{
            flexShrink: 0,
            padding: '11px 18px',
            borderRadius: '13px',
            border: 'none',
            background: input.trim() && !busy ? POPPY : 'rgba(197,53,44,0.15)',
            color: input.trim() && !busy ? BONE : 'rgba(197,53,44,0.4)',
            fontFamily: 'var(--font-space-mono), monospace',
            fontSize: '10px',
            letterSpacing: '0.12em',
            cursor: input.trim() && !busy ? 'pointer' : 'default',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
          }}
        >
          tell
        </button>
      </form>
    </div>
  )
}
