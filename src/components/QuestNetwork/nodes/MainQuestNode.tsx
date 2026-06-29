import { memo } from 'react'
import { Handle, Position } from 'reactflow'

function MainQuestNodeImpl({ data }: { data: { label: string; summary?: string; prerequisite?: string } }) {
  return (
    <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 shadow-lg shadow-red-500/10 backdrop-blur-sm min-w-[160px]">
      <Handle type="target" position={Position.Top} className="!bg-red-400 !w-2.5 !h-2.5 !border-2 !border-neutral-900" />
      <Handle type="source" position={Position.Bottom} className="!bg-red-400 !w-2.5 !h-2.5 !border-2 !border-neutral-900" />
      <p className="text-xs font-semibold text-red-200">{data.label}</p>
      {data.summary && <p className="mt-1 text-[9px] text-neutral-500">{data.summary}</p>}
      {data.prerequisite && <p className="mt-1 text-[8px] text-neutral-600">前置: {data.prerequisite}</p>}
    </div>
  )
}
export const MainQuestNode = memo(MainQuestNodeImpl)
