import { useConfigStore } from '../../useConfigStore'
import type { NpcRelationship } from '../../types'
import { Plus, Trash2 } from 'lucide-react'

const relationLabels: { key: keyof Pick<NpcRelationship, 'trust' | 'affection' | 'fear'>; label: string; color: string }[] = [
  { key: 'trust', label: '信任', color: 'bg-blue-500' },
  { key: 'affection', label: '好感', color: 'bg-emerald-500' },
  { key: 'fear', label: '敬畏', color: 'bg-amber-500' },
]

export function RelationshipPanel() {
  const selectedId = useConfigStore((s) => s.selectedNpcId)
  const npcs = useConfigStore((s) => s.npcs)

  const npc = npcs.find((n) => n.id === selectedId)
  if (!npc) return <div className="flex h-full items-center justify-center text-xs text-neutral-600">—</div>

  const updateNpc = (partial: Partial<typeof npc>) => {
    useConfigStore.setState((s) => ({
      npcs: s.npcs.map((n) => (n.id === npc.id ? { ...n, ...partial } : n)),
    }))
  }

  const updateRelationship = (index: number, partial: Partial<NpcRelationship>) => {
    const rels = [...(npc.relationships ?? [])]
    rels[index] = { ...rels[index], ...partial, lastUpdated: Date.now() }
    updateNpc({ relationships: rels })
  }

  const removeRelationship = (index: number) => {
    updateNpc({ relationships: (npc.relationships ?? []).filter((_, i) => i !== index) })
  }

  const addRelationship = () => {
    updateNpc({
      relationships: [...(npc.relationships ?? []), {
        targetId: 'new_target',
        targetType: 'npc',
        trust: 50,
        affection: 50,
        fear: 20,
        tags: [],
        lastUpdated: Date.now(),
      }],
    })
  }

  const getTargetName = (targetId: string, targetType: string) => {
    if (targetType === 'player') return '玩家'
    const found = npcs.find((n) => n.id === targetId)
    return found?.name ?? targetId
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-neutral-800 px-3 py-2.5 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-medium text-neutral-300">关系网络</span>
          <span className="ml-1.5 text-[9px] text-neutral-500">({(npc.relationships ?? []).length})</span>
        </div>
        <button onClick={addRelationship} className="flex items-center gap-1 rounded border border-neutral-700 px-1.5 py-0.5 text-[9px] text-neutral-400 hover:bg-neutral-800/50">
          <Plus className="h-2.5 w-2.5" /> 添加
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {(npc.relationships ?? []).length === 0 ? (
          <p className="text-[10px] text-neutral-600 px-1 py-3 text-center">暂无关系数据</p>
        ) : (
          (npc.relationships ?? []).map((rel, i) => (
            <div key={i} className="rounded-md border border-neutral-800 bg-neutral-900/50 p-2.5 space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <input
                    value={rel.targetId}
                    onChange={(e) => updateRelationship(i, { targetId: e.target.value })}
                    className="w-full bg-transparent text-[11px] font-medium text-neutral-200 outline-none"
                  />
                  <div className="flex items-center gap-2 mt-0.5">
                    <select
                      value={rel.targetType}
                      onChange={(e) => updateRelationship(i, { targetType: e.target.value as typeof rel.targetType })}
                      className="rounded border border-neutral-700 bg-neutral-800 px-1 py-0.5 text-[9px] text-neutral-400"
                    >
                      <option value="player">玩家</option>
                      <option value="npc">NPC</option>
                      <option value="faction">阵营</option>
                    </select>
                    <span className="text-[9px] text-neutral-500">{getTargetName(rel.targetId, rel.targetType)}</span>
                    {rel.tags.length > 0 && (
                      <div className="flex gap-1">
                        {rel.tags.map((t) => (
                          <span key={t} className="rounded-full bg-neutral-800 px-1.5 py-0.5 text-[8px] text-neutral-400">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <button onClick={() => removeRelationship(i)} className="p-0.5 text-neutral-600 hover:text-destructive">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>

              {relationLabels.map(({ key, label, color }) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="w-8 text-[9px] text-neutral-500 shrink-0">{label}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-neutral-800">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${rel[key]}%` }} />
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={rel[key]}
                    onChange={(e) => updateRelationship(i, { [key]: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })}
                    className="w-10 rounded border border-neutral-700 bg-neutral-800 px-1 py-0.5 text-[9px] font-mono text-neutral-300 text-center"
                  />
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
