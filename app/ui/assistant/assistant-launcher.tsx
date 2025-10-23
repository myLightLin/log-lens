'use client'

import Image from 'next/image'
import {FormEvent, useCallback, useEffect, useRef, useState} from 'react'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  status?: 'pending' | 'complete' | 'error'
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'assistant-initial',
    role: 'assistant',
    content: '您好，我是您的 AI 分析助手，您可以向我提任何问题',
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
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  const handleToggle = () => {
    if (isOpen) {
      handleClose()
    } else {
      setIsOpen(true)
    }
  }

  const handleClose = useCallback(() => {
    setIsOpen(false)
    setQuestion('')
    setIsThinking(false)
    setPendingMessageId(null)
    if (pendingTimerRef.current) {
      clearTimeout(pendingTimerRef.current)
      pendingTimerRef.current = null
    }
    setMessages((prev) => prev.filter((message) => message.status !== 'pending'))
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
      messagesEndRef.current.scrollIntoView({behavior: 'smooth'})
    }
  }, [messages])

  useEffect(() => {
    return () => {
      if (pendingTimerRef.current) {
        clearTimeout(pendingTimerRef.current)
      }
    }
  }, [])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!question.trim() || isThinking) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question.trim(),
    }

    const placeholderId = `assistant-${Date.now()}`

    const assistantPlaceholder: ChatMessage = {
      id: placeholderId,
      role: 'assistant',
      content: '正在分析数据…',
      status: 'pending',
    }

    setMessages((prev) => [...prev, userMessage, assistantPlaceholder])
    setQuestion('')
    setIsThinking(true)
    setPendingMessageId(placeholderId)

    if (pendingTimerRef.current) {
      clearTimeout(pendingTimerRef.current)
    }

    pendingTimerRef.current = setTimeout(() => {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === placeholderId
            ? {
                ...message,
                content:
                  '模拟响应：接口准备完成后，我会基于当前表格数据计算指标并给出洞察。',
                status: 'complete',
              }
            : message,
        ),
      )
      setIsThinking(false)
      setPendingMessageId(null)
      pendingTimerRef.current = null
    }, 1600)
  }

  return (
    <>
      <button
        type='button'
        aria-label={isOpen ? '关闭 AI 助手' : '打开 AI 助手'}
        aria-pressed={isOpen}
        className={`fixed bottom-[10.5rem] right-10 z-40 h-14 w-14 overflow-hidden rounded-full ring-1 ring-black/10 shadow-[0_12px_24px_-10px_rgba(24,39,75,0.45)] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${isOpen ? 'ring-blue-400/60 shadow-[0_18px_32px_-12px_rgba(24,39,75,0.55)]' : 'hover:scale-[1.05]'}`}
        onClick={handleToggle}
      >
        <Image
          src='/ai.jpg'
          alt='AI 助手'
          width={56}
          height={56}
          className='h-full w-full object-cover'
          priority
        />
      </button>
      {isOpen ? (
        <div
          role='dialog'
          aria-modal='false'
          className='fixed bottom-[16rem] right-12 z-50 flex h-[520px] w-[25rem] max-w-[calc(100vw-6rem)] max-h-[calc(100vh-6rem)] flex-col overflow-hidden rounded-[30px] border border-white/60 bg-gradient-to-br from-white/80 via-white/35 to-white/25 shadow-[0_45px_90px_-40px_rgba(15,23,42,0.6)] backdrop-blur-2xl'
        >
          <div className='flex items-center justify-between border-b border-white/60 bg-white/40 px-7 py-5 backdrop-blur-sm'>
            <div>
              <p className='text-sm uppercase tracking-[0.18em] text-slate-500'>
                Smart Insights
              </p>
              <p className='text-lg font-semibold text-slate-800'>AI 助手</p>
            </div>
            <button
              type='button'
              onClick={handleClose}
              className='flex h-11 w-11 items-center justify-center rounded-full text-slate-500 transition hover:bg-white/60 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500'
            >
              <span aria-hidden='true' className='text-2xl leading-none'>&times;</span>
            </button>
          </div>

          <div className='flex flex-1 flex-col gap-4 overflow-y-auto bg-white/25 px-7 py-5 text-sm text-slate-700 backdrop-blur-sm'>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 leading-relaxed shadow-[0_14px_30px_-18px_rgba(15,23,42,0.6)] ${
                    message.role === 'assistant'
                      ? message.status === 'pending'
                        ? 'border border-white/40 bg-white/55 text-slate-500'
                        : 'border border-white/50 bg-white/80 text-slate-800'
                      : 'bg-gradient-to-br from-blue-500 via-indigo-500 to-blue-600 text-white shadow-[0_18px_32px_-16px_rgba(37,99,235,0.75)]'
                  }`}
                >
                  {message.status === 'pending' ? (
                    <span className='flex items-center gap-2 text-slate-400'>
                      <span className='sr-only'>AI 正在生成回答…</span>
                      <span className='flex items-center gap-1'>
                        {[0, 1, 2].map((index) => (
                          <span
                            key={index}
                            className='h-1.5 w-1.5 rounded-full bg-slate-400/75 animate-bounce'
                            style={{animationDelay: `${index * 120}ms`}}
                          />
                        ))}
                      </span>
                    </span>
                  ) : (
                    message.content
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form
            className='flex items-center gap-4 border-t border-white/60 bg-white/45 px-7 py-5 backdrop-blur-sm'
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
              className='flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-400 via-teal-400 to-sky-400 text-white shadow-[0_18px_36px_-14px_rgba(14,165,233,0.6)] transition enabled:hover:shadow-[0_24px_46px_-18px_rgba(14,165,233,0.68)] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300'
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
        </div>
      ) : null}
    </>
  )
}
