import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { Box } from 'lucide-react'

function SubsystemNodeImpl({ data }: NodeProps) {
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 shadow-lg shadow-amber-500/10 backdrop-blur-sm min-w-[180px]">
      <Handle type="target" position={Position.Left} className="!bg-amber-400 !w-3 !h-3 !border-2 !border-neutral-900" />
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded bg-amber-500/20">
          <Box className="h-3.5 w-3.5 text-amber-400" />
        </div>
        <div>
          <p className="text-xs font-semibold text-amber-200">{data.label}</p>
          <p className="text-[9px] text-neutral-500">子系统 · Sub-system</p>
        </div>
      </div>
      {data.mutations && data.mutations.length > 0 && (
        <div className="mt-2 border-t border-neutral-800 pt-2">
          {data.mutations.map((m: string, i: number) => (
            <p key={i} className="text-[9px] font-mono text-neutral-400">
              {m}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

export const SubsystemNode = memo(SubsystemNodeImpl)
