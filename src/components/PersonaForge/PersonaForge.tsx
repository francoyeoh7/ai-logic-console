import { NpcRoster } from './NpcRoster'
import { BasePersona } from './BasePersona'
import { MemoryPruner } from './MemoryPruner'

export function PersonaForge() {
  return (
    <div className="flex h-full">
      <div className="w-56 shrink-0 border-r border-neutral-800 bg-neutral-900/30">
        <NpcRoster />
      </div>
      <div className="flex-1 border-r border-neutral-800">
        <BasePersona />
      </div>
      <div className="w-80 shrink-0">
        <MemoryPruner />
      </div>
    </div>
  )
}
