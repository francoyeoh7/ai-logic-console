import { useConfigStore } from '../../useConfigStore'
import { GripVertical } from 'lucide-react'

export function MemoryPreview() {
  const memories = useConfigStore((s) => s.memories)
  const selectedId = useConfigStore((s) => s.selectedNpcId)

  const npcMemories = memories
    .filter((m) => m.npcId === selectedId)
    .sort((a, b) => b.timestamp - a.timestamp)

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50">
      <div className="border-b border-neutral-800 px-4 py-2.5">
        <span className="text-xs font-medium text-neutral-300">记忆检索预览</span>
        <span className="ml-2 text-[10px] text-neutral-500">实际 LLM 调用将取 top 6</span>
      </div>
      <div className="max-h-48 overflow-y-auto p-2 space-y-1">
        {npcMemories.slice(0, 6).map((mem, i) => (
          <div
            key={mem.id}
            className={`flex items-center gap-2 rounded px-2 py-1.5 text-xs ${
              mem.pinned ? 'bg-primary/10' : 'hover:bg-neutral-800/50'
            }`}
          >
            <GripVertical className="h-3 w-3 shrink-0 text-neutral-600" />
            <span className="text-[10px] font-mono text-neutral-500">#{i + 1}</span>
            <span className="flex-1 truncate text-neutral-300">{mem.summary}</span>
            <span className="text-[10px] font-mono text-neutral-500">重要度:{mem.importance}</span>
          </div>
        ))}
        {npcMemories.length === 0 && (
          <p className="px-2 py-3 text-xs text-neutral-600">无记忆数据</p>
        )}
      </div>
    </div>
  )
}
