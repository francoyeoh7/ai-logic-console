import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { Zap } from 'lucide-react'

function EventSourceNodeImpl({ data }: NodeProps) {
  return (
    <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 px-4 py-3 shadow-lg shadow-cyan-500/10 backdrop-blur-sm min-w-[180px]">
      <Handle type="source" position={Position.Right} className="!bg-cyan-400 !w-3 !h-3 !border-2 !border-neutral-900" />
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded bg-cyan-500/20">
          <Zap className="h-3.5 w-3.5 text-cyan-400" />
        </div>
        <div>
          <p className="text-xs font-semibold text-cyan-200">{data.label}</p>
          <p className="text-[9px] text-neutral-500">事件源 · Event Source</p>
        </div>
      </div>
    </div>
  )
}

export const EventSourceNode = memo(EventSourceNodeImpl)
