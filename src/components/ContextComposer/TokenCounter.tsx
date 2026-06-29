import { useConfigStore } from '../../useConfigStore'
import { estimateTokens } from '../../lib/utils'

export function TokenCounter() {
  const sections = useConfigStore((s) => s.contextSections)
  const totalBudget = sections.reduce((sum, sec) => sum + sec.tokenBudget, 0)
  const usedTokens = sections.reduce((sum, sec) => sum + estimateTokens(sec.content), 0)

  const usedPercent = Math.min(100, (usedTokens / totalBudget) * 100)
  const barColor =
    usedPercent > 95 ? 'bg-destructive' : usedPercent > 75 ? 'bg-yellow-500' : 'bg-primary'

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-3">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="text-neutral-400">Token 预算</span>
        <span className="font-mono text-neutral-200">
          {usedTokens} / {totalBudget}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-neutral-800">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.max(2, usedPercent)}%` }}
        />
      </div>
    </div>
  )
}
