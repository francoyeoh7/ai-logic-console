import { useConfigStore } from '../../useConfigStore'
import type { NpcPersona } from '../../types'
import { Brain, Users, Tag, MapPin, Clock, FileText } from 'lucide-react'

interface Props {
  npc: NpcPersona
}

export function NpcIdentityCard({ npc }: Props) {
  const quests = useConfigStore((s) => s.questDefinitions)
  const npcQuests = quests.filter((q) => q.involvedNpcs.some((inv) => inv.npcId === npc.id))

  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="text-xs font-semibold text-neutral-200">人格画像快照</h3>
        <p className="text-[10px] text-neutral-500">以下内容已注入 System Prompt</p>
      </div>

      <div className="rounded-md border border-neutral-800 bg-neutral-900/50 p-3 space-y-1">
        <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
          <Tag className="h-3 w-3" /> 角色
        </div>
        <p className="text-[11px] text-neutral-200">{(npc.roleTags ?? []).join('、') || '未定义'}</p>
      </div>

      <div className="rounded-md border border-neutral-800 bg-neutral-900/50 p-3 space-y-1">
        <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
          <Brain className="h-3 w-3" /> 性格
        </div>
        <div className="text-[10px] space-y-0.5">
          {Object.entries(npc.traits).map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span className="text-neutral-500">{k}</span>
              <span className={`font-mono ${v > 65 ? 'text-red-400' : v < 35 ? 'text-blue-400' : 'text-neutral-300'}`}>
                {v}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-md border border-neutral-800 bg-neutral-900/50 p-3 space-y-1">
        <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
          <Users className="h-3 w-3" /> 关系 ({npc.relationships?.length ?? 0})
        </div>
        {(npc.relationships ?? []).slice(0, 5).map((r) => (
          <div key={r.targetId} className="text-[10px] flex justify-between">
            <span className="text-neutral-300">{r.targetType === 'player' ? '玩家' : r.targetId}</span>
            <span className="text-neutral-500">
              T{r.trust}/A{r.affection}/F{r.fear}
            </span>
          </div>
        ))}
      </div>

      <div className="rounded-md border border-neutral-800 bg-neutral-900/50 p-3 space-y-1">
        <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
          <FileText className="h-3 w-3" /> 对话风格
        </div>
        {(npc.dialogueStyles ?? []).length === 0 ? (
          <p className="text-[10px] text-neutral-600">无</p>
        ) : (
          (npc.dialogueStyles ?? []).map((s) => (
            <div key={s.label} className="text-[10px]">
              <span className="font-medium text-neutral-200">{s.label}</span>
              <span className="text-neutral-500 ml-1">{s.description}</span>
            </div>
          ))
        )}
      </div>

      <div className="rounded-md border border-neutral-800 bg-neutral-900/50 p-3 space-y-1">
        <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
          <FileText className="h-3 w-3" /> 关联任务 ({npcQuests.length})
        </div>
        {npcQuests.length === 0 ? (
          <p className="text-[10px] text-neutral-600">无</p>
        ) : (
          npcQuests.map((q) => (
            <div key={q.id} className="text-[10px]">
              <span className={`font-medium ${q.category === 'main' ? 'text-red-400' : q.category === 'side' ? 'text-emerald-400' : 'text-neutral-400'}`}>
                {q.category === 'main' ? '主' : q.category === 'side' ? '支' : 'AI'}
              </span>
              <span className="text-neutral-300 ml-1">{q.name}</span>
            </div>
          ))
        )}
      </div>

      <div className="rounded-md border border-neutral-800 bg-neutral-900/50 p-3 space-y-1">
        <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
          <MapPin className="h-3 w-3" /> 区域
          <span className="ml-auto text-neutral-300">{npc.region || '未知'}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
          <Clock className="h-3 w-3" /> 节律
          <span className="ml-auto text-neutral-300">{(npc.schedule ?? []).length} 个时段</span>
        </div>
      </div>
    </div>
  )
}
