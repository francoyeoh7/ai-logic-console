import { memo } from 'react'
import { Handle, Position } from 'reactflow'

function NpcNodeImpl({ data }: { data: { label: string; roleTags?: string[] } }) {
  return (
    <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-3 py-2.5 shadow-lg shadow-yellow-500/5 min-w-[130px]">
      <Handle type="source" position={Position.Right} className="!bg-yellow-400 !w-2.5 !h-2.5 !border-2 !border-neutral-900" />
      <Handle type="target" position={Position.Left} className="!bg-yellow-400 !w-2.5 !h-2.5 !border-2 !border-neutral-900" />
      <p className="text-xs font-semibold text-yellow-200">{data.label}</p>
      {data.roleTags && data.roleTags.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-0.5">
          {data.roleTags.slice(0, 2).map((t) => (
            <span key={t} className="rounded-full bg-yellow-500/20 px-1 text-[8px] text-yellow-400">{t}</span>
          ))}
        </div>
      )}
    </div>
  )
}
export const NpcNode = memo(NpcNodeImpl)
