import { useState } from 'react'
import { Plus, X, GripVertical } from 'lucide-react'
import { useConfigStore } from '../../useConfigStore'

export function AxiomBuilder() {
  const axioms = useConfigStore((s) => s.axioms)
  const toggleAxiom = useConfigStore((s) => s.toggleAxiom)
  const addAxiom = useConfigStore((s) => s.addAxiom)
  const removeAxiom = useConfigStore((s) => s.removeAxiom)

  const [showNew, setShowNew] = useState(false)
  const [newCondition, setNewCondition] = useState('')
  const [newAction, setNewAction] = useState('')

  const handleAdd = () => {
    if (!newCondition.trim() || !newAction.trim()) return
    addAxiom({
      id: `ax-${Date.now()}`,
      condition: newCondition.trim(),
      action: newAction.trim(),
      enabled: true,
    })
    setNewCondition('')
    setNewAction('')
    setShowNew(false)
  }

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-neutral-300">公理构建器</h3>
        <button
          onClick={() => setShowNew(!showNew)}
          className="flex items-center gap-1 rounded-md border border-primary/30 px-2 py-1 text-[10px] text-primary hover:bg-primary/10"
        >
          <Plus className="h-3 w-3" />
          添加公理
        </button>
      </div>

      {showNew && (
        <div className="mb-4 rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2">
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-neutral-400">IF</span>
            <input
              value={newCondition}
              onChange={(e) => setNewCondition(e.target.value)}
              placeholder="player.level < 10 && request == 'buy_legendary'"
              className="flex-1 rounded border border-neutral-700 bg-neutral-900 px-2 py-1.5 font-mono text-xs text-neutral-200 placeholder:text-neutral-600"
            />
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-neutral-400">THEN</span>
            <input
              value={newAction}
              onChange={(e) => setNewAction(e.target.value)}
              placeholder="FORCE_REJECT"
              className="flex-1 rounded border border-neutral-700 bg-neutral-900 px-2 py-1.5 font-mono text-xs text-neutral-200 placeholder:text-neutral-600"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowNew(false)} className="rounded px-2 py-1 text-[10px] text-neutral-500 hover:text-neutral-300">
              取消
            </button>
            <button onClick={handleAdd} className="rounded bg-primary/20 px-2 py-1 text-[10px] text-primary hover:bg-primary/30">
              确认添加
            </button>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        {axioms.map((axiom) => (
          <div
            key={axiom.id}
            className={`flex items-center gap-2 rounded-md border p-2.5 transition-all ${
              axiom.enabled
                ? 'border-neutral-800 bg-neutral-900'
                : 'border-neutral-800/50 bg-neutral-900/30 opacity-60'
            }`}
          >
            <GripVertical className="h-3.5 w-3.5 shrink-0 text-neutral-600" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] font-mono">
                <span className="text-cyan-400">IF</span>
                <span className="truncate text-neutral-300">{axiom.condition}</span>
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[10px] font-mono">
                <span className="text-yellow-400">THEN</span>
                <span className="text-amber-300">{axiom.action}</span>
              </div>
            </div>
            <button
              onClick={() => toggleAxiom(axiom.id)}
              className={`rounded px-1.5 py-0.5 text-[9px] transition-colors ${
                axiom.enabled ? 'bg-primary/20 text-primary' : 'bg-neutral-800 text-neutral-500'
              }`}
            >
              {axiom.enabled ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={() => removeAxiom(axiom.id)}
              className="rounded p-0.5 text-neutral-600 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
