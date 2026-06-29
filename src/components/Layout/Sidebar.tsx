import { FlaskConical, Shield, GitBranch, Activity, Download, Puzzle, MessageSquare, Users, Edit3 } from 'lucide-react'
import { useConfigStore } from '../../useConfigStore'
import type { ModuleId } from '../../types'

const navItems: { id: ModuleId; label: string; icon: typeof FlaskConical }[] = [
  { id: 'guardrails', label: '护栏与公理', icon: Shield },
  { id: 'npc_designer', label: 'NPC 设定', icon: Users },
  { id: 'quest_network', label: '任务网络图', icon: GitBranch },
  { id: 'quest_editor', label: '任务编排台', icon: Edit3 },
  { id: 'director', label: '导演控制台', icon: Activity },
  { id: 'context', label: '上下文编辑器', icon: Puzzle },
  { id: 'sandbox', label: '对话沙盒', icon: MessageSquare },
]

export function Sidebar() {
  const active = useConfigStore((s) => s.activeModule)
  const setActive = useConfigStore((s) => s.setActiveModule)
  const exportConfig = useConfigStore((s) => s.exportGlobalConfig)

  const handleExport = () => {
    const json = exportConfig()
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'global-config.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <aside className="flex h-full w-52 flex-col border-r border-neutral-800 bg-neutral-900/50">
      <div className="flex items-center gap-2 px-3 py-4 border-b border-neutral-800">
        <div className="flex h-7 w-7 items-center justify-center rounded bg-primary/20">
          <FlaskConical className="h-3.5 w-3.5 text-primary" />
        </div>
        <div>
          <p className="text-[11px] font-semibold tracking-wide">AI 语义控制台</p>
          <p className="text-[9px] text-neutral-500">v2.0 · LLM Runtime</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-2 py-3 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              onClick={() => setActive(item.id)}
              className={`group flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs transition-all ${
                isActive
                  ? 'bg-primary/15 text-primary shadow-sm shadow-primary/10'
                  : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200'
              }`}
            >
              <item.icon className={`h-3.5 w-3.5 ${isActive ? 'text-primary' : 'text-neutral-500 group-hover:text-neutral-300'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="border-t border-neutral-800 p-3">
        <button
          onClick={handleExport}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-[11px] font-medium text-primary transition-colors hover:bg-primary/20"
        >
          <Download className="h-3.5 w-3.5" />
          导出全局配置
        </button>
      </div>
    </aside>
  )
}
