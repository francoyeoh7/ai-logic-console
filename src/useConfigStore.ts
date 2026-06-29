import { create } from 'zustand'
import type {
  NpcPersona,
  Memory,
  GlobalGuardrailSettings,
  GuardrailAxiom,
  EventRoutingMap,
  InterventionThreshold,
  InterventionEvent,
  TensionDataPoint,
  GlobalConfig,
  ModuleId,
} from '../types'

// ========== Mock Data ==========
const mockNpcs: NpcPersona[] = [
  {
    id: 'tavern_keeper',
    name: '酒馆老板 · 老韩',
    basePrompt: '你是一个脾气暴躁的老头，在乱世中经营着一家破旧的酒馆。你讨厌闹事者，但对真正的英雄怀有敬意。你说话粗鲁但心地善良。',
    traits: { greed: 80, patience: 20, aggression: 60, charisma: 40, loyalty: 70 },
    pinnedMemories: ['mem-001', 'mem-002'],
  },
  {
    id: 'mysterious_merchant',
    name: '神秘游商 · 菲娜',
    basePrompt: '你是一个来历不明的游商，行踪飘忽。你对稀有物品有着近乎痴迷的执着，总是用谜语般的话语与人交谈。你从不透露自己的过去。',
    traits: { greed: 90, patience: 50, aggression: 10, charisma: 85, loyalty: 15 },
    pinnedMemories: ['mem-003'],
  },
  {
    id: 'guard_captain',
    name: '卫队长 · 艾德',
    basePrompt: '你是王城的卫队长，严肃、正直、一丝不苟。你对法律有着绝对的忠诚，但内心深处也明白世道的不公。你不会被贿赂，但可能被正义的理由说服。',
    traits: { greed: 10, patience: 70, aggression: 50, charisma: 60, loyalty: 95 },
    pinnedMemories: [],
  },
  {
    id: 'alchemist',
    name: '炼金术士 · 希尔',
    basePrompt: '你是一个隐居的炼金术士，痴迷于知识的探索。你对来访者既警惕又好奇，渴望有人能理解你的研究。你说话充满学术用语。',
    traits: { greed: 30, patience: 85, aggression: 5, charisma: 50, loyalty: 40 },
    pinnedMemories: ['mem-004'],
  },
]

const mockMemories: Memory[] = [
  { id: 'mem-001', npcId: 'tavern_keeper', timestamp: Date.now() - 3600000, summary: '玩家帮助老韩赶走了闹事的强盗', importance: 8, pinned: true },
  { id: 'mem-002', npcId: 'tavern_keeper', timestamp: Date.now() - 7200000, summary: '玩家在老韩面前展示了罕见的龙鳞碎片', importance: 6, pinned: true },
  { id: 'mem-003', npcId: 'mysterious_merchant', timestamp: Date.now() - 1800000, summary: '玩家用一块古代符文换取了菲娜的信任', importance: 9, pinned: true },
  { id: 'mem-004', npcId: 'alchemist', timestamp: Date.now() - 900000, summary: '玩家正确地解答了希尔的炼金谜题', importance: 7, pinned: true },
  { id: 'mem-005', npcId: 'tavern_keeper', timestamp: Date.now() - 600000, summary: '玩家在酒馆打碎了一个杯子', importance: 2, pinned: false },
  { id: 'mem-006', npcId: 'guard_captain', timestamp: Date.now() - 300000, summary: '玩家在城门与卫兵发生口角', importance: 4, pinned: false },
  { id: 'mem-007', npcId: 'mysterious_merchant', timestamp: Date.now() - 450000, summary: '菲娜向玩家透露了一个关于龙墓的传说', importance: 7, pinned: false },
  { id: 'mem-008', npcId: 'tavern_keeper', timestamp: Date.now() - 120000, summary: '玩家点了一杯最贵的麦酒', importance: 1, pinned: false },
  { id: 'mem-009', npcId: 'alchemist', timestamp: Date.now() - 240000, summary: '玩家带来了一种罕见的月光草样本', importance: 5, pinned: false },
]

const mockGuardrailSettings: GlobalGuardrailSettings = {
  antiOOC: true,
  antiPromptInjection: true,
  fallbackBehavior: 'idle',
}

