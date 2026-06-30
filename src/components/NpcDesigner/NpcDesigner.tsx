import { useResizable } from '../../lib/useResizable'
import { useConfigStore } from '../../useConfigStore'
import { zh } from '../../lib/i18n'
import { NpcRoster } from './NpcRoster'
import { NpcProfile } from './NpcProfile'
import { MemoryPruner } from './MemoryPruner'
import { NpcTaskList } from './NpcTaskList'
import { RelationshipPanel } from './RelationshipPanel'
import { StyleIntentPanel } from './StyleIntentPanel'
import { GripVertical } from 'lucide-react'

function ResizeHandle({ onMouseDown, isDragging }: { onMouseDown: (e: React.MouseEvent) => void; isDragging: boolean }) {
  return (
    <div
      className={`flex items-center justify-center w-1.5 cursor-col-resize hover:bg-primary/20 active:bg-primary/30 shrink-0 transition-colors group ${
        isDragging ? 'bg-primary/30' : 'bg-transparent'
      }`}
      onMouseDown={onMouseDown}
    >
      <GripVertical className={`h-4 w-4 transition-opacity ${isDragging ? 'opacity-100 text-primary' : 'opacity-0 text-neutral-600 group-hover:opacity-100'}`} />
    </div>
  )
}

export function NpcDesigner() {
  const locale = useConfigStore((s) => s.locale)
  const t = locale === 'zh' ? zh.npcDesigner : (zh.npcDesigner as any) // en mirror

  const left = useResizable({ initialWidth: 180, minWidth: 140, maxWidth: 280 })
  const main = useResizable({ initialWidth: 360, minWidth: 200, maxWidth: 600 })
  const mid = useResizable({ initialWidth: 280, minWidth: 180, maxWidth: 400 })
  const right = useResizable({ initialWidth: 300, minWidth: 180, maxWidth: 450 })

  return (
    <div className="flex h-full select-none">
      {/* 左一: NPC 列表 */}
      <div className="shrink-0 border-r border-neutral-800/50 bg-neutral-950 overflow-hidden" style={{ width: left.width }}>
        <NpcRoster />
      </div>
      <ResizeHandle onMouseDown={left.onMouseDown} isDragging={left.isDragging} />

      {/* 左二: 基础信息 + 性格 */}
      <div className="shrink-0 border-r border-neutral-800/50 overflow-hidden" style={{ width: main.width }}>
        <NpcProfile />
      </div>
      <ResizeHandle onMouseDown={main.onMouseDown} isDragging={main.isDragging} />

      {/* 中: 记忆 + 关系 */}
      <div className="shrink-0 border-r border-neutral-800/50 overflow-hidden" style={{ width: mid.width }}>
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-hidden border-b border-neutral-800/50">
            <MemoryPruner />
          </div>
          <div className="flex-1 overflow-hidden">
            <RelationshipPanel />
          </div>
        </div>
      </div>
      <ResizeHandle onMouseDown={mid.onMouseDown} isDragging={mid.isDragging} />

      {/* 右: 任务 + 风格/意图 */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-hidden border-b border-neutral-800/50">
            <NpcTaskList />
          </div>
          <div className="flex-1 overflow-hidden">
            <StyleIntentPanel />
          </div>
        </div>
      </div>
    </div>
  )
}
