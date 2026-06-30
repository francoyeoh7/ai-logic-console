import { useState } from 'react'
import { Pin, Trash2, Search, Brain, Layers, Users, Cloud, Eye, User, Zap, Shield } from 'lucide-react'
import { useConfigStore } from '../../useConfigStore'
import type { Memory } from '../../types'

const sourceIcons: Record<string, typeof Users> = {
  player_action: User,
  npc_action: Users,
  witnessed: Eye,
  environment: Cloud,
  self_event: Zap,
}

const sourceLabels: Record<string, string> = {
  player_action: '玩家',
  npc_action: 'NPC',
  witnessed: '目睹',
  environment: '环境',
  self_event: '自身',
}

const sourceColors: Record<string, string> = {
  player_action: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  npc_action: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  witnessed: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  environment: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  self_event: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
}

export function MemoryPruner() {
  const memories = useConfigStore((s) => s.memories)
  const selectedId = useConfigStore((s) => s.selectedNpcId)
  const npcs = useConfigStore((s) => s.npcs)
  const pinMemory = useConfigStore((s) => s.pinMemory)
  const forgetMemory = useConfigStore((s) => s.forgetMemory)
  const [searchQuery, setSearchQuery] = useState('')
  const [layerTab, setLayerTab] = useState<'working' | 'core'>('working')
  const [sourceFilter, setSourceFilter] = useState<string | null>(null)

  const npc = npcs.find((n) => n.id === selectedId)
  const npcMemories = memories
    .filter((m) => m.npcId === selectedId)
    .filter((m) => layerTab === 'core' ? m.layer === 'core' || m.pinned : true)
    .sort((a, b) => b.timestamp - a.timestamp)

  const filtered = npcMemories.filter((m) => {
    if (sourceFilter && m.sourceType !== sourceFilter) return false
    if (searchQuery && !m.summary.includes(searchQuery)) return false
    return true
  })

  const workingCount = npcMemories.filter((m) => m.layer === 'working' && !m.pinned).length
  const coreCount = npcMemories.filter((m) => m.layer === 'core' || m.pinned).length

  // 印象面板
  const impressions = npc?.impressions ?? []

  if (!npc) return <div className="flex h-full items-center justify-center text-xs text-neutral-600">—</div>

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-neutral-800 px-3 py-2">
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-[11px] font-medium text-neutral-300">记忆系统</h3>
          <span className="text-[9px] text-neutral-500">{npcMemories.length} 条</span>
        </div>

        {/* 层级Tab */}
        <div className="flex rounded-md border border-neutral-800 overflow-hidden mb-1.5">
          <button
            onClick={() => setLayerTab('working')}
            className={`flex-1 py-1 text-[9px] font-medium ${layerTab === 'working' ? 'bg-neutral-700 text-neutral-200' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            工作记忆 ({workingCount})
          </button>
          <button
            onClick={() => setLayerTab('core')}
            className={`flex-1 py-1 text-[9px] font-medium ${layerTab === 'core' ? 'bg-neutral-700 text-neutral-200' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            核心记忆 ({coreCount})
          </button>
        </div>

        {/* 来源筛选 */}
        <div className="flex flex-wrap gap-1">
          {['player_action', 'npc_action', 'witnessed', 'environment', 'self_event'].map((src) => {
            const isActive = sourceFilter === src
            return (
              <button
                key={src}
                onClick={() => setSourceFilter(isActive ? null : src)}
                className={`rounded-full px-1.5 py-0.5 text-[8px] border transition-colors ${
                  isActive
                    ? `${sourceColors[src]} border-current`
                    : 'border-neutral-700 text-neutral-500 hover:border-neutral-600'
                }`}
              >
                {sourceLabels[src]}
              </button>
            )
          })}
        </div>

        <div className="relative mt-1.5">
          <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-neutral-500" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="检索记忆..."
            className="w-full rounded border border-neutral-800 bg-neutral-900 py-1 pl-7 pr-2 text-[9px] text-neutral-200 placeholder:text-neutral-600"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {filtered.length === 0 ? (
          <p className="text-[10px] text-neutral-600 py-2 text-center">无匹配记忆</p>
        ) : (
          filtered.map((mem) => {
            const Icon = sourceIcons[mem.sourceType] ?? Zap
            const style = sourceColors[mem.sourceType] ?? sourceColors.self_event
            return (
              <div
                key={mem.id}
                className={`rounded-md border p-2 text-[10px] transition-all ${
                  mem.pinned || mem.layer === 'core'
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-neutral-800 bg-neutral-900/50'
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <p className="flex-1 leading-relaxed text-neutral-300">{mem.summary}</p>
                  <div className="flex shrink-0 gap-0.5">
                    {!mem.pinned && mem.layer !== 'core' && (
                      <button onClick={() => pinMemory(mem.id)} className="rounded p-0.5 text-neutral-600 hover:bg-neutral-800 hover:text-primary" title="固化为核心记忆">
                        <Pin className="h-3 w-3" />
                      </button>
                    )}
                    <button onClick={() => forgetMemory(mem.id)} className="rounded p-0.5 text-neutral-600 hover:bg-neutral-800 hover:text-destructive" title="清除">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                <div className="mt-1-wrap">
                  <span className={`rounded-full px-1 py-0.5 text-[7px] font-medium border ${style}`}>
                    {sourceLabels[mem.sourceType] ?? mem.sourceType}
                  </span>
                  <span className="text-neutral-600">{new Date(mem.timestamp).toLocaleTimeString('zh-CN')}</span>
                  <span className="font-mono text-neutral-500">imp:{mem.importance}</span>
                  {mem.location && <span className="text-neutral-600">{mem.location}</span>}
                  {mem.pinned && <span className="rounded-full bg-primary/20 px-1 py-0.5 text-[7px] text-primary">核心</span>}
                </div>

                {/* 关联实体 */}
                {mem.relatedEntityIds.length > 0 && (
                  <div className="mt-1 flex items-center gap-1 text-[8px] text-neutral-500">
                    <Shield className="h-2.5 w-2.5" />
                    {mem.relatedEntityIds.map((eid) => {
                      const eNpc = npcs.find((n) => n.id === eid)
                      return <span key={eid} className="text-cyan-400">{eNpc?.name ?? eid}</span>
                    })}
                  </div>
                )}

                {/* 派生效果 */}
                {mem.derivedEffects && (mem.derivedEffects.relationImpact.length > 0 || mem.derivedEffects.intentTriggers.length > 0) && (
                  <div className="mt-1 flex items-center gap-1.5 text-[7px]">
                    {mem.derivedEffects.relationImpact.slice(0, 3).map((ri, i) => (
                      <span key={i} className={`${ri.trustDelta > 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                        关系{ri.trustDelta > 0 ? '+' : ''}{ri.trustDelta}
                      </span>
                    ))}
                    {mem.derivedEffects.intentTriggers.slice(0, 2).map((it, i) => (
                      <span key={i} className="text-yellow-500">{it}</span>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* 印象摘要 */}
      {impressions.length > 0 && (
        <div className="border-t border-neutral-800 p-2">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Brain className="h-3 w-3 text-purple-400" />
            <span className="text-[9px] font-medium text-neutral-400">世界印象 ({impressions.length})</span>
          </div>
          {impressions.map((imp, i) => {
            const target = imp.targetType === 'player' ? '玩家' : npcs.find((n) => n.id === imp.targetId)?.name ?? imp.targetId
            return (
              <div key={i} className="rounded border border-neutral-800 bg-neutral-900/50 px-2 py-1.5 mb-1">
                <div className="flex items-center gap-1.5 text-[9px]">
                  <span className="text-neutral-300">{target}</span>
                  <span className="text-neutral-600">·</span>
                  <div className="flex-1 h-1 rounded-full bg-neutral-800">
                    <div className="h-full rounded-full bg-purple-500" style={{ width: `${imp.confidence * 100}%` }} />
                  </div>
                  <span className="font-mono text-purple-400">{Math.round(imp.confidence * 100)}%</span>
                </div>
                <p className="mt-0.5 text-[8px] text-neutral-500">{imp.summary}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
