import { TensionChart } from './TensionChart'
import { EventInjectionPool } from './EventInjectionPool'

export function DirectorDashboard() {
  return (
    <div className="h-full overflow-y-auto p-6 space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-neutral-200">导演节奏控制台</h2>
        <p className="mt-1 text-xs text-neutral-500">
          监控玩家心流 · 防止长期无聊或极度高压
        </p>
      </div>

      <TensionChart />
      <EventInjectionPool />
    </div>
  )
}
