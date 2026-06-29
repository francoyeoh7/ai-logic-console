import type { ContextSection } from '../../types'
import { estimateTokens } from '../../lib/utils'

interface Props {
  section: ContextSection
  onChange: (content: string) => void
}

export function SectionPanel({ section, onChange }: Props) {
  const used = estimateTokens(section.content)
  const pct = Math.min(100, (used / section.tokenBudget) * 100)

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 overflow-hidden">
      <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/20 text-[10px] font-bold text-primary">
            {section.id}
          </span>
          <span className="text-xs font-medium text-neutral-300">{section.title}</span>
        </div>
        <span className={`text-[10px] font-mono ${pct > 90 ? 'text-destructive' : 'text-neutral-500'}`}>
          {used}/{section.tokenBudget}t
        </span>
      </div>
      <textarea
        value={section.content}
        onChange={(e) => onChange(e.target.value)}
        readOnly={!section.editable}
        rows={6}
        className={`w-full resize-none bg-transparent px-4 py-3 font-mono text-xs leading-relaxed text-neutral-300 placeholder:text-neutral-600 focus:outline-none ${
          !section.editable ? 'cursor-not-allowed opacity-50' : ''
        }`}
        placeholder={section.editable ? '输入当前感知数据...' : '此段由系统自动填充'}
        spellCheck={false}
      />
    </div>
  )
}
