import { useConfigStore } from './useConfigStore'
import { Sidebar } from './components/Layout/Sidebar'
import { PersonaForge } from './components/PersonaForge/PersonaForge'
import { Guardrails } from './components/Guardrails/Guardrails'
import { EventBusVisualizer } from './components/EventBus/EventBusVisualizer'
import { DirectorDashboard } from './components/DirectorDashboard/DirectorDashboard'

const modules = {
  persona: PersonaForge,
  guardrails: Guardrails,
  eventbus: EventBusVisualizer,
  director: DirectorDashboard,
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
