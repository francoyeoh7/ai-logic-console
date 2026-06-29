import { useRef, useEffect } from 'react'
import { Send, User, Bot } from 'lucide-react'

export interface Message {
  role: 'user' | 'npc'
  content: string
  timestamp: number
}

interface Props {
  npcName: string
  messages: Message[]
  onSend: (message: string) => void
  isProcessing: boolean
  input: string
  setInput: (v: string) => void
}

export function ChatPanel({ npcName, messages, onSend, isProcessing, input, setInput }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = () => {
    const text = input.trim()
    if (!text || isProcessing) return
    setInput('')
    onSend(text)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-neutral-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20">
            <Bot className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-xs font-medium text-neutral-200">{npcName}</span>
          <span className="ml-auto text-[10px] text-neutral-500">对话沙盒</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                msg.role === 'user' ? 'bg-muted' : 'bg-primary/20'
              }`}
            >
              {msg.role === 'user' ? (
                <User className="h-3 w-3 text-neutral-400" />
              ) : (
                <Bot className="h-3 w-3 text-primary" />
              )}
            </div>
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-primary/10 text-neutral-200'
                  : 'bg-neutral-800/70 text-neutral-200'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isProcessing && (
          <div className="flex gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20">
              <Bot className="h-3 w-3 text-primary" />
            </div>
            <div className="rounded-lg bg-neutral-800/70 px-3 py-2 text-xs text-neutral-500">
              <span className="animate-pulse">思考中...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-neutral-800 p-3">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="输入对话内容..."
            className="flex-1 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-neutral-200 placeholder:text-neutral-600 focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={handleSubmit}
            disabled={isProcessing || !input.trim()}
            className="rounded-md bg-primary/20 p-2 text-primary hover:bg-primary/30 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
