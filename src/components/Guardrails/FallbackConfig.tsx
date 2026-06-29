import { useConfigStore } from '../../useConfigStore'
import type { FallbackBehavior } from '../../types'

const options: { value: FallbackBehavior; label: string; desc: string }[] = [
  { value: 'idle', label: '原地发呆', desc: 'NPC 保持当前位置，不做任何反应' },
  { value: 'call_guard', label: '呼叫警卫', desc: 'NPC 大声呼救，触发附近警卫响应' },
  { value: 'leave', label: '执行预设离开动画', desc: 'NPC 按照预设路径离开场景' },
  { value: 'continue', label: '使用最后一个合法输出循环', desc: '重复 NPC 最后一个通过安全检查的对话' },
]

export function FallbackConfig() {
  const behavior = useConfigStore((s) => s.guardrailSettings.fallbackBehavior)
  const update = useConfigStore((s) => s.updateGuardrailSetting)

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
      <h3 className="mb-3 text-xs font-semibold text-neutral-300">兜底策略配置</h3>
      <p className="mb-3 text-[10px] text-neutral-500">
        当 LLM 超时、输出乱码或调用失败时，NPC 的默认行为
      </p>
      <div className="space-y-1.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => update('fallbackBehavior', opt.value)}
            className={`w-full rounded-md border px-3 py-2.5 text-left transition-all ${
              behavior === opt.value
                ? 'border-primary/40 bg-primary/10'
                : 'border-neutral-800 hover:bg-neutral-800/50'
            }`}
          >
            <p className="text-xs font-medium text-neutral-200">{opt.label}</p>
            <p className="mt-0.5 text-[10px] text-neutral-500">{opt.desc}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
