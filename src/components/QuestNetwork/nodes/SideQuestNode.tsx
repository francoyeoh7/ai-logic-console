import { memo } from 'react'
import { Handle, Position } from 'reactflow'

function SideQuestNodeImpl({ data }: { data: { label: string; summary?: string } }) {
  return (
    <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 shadow-lg shadow-emerald-500/10 min-w-[150px]">
      <Handle type="target" position={Position.Top} className="!bg-emerald-400 !w-2.5 !h-2.5 !border-2 !border-neutral-900" />
      <Handle type="source" position={Position.Bottom} className="!bg-emerald-400 !w-2.5 !h-2.5 !border-2 !border-neutral-900" />
      <p className="text-xs font-semibold text-emerald-200">{data.label}</p>
      {data.summary && <p className="mt-1 text-[9px] text-neutral-500">{data.summary}</p>}
    </div>
  )
}
export const SideQuestNode = memo(SideQuestNodeImpl)
