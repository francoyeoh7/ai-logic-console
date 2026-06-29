// ========== NPC Persona ==========
export interface NpcTraits {
  greed: number
  patience: number
  aggression: number
  charisma: number
  loyalty: number
}

export interface NpcPersona {
  id: string
  name: string
  basePrompt: string
  traits: NpcTraits
  pinnedMemories: string[]
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

// ========== Event Routing ==========
export interface EventRoute {
  targetSystem: string
  mutation: string
}

export interface EventRoutingMap {
  [eventType: string]: EventRoute[]
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
export type ModuleId = 'persona' | 'guardrails' | 'eventbus' | 'director'
