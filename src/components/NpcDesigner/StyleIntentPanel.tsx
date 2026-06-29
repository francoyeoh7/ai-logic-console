import { useState } from 'react'
import { useConfigStore } from '../../useConfigStore'
import type { DialogueStyle, IntentMapping } from '../../types'
import { generateDialogueStylesFromTraits } from '../../lib/styleGenerator'
import { Sparkles, MessageSquare, RefreshCw } from 'lucide-react'

export function StyleIntentPanel() {
  const [tab, setTab] = useState<'style' | 'intent'>('style')
  const npcs = useConfigStore((s) => s.npcs)
  const selectedId = useConfigStore((s) => s.selectedNpcId)
  const npc = npcs.find((n) => n.id === selectedId)

  if (!npc) return <div className="flex h-full items-center justify-center text-xs text-neutral-600">—</div>

  const updateNpc = (partial: Partial<typeof npc>) => {
    useConfigStore.setState((s) => ({
      npcs: s.npcs.map((n) => (n.id === npc.id ? { ...n, ...partial } : n)),
    }))
  }

  const handleRegenerateStyles = () => {
    updateNpc({ dialogueStyles: generateDialogueStylesFromTraits(npc.traits) })
  }

  const updateStyle = (index: number, partial: Partial<DialogueStyle>) => {
    const styles = [...(npc.dialogueStyles ?? [])]
    styles[index] = { ...styles[index], ...partial }
    updateNpc({ dialogueStyles: styles })
  }

  const updateIntent = (index: number, partial: Partial<IntentMapping>) => {
    const intents = [...(npc.intentMappings ?? [])]
    intents[index] = { ...intents[index], ...partial }
    updateNpc({ intentMappings: intents })
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-neutral-800 flex">
        <button
          onClick={() => setTab('style')}
          className={`flex-1 py-2 text-[10px] font-medium flex items-center justify-center gap-1.5 ${
            tab === 'style' ? 'text-primary border-b border-primary bg-primary/5' : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <Sparkles className="h-3 w-3" /> 对话风格
        </button>
        <button
          onClick={() => setTab('intent')}
          className={`flex-1 py-2 text-[10px] font-medium flex items-center justify-center gap-1.5 ${
            tab === 'intent' ? 'text-primary border-b border-primary bg-primary/5' : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <MessageSquare className="h-3 w-3" /> 意图映射
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {tab === 'style' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-neutral-500">根据性格值自动生成</span>
              <button
                onClick={handleRegenerateStyles}
                className="flex items-center gap-1 rounded border border-neutral-700 px-1.5 py-0.5 text-[9px] text-neutral-400 hover:bg-neutral-800/50"
              >
                <RefreshCw className="h-2.5 w-2.5" /> 重新生成
              </button>
            </div>

            {(npc.dialogueStyles ?? []).length === 0 ? (
              <p className="text-[10px] text-neutral-600 py-2">无对话风格标签</p>
            ) : (
              (npc.dialogueStyles ?? []).map((style, i) => (
                <div key={i} className="rounded-md border border-neutral-800 bg-neutral-900/50 p-2.5 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <input
                      value={style.label}
                      onChange={(e) => updateStyle(i, { label: e.target.value })}
                      className="flex-1 bg-transparent text-xs font-medium text-neutral-200 outline-none"
                    />
                    <span className="text-[9px] text-neutral-500">{style.description}</span>
                  </div>
                  <textarea
                    value={style.promptHint}
                    onChange={(e) => updateStyle(i, { promptHint: e.target.value })}
                    rows={2}
                    className="w-full resize-none rounded border border-neutral-700 bg-neutral-800 px-2 py-1 font-mono text-[9px] leading-relaxed text-neutral-400 placeholder:text-neutral-600 focus:ring-1 focus:ring-primary"
                  />
                  <p className="text-[8px] text-neutral-600">Prompt 注入提示 · 此文本将拼入 Section A</p>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'intent' && (
          <div className="space-y-2">
            <p className="text-[10px] text-neutral-500">事件 → 意图权重</p>
            {(npc.intentMappings ?? []).map((mapping, i) => (
              <div key={i} className="flex items-center gap-2 rounded border border-neutral-800 bg-neutral-900/50 px-2 py-1.5">
                <span className="w-14 text-[10px] text-neutral-300 shrink-0">{mapping.intent}</span>
                <input
                  type="range"
                  min={-1}
                  max={1}
                  step={0.05}
                  value={mapping.weight}
                  onChange={(e) => updateIntent(i, { weight: Number(e.target.value) })}
                  className="flex-1"
                />
                <input
                  type="number"
                  min={-1}
                  max={1}
                  step={0.05}
                  value={mapping.weight}
                  onChange={(e) => updateIntent(i, { weight: Math.max(-1, Math.min(1, Number(e.target.value) || 0)) })}
                  className="w-14 rounded border border-neutral-700 bg-neutral-800 px-1 py-0.5 text-[9px] font-mono text-neutral-300 text-center"
                />
                <span className="text-[8px] text-neutral-500 w-28 text-right">{mapping.description}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