const mockAxioms: GuardrailAxiom[] = [
  { id: 'ax-1', condition: 'player.level < 10 && request == "buy_legendary"', action: 'FORCE_REJECT', enabled: true },
  { id: 'ax-2', condition: 'npc.is_hostile && player.action == "negotiate"', action: 'FORCE_ATTACK', enabled: true },
  { id: 'ax-3', condition: 'player.inventory.contains("royal_seal") && npc.is_guard', action: 'FORCE_RESPECT', enabled: false },
]

const mockEventRouting: EventRoutingMap = {
  NPC_INSULTED: [
    { targetSystem: 'reputation', mutation: '-30' },
    { targetSystem: 'economy', mutation: 'multiplier:0.5' },
  ],
  NPC_GIFTED: [
    { targetSystem: 'affection', mutation: '+45' },
    { targetSystem: 'reputation', mutation: '+10' },
  ],
  PLAYER_THEFT: [
    { targetSystem: 'wanted_level', mutation: '+1' },
    { targetSystem: 'reputation', mutation: '-50' },
    { targetSystem: 'economy', mutation: '-100' },
  ],
  QUEST_COMPLETED: [
    { targetSystem: 'reputation', mutation: '+25' },
    { targetSystem: 'experience', mutation: '+500' },
    { targetSystem: 'affection', mutation: '+15' },
  ],
  NPC_KILLED: [
    { targetSystem: 'wanted_level', mutation: '+3' },
    { targetSystem: 'reputation', mutation: '-100' },
    { targetSystem: 'world_state', mutation: 'remove_entity' },
  ],
}

const mockThresholds: InterventionThreshold = {
  highTension: 80,
  lowBoredom: 25,
}

const mockInterventionEvents: InterventionEvent[] = [
  { id: 'ev-1', name: '天降大雨', description: '天气骤变，降低所有户外活动的视野和移动速度', tensionEffect: -15, category: 'environment' },
  { id: 'ev-2', name: '黑帮抢劫', description: '一伙强盗突然出现，试图抢劫玩家', tensionEffect: +40, category: 'combat' },
  { id: 'ev-3', name: '游商路过', description: '一位神秘商人恰好经过，提供稀有物品交易', tensionEffect: -10, category: 'opportunity' },
  { id: 'ev-4', name: '卫兵巡逻', description: '一队卫兵出现在附近巡逻，遏制潜在的暴力行为', tensionEffect: -20, category: 'security' },
  { id: 'ev-5', name: '野兽袭击', description: '一头饥饿的野兽从暗处发起突袭', tensionEffect: +35, category: 'combat' },
  { id: 'ev-6', name: '发现遗迹', description: '玩家意外发现了一处古老的地下遗迹入口', tensionEffect: +15, category: 'exploration' },
]

const mockTensionData: TensionDataPoint[] = Array.from({ length: 60 }, (_, i) => ({
  time: i,
  tension: 40 + Math.sin(i / 8) * 25 + Math.random() * 15,
}))

// ========== Store ==========
interface ConfigStore {
  // Navigation
  activeModule: ModuleId
  setActiveModule: (m: ModuleId) => void

  // NPCs
  npcs: NpcPersona[]
  memories: Memory[]
  selectedNpcId: string | null
  selectNpc: (id: string) => void
  updateNpcPrompt: (id: string, prompt: string) => void
  updateNpcTraits: (id: string, traits: Partial<NpcPersona['traits']>) => void
  pinMemory: (memoryId: string) => void
  forgetMemory: (memoryId: string) => void

  // Guardrails
  guardrailSettings: GlobalGuardrailSettings
  axioms: GuardrailAxiom[]
  updateGuardrailSetting: (key: keyof GlobalGuardrailSettings, value: boolean | string) => void
  toggleAxiom: (id: string) => void
  addAxiom: (axiom: GuardrailAxiom) => void
  removeAxiom: (id: string) => void

  // Event Routing
  eventRouting: EventRoutingMap
  updateEventRoute: (eventType: string, routes: EventRoutingMap[string]) => void
  addEventType: (eventType: string) => void
  removeEventType: (eventType: string) => void

  // Director
  thresholds: InterventionThreshold
  interventionEvents: InterventionEvent[]
  tensionData: TensionDataPoint[]
  updateThreshold: (key: keyof InterventionThreshold, value: number) => void
  addTensionPoint: (point: TensionDataPoint) => void
  injectEvent: (eventId: string) => void

  // Export
  exportGlobalConfig: () => GlobalConfig
}

