import { useConfigStore } from '../../useConfigStore'
import type { QuestDefinition } from '../../types'

interface Props {
  quest: QuestDefinition
}

export function QuestInfoPanel({ quest }: Props) {
  const updateQuest = useConfigStore((s) => s.updateQuest)
  const npcs = useConfigStore((s) => s.npcs)

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
      <h3 className="mb-3 text-xs font-semibold text-neutral-300">基本信息</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-[10px] text-neutral-500">任务名称</label>
          <input
            value={quest.name}
            onChange={(e) => updateQuest(quest.id, { name: e.target.value })}
            className="w-full rounded border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-xs text-neutral-200"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] text-neutral-500">任务ID</label>
          <input value={quest.id} readOnly className="w-full rounded border border-neutral-700 bg-neutral-800/50 px-2 py-1.5 text-xs text-neutral-500 font-mono cursor-not-allowed" />
        </div>
        <div>
          <label className="mb-1 block text-[10px] text-neutral-500">类别</label>
          <select
            value={quest.category}
            onChange={(e) => updateQuest(quest.id, { category: e.target.value as typeof quest.category })}
            className="w-full rounded border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-xs text-neutral-200"
          >
            <option value="main">主线</option>
            <option value="side">支线</option>
            <option value="ai_dynamic">AI 动态</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] text-neutral-500">状态</label>
          <select
            value={quest.status}
            onChange={(e) => updateQuest(quest.id, { status: e.target.value as typeof quest.status })}
            className="w-full rounded border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-xs text-neutral-200"
          >
            <option value="draft">草稿</option>
            <option value="active">进行中</option>
            <option value="completed">已完成</option>
            <option value="locked">锁定</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] text-neutral-500">最低等级</label>
          <input type="number" value={quest.minLevel} onChange={(e) => updateQuest(quest.id, { minLevel: Number(e.target.value) })} className="w-full rounded border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-xs text-neutral-200" />
        </div>
        <div>
          <label className="mb-1 block text-[10px] text-neutral-500">最高等级</label>
          <input type="number" value={quest.maxLevel} onChange={(e) => updateQuest(quest.id, { maxLevel: Number(e.target.value) })} className="w-full rounded border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-xs text-neutral-200" />
        </div>
      </div>
      <div className="mt-3">
        <label className="mb-1 block text-[10px] text-neutral-500">参与 NPC</label>
        <div className="flex flex-wrap gap-1">
          {quest.involvedNpcs.map((inv) => {
            const npc = npcs.find((n) => n.id === inv.npcId)
            return (
              <span key={inv.npcId} className="rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] text-neutral-300">
                {npc?.name ?? inv.npcId} ({inv.role})
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}
