import { useConfigStore } from '../../useConfigStore'
import type { NpcRole } from '../../types'
import { Plus, Trash2 } from 'lucide-react'

const allRoles: { value: NpcRole; label: string }[] = [
  { value: 'merchant', label: '商人' },
  { value: 'quest_giver', label: '任务发布者' },
  { value: 'informant', label: '情报源' },
  { value: 'combat_ally', label: '战斗盟友' },
  { value: 'artisan', label: '工匠' },
  { value: 'official', label: '官员' },
]

export function NpcProfile() {
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

  const updateNpc = (id: string, partial: Partial<typeof npc>) => {
    // 通过 store 更新 NPC 非 prompt/traits 字段 (需要 store 方法支持)
    useConfigStore.setState((s) => ({
      npcs: s.npcs.map((n) => (n.id === id ? { ...n, ...partial } : n)),
    }))
  }

  const traitLabels: Record<string, string> = {
    greed: '贪婪度',
    patience: '耐心',
    aggression: '攻击性',
    charisma: '魅力',
    loyalty: '忠诚度',
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-neutral-200">{npc.name}</h2>
        <p className="text-[11px] text-neutral-500">ID: {npc.id}</p>
      </div>

      {/* Core Prompt */}
      <div className="mb-6">
        <label className="mb-2 block text-xs font-medium text-neutral-400">Core Prompt · 核心人设公理</label>
        <textarea
          value={npc.basePrompt}
          onChange={(e) => updatePrompt(npc.id, e.target.value)}
          rows={5}
          className="w-full resize-none rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2.5 font-mono text-xs leading-relaxed text-neutral-200 placeholder:text-neutral-600 focus:ring-1 focus:ring-primary"
          spellCheck={false}
        />
      </div>

      {/* Traits */}
      <div className="mb-6">
        <label className="mb-3 block text-xs font-medium text-neutral-400">数值化性格</label>
        <div className="space-y-3">
          {Object.entries(traitLabels).map(([trait, label]) => (
            <div key={trait}>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] text-neutral-400">{label}</span>
                <span className="text-[11px] font-mono text-neutral-300">{npc.traits[trait as keyof typeof npc.traits]}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={npc.traits[trait as keyof typeof npc.traits]}
                onChange={(e) => updateTraits(npc.id, { [trait]: Number(e.target.value) })}
                className="w-full"
              />
            </div>
          ))}
        </div>
      </div>

      {/* 角色标签 */}
      <div className="mb-5">
        <label className="mb-2 block text-xs font-medium text-neutral-400">角色类型</label>
        <div className="flex flex-wrap gap-1.5">
          {allRoles.map((role) => {
            const active = npc.roleTags?.includes(role.value)
            return (
              <button
                key={role.value}
                onClick={() => {
                  const tags = [...(npc.roleTags ?? [])]
                  updateNpc(npc.id, {
                    roleTags: active ? tags.filter((t) => t !== role.value) : [...tags, role.value],
                  })
                }}
                className={`rounded-full px-2.5 py-1 text-[10px] transition-colors ${
                  active
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'bg-neutral-800 text-neutral-400 border border-neutral-700 hover:border-neutral-600'
                }`}
              >
                {role.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* 阵营 + 区域 */}
      <div className="mb-5 grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-neutral-400">所属阵营</label>
          <input
            value={npc.faction ?? ''}
            onChange={(e) => updateNpc(npc.id, { faction: e.target.value })}
            className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-200 placeholder:text-neutral-600 focus:ring-1 focus:ring-primary"
            placeholder="输入阵营名"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-neutral-400">关联区域</label>
          <input
            value={npc.region ?? ''}
            onChange={(e updateNpc(npc.id, { region: e.target.value })}
            className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-200 placeholder:text-neutral-600 focus:ring-1 focus:ring-primary"
            placeholder="输入区域名"
          />
        </div>
      </div>

      {/* 日常节律 */}
      <div>
        <label className="mb-2 block text-xs font-medium text-neutral-400">日常节律</label>
        <div className="space-y-1.5">
          {(npc.schedule ?? []).map((s, i) => (
            <div key={i} className="flex items-center gap-2 rounded border border-neutral-800 bg-neutral-900/50 px-3 py-1.5">
              <span className="text-[10px] font-mono text-neutral-500">
                {String(s.startHour).padStart(2, '0')}:00 — {String(s.endHour).padStart(2, '0')}:00
              </span>
              <span className="flex-1 text-[10px] text-neutral-300">{s.activity}</span>
              <button
                onClick={() => {
                  const schedule = [...(npc.schedule ?? [])]
                  schedule.splice(i, 1)
                  updateNpc(npc.id, { schedule })
                }}
                className="p-0.5 text-neutral-600 hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() => {
            const schedule = [...(npc.schedule ?? []), { startHour: 0, endHour: 24, activity: '新活动' }]
            updateNpc(npc.id, { schedule })
          }}
          className="mt-1.5 flex items-center gap-1 text-[10px] text-neutral-500 hover:text-neutral-300"
        >
          <Plus className="h-3 w-3" /> 添加时段
        </button>
      </div>
    </div>
  )
}
