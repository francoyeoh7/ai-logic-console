import { useState, useEffect, useCallback } from 'react'
import { useConfigStore } from '../../useConfigStore'
import { ChatPanel, type Message } from './ChatPanel'
import { ResponseInspector } from './ResponseInspector'

export function ConversationSandbox() {
  const npcs = useConfigStore((s) => s.npcs)
  const selectedId = useConfigStore((s) => s.selectedNpcId)
  const selectNpc = useConfigStore((s) => s.selectNpc)
  const callLlm = useConfigStore((s) => s.callLlm)
  const isCalling = useConfigStore((s) => s.isLlmCalling)
  const updateSection = useConfigStore((s) => s.updateContextSection)

  const npc = npcs.find((n) => n.id === selectedId)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')

  useEffect(() => {
    if (npc) {
      setMessages([{ role: 'npc', content: `*${npc.name} 抬起头，似乎在等你说什么*`, timestamp: Date.now() }])
    }
  }, [npc?.id])

  const handleSend = useCallback(async (text: string) => {
    if (!npc) return

    setMessages((prev) => [...prev, { role: 'user', content: text, timestamp: Date.now() }])

    updateSection('A', npc.basePrompt)
    updateSection('C', `[CURRENT STATE]
NPC: ${npc.name} (id:${npc.id})
Perceived: player (distance:2m, speaking:true)
Recent player message: "${text}"

You MUST output a JSON object with these fields:
- action: must be one of [SPEAK, OBSERVE, DO_NOTHING]
- params: object with action-specific parameters. For SPEAK: {"target":"player","message":"你的回复内容"}
- emotion: one of [neutral,happy,sad,angry,fearful,surprised,disgusted]
- priority: float 0.0-1.0 (urgency)
- reasoning: short reason string

Example: {"action":"SPEAK","params":{"target":"player","message":"哦，是你啊。今天想打听什么？"},"emotion":"neutral","priority":0.3,"reasoning":"greeting_player"}`)

    await callLlm()
    const resp = useConfigStore.getState().lastLlmResponse
    const reply = resp
      ? ((resp.params as Record<string, unknown>)?.message as string ?? resp.action as string ?? '……')
      : '(无响应)'

    setMessages((prev) => [...prev, { role: 'npc', content: reply, timestamp: Date.now() }])
  }, [npc, updateSection, callLlm])

  return (
    <div className="flex h-full">
      <div className="w-56 shrink-0 border-r border-neutral-800">
        <div className="border-b border-neutral-800 px-4 py-3">
          <span className="text-xs font-medium text-neutral-300">测试 NPC</span>
        </div>
        <div className="p-2 space-y-0.5">
          {npcs.map((n) => (
            <button
              key={n.id}
              onClick={() => selectNpc(n.id)}
              className={`w-full rounded px-3 py-2 text-left text-xs transition-all ${
                selectedId === n.id
                  ? 'bg-primary/10 border border-primary/20 text-primary'
                  : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200'
              }`}
            >
              {n.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1">
        <ChatPanel
          npcName={npc?.name ?? '选择 NPC'}
          messages={messages}
          onSend={handleSend}
          isProcessing={isCalling}
          input={input}
          setInput={setInput}
        />
      </div>

      <div className="w-72 shrink-0 border-l border-neutral-800">
        <ResponseInspector />
      </div>
    </div>
  )
}
