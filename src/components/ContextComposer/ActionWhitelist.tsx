import { useConfigStore } from '../../useConfigStore'
import { CheckCircle2 } from 'lucide-react'

export function ActionWhitelist() {
  const actions = useConfigStore((s) => s.actionDefinitions)

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50">
      <div className="border-b border-neutral-800 px-4 py-2.5">
        <span className="text-xs font-medium text-neutral-300">行为白名单</span>
        <span className="ml-2 text-[10px] text-neutral-500">
          当前上下文将包含 {actions.length} 个可用动作
        </span>
      </div>
      <div className="max-h-48 overflow-y-auto p-2 space-y-1">
        {actions.map((action) => (
          <div
            key={action.actionId}
            className="flex items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-neutral-800/50"
          >
            <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />
            <span className="font-mono text-neutral-200">{action.actionId}</span>
            <span className="ml-auto text-[10px] text-neutral-500 capitalize">{action.category}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
