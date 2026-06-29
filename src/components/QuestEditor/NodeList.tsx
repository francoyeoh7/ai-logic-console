import { useConfigStore } from '../../useConfigStore'
import type { QuestDefinition } from '../../types'
import { Edit3, Trash2, Plus, GripVertical } from 'lucide-react'

const nodeTypeLabels: Record<string, string> = {
  dialogue: '对话',
  combat: '战斗',
  collect: '收集',
  escort: '护卫',
  explore: '探索',
  deliver: '递送',
  trigger: '触发',
}

interface Props {
  quest: QuestDefinition
}

export function NodeList({ quest }: Props) {
  const addNode = useConfigStore((s) => s.addQuestNode)
  const updateNode = useConfigStore((s) => s.updateQuestNode)
  const removeNode = useConfigStore((s) => s.removeQuestNode)

  const handleAdd = () => {
    addNode(quest.id, {
      id: `n_${Date.now()}`,
      questId: quest.id,
      name: '新节点',
      type: 'dialogue',
      order: quest.nodes.length,
      completionCondition: 'dialogue:complete',
      isOptional: false,
      rewards: [],
    })
  }

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-neutral-300">任务节点 ({quest.nodes.length})</h3>
        <button onClick={handleAdd} className="flex items-center gap-1 rounded border border-primary/30 px-2 py-1 text-[10px] text-primary hover:bg-primary/10">
          <Plus className="h-3 w-3" /> 添加节点
        </button>
      </div>
      <div className="space-y-2">
        {quest.nodes.length === 0 && (
          <p className="text-[10px] text-neutral-600 py-3 text-center">暂无节点，点击上方添加</p>
        )}
        {quest.nodes.map((node) => (
          <div key={node.id} className="flex items-start gap-2 rounded border border-neutral-800 bg-neutral-900 p-3">
            <GripVertical className="h-4 w-4 shrink-0 mt-0.5 text-neutral-600" />
            <div className="flex-1 min-w-0">
              <input
                value={node.name}
                onChange={(e) => updateNode(quest.id, node.id, { name: e.target.value })}
                className="w-full bg-transparent text-xs font-medium text-neutral-200 outline-none"
              />
              <div className="mt-1 flex items-center gap-2 text-[10px] text-neutral-500">
                <span className="font-mono text-neutral-400">#{node.order + 1}</span>
                <select
                  value={node.type}
                  onChange={(e) => updateNode(quest.id, node.id, { type: e.target.value as typeof node.type })}
                  className="rounded border border-neutral-700 bg-neutral-800 px-1.5 py-0.5 text-[10px] text-neutral-300"
                >
                  {Object.entries(nodeTypeLabels).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                {node.triggerNpcId && <span className="text-cyan-400">NPC: {node.triggerNpcId}</span>}
              </div>
            </div>
            <button onClick={() => removeNode(quest.id, node.id)} className="p-1 text-neutral-600 hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
