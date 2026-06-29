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
  const roleHints: Record<string, string> = {
    merchant: '你是卖家/商人。你提供商品或服务，别人向你购买。你报价，对方还价。你不想降价。',
    quest_giver: '你是任务发布者。你有事需要别人去做，你可以提供报酬。你不是被雇佣的那个人。',
    informant: '你掌握信息。别人来找你打听。你可以选择收费或免费分享。你有信息发布的主动权。',
    combat_ally: '你是战斗伙伴。你帮别人打架，不是雇佣兵——你是出于自己的原因帮忙。',
  }

  const roleLines = (npc.roleTags ?? []).map((r) => roleHints[r]).filter(Boolean)
  parts.push(`[角色定位]
类型: ${(npc.roleTags ?? []).join('、') || '无'}
阵营: ${npc.faction || '无'}
所属区域: ${npc.region || '未知'}
${roleLines.length > 0 ? '你的社交立场:\n' + roleLines.join('\n') + '\n' : ''}
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

  // 9. 输出格式 (精简版)
  parts.push(`[输出格式]
JSON: {"action":"SPEAK","params":{"target":"player","message":"你的对话"},"emotion":"neutral","priority":0.3,"reasoning":"原因"}
你直接说话，不写旁白。体现你的性格。`)

  return parts.join('\n')
}
