import { useState } from 'react'
import { Search } from 'lucide-react'
import { useConfigStore } from '../../useConfigStore'

export function NpcRoster() {
  const npcs = useConfigStore((s) => s.npcs)
  const selectedId = useConfigStore((s) => s.selectedNpcId)
  const selectNpc = useConfigStore((s) => s.selectNpc)
  const [query, setQuery] = useState('')

  const filtered = npcs.filter(
    (n) =>
      n.name.toLowerCase().includes(query.toLowerCase()) ||
      n.id.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="flex h-full flex-col">
      <div className="px-3 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索 NPC..."
            className="w-full rounded-md border border-neutral-800 bg-neutral-900 py-2 pl-8 pr-3 text-xs text-neutral-200 placeholder:text-neutral-600 focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
        {filtered.map((npc) => {
          const isSelected = selectedId === npc.id
          return (
            <button
              key={npc.id}
              onClick={() => selectNpc(npc.id)}
              className={`w-full rounded-md px-3 py-2.5 text-left transition-all ${
                isSelected
                  ? 'bg-primary/10 border border-primary/20'
                  : 'border border-transparent hover:bg-neutral-800/50'
              }`}
            >
              <p className="text-xs font-medium text-neutral-200">{npc.name}</p>
              <p className="mt-0.5 text-[10px] text-neutral-500">{npc.id}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
