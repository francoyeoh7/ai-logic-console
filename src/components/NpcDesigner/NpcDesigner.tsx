import { NpcRoster } from './NpcRoster'
import { NpcProfile } from './NpcProfile'
import { MemoryPruner } from './MemoryPruner'
import { NpcTaskList } from './NpcTaskList'

export function NpcDesigner() {
  return (
    <div className="flex h-full">
      <div className="w-48 shrink-0 border-r border-neutral-800 bg-neutral-900/30">
        <NpcRoster />
      </div>
      <div className="flex-1 border-r border-neutral-800">
        <NpcProfile />
      </div>
      <div className="w-64 shrink-0 border-r border-neutral-800">
        <MemoryPruner />
      </div>
      <div className="w-64 shrink-0">
        <NpcTaskList />
      </div>
    </div>
  )
}
