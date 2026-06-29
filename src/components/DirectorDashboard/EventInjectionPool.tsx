import { useConfigStore } from '../../useConfigStore'
import { Zap, CloudRain, Swords, ShoppingBag, Shield, Compass } from 'lucide-react'

const categoryIcons: Record<string, typeof Zap> = {
  environment: CloudRain,
  combat: Swords,
  opportunity: ShoppingBag,
  security: Shield,
  exploration: Compass,
}

const categoryColors: Record<string, string> = {
  environment: 'border-blue-500/30 bg-blue-500/5',
  combat: 'border-red-500/30 bg-red-500/5',
  opportunity: 'border-emerald-500/30 bg-emerald-500/5',
  security: 'border-amber-500/30 bg-amber-500/5',
  exploration: 'border-purple-500/30 bg-purple-500/5',
}

export function EventInjectionPool() {
  const events = useConfigStore((s) => s.interventionEvents)
  const injectEvent = useConfigStore((s) => s.injectEvent)

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold text-neutral-300">干预事件池</h3>
          <p className="text-[10px] text-neutral-500">导演可在运行时从池中挑选事件</p>
        </div>
        <div className="flex items-center gap-2">
          <Zap className="h-3.5 w-3.5 text-yellow-500" />
          <span className="text-[10px] text-neutral-400">共 {events.length} 个预设事件</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {events.map((event) => {
          const Icon = categoryIcons[event.category] ?? Zap
          const colorClass = categoryColors[event.category] ?? 'border-neutral-700'
          return (
            <div
              key={event.id}
              className={`rounded-lg border p-3.5 transition-all hover:border-neutral-600 ${colorClass}`}
            >
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded bg-neutral-800">
                  <Icon className="h-3.5 w-3.5 text-neutral-300" />
                </div>
                <div>
                  <p className="text-xs font-medium text-neutral-200">{event.name}</p>
                  <p className="text-[9px] text-neutral-500 capitalize">{event.category}</p>
                </div>
              </div>
              <p className="mb-3 text-[10px] leading-relaxed text-neutral-400">{event.description}</p>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-mono ${event.tensionEffect >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                  张力 {event.tensionEffect >= 0 ? '+' : ''}{event.tensionEffect}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
