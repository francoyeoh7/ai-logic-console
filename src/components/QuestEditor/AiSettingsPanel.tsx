import { useConfigStore } from '../../useConfigStore'
import type { QuestDefinition } from '../../types'
import { Plus, Trash2 } from 'lucide-react'

interface Props {
  quest: QuestDefinition
}

export function AiSettingsPanel({ quest }: Props) {
  const updateQuest = useConfigStore((s) => s.updateQuest)
  const s = quest.aiSettings
  if (!s) return null

  const updateAi = (partial: Partial<typeof s>) => {
    updateQuest(quest.id, { aiSettings: { ...s, ...partial } })
  }

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4 space-y-4">
      <h3 className="text-xs font-semibold text-neutral-300">AI 支线设置</h3>

      <div>
        <label className="mb-2 block text-[10px] text-neutral-500">触发条件</label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-[9px] text-neutral-400">NPC 好感度 ≥</span>
            <input type="number" value={s.triggerConditions.npcAffectionMin ?? ''} onChange={(e) => updateAi({ triggerConditions: { ...s.triggerConditions, npcAffectionMin: Number(e.target.value) || undefined } })} className="w-full rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-[10px] text-neutral-200 mt-0.5" />
          </div>
          <div>
            <span className="text-[9px] text-neutral-400">玩家等级 ≥</span>
            <input type="number" value={s.triggerConditions.playerLevelMin ?? ''} onChange={(e) => updateAi({ triggerConditions: { ...s.triggerConditions, playerLevelMin: Number(e.target.value) || undefined } })} className="w-full rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-[10px] text-neutral-200 mt-0.5" />
          </div>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-[10px] text-neutral-500">触发频率</label>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-neutral-400">每</span>
          <input type="number" value={s.triggerFrequency.min} onChange={(e) => updateAi({ triggerFrequency: { ...s.triggerFrequency, min: Number(e.target.value) } })} className="w-14 rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-[10px] text-neutral-200" />
          <span className="text-[9px] text-neutral-400">~</span>
          <input type="number" value={s.triggerFrequency.max} onChange={(e) => updateAi({ triggerFrequency: { ...s.triggerFrequency, max: Number(e.target.value) } })} className="w-14 rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-[10px] text-neutral-200" />
          <span className="text-[9px] text-neutral-400">次{ s.triggerFrequency.unit === 'visit' ? '访问' : '分钟'}触发</span>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-[10px] text-neutral-500">任务边界</label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-[9px] text-neutral-400">类型</span>
            <select value={s.questCategory} onChange={(e) => updateAi({ questCategory: e.target.value as typeof s.questCategory })} className="w-full rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-[10px] text-neutral-200 mt-0.5">
              <option value="collect">收集</option>
              <option value="combat">战斗</option>
              <option value="deliver">递送</option>
            </select>
          </div>
          <div>
            <span className="text-[9px] text-neutral-400">目标数量</span>
            <div className="flex items-center gap-1 mt-0.5">
              <input type="number" value={s.targetCountRange.min} onChange={(e) => updateAi({ targetCountRange: { ...s.targetCountRange, min: Number(e.target.value) } })} className="w-12 rounded border border-neutral-700 bg-neutral-800 px-1 py-1 text-[10px] text-neutral-200" />
              <span className="text-[9px] text-neutral-400">~</span>
              <input type="number" value={s.targetCountRange.max} onChange={(e) => updateAi({ targetCountRange: { ...s.targetCountRange, max: Number(e.target.value) } })} className="w-12 rounded border border-neutral-700 bg-neutral-800 px-1 py-1 text-[10px] text-neutral-200" />
            </div>
          </div>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-[10px] text-neutral-500">奖励边界</label>
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div>
            <span className="text-[9px] text-neutral-400">金币</span>
            <div className="flex items-center gap-1 mt-0.5">
              <input type="number" value={s.rewardBoundaries.gold.min} onChange={(e) => updateAi({ rewardBoundaries: { ...s.rewardBoundaries, gold: { ...s.rewardBoundaries.gold, min: Number(e.target.value) } } })} className="w-14 rounded border border-neutral-700 bg-neutral-800 px-1 py-1 text-neutral-200" />
              <span className="text-[9px] text-neutral-400">~</span>
              <input type="number" value={s.rewardBoundaries.gold.max} onChange={(e) => updateAi({ rewardBoundaries: { ...s.rewardBoundaries, gold: { ...s.rewardBoundaries.gold, max: Number(e.target.value) } } })} className="w-14 rounded border border-neutral-700 bg-neutral-800 px-1 py-1 text-neutral-200" />
            </div>
          </div>
          <div>
            <span className="text-[9px] text-neutral-400">经验</span>
            <div className="flex items-center gap-1 mt-0.5">
              <input type="number" value={s.rewardBoundaries.exp.min} onChange={(e) => updateAi({ rewardBoundaries: { ...s.rewardBoundaries, exp: { ...s.rewardBoundaries.exp, min: Number(e.target.value) } } })} className="w-14 rounded border border-neutral-700 bg-neutral-800 px-1 py-1 text-neutral-200" />
              <span className="text-[9px] text-neutral-400">~</span>
              <input type="number" value={s.rewardBoundaries.exp.max} onChange={(e) => updateAi({ rewardBoundaries: { ...s.rewardBoundaries, exp: { ...s.rewardBoundaries.exp, max: Number(e.target.value) } } })} className="w-14 rounded border border-neutral-700 bg-neutral-800 px-1 py-1 text-neutral-200" />
            </div>
          </div>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-[10px] text-neutral-500">
          稀有奖励 · 触发概率: {s.rareRewardChance}%
        </label>
        <input type="range" min={0} max={100} value={s.rareRewardChance} onChange={(e) => updateAi({ rareRewardChance: Number(e.target.value) })} className="w-full" />
        <div className="mt-2 space-y-1">
          {s.rareRewardPool.map((item, i) => (
            <div key={i} className="flex items-center gap-2 rounded border border-neutral-700 bg-neutral-800 px-2 py-1">
              <input value={item.itemId} onChange={(e) => {
                const pool = [...s.rareRewardPool]
                pool[i] = { ...pool[i], itemId: e.target.value }
                updateAi({ rareRewardPool: pool })
              }} className="flex-1 bg-transparent text-[10px] text-neutral-200 outline-none" />
              <span className="text-[9px] text-neutral-500">权重:</span>
              <input type="number" value={item.weight} onChange={(e) => {
                const pool = [...s.rareRewardPool]
                pool[i] = { ...pool[i], weight: Number(e.target.value) }
                updateAi({ rareRewardPool: pool })
              }} className="w-10 rounded border border-neutral-700 bg-neutral-800 px-1 py-0.5 text-[10px] text-neutral-200" />
              <button onClick={() => {
                updateAi({ rareRewardPool: s.rareRewardPool.filter((_, j) => j !== i) })
              }} className="p-0.5 text-neutral-600 hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
            </div>
          ))}
          <button onClick={() => updateAi({ rareRewardPool: [...s.rareRewardPool, { itemId: 'new_item', weight: 1 }] })} className="flex items-center gap-1 text-[10px] text-neutral-500 hover:text-neutral-300">
            <Plus className="h-3 w-3" /> 添加稀有奖励
          </button>
        </div>
      </div>
    </div>
  )
}
