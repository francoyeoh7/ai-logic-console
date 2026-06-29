import { memo } from 'react'
import { Handle, Position } from 'reactflow'

const statusColors: Record<string, string> = {
  completed: 'border-green-500/30 bg-green-500/5',
  active: 'border-red-500/40 bg-red-500/10',
  locked: 'border-neutral-700 bg-neutral-900/50 opacity-50',
}

function MainQuestNodeImpl({ data }: { data: { label: string; status: string; summary?: string } }) {
  return (
    <div className={`rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm min-w-[160px] ${statusColors[data.status] ?? statusColors.active}`}>
      <Handle type="target" position={Position.Top} className="!bg-red-400 !w-2.5 !h-2.5 !border-2 !border-neutral-900" />
      <Handle type="source" position={Position.Bottom} className="!bg-red-400 !w-2.5 !h-2.5 !border-2 !border-neutral-900" />
      <p className="text-xs font-semibold text-red-200">{data.label}</p>
      {data.summary && <p className="mt-1 text-[9px] text-neutral-500">{data.summary}</p>}
      <span className="mt-1.5 inline-block rounded-full bg-red-500/20 px-1.5 py-0.5 text-[8px] text-red-400">{data.status}</span>
    </div>
  )
}
export const MainQuestNode = memo(MainQuestNodeImpl)
