import { useState, useEffect, useCallback, useRef } from 'react'
import { useConfigStore } from '../../useConfigStore'
import { ChatPanel, type Message } from './ChatPanel'
import { ResponseInspector } from './ResponseInspector'
import { NpcIdentityCard } from './NpcIdentityCard'
import { compileNpcIdentity } from '../../lib/npcIdentityCompiler'
import { RefreshCw } from 'lucide-react'

export function ConversationSandbox() {
  const npcs = useConfigStore((s) => s.npcs)
  const quests = useConfigStore((s) => s.questDefinitions)
  const selectedId = useConfigStore((s) => s.selectedNpcId)
  const selectNpc = useConfigStore((s) => s.selectNpc)
  const callLlm = useConfigStore((s) => s.callLlm)
  const isCalling = useConfigStore((s) => s.isLlmCalling)
  const updateSection = useConfigStore((s) => s.updateContextSection)

  const npc = npcs.find((n) => n.id === selectedId)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const identityRef = useRef<string>('')

  const reloadIdentity = useCallback(() => {
    if (!npc) return
    const compiled = compileNpcIdentity(npc, quests)
    identityRef.current = compiled
    updateSection('A', compiled)
    setMessages((prev) => [
      ...prev,
      {
        role: 'npc',
        content: `—— 人格画像已重新装载 ——\n\n${npc.name} 当前配置已更新。继续对话将使用最新设定。`,
        timestamp: Date.now(),
      },
    ])
  }, [npc, quests, updateSection])

  useEffect(() => {
    if (npc) {
      const compiled = compileNpcIdentity(npc, quests)
      identityRef.current = compiled
      updateSection('A', compiled)
      setMessages([{
        role: 'npc',
        content: `*${npc.name} 的人格画像已编译完成*\n\n性格: ${Object.entries(npc.traits).map(([k,v])=>`${k}=${v}`).join(', ')}\n风格: ${(npc.dialogueStyles??[]).map(s=>s.label).join(', ')||'无'}\n关系: ${(npc.relationships??[]).length} 条\n任务: ${quests.filter(q=>q.involvedNpcs.some(i=>i.npcId===npc.id)).length} 个\n\n—— 开始对话测试 ——`,
        timestamp: Date.now(),
      }])
    } else {
      identityRef.current = ''
    }
  }, [npc?.id])

  const handleSend = useCallback(async (text: string) => {
    if (!npc) return
    if (!identityRef.current) return

    setMessages((prev) => [...prev, { role: 'user', content: text, timestamp: Date.now() }])

    // 只更新当前状态（Section C），人格画像不变
    updateSection('C', `[当前交互]
你正与玩家面对面交谈。
玩家刚刚说: "${text}"

请根据你的人格画像自然回应。记住：你是 ${npc.name}，${npc.roleTags?.join('、') ?? '普通人'}，${npc.faction ? '属于' + npc.faction : '没有固定阵营'}。`)

    await callLlm()
    const resp = useConfigStore.getState().lastLlmResponse
    const reply = resp
      ? ((resp.params as Record<string, unknown>)?.message as string ?? resp.action as string ?? '……')
      : '(无响应)'

    setMessages((prev) => [...prev, { role: 'npc', content: reply, timestamp: Date.now() }])
  }, [npc, updateSection, callLlm])

  return (
    <div className="flex h-full">
      <div className="w-56 shrink-0 border-r border-neutral-800 flex flex-col">
        <div className="border-b border-neutral-800 px-4 py-3">
          <span className="text-xs font-medium text-neutral-300">测试 NPC</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
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
        <div className="border-t border-neutral-800 p-3 text-[9px] text-neutral-500 leading-relaxed">
          NPC 人格由其完整设定编译而成——性格数值、关系网络、对话风格、角色标签、任务背景均注入 Prompt。
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2">
          <span className="text-[10px] text-neutral-500">
            人格画像: {npc ? `${(npc.dialogueStyles??[]).length} 风格 · ${(npc.relationships??[]).length} 关系 · ${quests.filter(q=>q.involvedNpcs.some(i=>i.npcId===npc.id)).length} 任务` : '—'}
          </span>
          <button
            onClick={reloadIdentity}
            disabled={isCalling || !npc}
            className="flex items-center gap-1 rounded border border-neutral-700 px-2 py-1 text-[10px] text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200 disabled:opacity-50"
          >
            <RefreshCw className="h-3 w-3" />
            重新装载
          </button>
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
      </div>

      <div className="w-64 shrink-0 border-l border-neutral-800 overflow-y-auto">
        {npc ? <NpcIdentityCard npc={npc} /> : <ResponseInspector />}
      </div>
    </div>
  )
}
