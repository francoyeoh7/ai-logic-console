import { useConfigStore } from '../../useConfigStore'
import { QuestInfoPanel } from './QuestInfoPanel'
import { NodeList } from './NodeList'
import { AiSettingsPanel } from './AiSettingsPanel'
import { QuestPreview } from './QuestPreview'

export function QuestEditor() {
  const quests = useConfigStore((s) => s.questDefinitions)
  const selectedId = useConfigStore((s) => s.selectedQuestId)
  const quest = quests.find((q) => q.id === selectedId)

  if (!quest) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-neutral-500">
        请从 NPC 设定或任务网络图中选择一个任务
      </div>
    )
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <h2 className="text-sm font-semibold text-neutral-200">任务编排台 · {quest.name}</h2>
        <QuestInfoPanel quest={quest} />
        <NodeList quest={quest} />
        {quest.category === 'ai_dynamic' && quest.aiSettings && (
          <AiSettingsPanel quest={quest} />
        )}
      </div>
      <div className="w-72 shrink-0 border-l border-neutral-800 p-4 overflow-y-auto">
        <QuestPreview quest={quest} />
      </div>
    </div>
  )
}
