'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { SizeResult, ShapeProfile, AestheticGoal, Measurements } from './sizing'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface FrootChatProps {
  sizeResult: SizeResult
  shapeProfile: ShapeProfile
  aestheticGoal: AestheticGoal
  measurements?: Measurements
  topMatches?: Array<{
    brand: string
    style: string
    bestSize: string
    score: number
    tags?: string[]
  }>
  fitCheckData?: {
    currentBrand: string
    currentSize: string
    bandFit: string
    cupFit: string
    issues: string[]
  }
}

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

const STARTERS = [
  'Why this size and not what I usually wear?',
  'What should I look for when trying bras on?',
  'Best bra for a low-cut top?',
  'What about strapless options?',
]

export default function FrootChat({
  sizeResult,
  shapeProfile,
  aestheticGoal,
  measurements,
  topMatches,
  fitCheckData,
}: FrootChatProps) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, streaming])

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  async function sendMessage(text: string) {
    if (!text.trim() || streaming) return

    const userMsg: ChatMessage = { role: 'user', content: text.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setStreaming(true)

    try {
      const resp = await fetch('/api/froot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          context: {
            sizeResult,
            shapeProfile,
            aestheticGoal,
            measurements,
            topMatches,
            fitCheckData,
            notes: sizeResult.notes,
          },
        }),
      })

      if (!resp.ok) throw new Error('Chat failed')

      const reader = resp.body?.getReader()
      if (!reader) throw new Error('No reader')

      const decoder = new TextDecoder()
      let assistantText = ''

      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        assistantText += decoder.decode(value, { stream: true })
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: assistantText }
          return updated
        })
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I had a moment — ask me again?' },
      ])
    } finally {
      setStreaming(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    sendMessage(input)
  }

  return (
    <>
      {/* Toggle button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: EASE }}
            onClick={() => setOpen(true)}
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              padding: '14px 24px',
              borderRadius: '28px',
              border: 'none',
              background: '#1A0808',
              color: '#FAF6EE',
              fontFamily: 'var(--font-space-mono), monospace',
              fontSize: '11px',
              letterSpacing: '0.1em',
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(26,8,8,0.25)',
              zIndex: 50,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#D4A020',
              display: 'inline-block',
            }} />
            Ask your fitter
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.35, ease: EASE }}
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              width: 'min(380px, calc(100vw - 48px))',
              height: 'min(520px, calc(100vh - 100px))',
              background: '#FAF6EE',
              borderRadius: '20px',
              boxShadow: '0 8px 40px rgba(26,8,8,0.15), 0 0 0 1px rgba(26,8,8,0.04)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              zIndex: 50,
            }}
          >
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid rgba(26,8,8,0.06)',
            }}>
              <div>
                <div style={{
                  fontFamily: 'var(--font-dm-serif), Georgia, serif',
                  fontStyle: 'italic',
                  fontSize: '16px',
                  color: '#1A0808',
                }}>
                  Your fitting advisor
                </div>
                <div style={{
                  fontFamily: 'var(--font-space-mono), monospace',
                  fontSize: '9px',
                  color: 'rgba(26,8,8,0.3)',
                  letterSpacing: '0.08em',
                  marginTop: '2px',
                }}>
                  knows your size, shape &amp; goals
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-space-mono), monospace',
                  fontSize: '10px',
                  color: 'rgba(26,8,8,0.3)',
                  letterSpacing: '0.1em',
                  padding: '6px 10px',
                  borderRadius: '12px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(26,8,8,0.04)'
                  e.currentTarget.style.color = 'rgba(26,8,8,0.5)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'none'
                  e.currentTarget.style.color = 'rgba(26,8,8,0.3)'
                }}
              >
                close
              </button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {messages.length === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <p style={{
                    fontFamily: 'var(--font-space-mono), monospace',
                    fontSize: '11px',
                    color: 'rgba(26,8,8,0.4)',
                    lineHeight: 1.6,
                    marginBottom: '8px',
                  }}>
                    I already know your measurements, shape, and what you&apos;re going for. Ask me anything.
                  </p>
                  {STARTERS.map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      style={{
                        textAlign: 'left',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        border: 'none',
                        background: 'rgba(26,8,8,0.02)',
                        boxShadow: '0 1px 3px rgba(26,8,8,0.04)',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-space-mono), monospace',
                        fontSize: '11px',
                        color: 'rgba(26,8,8,0.5)',
                        lineHeight: 1.5,
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(26,8,8,0.04)'
                        e.currentTarget.style.boxShadow = '0 2px 6px rgba(26,8,8,0.08)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(26,8,8,0.02)'
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(26,8,8,0.04)'
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                  }}
                >
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    background: msg.role === 'user' ? '#1A0808' : 'rgba(26,8,8,0.03)',
                    boxShadow: msg.role === 'user'
                      ? '0 2px 8px rgba(26,8,8,0.15)'
                      : '0 1px 3px rgba(26,8,8,0.04)',
                    color: msg.role === 'user' ? '#FAF6EE' : '#1A0808',
                    fontFamily: msg.role === 'assistant'
                      ? 'var(--font-dm-serif), Georgia, serif'
                      : 'var(--font-space-mono), monospace',
                    fontStyle: msg.role === 'assistant' ? 'italic' : 'normal',
                    fontSize: msg.role === 'assistant' ? '13px' : '11px',
                    lineHeight: 1.6,
                    letterSpacing: msg.role === 'user' ? '0.02em' : undefined,
                  }}>
                    {msg.content}
                    {streaming && i === messages.length - 1 && msg.role === 'assistant' && (
                      <span style={{
                        display: 'inline-block',
                        width: '4px',
                        height: '14px',
                        background: '#D4A020',
                        marginLeft: '2px',
                        borderRadius: '1px',
                        animation: 'blink 1s infinite',
                        verticalAlign: 'text-bottom',
                      }} />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <form
              onSubmit={handleSubmit}
              style={{
                padding: '12px 16px',
                borderTop: '1px solid rgba(26,8,8,0.06)',
                display: 'flex',
                gap: '8px',
              }}
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything about your fit..."
                disabled={streaming}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'rgba(26,8,8,0.03)',
                  boxShadow: '0 1px 3px rgba(26,8,8,0.04) inset',
                  fontFamily: 'var(--font-space-mono), monospace',
                  fontSize: '11px',
                  color: '#1A0808',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={!input.trim() || streaming}
                style={{
                  padding: '10px 16px',
                  borderRadius: '12px',
                  border: 'none',
                  background: input.trim() && !streaming ? '#D4A020' : 'rgba(212,160,32,0.15)',
                  color: input.trim() && !streaming ? '#FAF6EE' : 'rgba(212,160,32,0.4)',
                  fontFamily: 'var(--font-space-mono), monospace',
                  fontSize: '10px',
                  letterSpacing: '0.1em',
                  cursor: input.trim() && !streaming ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                send
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cursor blink animation */}
      <style jsx global>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </>
  )
}
