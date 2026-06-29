import { useConfigStore } from '../../useConfigStore'
import type { NpcTraits } from '../../types'

const traitLabels: Record<keyof NpcTraits, string> = {
  greed: '贪婪度',
  patience: '耐心',
  aggression: '攻击性',
  charisma: '魅力',
  loyalty: '忠诚度',
}

export function BasePersona() {
  const npcs = useConfigStore((s) => s.npcs)
  const selectedId = useConfigStore((s) => s.selectedNpcId)
  const updatePrompt = useConfigStore((s) => s.updateNpcPrompt)
  const updateTraits = useConfigStore((s) => s.updateNpcTraits)

  const npc = npcs.find((n) => n.id === selectedId)
  if (!npc) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-neutral-500">
        请从左侧列表选择一个 NPC
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-neutral-200">{npc.name}</h2>
        <p className="text-[11px] text-neutral-500">ID: {npc.id}</p>
      </div>

      {/* Core Prompt */}
      <div className="mb-6">
        <label className="mb-2 block text-xs font-medium text-neutral-400">
          Core Prompt · 核心人设公理
        </label>
        <textarea
          value={npc.basePrompt}
          onChange={(e) => updatePrompt(npc.id, e.target.value)}
          rows={6}
          className="w-full resize-none rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2.5 font-mono text-xs leading-relaxed text-neutral-200 placeholder:text-neutral-600 focus:ring-1 focus:ring-primary"
          spellCheck={false}
        />
        <p className="mt-1 text-[10px] text-neutral-600">
          支持 Markdown 格式 · 此 Prompt 为 LLM 系统级注入，不可被对话覆盖
        </p>
      </div>

      {/* Traits */}
      <div>
        <label className="mb-3 block text-xs font-medium text-neutral-400">
          数值化性格 · Personality Vectors
        </label>
        <div className="space-y-4">
          {(Object.keys(traitLabels) as (keyof NpcTraits)[]).map((trait) => (
            <div key={trait}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[11px] text-neutral-400">{traitLabels[trait]}</span>
                <span className="text-[11px] font-mono text-neutral-300">{npc.traits[trait]}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={npc.traits[trait]}
                onChange={(e) => updateTraits(npc.id, { [trait]: Number(e.target.value) })}
                className="w-full"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
