import { useState } from 'react'
import { FlaskConical, Shield, GitBranch, Activity, Download, Puzzle, MessageSquare, Users, Edit3, ChevronDown, FileJson, Languages } from 'lucide-react'
import { useConfigStore } from '../../useConfigStore'
import type { ModuleId } from '../../types'
import { exportAllForUe5, downloadJsonFile } from '../../services/ue5Exporter'
import { zh, en } from '../../lib/i18n'

type NavKey = 'guardrails' | 'npcDesigner' | 'questNetwork' | 'questEditor' | 'director' | 'context' | 'sandbox'

const navKeys: { id: ModuleId; key: NavKey; icon: typeof FlaskConical }[] = [
  { id: 'guardrails', key: 'guardrails', icon: Shield },
  { id: 'npc_designer', key: 'npcDesigner', icon: Users },
  { id: 'quest_network', key: 'questNetwork', icon: GitBranch },
  { id: 'quest_editor', key: 'questEditor', icon: Edit3 },
  { id: 'director', key: 'director', icon: Activity },
  { id: 'context', key: 'context', icon: Puzzle },
  { id: 'sandbox', key: 'sandbox', icon: MessageSquare },
]

export function Sidebar() {
  const active = useConfigStore((s) => s.activeModule)
  const setActive = useConfigStore((s) => s.setActiveModule)
  const locale = useConfigStore((s) => s.locale)
  const setLocale = useConfigStore((s) => s.setLocale)
  const npcs = useConfigStore((s) => s.npcs)
  const quests = useConfigStore((s) => s.questDefinitions)
  const axioms = useConfigStore((s) => s.axioms)
  const [showExportMenu, setShowExportMenu] = useState(false)

  const t = locale === 'zh' ? zh : en

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
    <aside className="flex h-full w-52 flex-col border-r border-neutral-800/50 bg-neutral-950/80 backdrop-blur-sm">
      <div className="flex items-center gap-2 px-3 py-4 border-b border-neutral-800/30">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15">
          <FlaskConical className="h-3.5 w-3.5 text-primary/80" />
        </div>
        <div>
          <p className="text-[11px] font-medium tracking-wide text-neutral-200">{t.nav.title}</p>
          <p className="text-[9px] text-neutral-600">{t.nav.version}</p>
        </div>
      </div>

      {/* 语言切换 */}
      <div className="flex mx-2 mt-2 rounded-md border border-neutral-800/50 overflow-hidden">
        <button
          onClick={() => setLocale('zh')}
          className={`flex-1 py-1.5 text-[10px] font-medium transition-colors ${
            locale === 'zh' ? 'bg-primary/15 text-primary' : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          中文
        </button>
        <button
          onClick={() => setLocale('en')}
          className={`flex-1 py-1.5 text-[10px] font-medium transition-colors ${
            locale === 'en' ? 'bg-primary/15 text-primary' : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          EN
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 px-2 py-3 overflow-y-auto">
        {navKeys.map(({ id, key, icon: Icon }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              onClick={() => setActive(id)}
              className={`group flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[11px] transition-all duration-150 ${
                isActive
                  ? 'bg-primary/10 text-primary border border-primary/10'
                  : 'text-neutral-500 hover:bg-neutral-800/40 hover:text-neutral-300 border border-transparent'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-primary/80' : 'text-neutral-600 group-hover:text-neutral-400'}`} />
              <span className="truncate">{t.nav[key]}</span>
            </button>
          )
        })}
      </nav>

      <div className="border-t border-neutral-800/30 p-2">
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex w-full items-center justify-center gap-1.5 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-[10px] font-medium text-primary/80 transition-colors hover:bg-primary/10"
          >
            <Download className="h-3.5 w-3.5" />
            {t.nav.export}
            <ChevronDown className="h-3 w-3 opacity-60" />
          </button>
          {showExportMenu && (
            <div className="absolute bottom-full left-0 right-0 mb-1 rounded-md border border-neutral-700/50 bg-neutral-900 shadow-2xl shadow-black/50 overflow-hidden backdrop-blur-sm">
              onClick={handleExportUe5Npc} className="flex w-full items-center gap-2 px-3 py-2 text-[10px] text-neutral-300 hover:bg-neutral-800/60 transition-colors">
                <FileJson className="h-3 w-3 text-cyan-400/80" /> {t.common.exportNpc}
              </button>
              <button onClick={handleExportUe5Quest} className="flex w-full items-center gap-2 px-3 py-2 text-[10px] text-neutral-300 hover:bg-neutral-800/60 transition-colors">
                <FileJson className="h-3 w-3 text-emerald-400/80" /> {t.common.exportQuest}
              </button>
              <button onClick={handleExportUe5Guardrail} className="flex w-full items-center gap-2 px-3 py-2 text-[10px] text-neutral-300 hover:bg-neutral-800/60 transition-colors">
                <FileJson className="h-3 w-3 text-amber-400/80" /> {t.common.exportGuardrail}
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
