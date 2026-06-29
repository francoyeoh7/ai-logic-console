import { useConfigStore } from '../../useConfigStore'
import { TokenCounter } from './TokenCounter'
import { SectionPanel } from './SectionPanel'
import { MemoryPreview } from './MemoryPreview'
import { ActionWhitelist } from './ActionWhitelist'
import { Play, Loader2 } from 'lucide-react'

export function ContextComposer() {
  const sections = useConfigStore((s) => s.contextSections)
  const updateSection = useConfigStore((s) => s.updateContextSection)
  const npcs = useConfigStore((s) => s.npcs)
  const selectedId = useConfigStore((s) => s.selectedNpcId)
  const isCalling = useConfigStore((s) => s.isLlmCalling)
  const callLlm = useConfigStore((s) => s.callLlm)

  const npc = npcs.find((n) => n.id === selectedId)

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-neutral-200">上下文编排器</h2>
            <p className="mt-1 text-xs text-neutral-500">
              {npc ? `NPC: ${npc.name}` : '选择 NPC 后拼装上下文'}
            </p>
          </div>
          <button
            onClick={callLlm}
            disabled={isCalling}
            className="flex items-center gap-2 rounded-md bg-primary/20 px-4 py-2 text-xs font-medium text-primary hover:bg-primary/30 disabled:opacity-50"
          >
            {isCalling ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            模拟调用
          </button>
        </div>

        <TokenCounter />

        <div className="space-y-3">
          {sections.map((sec) => (
            <SectionPanel
              key={sec.id}
              section={sec}
              onChange={(content) => updateSection(sec.id, content)}
            />
          ))}
        </div>
      </div>

      <div className="w-72 shrink-0 border-l border-neutral-800 p-4 space-y-4 overflow-y-auto">
        <MemoryPreview />
        <ActionWhitelist />
      </div>
    </div>
  )
}
