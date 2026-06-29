import { GlobalToggles } from './GlobalToggles'
import { AxiomBuilder } from './AxiomBuilder'
import { FallbackConfig } from './FallbackConfig'

export function Guardrails() {
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-5">
        <h2 className="text-sm font-semibold text-neutral-200">护栏与绝对公理</h2>
        <p className="mt-1 text-xs text-neutral-500">
          设定不可被 LLM 幻觉绕过的物理与剧情铁律
        </p>
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-1 space-y-4">
          <GlobalToggles />
          <FallbackConfig />
        </div>
        <div className="col-span-2">
          <AxiomBuilder />
        </div>
      </div>
    </div>
  )
}
