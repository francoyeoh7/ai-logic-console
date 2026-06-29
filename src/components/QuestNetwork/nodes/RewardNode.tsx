import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import { Gift } from 'lucide-react'

function RewardNodeImpl({ data }: { data: { label: string; summary?: string } }) {
  return (
    <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 px-3 py-2.5 shadow-lg shadow-purple-500/10 min-w-[120px]">
      <Handle type="target" position={Position.Top} className="!bg-purple-400 !w-2.5 !h-2.5 !border-2 !border-neutral-900" />
      <div className="flex items-center gap-1.5">
        <Gift className="h-3.5 w-3.5 text-purple-400" />
        <p className="text-xs font-semibold text-purple-200">{data.label}</p>
      </div>
      {data.summary && <p className="mt-0.5 text-[9px] text-neutral-500">{data.summary}</p>}
    </div>
  )
}
export const RewardNode = memo(RewardNodeImpl)
