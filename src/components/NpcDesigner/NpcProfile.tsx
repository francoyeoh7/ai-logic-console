import { useConfigStore } from '../../useConfigStore'
import type { NpcRole } from '../../types'
import { Plus, Trash2 } from 'lucide-react'
import { zh, en } from '../../lib/i18n'

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
  const locale = useConfigStore((s) => s.locale)
  const t = locale === 'zh' ? zh.npcDesigner : en.npcDesigner
  const commonT = locale === 'zh' ? zh.common : en.common

  const npc = npcs.find((n) => n.id === selectedId)
  if (!npc) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-neutral-500">
        {commonT.selectNpcFirst}
      </div>
    )
  }

  const updateNpc = (id: string, partial: Partial<typeof npc>) => {
    useConfigStore.setState((s) => ({
      npcs: s.npcs.map((n) => (n.id === id ? { ...n, ...partial } : n)),
    }))
  }

  const traitLabels: Record<string, string> = {
    greed: t.greed, patience: t.patience, aggression: t.aggression, charisma: t.charisma, loyalty: t.loyalty,
  }

  return (
    <div className="h-full overflow-y-auto px-5 py-4">
      <div className="mb-4">
        <h2 className="text-sm font-medium text-neutral-200">{npc.name}</h2>
        <p className="text-[11px] text-neutral-500">ID: {npc.id}</p>
      </div>

      <div className="mb-5">
        <label className="mb-2 block text-[11px] font-medium text-neutral-400">{t.corePrompt}</label>
        <textarea
          value={npc.basePrompt}
          onChange={(e) => updatePrompt(npc.id, e.target.value)}
          rows={5}
          className="w-full resize-none rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2.5 font-mono text-[11px] leading-relaxed text-neutral-200 placeholder:text-neutral-600 focus:ring-1 focus:ring-primary/30"
          spellCheck={false}
        />
      </div>

      <div className="mb-5">
        <label className="mb-2 block text-[11px] font-medium text-neutral-400">{t.traits}</label>
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

      <div className="mb-5">
        <label className="mb-2 block text-[11px] font-medium text-neutral-400">{t.roleType}</label>
        <div className="flex flex-wrap gap-1.5">
          {allRoles.map((role) => {
            const active = npc.roleTags?.includes(role.value)
            return (
              <button
                key={role.value}
                onClick={() => {
                  const tags = [...(npc.roleTags ?? [])]
                  updateNpc(npc.id, {
                    roleTags: active ? tags.filter((r) => r !== role.value) : [...tags, role.value],
                  })
                }}
                className={`rounded-full px-2.5 py-1 text-[10px] transition-colors ${
                  active
                    ? 'bg-primary/15 text-primary border border-primary/20'
                    : 'bg-neutral-800 text-neutral-400 border border-neutral-700 hover:border-neutral-600'
                }`}
              >
                {role.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-[11px] font-medium text-neutral-400">{t.Faction}</label>
          <input
            value={npc.faction ?? ''}
            onChange={(e) => updateNpc(npc.id, { faction: e.target.value })}
            className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-200 placeholder:text-neutral-600 focus:ring-1 focus:ring-primary/30"
            placeholder=""
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-medium text-neutral-400">{t.region}</label>
          <input
            value={npc.region ?? ''}
            onChange={(e) => updateNpc(npc.id, { region: e.target.value })}
            className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-200 placeholder:text-neutral-600 focus:ring-1 focus:ring-primary/30"
            placeholder=""
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-[11px] font-medium text-neutral-400">{t.schedule}</label>
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
          ))}
        </div>
        <button
          onClick={() => {
            const schedule = [...(npc.schedule ?? []), { startHour: 0, endHour: 24, activity: t.addSchedule }]
            updateNpc(npc.id, { schedule })
          }}
          className="mt-1.5 flex items-center gap-1 text-[10px] text-neutral-500 hover:text-neutral-300"
        >
          <Plus className="h-3 w-3" /> {t.addSchedule}
        </button>
      </div>
    </div>
  )
}
