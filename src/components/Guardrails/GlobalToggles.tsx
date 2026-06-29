import { useConfigStore } from '../../useConfigStore'

export function GlobalToggles() {
  const settings = useConfigStore((s) => s.guardrailSettings)
  const update = useConfigStore((s) => s.updateGuardrailSetting)

  return (
    <div className="space-y-4 rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
      <h3 className="text-xs font-semibold text-neutral-300">全局安全开关</h3>

      <div className="space-y-3">
        {[
          { key: 'antiOOC' as const, label: '出戏检测 (Anti-OOC)', desc: '阻止 NPC 做出不符合角色设定的回应' },
          { key: 'antiPromptInjection' as const, label: '防提示词注入 (Anti-Prompt Injection)', desc: '过滤用户输入中隐藏的提示词注入攻击' },
        ].map((item) => (
          <div key={item.key} className="flex items-center justify-between">
            <div>
              <p className="text-xs text-neutral-300">{item.label}</p>
              <p className="text-[10px] text-neutral-500">{item.desc}</p>
            </div>
            <button
              role="switch"
              aria-checked={settings[item.key]}
              onClick={() => update(item.key, !settings[item.key])}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                settings[item.key] ? 'bg-primary' : 'bg-neutral-700'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  settings[item.key] ? 'translate-x-[18px]' : 'translate-x-[3px]'
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
