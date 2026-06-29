import { TensionChart } from './TensionChart'
import { EventInjectionPool } from './EventInjectionPool'

export function DirectorDashboard() {
  return (
    <div className="h-full overflow-y-auto p-6 space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-neutral-200">导演规则配置</h2>
        <p className="mt-1 text-xs text-neutral-500">
          设置心流监测参数和干预事件池
        </p>
      </div>

      <TensionChart />
      <EventInjectionPool />
    </div>
  )
}
