import { useState } from 'react'
import { Pin, Trash2, Search, Brain } from 'lucide-react'
import { useConfigStore } from '../../useConfigStore'

export function MemoryPruner() {
  const memories = useConfigStore((s) => s.memories)
  const selectedId = useConfigStore((s) => s.selectedNpcId)
  const npcs = useConfigStore((s) => s.npcs)
  const pinMemory = useConfigStore((s) => s.pinMemory)
  const forgetMemory = useConfigStore((s) => s.forgetMemory)
  const [searchQuery, setSearchQuery] = useState('')

  const npc = npcs.find((n) => n.id === selectedId)
  const npcMemories = memories
    .filter((m) => m.npcId === selectedId)
    .sort((a, b) => b.timestamp - a.timestamp)

  const filtered = searchQuery
    ? npcMemories.filter((m) => m.summary.includes(searchQuery))
    : npcMemories

  if (!npc) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-neutral-500">
        —
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-4">
      <div className="mb-3">
        <h3 className="text-xs font-semibold text-neutral-300">向量记忆修剪</h3>
        <p className="text-[10px] text-neutral-500">{npc.name} · 共 {npcMemories.length} 条</p>
        <div className="mt-2 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-neutral-500" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="语义检索..."
              className="w-full rounded border border-neutral-800 bg-neutral-900 py-1.5 pl-7 pr-2 text-[10px] text-neutral-200 placeholder:text-neutral-600"
            />
          </div>
          <span className="flex items-center gap-1 text-[9px] text-neutral-500"><Brain className="h-3 w-3" />模拟</span>
        </div>
      </div>
      {filtered.length === 0 ? (
        <p className="text-xs text-neutral-600">暂无记忆数据</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((mem) => (
            <div key={mem.id} className={`rounded-md border p-2.5 transition-all ${mem.pinned ? 'border-primary/30 bg-primary/5' : 'border-neutral-800 bg-neutral-900/50'}`}>
              <div className="mb-1 flex items-start justify-between gap-2">
                <p className="text-xs leading-relaxed text-neutral-300">{mem.summary}</p>
                <div className="flex shrink-0 gap-1">
                  {!mem.pinned && <button onClick={() => pinMemory(mem.id)} className="rounded p-1 text-neutral-600 hover:bg-neutral-800 hover:text-primary" title="固化为核心记忆"><Pin className="h-3.5 w-3.5" /></button>}
                  <button onClick={() => forgetMemory(mem.id)} className="rounded p-1 text-neutral-600 hover:bg-neutral-800 hover:text-destructive" title="从向量库抹除"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-neutral-500">
                <span>{new Date(mem.timestamp).toLocaleTimeString('zh-CN')}</span>
                <span>重要度:<span className={`font-mono font-medium ${mem.importance >= 7 ? 'text-yellow-500' : 'text-neutral-400'}`}>{mem.importance}/10</span></span>
                {mem.pinned && <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[9px] text-primary">已固化</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
