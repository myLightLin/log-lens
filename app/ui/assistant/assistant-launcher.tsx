'use client'

import Image from 'next/image'
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { fetchOverviewData } from '@/app/lib/overview'
import { fetchAiAnswer } from '@/app/lib/ai'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  status?: 'pending' | 'typing' | 'complete' | 'error'
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'assistant-initial',
    role: 'assistant',
    content: '',
  },
]

export default function AssistantLauncher() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    ...INITIAL_MESSAGES,
  ])
  const [question, setQuestion] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [pendingMessageId, setPendingMessageId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const overviewControllerRef = useRef<AbortController | null>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const overviewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const aiControllerRef = useRef<AbortController | null>(null)
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasTriggeredOverviewRef = useRef(false)
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([])
  const [showIntroTip, setShowIntroTip] = useState(false)
  const [displaySuggestions, setDisplaySuggestions] = useState(false)

  const dismissIntroTip = useCallback(() => {
    setShowIntroTip(false)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('loglens-ai-tip-dismissed', 'true')
    }
  }, [])

  const startTypingEffect = useCallback(
    (messageId: string, fullText: string, options?: {onComplete?: () => void}) => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current)
      }

      const characters = Array.from(fullText)

      if (characters.length === 0) {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === messageId
              ? { ...message, content: '暂无摘要信息。', status: 'complete' }
              : message,
          ),
        )
        setIsThinking(false)
        setPendingMessageId(null)
        typingTimerRef.current = null
        options?.onComplete?.()
        return
      }

      const interval = Math.max(1000 / 42, 16)

      const step = (index: number) => {
        const content = characters.slice(0, index).join('')
        setMessages((prev) =>
          prev.map((message) =>
            message.id === messageId
              ? {
                ...message,
                content,
                status: index >= characters.length ? 'complete' : 'typing',
              }
              : message,
          ),
        )

        if (index < characters.length) {
          typingTimerRef.current = setTimeout(() => step(index + 1), interval)
        } else {
          typingTimerRef.current = null
          setIsThinking(false)
          setPendingMessageId(null)
          options?.onComplete?.()
        }
      }

      step(1)
    },
    [],
  )

  const submitQuestion = useCallback(
    async (content: string, options: {clearInput?: boolean} = {}) => {
      const trimmedQuestion = content.trim()
      if (!trimmedQuestion || isThinking) return

      setDisplaySuggestions(false)

      if (options.clearInput !== false) {
        setQuestion('')
      }

      if (aiControllerRef.current) {
        aiControllerRef.current.abort()
        aiControllerRef.current = null
      }
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current)
        aiTimeoutRef.current = null
      }

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: trimmedQuestion,
      }

      const placeholderId = `assistant-${Date.now()}`
      const assistantPlaceholder: ChatMessage = {
        id: placeholderId,
        role: 'assistant',
        content: '',
        status: 'pending',
      }

      setMessages((prev) => [...prev, userMessage, assistantPlaceholder])
      setIsThinking(true)
      setPendingMessageId(placeholderId)

      const controller = new AbortController()
      aiControllerRef.current = controller

      let didTimeout = false
      aiTimeoutRef.current = setTimeout(() => {
        didTimeout = true
        controller.abort()
      }, 1000000)

      try {
        const result = await fetchAiAnswer(trimmedQuestion, controller.signal)
        if (controller.signal.aborted) {
          return
        }
        const answer = resolveAiAnswer(result, trimmedQuestion)
        setMessages((prev) =>
          prev.map((message) =>
            message.id === placeholderId
              ? {
                  ...message,
                  status: answer ? 'typing' : 'complete',
                }
              : message,
          ),
        )
        startTypingEffect(
          placeholderId,
          answer || '暂无回答，请稍后再试。',
        )
      } catch (error) {
        if (controller.signal.aborted) {
          if (didTimeout) {
            setMessages((prev) =>
              prev.map((message) =>
                message.id === placeholderId
                  ? {
                      ...message,
                      content: '分析请求超时，请稍后再试。',
                      status: 'error',
                    }
                  : message,
              ),
            )
            setIsThinking(false)
            setPendingMessageId(null)
          }
          return
        }
        console.error('AI 分析请求失败', error)
        setMessages((prev) =>
          prev.map((message) =>
            message.id === placeholderId
              ? {
                  ...message,
                  content: '分析请求失败，请稍后再试。',
                  status: 'error',
                }
              : message,
          ),
        )
        setIsThinking(false)
        setPendingMessageId(null)
      } finally {
        if (aiTimeoutRef.current) {
          clearTimeout(aiTimeoutRef.current)
          aiTimeoutRef.current = null
        }
        aiControllerRef.current = null
      }
    },
    [isThinking, startTypingEffect],
  )

  const handleToggle = () => {
    if (isOpen) {
      handleClose()
    } else {
      dismissIntroTip()
      setIsOpen(true)
    }
  }

  const handleClose = useCallback(() => {
    setIsOpen(false)
    setQuestion('')
    setIsThinking(false)
    setPendingMessageId(null)
    if (overviewControllerRef.current) {
      overviewControllerRef.current.abort()
      overviewControllerRef.current = null
    }
    if (overviewTimeoutRef.current) {
      clearTimeout(overviewTimeoutRef.current)
      overviewTimeoutRef.current = null
    }
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current)
      typingTimerRef.current = null
    }
    if (aiControllerRef.current) {
      aiControllerRef.current.abort()
      aiControllerRef.current = null
    }
    if (aiTimeoutRef.current) {
      clearTimeout(aiTimeoutRef.current)
      aiTimeoutRef.current = null
    }
    setMessages((prev) =>
      prev.filter(
        (message) =>
          message.status !== 'pending' && message.status !== 'typing',
      ),
    )
    setSuggestedQuestions([])
    setDisplaySuggestions(false)
  }, [])


  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem('loglens-ai-tip-dismissed')
    if (!stored) {
      setShowIntroTip(true)
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, handleClose])

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: isThinking ? 'auto' : 'smooth', block: 'end' })
    }
  }, [messages, isThinking])

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current)
      }
      if (overviewControllerRef.current) {
        overviewControllerRef.current.abort()
      }
      if (overviewTimeoutRef.current) {
        clearTimeout(overviewTimeoutRef.current)
      }
      if (aiControllerRef.current) {
        aiControllerRef.current.abort()
      }
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current)
      }
    }
  }, [])

  const triggerOverviewSummary = useCallback(async () => {
    if (!isOpen) return

    if (overviewControllerRef.current) {
      overviewControllerRef.current.abort()
    }

    const controller = new AbortController()
    overviewControllerRef.current = controller

    const placeholderId = `overview-${Date.now()}`
    setMessages((prev) => {
      const cleaned = prev.filter(
        (message) =>
          message.status !== 'pending' && message.status !== 'typing',
      )
      return [
        ...cleaned,
        {
          id: placeholderId,
          role: 'assistant',
          content: '',
          status: 'pending',
        },
      ]
    })

    setIsThinking(true)
    setPendingMessageId(placeholderId)
    setDisplaySuggestions(false)
    let didTimeout = false
    setSuggestedQuestions([])
    try {
      overviewTimeoutRef.current = setTimeout(() => {
        didTimeout = true
        controller.abort()
      }, 60000)

      const result = await fetchOverviewData(controller.signal)
      if (controller.signal.aborted) {
        return
      }
      const summary = (result?.data?.summary ?? '').toString().trim()
      console.log('AI 概览摘要响应', result)
      const rawTips = Array.isArray(result?.data?.question_tips)
        ? (result?.data?.question_tips as unknown[])
        : []
      const tips = rawTips
        .filter((tip): tip is string => typeof tip === 'string' && tip.trim().length > 0)
        .slice(0, 3)
      setSuggestedQuestions(tips)
      setMessages((prev) =>
        prev.map((message) =>
          message.id === placeholderId
            ? {
                ...message,
                status: summary ? 'typing' : 'complete',
              }
            : message,
        ),
      )
      startTypingEffect(
        placeholderId,
        summary || '暂无最新概览，请稍后再试。',
        {
          onComplete: () => {
            if (tips.length > 0) {
              setDisplaySuggestions(true)
            }
          },
        },
      )
    } catch (error) {
      if (controller.signal.aborted) {
        if (didTimeout) {
          setMessages((prev) =>
            prev.map((message) =>
              message.id === placeholderId
                ? {
                  ...message,
                  content: '获取数据概览超时，请稍后再试。',
                  status: 'error',
                }
                : message,
            ),
          )
          setIsThinking(false)
          setPendingMessageId(null)
        }
        return
      }
      setMessages((prev) =>
        prev.map((message) =>
          message.id === placeholderId
            ? {
              ...message,
              content: '获取数据概览失败，请稍后再试。',
              status: 'error',
            }
            : message,
        ),
      )
      setIsThinking(false)
      setPendingMessageId(null)
      setSuggestedQuestions([])
    } finally {
      if (overviewTimeoutRef.current) {
        clearTimeout(overviewTimeoutRef.current)
        overviewTimeoutRef.current = null
      }
      overviewControllerRef.current = null
    }
  }, [isOpen, startTypingEffect])

  useEffect(() => {
    if (isOpen && !hasTriggeredOverviewRef.current) {
      hasTriggeredOverviewRef.current = true
      triggerOverviewSummary()
    }
  }, [isOpen, triggerOverviewSummary])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    submitQuestion(question, {clearInput: true})
  }

  const handleSuggestionClick = useCallback(
    (tip: string) => {
      setDisplaySuggestions(false)
      submitQuestion(tip, {clearInput: false})
    },
    [submitQuestion],
  )

  return (
    <>
      {showIntroTip && !isOpen && (
        <div className='fixed bottom-[calc(4.5rem+2.25rem)] right-[calc(1rem+3.5rem+1rem)] z-30 max-w-[220px] rounded-2xl bg-white/95 px-4 py-3 text-xs leading-relaxed text-slate-600 shadow-[0_28px_60px_-28px_rgba(15,23,42,0.55)] sm:bottom-[calc(5.5rem+2.25rem)] sm:right-[calc(1.5rem+3.5rem+1rem)] lg:bottom-[calc(10.5rem+2.75rem)] lg:right-[calc(2.5rem+3.5rem+1.25rem)]'>
          <div className='flex items-start gap-2'>
            <span>你的数据报告已准备好，快来查看吧！</span>
            <button
              type='button'
              onClick={dismissIntroTip}
              className='rounded-full px-1 text-slate-400 transition hover:text-slate-600'
            >
              ×
            </button>
          </div>
        </div>
      )}
      <button
        type='button'
        aria-label={isOpen ? '关闭 AI 问数' : '打开 AI 问数'}
        aria-pressed={isOpen}
        className={`fixed bottom-[4.5rem] right-4 z-40 h-14 w-14 overflow-hidden rounded-full ring-1 ring-black/10 shadow-[0_24px_52px_-24px_rgba(15,23,42,0.58)] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 sm:bottom-[5.5rem] sm:right-6 lg:bottom-[10.5rem] lg:right-10 ${isOpen ? 'ring-blue-400/60 shadow-[0_28px_58px_-26px_rgba(15,23,42,0.68)]' : 'hover:scale-[1.05] hover:ring-blue-400/50 hover:shadow-[0_26px_56px_-24px_rgba(15,23,42,0.63)]'}`}
        onClick={handleToggle}
      >
        <Image
          src='/ai.jpg'
          alt='AI 问数'
          width={56}
          height={56}
          className='h-full w-full object-cover'
          priority
        />
      </button>
      {isOpen ? (
        <>
          <button
            type='button'
            onClick={handleClose}
            className='fixed inset-0 z-40 bg-slate-900/15 backdrop-blur-sm sm:hidden'
            aria-label='关闭 AI 问数'
          />
          <div
            role='dialog'
            aria-modal='false'
            className='fixed top-[12vh] left-1/2 z-50 flex h-[70vh] w-[calc(100vw-2.5rem)] max-w-[25rem] min-w-[18rem] -translate-x-1/2 flex-col overflow-hidden rounded-[30px] border border-white/60 bg-gradient-to-br from-white/80 via-white/35 to-white/25 shadow-[0_45px_90px_-40px_rgba(15,23,42,0.6)] backdrop-blur-2xl sm:top-[10vh] sm:w-[calc(100vw-3rem)] md:top-auto md:bottom-[5.5rem] md:right-[calc(1.5rem+3.5rem+0.5rem)] md:left-auto md:w-[calc(100vw-3rem)] md:max-w-[25rem] md:translate-x-0 lg:bottom-[10.5rem] lg:right-[calc(2.5rem+3.5rem+0.75rem)] lg:w-[25rem] lg:h-[610px]'
          >
            <div className='flex flex-shrink-0 items-center justify-between border-b border-white/60 bg-white/40 px-7 py-5 backdrop-blur-sm'>
              <div>
                <p className='text-sm uppercase tracking-[0.18em] text-slate-500'>
                  Smart Insights
                </p>
                <p className='text-lg font-semibold text-slate-800'>AI 问数</p>
              </div>
              <button
                type='button'
                onClick={handleClose}
                className='flex h-11 w-11 items-center justify-center rounded-full text-slate-500 transition hover:bg-white/60 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500'
              >
                <span aria-hidden='true' className='text-2xl leading-none'>&times;</span>
              </button>
            </div>

            <div className='flex flex-1 min-h-0 flex-col bg-white/25 text-sm text-slate-700 backdrop-blur-sm'>
              <div className='flex-1 min-h-0 overflow-y-auto px-7 py-5'>
                <div className='flex flex-col gap-4'>
                  {messages.map((message) => {
                    const trimmedContent = message.content.trim()
                    const isPending = message.status === 'pending'
                    const isTyping = message.status === 'typing'
                    if (!isPending && !isTyping && trimmedContent.length === 0) {
                      return null
                    }
                    const shouldRenderMarkdown =
                      message.role === 'assistant' &&
                      !isPending &&
                      !isTyping &&
                      message.status !== 'error'
                    return (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.role === 'assistant' ? 'justify-start' : 'justify-end'
                        }`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2 leading-relaxed shadow-[0_14px_30px_-18px_rgba(15,23,42,0.6)] ${
                            message.role === 'assistant'
                              ? isPending
                                ? 'border border-white/40 bg-white/55 text-slate-500'
                                : 'border border-white/50 bg-white/80 text-slate-800'
                              : 'bg-gradient-to-br from-blue-500 via-indigo-500 to-blue-600 text-white shadow-[0_18px_32px_-16px_rgba(37,99,235,0.75)]'
                          }`}
                        >
                          {isPending ? (
                            <span className='flex items-center gap-2 text-slate-400'>
                              <span className='sr-only'>AI 正在生成回答…</span>
                              <span className='flex items-center gap-1'>
                                {[0, 1, 2].map((index) => (
                                  <span
                                    key={index}
                                    className='h-1.5 w-1.5 rounded-full bg-slate-400/75 animate-bounce'
                                    style={{ animationDelay: `${index * 120}ms` }}
                                  />
                                ))}
                              </span>
                            </span>
                          ) : shouldRenderMarkdown ? (
                            <div
                              className='markdown-renderer'
                              dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(message.content) }}
                            />
                          ) : (
                            message.content
                          )}
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </div>
              {displaySuggestions && suggestedQuestions.length > 0 && (
                <div className='flex flex-shrink-0 flex-wrap gap-2 px-7 pb-2'>
                  {suggestedQuestions.map((tip, index) => (
                    <button
                      key={`${tip}-${index}`}
                      type='button'
                      onClick={() => handleSuggestionClick(tip)}
                      disabled={isThinking}
                      className='rounded-full border border-blue-200/70 bg-white/85 px-3 py-1 text-xs text-slate-600 shadow-[0_12px_28px_-20px_rgba(15,23,42,0.55)] transition hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60 text-left'
                    >
                      {tip}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <form
              className='flex flex-shrink-0 items-center gap-4 border-t border-white/60 bg-white/45 px-4 py-3 backdrop-blur-sm'
              onSubmit={handleSubmit}
            >
              <input
                type='text'
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder='输入想要分析的问题...'
                disabled={isThinking}
                className='flex-1 rounded-[18px] border border-slate-200/80 bg-white/90 px-4 py-3 text-sm font-medium text-slate-800 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.45),inset_0_1px_0_rgba(255,255,255,0.9)] outline-none placeholder:text-slate-400 transition focus:border-blue-400/70 focus:bg-white focus:shadow-[0_16px_40px_-22px_rgba(59,130,246,0.35)] focus:ring-2 focus:ring-blue-200/70 disabled:cursor-not-allowed disabled:opacity-60'
              />
              <button
                type='submit'
                disabled={!question.trim() || isThinking}
                className='flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-400 via-teal-400 to-sky-400 text-white shadow-[0_18px_36px_-14px_rgba(14,165,233,0.6)] transition enabled:hover:shadow-[0_24px_46px_-18px_rgba(14,165,233,0.68)] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 aspect-square'
              >
                <svg
                  aria-hidden='true'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth={1.5}
                  className='h-5 w-5'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d='M5 12L19 5l-3 14-3.5-4L12 18l-1.5-4L5 12z'
                  />
                </svg>
              </button>
            </form>
            <p className='px-7 pb-6 text-[11px] leading-relaxed text-slate-400 text-center'>
              内容由AI生成，请仔细甄别
            </p>
          </div>
        </>
      ) : null}
    </>
  )
}

function resolveAiAnswer(payload: unknown, fallback: string): string {
  if (typeof payload === 'string' && payload.trim()) {
    return payload.trim()
  }

  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>
    const data = (record.data ?? {}) as Record<string, unknown>
    const candidates: unknown[] = [
      data.result,
      record.result,
      data.answer,
      record.answer,
      data.summary,
      record.summary,
      record.message,
      data.message,
      record.content,
    ]

    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim()
      }
    }

    try {
      return JSON.stringify(record)
    } catch (error) {
      console.error('无法序列化 AI 返回数据', error)
    }
  }

  return fallback
}

function simpleMarkdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const html: string[] = []

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')

  const renderInline = (value: string) => {
    let text = escapeHtml(value)
    text = text.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
    )
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>')
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>')
    text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>')
    text = text.replace(/_([^_]+)_/g, '<em>$1</em>')
    text = text.replace(/~~([^~]+)~~/g, '<del>$1</del>')
    return text
  }

  const splitTableRow = (row: string) =>
    row
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((cell) => renderInline(cell.trim()))

  let index = 0

  while (index < lines.length) {
    const line = lines[index]

    if (!line.trim()) {
      index += 1
      continue
    }

    if (line.startsWith('```')) {
      const fence = line.slice(3).trim()
      const codeLines: string[] = []
      index += 1
      while (index < lines.length && !lines[index].startsWith('```')) {
        codeLines.push(lines[index])
        index += 1
      }
      if (index < lines.length) {
        index += 1
      }
      const languageClass = fence ? ` class="language-${escapeHtml(fence)}"` : ''
      html.push(
        `<pre><code${languageClass}>${escapeHtml(codeLines.join('\n'))}</code></pre>`,
      )
      continue
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const content = renderInline(headingMatch[2])
      html.push(`<h${level}>${content}</h${level}>`)
      index += 1
      continue
    }

    if (/^\s*>/.test(line)) {
      const quoteLines: string[] = []
      while (index < lines.length && /^\s*>/.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^\s*> ?/, ''))
        index += 1
      }
      html.push(`<blockquote>${simpleMarkdownToHtml(quoteLines.join('\n'))}</blockquote>`)
      continue
    }

    const nextLine = lines[index + 1] ?? ''
    if (
      line.includes('|') &&
      /^\s*\|?[:\-| ]+\|?\s*$/.test(nextLine.trim())
    ) {
      const headers = splitTableRow(line)
      index += 2
      const bodyRows: string[][] = []
      while (
        index < lines.length &&
        lines[index].includes('|') &&
        lines[index].trim()
      ) {
        bodyRows.push(splitTableRow(lines[index]))
        index += 1
      }
      const headerHtml = headers.map((cell) => `<th>${cell}</th>`).join('')
      const bodyHtml = bodyRows
        .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`)
        .join('')
      html.push(`<table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`)
      continue
    }

    if (/^(\*|-)\s+/.test(line)) {
      const items: string[] = []
      while (index < lines.length && /^(\*|-)\s+/.test(lines[index])) {
        items.push(`<li>${renderInline(lines[index].replace(/^(\*|-)\s+/, ''))}</li>`)
        index += 1
      }
      html.push(`<ul>${items.join('')}</ul>`)
      continue
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = []
      while (index < lines.length && /^\d+\.\s+/.test(lines[index])) {
        items.push(`<li>${renderInline(lines[index].replace(/^\d+\.\s+/, ''))}</li>`)
        index += 1
      }
      html.push(`<ol>${items.join('')}</ol>`)
      continue
    }

    const paragraphLines: string[] = []
    while (
      index < lines.length &&
      lines[index].trim() &&
      !lines[index].startsWith('```') &&
      !/^(#{1,6})\s+/.test(lines[index]) &&
      !/^\s*>/.test(lines[index]) &&
      !lines[index].includes('|') &&
      !/^(\*|-|\d+\.)\s+/.test(lines[index])
    ) {
      paragraphLines.push(lines[index])
      index += 1
    }
    if (paragraphLines.length > 0) {
      html.push(`<p>${renderInline(paragraphLines.join(' '))}</p>`)
      continue
    }

    index += 1
  }

  return html.join('')
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds)) return '—'
  const totalSeconds = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60

  const parts: string[] = []
  if (hours) parts.push(`${hours}小时`)
  if (minutes || hours) parts.push(`${minutes}分`)
  parts.push(`${secs}秒`)
  return parts.join('')
}

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  dateStyle: 'short',
  timeStyle: 'medium',
  hour12: false,
})

function formatTimestamp(value: number) {
  if (!value) return '—'
  return dateFormatter.format(new Date(value))
}
