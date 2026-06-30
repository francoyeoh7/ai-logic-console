import { useConfigStore } from '../../useConfigStore'
import { Plus, ArrowRight } from 'lucide-react'
import { zh, en } from '../../lib/i18n'

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
  const locale = useConfigStore((s) => s.locale)
  const t = locale === 'zh' ? zh.npcDesigner : en.npcDesigner

  const npc = npcs.find((n) => n.id === selectedId)
  if (!npc) return <div className="flex h-full items-center justify-center text-xs text-neutral-600">—</div>

  const npcQuests = quests.filter((q) => q.involvedNpcs.some((n) => n.npcId === npc.id))

  const handleEdit = (questId: string) => {
    selectQuest(questId)
    setActiveModule('quest_editor')
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-neutral-800/50 px-3 py-2.5 flex items-center justify-between">
        <span className="text-[11px] font-medium text-neutral-300">{t.tasks}</span>
        <span className="text-[9px] text-neutral-600">({npcQuests.length})</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {npcQuests.length === 0 ? (
          <p className="text-[10px] text-neutral-600 px-1 py-2">{t.noTasks}</p>
        ) : (
          npcQuests.map((quest) => {
            const role = quest.involvedNpcs.find((n) => n.npcId === npc.id)?.role ?? '—'
            const catStyle = categoryColors[quest.category] ?? categoryColors.ai_dynamic
            const catLabel = quest.category === 'main' ? t.tasks?.replace('关联任务', '主线') : quest.category === 'side' ? t.tasks?.replace('关联任务', '支线') : 'AI'
            return (
              <div key={quest.id} className="rounded-md border border-neutral-800/50 bg-neutral-900/30 p-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-medium border ${catStyle}`}>
                    {quest.category === 'main' ? (locale === 'zh' ? '主线' : 'Main') : quest.category === 'side' ? (locale === 'zh' ? '支线' : 'Side') : 'AI'}
                  </span>
                  <span className="text-[9px] text-neutral-500">{t.tasks}: {role}</span>
                </div>
                <p className="text-[10px] text-neutral-200 mb-1.5">{quest.name}</p>
                <button
                  onClick={() => handleEdit(quest.id)}
                  className="flex items-center gap-1 text-[9px] text-primary/80 hover:text-primary"
                >
                  {t.enterEditor} <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            )
          })
        )}
      </div>
      <div className="border-t border-neutral-800/50 p-2">
        <button className="flex w-full items-center justify-center gap-1.5 rounded border border-neutral-800 py-1.5 text-[10px] text-neutral-500 hover:bg-neutral-800/30">
          <Plus className="h-3 w-3" /> {t.newTask}
        </button>
      </div>
    </div>
  )
}
