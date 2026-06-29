// ========== NPC Persona ==========
export interface NpcTraits {
  greed: number
  patience: number
  aggression: number
  charisma: number
  loyalty: number
}

export type NpcRole = 'merchant' | 'quest_giver' | 'informant' | 'combat_ally' | 'artisan' | 'official'

export interface DailySchedule {
  startHour: number
  endHour: number
  activity: string
}

// ========== RimTalk 风格映射 ==========
export interface DialogueStyle {
  label: string
  description: string
  promptHint: string
}

export interface IntentMapping {
  intent: string
  weight: number
  description: string
}

// ========== Crawford 状态变量 ==========
export interface NpcRelationship {
  targetId: string
  targetType: 'player' | 'npc' | 'faction'
  trust: number
  affection: number
  fear: number
  tags: string[]
  lastUpdated: number
}

export interface EmotionState {
  primary: string
  intensity: number
  decayRate: number
  lastUpdated: number
}

export interface InclinationVariable {
  source: 'trait' | 'relationship' | 'emotion' | 'world_state'
  key: string
  weight: number
}

export interface InclinationFormula {
  actionType: string
  variables: InclinationVariable[]
  threshold: number
}

export interface NpcPersona {
  id: string
  name: string
  basePrompt: string
  traits: NpcTraits
  pinnedMemories: string[]
  roleTags: NpcRole[]
  faction: string
  region: string
  schedule: DailySchedule[]
  relationships: NpcRelationship[]
  currentEmotion: EmotionState
  inclinationFormulas: InclinationFormula[]
  dialogueStyles: DialogueStyle[]
  intentMappings: IntentMapping[]
}

// ========== Memory ==========
export interface Memory {
  id: string
  npcId: string
  timestamp: number
  summary: string
  importance: number
  pinned: boolean
}

// ========== Guardrails ==========
export type FallbackBehavior = 'idle' | 'call_guard' | 'leave' | 'continue'

export interface GlobalGuardrailSettings {
  antiOOC: boolean
  antiPromptInjection: boolean
  fallbackBehavior: FallbackBehavior
}

export interface GuardrailAxiom {
  id: string
  condition: string
  action: string
  enabled: boolean
}

// ========== Event Routing (保留接口兼容) ==========
export interface EventRoute {
  targetSystem: string
  mutation: string
}

export interface EventRoutingMap {
  [eventType: string]: EventRoute[]
}

// ========== Quest System ==========
export interface QuestReward {
  type: 'gold' | 'exp' | 'reputation' | 'item'
  value: string
  detail?: string
}

export interface QuestNode {
  id: string
  questId: string
  name: string
  type: 'dialogue' | 'combat' | 'collect' | 'escort' | 'explore' | 'deliver' | 'trigger'
  order: number
  triggerNpcId?: string
  triggerLocation?: string
  dialogueText?: string
  combatTarget?: string
  collectItems?: { itemId: string; count: number }[]
  completionCondition: string
  nextNodeId?: string
  isOptional: boolean
  rewards: QuestReward[]
}

export interface QuestInvolvedNpc {
  npcId: string
  role: string
}

export interface AiQuestSettings {
  triggerConditions: {
    npcAffectionMin?: number
    playerLevelMin?: number
    requiredItems?: string[]
    requiredFlags?: string[]
    requiredRegion?: string
  }
  triggerFrequency: { min: number; max: number; unit: 'visit' | 'minutes' }
  triggerChance: number
  questCategory: 'collect' | 'combat' | 'deliver' | 'escort' | 'explore'
  targetCountRange: { min: number; max: number }
  targetRegion: string
  rewardBoundaries: {
    gold: { min: number; max: number }
    exp: { min: number; max: number }
    reputation: { faction: string; min: number; max: number }
  }
  rareRewardChance: number
  rareRewardPool: { itemId: string; weight: number }[]
}

export interface QuestDefinition {
  id: string
  name: string
  category: 'main' | 'side' | 'ai_dynamic'
  minLevel: number
  maxLevel: number
  prerequisiteQuestId?: string
  nodes: QuestNode[]
  involvedNpcs: QuestInvolvedNpc[]
  aiSettings?: AiQuestSettings
}

// ========== Director AI ==========
export interface InterventionThreshold {
  highTension: number
  lowBoredom: number
}

export interface InterventionEvent {
  id: string
  name: string
  description: string
  tensionEffect: number
  category: string
}

export interface TensionDataPoint {
  time: number
  tension: number
}

// ========== Global Config ==========
export interface GlobalConfig {
  version: string
  npcs: Record<string, {
    base_prompt: string
    traits: NpcTraits
    pinned_memories: string[]
  }>
  guardrails: {
    condition: string
    override_action: string
    enabled: boolean
  }[]
  event_routing: EventRoutingMap
  director_settings: {
    thresholds: InterventionThreshold
    events: InterventionEvent[]
  }
}

// ========== Navigation ==========
export type ModuleId = 'guardrails' | 'npc_designer' | 'quest_network' | 'quest_editor' | 'director' | 'context' | 'sandbox'

// ========== WebSocket & Runtime ==========
export interface WebSocketMessage {
  type: string
  seq: number
  timestamp: number
  payload: Record<string, unknown>
}

export interface NpcStatusSnapshot {
  npcId: string
  action: string
  emotion: string
  state: string
}

export interface LlmCallLogEntry {
  npcId: string
  promptTokens: number
  completionTokens: number
  latencyMs: number
  actionOutput: string
  success: boolean
  timestamp: number
}

export interface GuardrailLogEntry {
  ruleId: string
  input: string
  interceptedAction: string
  timestamp: number
}

export interface InterventionLogEntry {
  reason: string
  selectedEvent: string
  result: string
  timestamp: number
}

export interface RuntimeState {
  connected: boolean
  npcStatuses: NpcStatusSnapshot[]
  llmCallLogs: LlmCallLogEntry[]
  guardrailLogs: GuardrailLogEntry[]
  interventionLogs: InterventionLogEntry[]
}

// ========== Context Assembly ==========
export interface ContextSection {
  id: 'A' | 'B' | 'C' | 'D'
  title: string
  content: string
  tokenBudget: number
  editable: boolean
}

export interface ContextAssembly {
  sections: ContextSection[]
  totalTokens: number
  budget: number
}
