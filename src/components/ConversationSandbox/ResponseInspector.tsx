import { useConfigStore } from '../../useConfigStore'
import { AlertCircle, Zap } from 'lucide-react'

export function ResponseInspector() {
  const response = useConfigStore((s) => s.lastLlmResponse)
  const usage = useConfigStore((s) => s.lastLlmUsage)
  const error = useConfigStore((s) => s.llmCallError)
  const isCalling = useConfigStore((s) => s.isLlmCalling)
  const actions = useConfigStore((s) => s.actionDefinitions)

  const actionId = response?.action as string
  const actionDef = actions.find((a) => a.actionId === actionId)
  const params = response?.params as Record<string, unknown> | undefined

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-neutral-800 px-4 py-3">
        <span className="text-xs font-medium text-neutral-300">响应检查器</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isCalling ? (
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <Zap className="h-3.5 w-3.5 animate-pulse text-yellow-500" />
            等待 LLM 响应...
          </div>
        ) : error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="h-3.5 w-3.5 text-destructive" />
              <span className="text-xs font-medium text-destructive">调用失败</span>
            </div>
            <p className="text-[10px] text-destructive/80">{error}</p>
          </div>
        ) : response ? (
          <>
            <div className="rounded-md border border-neutral-800 bg-neutral-900/50 p-3">
              <p className="mb-2 text-[10px] text-neutral-500">动作</p>
              <p className="font-mono text-xs font-semibold text-primary">
                {actionId ?? '—'}
              </p>
              {actionDef && (
                <p className="mt-1 text-[10px] text-neutral-500">
                  分类: {actionDef.category} · {actionDef.ue5Class}
                </p>
              )}
            </div>

            <div className="rounded-md border border-neutral-800 bg-neutral-900/50 p-3">
              <p className="mb-2 text-[10px] text-neutral-500">参数</p>
              <pre className="font-mono text-[10px] leading-relaxed text-neutral-300 whitespace-pre-wrap">
                {JSON.stringify(params, null, 2)}
              </pre>
            </div>

            <div className="rounded-md border border-neutral-800 bg-neutral-900/50 p-3">
              <p className="mb-2 text-[10px] text-neutral-500">情绪 · 优先级 · 推理</p>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="text-neutral-300">情绪: {response?.emotion as string ?? '—'}</span>
                <span className="font-mono text-neutral-300">优先级: {response?.priority as string ?? '—'}</span>
              </div>
              <p className="mt-1 text-[10px] text-neutral-400">
                推理: {response?.reasoning as string ?? '—'}
              </p>
            </div>

            {usage && (
              <div className="rounded-md border border-neutral-800 bg-neutral-900/50 p-3">
                <p className="mb-2 text-[10px] text-neutral-500">Token 消耗</p>
                <div className="flex items-center gap-4 text-[10px] font-mono">
                  <span className="text-neutral-400">Prompt: {usage.promptTokens}</span>
                  <span className="text-neutral-400">Completion: {usage.completionTokens}</span>
                  <span className="text-neutral-200">Total: {usage.totalTokens}</span>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-neutral-600">尚未调用。在左侧编辑上下文后点击「模拟调用」</p>
        )}
      </div>
    </div>
  )
}
