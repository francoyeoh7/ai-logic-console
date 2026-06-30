/**
 * 将控制台配置导出为 UE5 DataTable 兼容 JSON 格式
 * UE5 DataTable JSON 格式:
 * [
 *   { "Name": "RowName", ...fields },
 *   ...
 * ]
 */
import type { NpcPersona, QuestDefinition, GuardrailAxiom } from '../types'

interface Ue5DataTableRow {
  Name: string
  [key: string]: unknown
}

function npcToDataTableRow(npc: NpcPersona): Ue5DataTableRow {
  return {
    Name: npc.id,
    DisplayName: npc.name,
    BasePrompt: npc.basePrompt,
    Greed: npc.traits.greed,
    Patience: npc.traits.patience,
    Aggression: npc.traits.aggression,
    Charisma: npc.traits.charisma,
    Loyalty: npc.traits.loyalty,
    RoleTags: (npc.roleTags ?? []).join(';'),
    Faction: npc.faction ?? '',
    Region: npc.region ?? '',
    Schedule: (npc.schedule ?? []).map((s) => `${s.startHour}-${s.endHour}:${s.activity}`).join('|'),
    Relationships: (npc.relationships ?? []).map((r) => `${r.targetId}:${r.targetType}:T${r.trust}/A${r.affection}/F${r.fear}:${r.tags.join(',')}`).join('|'),
    DialogueStyles: (npc.dialogueStyles ?? []).map((s) => `${s.label}=${s.promptHint}`).join('|'),
    CurrentEmotion: `${npc.currentEmotion?.primary ?? 'neutral'}:${npc.currentEmotion?.intensity ?? 0}`,
  }
}

function questToDataTableRow(quest: QuestDefinition): Ue5DataTableRow {
  return {
    Name: quest.id,
    DisplayName: quest.name,
    Category: quest.category,
    MinLevel: quest.minLevel,
    MaxLevel: quest.maxLevel,
    PrerequisiteQuestId: quest.prerequisiteQuestId ?? '',
    NodesJson: JSON.stringify(quest.nodes),
    InvolvedNpcsJson: JSON.stringify(quest.involvedNpcs),
    AiSettingsJson: quest.aiSettings ? JSON.stringify(quest.aiSettings) : '',
  }
}

function axiomToDataTableRow(axiom: GuardrailAxiom): Ue5DataTableRow {
  return {
    Name: axiom.id,
    Condition: axiom.condition,
    Action: axiom.action,
    Enabled: axiom.enabled ? 1 : 0,
  }
}

export interface ExportBundle {
  npcTable: Ue5DataTableRow[]
  questTable: Ue5DataTableRow[]
  guardrailTable: Ue5DataTableRow[]
}

export function exportAllForUe5(
  npcs: NpcPersona[],
  quests: QuestDefinition[],
  axioms: GuardrailAxiom[],
): ExportBundle {
  return {
    npcTable: npcs.map(npcToDataTableRow),
    questTable: quests.map(questToDataTableRow),
    guardrailTable: axioms.map(axiomToDataTableRow),
  }
}

export function downloadJsonFile(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
