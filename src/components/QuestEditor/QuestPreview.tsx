import type { QuestDefinition } from '../../types'

interface Props {
  quest: QuestDefinition
}

export function QuestPreview({ quest }: Props) {
  const allRewards = quest.nodes.flatMap((n) => n.rewards)
  const goldTotal = allRewards.filter((r) => r.type === 'gold').reduce((s, r) => s + Number(r.value) || 0, 0)
  const expTotal = allRewards.filter((r) => r.type === 'exp').reduce((s, r) => s + Number(r.value) || 0, 0)
  const reputationRewards = allRewards.filter((r) => r.type === 'reputation')
  const itemRewards = allRewards.filter((r) => r.type === 'item')

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-3">
        <h4 className="mb-2 text-[10px] font-medium text-neutral-400">节点流程预览</h4>
        <div className="space-y-1.5">
          {quest.nodes.length === 0 ? (
            <p className="text-[10px] text-neutral-600">无节点</p>
          ) : (
            quest.nodes.map((n) => (
              <div key={n.id} className="flex items-center gap-2 text-[10px]">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-neutral-800 text-[8px] font-mono text-neutral-500">
                  {n.order + 1}
                </span>
                <span className="flex-1 text-neutral-300">{n.name}</span>
                <span className="text-neutral-500">{n.type}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-3">
        <h4 className="mb-2 text-[10px] font-medium text-neutral-400">奖励汇总</h4>
        <div className="text-[10px] space-y-1">
          <div className="flex justify-between"><span className="text-neutral-500">金币</span><span className="font-mono text-yellow-400">{goldTotal}</span></div>
          <div className="flex justify-between"><span className="text-neutral-500">经验</span><span className="font-mono text-blue-400">{expTotal}</span></div>
          {reputationRewards.map((r, i) => (
            <div key={i} className="flex justify-between"><span className="text-neutral-500">声望</span><span className="text-cyan-400">+{r.value} {r.detail}</span></div>
          ))}
          {itemRewards.map((r, i) => (
            <div key={i} className="flex justify-between"><span className="text-neutral-500">物品</span><span className="text-purple-400">{r.detail ?? r.value}</span></div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-3">
        <h4 className="mb-2 text-[10px] font-medium text-neutral-400">关联NPC</h4>
        <div className="space-y-1">
          {quest.involvedNpcs.map((inv) => (
            <div key={inv.npcId} className="flex justify-between text-[10px]">
              <span className="text-neutral-300">{inv.npcId}</span>
              <span className="text-neutral-500">{inv.role}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
