import { useConfigStore } from '../../useConfigStore'
import { Plus, ArrowRight } from 'lucide-react'

const categoryColors: Record<string, string> = {
  main: 'text-red-400 bg-red-500/10 border-red-500/20',
  side: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  ai_dynamic: 'text-neutral-400 bg-neutral-700/30 border-neutral-600/30',
}

export function NpcTaskList() {
  const quests = useConfigStore((s) => s.questDefinitions)
  const selectedId = useConfigStore((s) => s.selectedNpcId)
  const npcs = useConfigStore((s) => s.npcs)
  const selectQuest = useConfigStore((s) => s.selectQuest)
  const setActiveModule = useConfigStore((s) => s.setActiveModule)

  const npc = npcs.find((n) => n.id === selectedId)
  if (!npc) return <div className="flex h-full items-center justify-center text-xs text-neutral-600">—</div>

  const npcQuests = quests.filter((q) => q.involvedNpcs.some((n) => n.npcId === npc.id))

  const handleEdit = (questId: string) => {
    selectQuest(questId)
    setActiveModule('quest_editor')
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-neutral-800 px-4 py-3 flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-300">关联任务</span>
        <span className="text-[10px] text-neutral-500">({npcQuests.length})</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {npcQuests.length === 0 ? (
          <p className="text-[10px] text-neutral-600 px-1">暂无关联任务</p>
        ) : (
          npcQuests.map((quest) => {
            const role = quest.involvedNpcs.find((n) => n.npcId === npc.id)?.role ?? '—'
            const catStyle = categoryColors[quest.category] ?? categoryColors.ai_dynamic
            const catLabel = quest.category === 'main' ? '主线' : quest.category === 'side' ? '支线' : 'AI'
            return (
              <div key={quest.id} className="rounded-md border border-neutral-800 bg-neutral-900/50 p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium border ${catStyle}`}>
                    {catLabel}
                  </span>
                  <span className="text-[10px] text-neutral-500">角色: {role}</span>
                </div>
                <p className="text-xs text-neutral-200 mb-2">{quest.name}</p>
                <button
                  onClick={() => handleEdit(quest.id)}
                  className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80"
                >
                  进入编排 <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            )
          })
        )}
      </div>
      <div className="border-t border-neutral-800 p-3">
        <button className="flex w-full items-center justify-center gap-1.5 rounded border border-neutral-700 py-2 text-[10px] text-neutral-400 hover:bg-neutral-800/50">
          <Plus className="h-3 w-3" /> 新建任务
        </button>
      </div>
    </div>
  )
}