export const useConfigStore = create<ConfigStore>((set, get) => ({
  activeModule: 'persona',
  setActiveModule: (m) => set({ activeModule: m }),

  // NPCs
  npcs: mockNpcs,
  memories: mockMemories,
  selectedNpcId: mockNpcs[0]?.id ?? null,
  selectNpc: (id) => set({ selectedNpcId: id }),
  updateNpcPrompt: (id, prompt) =>
    set((s) => ({
      npcs: s.npcs.map((n) => (n.id === id ? { ...n, basePrompt: prompt } : n)),
    })),
  updateNpcTraits: (id, traits) =>
    set((s) => ({
      npcs: s.npcs.map((n) => (n.id === id ? { ...n, traits: { ...n.traits, ...traits } } : n)),
    })),
  pinMemory: (memoryId) =>
    set((s) => {
      const mem = s.memories.find((m) => m.id === memoryId)
      if (!mem) return s
      const updated = s.memories.map((m) => (m.id === memoryId ? { ...m, pinned: true } : m))
      const npcs = s.npcs.map((n) =>
        n.id === mem.npcId && !n.pinnedMemories.includes(memoryId)
          ? { ...n, pinnedMemories: [...n.pinnedMemories, memoryId] }
          : n
      )
      return { memories: updated, npcs }
    }),
  forgetMemory: (memoryId) =>
    set((s) => {
      const mem = s.memories.find((m) => m.id === memoryId)
      if (!mem) return s
      const updated = s.memories.map((m) => (m.id === memoryId ? { ...m, pinned: false } : m))
      const npcs = s.npcs.map((n) =>
        n.id === mem.npcId
          ? { ...n, pinnedMemories: n.pinnedMemories.filter((pm) => pm !== memoryId) }
          : n
      )
      return { memories: updated, npcs }
    }),

  // Guardrails
  guardrailSettings: mockGuardrailSettings,
  axioms: mockAxioms,
  updateGuardrailSetting: (key, value) =>
    set((s) => ({
      guardrailSettings: { ...s.guardrailSettings, [key]: value },
    })),
  toggleAxiom: (id) =>
    set((s) => ({
      axioms: s.axioms.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)),
    })),
  addAxiom: (axiom) => set((s) => ({ axioms: [...s.axioms, axiom] })),
  removeAxiom: (id) => set((s) => ({ axioms: s.axioms.filter((a) => a.id !== id) })),

  // Event Routing
  eventRouting: mockEventRouting,
  updateEventRoute: (eventType, routes) =>
    set((s) => ({
      eventRouting: { ...s.eventRouting, [eventType]: routes },
    })),
  addEventType: (eventType) =>
    set((s) => {
      if (s.eventRouting[eventType]) return s
      return { eventRouting: { ...s.eventRouting, [eventType]: [] } }
    }),
  removeEventType: (eventType) =>
    set((s) => {
      const { [eventType]: _, ...rest } = s.eventRouting
      return { eventRouting: rest }
    }),

  // Director
  thresholds: mockThresholds,
  interventionEvents: mockInterventionEvents,
  tensionData: mockTensionData,
  updateThreshold: (key, value) =>
    set((s) => ({
      thresholds: { ...s.thresholds, [key]: value },
    })),
  addTensionPoint: (point) =>
    set((s) => ({
      tensionData: [...s.tensionData.slice(-59), point],
    })),
  injectEvent: (eventId) => {
    const event = get().interventionEvents.find((e) => e.id === eventId)
    if (!event) return
    const now = get().tensionData.length
    set((s) => ({
      tensionData: [
        ...s.tensionData,
        { time: now, tension: Math.min(100, Math.max(0, s.tensionData[s.tensionData.length - 1]?.tension ?? 50 + event.tensionEffect)) },
      ],
    }))
  },

  // Export
  exportGlobalConfig: () => {
    const s = get()
    const npcs: GlobalConfig['npcs'] = {}
    for (const npc of s.npcs) {
      npcs[npc.id] = {
        base_prompt: npc.basePrompt,
        traits: npc.traits,
        pinned_memories: npc.pinnedMemories,
      }
    }
    return {
      version: '1.0.0',
      npcs,
      guardrails: s.axioms
        .filter((a) => a.enabled)
        .map((a) => ({ condition: a.condition, override_action: a.action, enabled: a.enabled })),
      event_routing: s.eventRouting,
      director_settings: {
        thresholds: s.thresholds,
        events: s.interventionEvents,
      },
    }
  },
}))
