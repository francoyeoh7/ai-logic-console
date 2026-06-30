import { Activity, Brain, Cable, CircleDot, Database, Link2, Radio, ShieldAlert, Trash2, Zap } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useConfigStore } from '../../useConfigStore'

const formatTime = (timestamp?: number | null) => {
  if (!timestamp) return 'never'
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(timestamp)
}

const toneByImportance = (importance: number) => {
  if (importance >= 8) return 'border-amber-400/30 bg-amber-400/5 text-amber-200'
  if (importance >= 5) return 'border-cyan-400/30 bg-cyan-400/5 text-cyan-200'
  return 'border-neutral-700/60 bg-neutral-900/50 text-neutral-300'
}

function StatTile({ label, value, icon: Icon, tone = 'text-neutral-200' }: {
  label: string
  value: string | number
  icon: typeof Activity
  tone?: string
}) {
  return (
    <div className="rounded-md border border-neutral-800/70 bg-neutral-950/70 p-3">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-neutral-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className={`mt-2 text-xl font-semibold ${tone}`}>{value}</div>
    </div>
  )
}

export function RuntimeMonitor() {
  const wsConnected = useConfigStore((s) => s.wsConnected)
  const connectWebSocket = useConfigStore((s) => s.connectWebSocket)
  const disconnectWebSocket = useConfigStore((s) => s.disconnectWebSocket)
  const clearRuntimeLogs = useConfigStore((s) => s.clearRuntimeLogs)
  const npcStatuses = useConfigStore((s) => s.npcStatuses)
  const runtimeMemories = useConfigStore((s) => s.runtimeMemories)
  const socialBeats = useConfigStore((s) => s.socialBeats)
  const directorMetrics = useConfigStore((s) => s.directorMetrics)
  const llmCallLogs = useConfigStore((s) => s.llmCallLogs)
  const guardrailLogs = useConfigStore((s) => s.guardrailLogs)
  const interventionLogs = useConfigStore((s) => s.interventionLogs)
  const runtimeLastUpdated = useConfigStore((s) => s.runtimeLastUpdated)
  const [selectedNpcId, setSelectedNpcId] = useState('all')

  const npcIds = useMemo(() => {
    const ids = new Set<string>()
    npcStatuses.forEach((status) => ids.add(status.npcId))
    runtimeMemories.forEach((memory) => ids.add(memory.ownerNpcId))
    socialBeats.forEach((beat) => {
      ids.add(beat.sourceNpcId)
      ids.add(beat.targetNpcId)
    })
    return Array.from(ids).sort()
  }, [npcStatuses, runtimeMemories, socialBeats])

  const filteredMemories = selectedNpcId === 'all'
    ? runtimeMemories
    : runtimeMemories.filter((memory) => memory.ownerNpcId === selectedNpcId)
  const activeSocialBeat = socialBeats.find((beat) => beat.status === 'active')
  const flowIndex = directorMetrics?.flowIndex ?? 0

  return (
    <div className="h-full overflow-y-auto bg-neutral-950 p-5">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-neutral-100">运行时监控</h2>
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            UE5 live memory, social beats, guardrails, and director state
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] ${
            wsConnected
              ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
              : 'border-neutral-700/70 bg-neutral-900/80 text-neutral-400'
          }`}>
            <CircleDot className="h-3 w-3" />
            {wsConnected ? 'Connected' : 'Mock / Offline'}
          </div>
          <button
            onClick={() => (wsConnected ? disconnectWebSocket() : connectWebSocket())}
            className="flex items-center gap-1.5 rounded-md border border-primary/20 bg-primary/10 px-3 py-1.5 text-[11px] font-medium text-primary hover:bg-primary/15"
          >
            <Cable className="h-3.5 w-3.5" />
            {wsConnected ? 'Disconnect' : 'Connect UE5'}
          </button>
          <button
            onClick={clearRuntimeLogs}
            className="flex items-center gap-1.5 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-[11px] text-neutral-400 hover:text-neutral-200"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </button>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-6">
        <StatTile label="Flow" value={flowIndex} icon={Zap} tone={flowIndex > 65 ? 'text-emerald-300' : 'text-amber-300'} />
        <StatTile label="NPCs" value={npcStatuses.length} icon={Activity} />
        <StatTile label="Memories" value={runtimeMemories.length} icon={Brain} />
        <StatTile label="Social Beats" value={socialBeats.length} icon={Link2} />
        <StatTile label="LLM Calls" value={llmCallLogs.length} icon={Database} />
        <StatTile label="Last Update" value={formatTime(runtimeLastUpdated)} icon={CircleDot} tone="text-neutral-300" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_1.35fr]">
        <section className="rounded-md border border-neutral-800/70 bg-neutral-950/80">
          <div className="border-b border-neutral-800/70 px-4 py-3">
            <h3 className="text-xs font-semibold text-neutral-200">NPC 状态墙</h3>
            <p className="mt-1 text-[11px] text-neutral-500">当前行为、情绪和 UE 侧头顶状态</p>
          </div>
          <div className="grid gap-2 p-3 md:grid-cols-2 xl:grid-cols-1">
            {npcStatuses.map((status) => (
              <div key={status.npcId} className="rounded-md border border-neutral-800/70 bg-neutral-900/40 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-mono text-xs text-neutral-100">{status.npcId}</div>
                    <div className="mt-1 text-[11px] text-neutral-500">{status.statusText ?? status.state}</div>
                  </div>
                  <span className="rounded border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                    {status.action}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-neutral-500">
                  <span>{status.emotion}</span>
                  <span>{formatTime(status.updatedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-md border border-neutral-800/70 bg-neutral-950/80">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800/70 px-4 py-3">
            <div>
              <h3 className="text-xs font-semibold text-neutral-200">记忆查看器</h3>
              <p className="mt-1 text-[11px] text-neutral-500">按 NPC 过滤运行时记忆和语义标签</p>
            </div>
            <select
              value={selectedNpcId}
              onChange={(event) => setSelectedNpcId(event.target.value)}
              className="rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-[11px] text-neutral-300"
            >
              <option value="all">All NPCs</option>
              {npcIds.map((npcId) => (
                <option key={npcId} value={npcId}>{npcId}</option>
              ))}
            </select>
          </div>
          <div className="max-h-[430px] space-y-2 overflow-y-auto p-3">
            {filteredMemories.map((memory) => (
              <div key={memory.id} className={`rounded-md border p-3 ${toneByImportance(memory.importance)}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-mono text-[11px] text-neutral-400">{memory.ownerNpcId}</div>
                    <p className="mt-1 text-xs leading-5 text-neutral-100">{memory.summary}</p>
                  </div>
                  <div className="shrink-0 rounded border border-neutral-700/70 px-2 py-0.5 text-[10px]">
                    {memory.importance}/10
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {memory.semanticTags.map((tag) => (
                    <span key={tag} className="rounded border border-neutral-700/60 bg-neutral-950/60 px-1.5 py-0.5 text-[10px] text-neutral-400">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px] text-neutral-500">
                  <span>{memory.participants.join(' -> ') || 'solo'}</span>
                  <span>{formatTime(memory.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <section className="rounded-md border border-neutral-800/70 bg-neutral-950/80">
          <div className="border-b border-neutral-800/70 px-4 py-3">
            <h3 className="text-xs font-semibold text-neutral-200">社交事件流</h3>
            <p className="mt-1 text-[11px] text-neutral-500">
              {activeSocialBeat ? `Active: ${activeSocialBeat.sourceNpcId} -> ${activeSocialBeat.targetNpcId}` : 'No active beat'}
            </p>
          </div>
          <div className="space-y-2 p-3">
            {socialBeats.map((beat) => (
              <div key={beat.id} className="rounded-md border border-neutral-800/70 bg-neutral-900/40 p-3">
                <div className="flex items-center gap-2 text-xs text-neutral-200">
                  <span className="font-mono">{beat.sourceNpcId}</span>
                  <Link2 className="h-3.5 w-3.5 text-primary/70" />
                  <span className="font-mono">{beat.targetNpcId}</span>
                  <span className={`ml-auto rounded px-2 py-0.5 text-[10px] ${
                    beat.status === 'active' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-neutral-800 text-neutral-400'
                  }`}>
                    {beat.status}
                  </span>
                </div>
                <p className="mt-2 text-[11px] leading-5 text-neutral-400">{beat.summary}</p>
                <div className="mt-2 text-[10px] text-neutral-600">{formatTime(beat.timestamp)}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-md border border-neutral-800/70 bg-neutral-950/80">
          <div className="border-b border-neutral-800/70 px-4 py-3">
            <h3 className="text-xs font-semibold text-neutral-200">系统日志</h3>
            <p className="mt-1 text-[11px] text-neutral-500">LLM / guardrail / director runtime signals</p>
          </div>
          <div className="grid gap-2 p-3">
            <div className="rounded-md border border-neutral-800/70 bg-neutral-900/40 p-3">
              <div className="flex items-center gap-2 text-[11px] font-medium text-neutral-300">
                <Database className="h-3.5 w-3.5 text-cyan-300" />
                LLM Calls
              </div>
              <div className="mt-2 text-[11px] text-neutral-500">{llmCallLogs.length} records</div>
            </div>
            <div className="rounded-md border border-neutral-800/70 bg-neutral-900/40 p-3">
              <div className="flex items-center gap-2 text-[11px] font-medium text-neutral-300">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-300" />
                Guardrails
              </div>
              <div className="mt-2 text-[11px] text-neutral-500">{guardrailLogs.length} fires</div>
            </div>
            <div className="rounded-md border border-neutral-800/70 bg-neutral-900/40 p-3">
              <div className="flex items-center gap-2 text-[11px] font-medium text-neutral-300">
                <Activity className="h-3.5 w-3.5 text-emerald-300" />
                Director Metrics
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-neutral-500">
                <span>Boredom {directorMetrics?.boredomSeconds ?? 0}s</span>
                <span>Pressure {directorMetrics?.pressureSeconds ?? 0}s</span>
                <span>Interactions {directorMetrics?.lastMeaningfulInteractionSeconds ?? 0}s</span>
                <span>Interventions {interventionLogs.length}</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
