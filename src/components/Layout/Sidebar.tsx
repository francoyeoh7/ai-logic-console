import { FlaskConical, Shield, GitBranch, Activity, Download } from 'lucide-react'
import { useConfigStore } from '../../useConfigStore'
import type { ModuleId } from '../../types'

const navItems: { id: ModuleId; label: string; icon: typeof FlaskConical }[] = [
  { id: 'persona', label: '灵魂锻造台', icon: FlaskConical },
  { id: 'guardrails', label: '护栏与公理', icon: Shield },
  { id: 'eventbus', label: '事件总线路由图', icon: GitBranch },
  { id: 'director', label: '导演节奏控制台', icon: Activity },
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
    <aside className="flex h-full w-56 flex-col border-r border-neutral-800 bg-neutral-900/50">
      <div className="flex items-center gap-2 px-4 py-5 border-b border-neutral-800">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/20">
          <FlaskConical className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-xs font-semibold tracking-wide">AI 语义控制台</p>
          <p className="text-[10px] text-neutral-500">v1.0.0 · LLM Runtime</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-4">
        {navItems.map((item) => {
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              onClick={() => setActive(item.id)}
              className={`group flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-all ${
                isActive
                  ? 'bg-primary/15 text-primary shadow-sm shadow-primary/10'
                  : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200'
              }`}
            >
              <item.icon className={`h-4 w-4 ${isActive ? 'text-primary' : 'text-neutral-500 group-hover:text-neutral-300'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="border-t border-neutral-800 p-3">
        <button
          onClick={handleExport}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
        >
          <Download className="h-3.5 w-3.5" />
          导出全局配置
        </button>
      </div>
    </aside>
  )
}
