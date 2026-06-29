/**
 * 编译 NPC 完整人格画像 → System Prompt
 */
import type { NpcPersona, QuestDefinition } from '../../types'

export function compileNpcIdentity(npc: NpcPersona, quests: QuestDefinition[]): string {
  const parts: string[] = []

  // 1. 核心人设
  parts.push(`[核心人设]
${npc.basePrompt}
`)

  // 2. 性格数值
  const traitLabels: Record<string, string> = {
    greed: '贪婪', patience: '耐心', aggression: '攻击性', charisma: '魅力', loyalty: '忠诚',
  }
  const traitDesc = Object.entries(npc.traits)
    .map(([k, v]) => `${traitLabels[k] ?? k}: ${v}`)
    .join(', ')
  parts.push(`[性格数值]
${traitDesc}
`)

  // 3. 角色定位
  parts.push(`[角色定位]
类型: ${(npc.roleTags ?? []).join('、') || '无'}
阵营: ${npc.faction || '无'}
所属区域: ${npc.region || '未知'}
${(npc.schedule ?? []).length > 0 ? '日常: ' + npc.schedule.map((s) => `${s.startHour}:00-${s.endHour}:00 ${s.activity}`).join('; ') : ''}
`)

  // 4. 关系网络
  if ((npc.relationships ?? []).length > 0) {
    const rels = npc.relationships.map((r) => {
      const target = r.targetType === 'player' ? '玩家' : r.targetId
      return `  - ${target}: 信任${r.trust}/好感${r.affection}/敬畏${r.fear}${r.tags.length > 0 ? ' [' + r.tags.join(',') + ']' : ''}`
    }).join('\n')
    parts.push(`[关系网络]
${rels}
`)
  }

  // 5. 对话风格
  if ((npc.dialogueStyles ?? []).length > 0) {
    const hints = npc.dialogueStyles.map((s) => `  - ${s.label}: ${s.promptHint}`).join('\n')
    parts.push(`[对话风格]
${hints}

你必须严格遵循以上对话风格说话。`)
  }

  // 6. 行为倾向
  if ((npc.inclinationFormulas ?? []).length > 0) {
    const formulas = npc.inclinationFormulas.map((f) => {
      const vars = f.variables.map((v) => v.key).join(', ')
      return `  - ${f.actionType}: 受${vars}影响 (阈值${f.threshold})`
    }).join('\n')
    parts.push(`[行为倾向]
${formulas}
`)
  }

  // 7. 当前情绪
  if (npc.currentEmotion) {
    parts.push(`[当前情绪]
主导: ${npc.currentEmotion.primary}, 强度: ${npc.currentEmotion.intensity}
`)
  }

  // 8. 关联任务
  const npcQuests = quests.filter((q) => q.involvedNpcs.some((inv) => inv.npcId === npc.id))
  if (npcQuests.length > 0) {
    const questLines = npcQuests.map((q) => {
      const role = q.involvedNpcs.find((inv) => inv.npcId === npc.id)?.role ?? '参与者'
      const cat = q.category === 'main' ? '主线' : q.category === 'side' ? '支线' : 'AI动态'
      return `  - [${cat}] ${q.name} (角色: ${role}, Lv.${q.minLevel}-${q.maxLevel})`
    }).join('\n')
    parts.push(`[关联任务·背景版]
你参与以下任务。你的对话可能自然涉及这些内容，但不要生硬地"派任务"：
${questLines}
`)
  }

  // 9. 输出格式
  parts.push(`[输出格式要求]
你必须输出一个 JSON 对象，字段如下:
- action: 必须是以下之一 [SPEAK, OBSERVE, DO_NOTHING, MOVE_TO, FLEE_FROM, GIVE_ITEM, SHOUT_WARNING]
- params: 动作参数。SPEAK 的时候必须有 {"target":"player","message":"你的对话内容"}
- emotion: 情绪标签 [neutral,happy,sad,angry,fearful,surprised,disgusted]
- priority: 0.0 到 1.0 的紧迫程度
- reasoning: 简短推理原因 (≤20字)

你的 message 是你真正说的话——不是旁白、不是叙述。说话时直接说，不要写"老韩说:"之类的。
你应该体现你的性格、关系、当前情绪。不要回复模板化的客套话。

示例: {"action":"SPEAK","params":{"target":"player","message":"哈！又是你！这次别再把杯子打碎了！"},"emotion":"angry","priority":0.4,"reasoning":"remembering_previous_incident"}`)

  return parts.join('\n')
}
