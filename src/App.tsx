import { useConfigStore } from './useConfigStore'
import { Sidebar } from './components/Layout/Sidebar'
import { NpcDesigner } from './components/NpcDesigner/NpcDesigner'
import { Guardrails } from './components/Guardrails/Guardrails'
import { QuestNetwork } from './components/QuestNetwork/QuestNetwork'
import { QuestEditor } from './components/QuestEditor/QuestEditor'
import { DirectorDashboard } from './components/DirectorDashboard/DirectorDashboard'
import { ContextComposer } from './components/ContextComposer/ContextComposer'
import { ConversationSandbox } from './components/ConversationSandbox/ConversationSandbox'

const modules = {
  npc_designer: NpcDesigner,
  guardrails: Guardrails,
  quest_network: QuestNetwork,
  quest_editor: QuestEditor,
  director: DirectorDashboard,
  context: ContextComposer,
  sandbox: ConversationSandbox,
}

export default function App() {
  const activeModule = useConfigStore((s) => s.activeModule)
  const ActiveComponent = modules[activeModule]

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-neutral-950">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <ActiveComponent />
      </main>
    </div>
  )
}
