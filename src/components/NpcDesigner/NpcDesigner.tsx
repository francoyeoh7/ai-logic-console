import { NpcRoster } from './NpcRoster'
import { NpcProfile } from './NpcProfile'
import { MemoryPruner } from './MemoryPruner'
import { NpcTaskList } from './NpcTaskList'
import { RelationshipPanel } from './RelationshipPanel'
import { StyleIntentPanel } from './StyleIntentPanel'

export function NpcDesigner() {
  return (
    <div className="flex h-full">
      <div className="w-44 shrink-0 border-r border-neutral-800 bg-neutral-900/30">
        <NpcRoster />
      </div>
      <div className="flex-1 border-r border-neutral-800">
        <NpcProfile />
      </div>
      <div className="w-56 shrink-0 border-r border-neutral-800">
        <div className="flex flex-col h-full">
          <div className="basis-2/5 overflow-hidden">
            <MemoryPruner />
          </div>
          <div className="flex-1 border-t border-neutral-800 overflow-hidden">
            <RelationshipPanel />
          </div>
        </div>
      </div>
      <div className="w-64 shrink-0">
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-hidden">
            <NpcTaskList />
          </div>
          <div className="basis-2/5 border-t border-neutral-800 overflow-hidden">
            <StyleIntentPanel />
          </div>
        </div>
      </div>
    </div>
  )
}
