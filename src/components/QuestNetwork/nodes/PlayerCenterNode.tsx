import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import { User } from 'lucide-react'

function PlayerCenterNodeImpl() {
  return (
    <div className="rounded-full border-2 border-blue-500/50 bg-blue-500/10 px-6 py-4 shadow-lg shadow-blue-500/10">
      <Handle type="source" position={Position.Right} className="!bg-blue-400 !w-3 !h-3 !border-2 !border-neutral-900" />
      <Handle type="target" position={Position.Left} className="!bg-blue-400 !w-3 !h-3 !border-2 !border-neutral-900" />
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-blue-400" />
        <span className="text-xs font-semibold text-blue-200">玩家</span>
      </div>
    </div>
  )
}
export const PlayerCenterNode = memo(PlayerCenterNodeImpl)
