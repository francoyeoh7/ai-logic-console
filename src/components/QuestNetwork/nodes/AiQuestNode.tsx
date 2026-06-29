import { memo } from 'react'
import { Handle, Position } from 'reactflow'

function AiQuestNodeImpl({ data }: { data: { label: string; triggerChance?: number } }) {
  return (
    <div className="rounded-lg border border-neutral-600/50 bg-neutral-800/50 px-4 py-3 min-w-[150px]">
      <Handle type="target" position={Position.Top} className="!bg-neutral-400 !w-2.5 !h-2.5 !border-2 !border-neutral-900" />
      <Handle type="source" position={Position.Bottom} className="!bg-neutral-400 !w-2.5 !h-2.5 !border-2 !border-neutral-900" />
      <p className="text-xs font-semibold text-neutral-300">{data.label}</p>
      {data.triggerChance != null && (
        <p className="mt-1 text-[9px] text-neutral-500">触发概率: {data.triggerChance}%</p>
      )}
    </div>
  )
}
export const AiQuestNode = memo(AiQuestNodeImpl)
