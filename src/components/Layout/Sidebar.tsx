import { useState } from 'react'
import { FlaskConical, Shield, GitBranch, Activity, Download, Puzzle, MessageSquare, Users, Edit3, ChevronDown, FileJson, FileText } from 'lucide-react'
import { useConfigStore } from '../../useConfigStore'
import type { ModuleId } from '../../types'
import { exportAllForUe5, downloadJsonFile } from '../../services/ue5Exporter'

const navItems: { id: ModuleId; label: string; icon: typeof FlaskConical }[] = [
  { id: 'guardrails', label: '护栏与公理', icon: Shield },
  { id: 'npc_designer', label: 'NPC 设定', icon: Users },
  { id: 'quest_network', label: '任务网络图', icon: GitBranch },
  { id: 'quest_editor', label: '任务编排', icon: Edit3 },
  { id: 'director', label: '导演规则', icon: Activity },
  { id: 'context', label: '上下文编辑器', icon: Puzzle },
  { id: 'sandbox', label: '对话沙盒', icon: MessageSquare },
]

export function Sidebar() {
  const active = useConfigStore((s) => s.activeModule)
  const setActive = useConfigStore((s) => s.setActiveModule)
  const npcs = useConfigStore((s) => s.npcs)
  const quests = useConfigStore((s) => s.questDefinitions)
  const axioms = useConfigStore((s) => s.axioms)
  const [showExportMenu, setShowExportMenu] = useState(false)

  const handleExportUe5Npc = () => {
    const bundle = exportAllForUe5(npcs, quests, axioms)
    downloadJsonFile(bundle.npcTable, 'DT_NpcPersonas.json')
    setShowExportMenu(false)
  }

  const handleExportUe5Quest = () => {
    const bundle = exportAllForUe5(npcs, quests, axioms)
    downloadJsonFile(bundle.questTable, 'DT_QuestDefinitions.json')
    setShowExportMenu(false)
  }

  const handleExportUe5Guardrail = () => {
    const bundle = exportAllForUe5(npcs, quests, axioms)
    downloadJsonFile(bundle.guardrailTable, 'DT_GuardrailAxioms.json')
    setShowExportMenu(false)
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

      <div className="border-t border-neutral-800 p-2">
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex w-full items-center justify-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-[11px] font-medium text-primary transition-colors hover:bg-primary/20"
          >
            <Download className="h-3.5 w-3.5" />
            导出 UE5 DataTable
            <ChevronDown className="h-3 w-3" />
          </button>
          {showExportMenu && (
            <div className="absolute bottom-full left-0 right-0 mb-1 rounded-md border border-neutral-700 bg-neutral-900 shadow-xl overflow-hidden">
              <button onClick={handleExportUe5Npc} className="flex w-full items-center gap-2 px-3 py-2 text-[10px] text-neutral-300 hover:bg-neutral-800">
                <FileJson className="h-3 w-3 text-cyan-400" /> NPC 人设表
              </button>
              <button onClick={handleExportUe5Quest} className="flex w-full items-center gap-2 px-3 py-2 text-[10px] text-neutral-300 hover:bg-neutral-800">
                <FileJson className="h-3 w-3 text-emerald-400" /> 任务定义表
              </button>
              <button onClick={handleExportUe5Guardrail} className="flex w-full items-center gap-2 px-3 py-2 text-[10px] text-neutral-300 hover:bg-neutral-800">
                <FileJson className="h-3 w-3 text-amber-400" /> 护栏规则表
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
