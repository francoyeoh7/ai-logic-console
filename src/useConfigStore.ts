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
  NpcStatusSnapshot,
  RuntimeDirectorMetrics,
  RuntimeMemoryRecord,
  RuntimeSocialBeat,
  LlmCallLogEntry,
  GuardrailLogEntry,
  InterventionLogEntry,
  ContextSection,
  NpcRole,
  QuestDefinition,
  QuestNode,
  WebSocketMessage,
} from './types'
import type { ActionCategory, ActionDefinition } from './types/actions'
import { wsClient } from './services/websocket'
import { llmService } from './services/llmService'
import { generateDialogueStylesFromTraits, getDefaultIntentMappings } from './lib/styleGenerator'
import { generateGbnfGrammar } from './services/gbnfGenerator'

// ========== Mock Data ==========
const mockNpcs: NpcPersona[] = [
  {
    id: 'tavern_keeper',
    name: '酒馆老板 · 老韩',
    basePrompt: '你是一个脾气暴躁的老头，在乱世中经营着一家破旧的酒馆。你讨厌闹事者，但对真正的英雄怀有敬意。你说话粗鲁但心地善良。',
    traits: { greed: 80, patience: 20, aggression: 60, charisma: 40, loyalty: 70 },
    pinnedMemories: ['mem-001', 'mem-002'],
    roleTags: ['merchant', 'informant'] as NpcRole[],
    faction: '风语镇',
    region: '风语镇 · 酒馆',
    schedule: [
      { startHour: 6, endHour: 8, activity: '起床/用餐' },
      { startHour: 8, endHour: 22, activity: '营业中' },
      { startHour: 22, endHour: 6, activity: '休息' },
    ],
    relationships: [
      { targetId: 'player', targetType: 'player', trust: 50, affection: 60, fear: 30, tags: ['观望中'], lastUpdated: Date.now() },
      { targetId: 'guard_captain', targetType: 'npc', trust: 80, affection: 70, fear: 25, tags: ['老朋友'], lastUpdated: Date.now() },
      { targetId: 'mysterious_merchant', targetType: 'npc', trust: 20, affection: 30, fear: 10, tags: ['戒备'], lastUpdated: Date.now() },
    ],
    currentEmotion: { primary: 'neutral', intensity: 0.2, decayRate: 0.05, lastUpdated: Date.now() },
    inclinationFormulas: [
      { actionType: 'trade', variables: [{ source: 'trait', key: 'greed', weight: 0.5 }, { source: 'relationship', key: 'trust', weight: 0.3 }, { source: 'emotion', key: 'fear', weight: -0.2 }], threshold: 40 },
      { actionType: 'reveal_info', variables: [{ source: 'trait', key: 'loyalty', weight: -0.4 }, { source: 'relationship', key: 'affection', weight: 0.5 }, { source: 'relationship', key: 'trust', weight: 0.3 }], threshold: 60 },
    ],
    dialogueStyles: generateDialogueStylesFromTraits({ greed: 80, patience: 20, aggression: 60, charisma: 40, loyalty: 70 }),
    intentMappings: getDefaultIntentMappings().map((m) => {
      if (m.intent === '交易') return { ...m, weight: 0.7 }
      if (m.intent === '抱怨') return { ...m, weight: 0.5 }
      if (m.intent === '打听') return { ...m, weight: 0.4 }
      return m
    }),
    impressions: [
      { npcId: 'tavern_keeper', targetId: 'player', targetType: 'player', summary: '这个陌生人看起来有两下子，但还没完全信任', confidence: 0.45, sourceMemoryIds: ['mem-001', 'mem-002'], lastReinforced: Date.now() },
      { npcId: 'tavern_keeper', targetId: 'guard_captain', targetType: 'npc', summary: '艾德是个可靠的老朋友，在镇上很有威信', confidence: 0.9, sourceMemoryIds: ['mem-010'], lastReinforced: Date.now() },
    ],
  },
  {
    id: 'mysterious_merchant',
    name: '神秘游商 · 菲娜',
    basePrompt: '你是一个来历不明的游商，行踪飘忽。你对稀有物品有着近乎痴迷的执着，总是用谜语般的话语与人交谈。你从不透露自己的过去。',
    traits: { greed: 90, patience: 50, aggression: 10, charisma: 85, loyalty: 15 },
    pinnedMemories: ['mem-003'],
    roleTags: ['merchant'] as NpcRole[],
    faction: '无',
    region: '各地游走',
    schedule: [{ startHour: 10, endHour: 22, activity: '游商活动' }],
    relationships: [
      { targetId: 'player', targetType: 'player', trust: 40, affection: 50, fear: 10, tags: ['好奇'], lastUpdated: Date.now() },
      { targetId: 'alchemist', targetType: 'npc', trust: 60, affection: 45, fear: 5, tags: ['学术交流'], lastUpdated: Date.now() },
    ],
    currentEmotion: { primary: 'neutral', intensity: 0.1, decayRate: 0.05, lastUpdated: Date.now() },
    inclinationFormulas: [
      { actionType: 'trade', variables: [{ source: 'trait', key: 'greed', weight: 0.6 }, { source: 'relationship', key: 'trust', weight: 0.2 }, { source: 'trait', key: 'charisma', weight: 0.2 }], threshold: 35 },
      { actionType: 'reveal_info', variables: [{ source: 'relationship', key: 'affection', weight: 0.4 }, { source: 'trait', key: 'loyalty', weight: -0.3 }], threshold: 55 },
    ],
    dialogueStyles: generateDialogueStylesFromTraits({ greed: 90, patience: 50, aggression: 10, charisma: 85, loyalty: 15 }),
    intentMappings: getDefaultIntentMappings().map((m) => {
      if (m.intent === '交易') return { ...m, weight: 0.8 }
      if (m.intent === '闲聊') return { ...m, weight: 0.1 }
      return m
    }),
    impressions: [],
  },
  {
    id: 'guard_captain',
    name: '卫队长 · 艾德',
    basePrompt: '你是王城的卫队长，严肃、正直、一丝不苟。你对法律有着绝对的忠诚，但内心深处也明白世道的不公。你不会被贿赂，但可能被正义的理由说服。',
    traits: { greed: 10, patience: 70, aggression: 50, charisma: 60, loyalty: 95 },
    pinnedMemories: [],
    roleTags: ['quest_giver', 'combat_ally'] as NpcRole[],
    faction: '风语镇守卫',
    region: '风语镇 · 城门',
    schedule: [
      { startHour: 6, endHour: 18, activity: '站岗巡逻' },
      { startHour: 18, endHour: 6, activity: '休息' },
    ],
    relationships: [
      { targetId: 'player', targetType: 'player', trust: 60, affection: 50, fear: 15, tags: ['观察中'], lastUpdated: Date.now() },
      { targetId: 'tavern_keeper', targetType: 'npc', trust: 80, affection: 70, fear: 5, tags: ['老朋友'], lastUpdated: Date.now() },
    ],
    currentEmotion: { primary: 'neutral', intensity: 0.1, decayRate: 0.03, lastUpdated: Date.now() },
    inclinationFormulas: [
      { actionType: 'fight', variables: [{ source: 'trait', key: 'loyalty', weight: 0.5 }, { source: 'trait', key: 'aggression', weight: 0.3 }, { source: 'relationship', key: 'trust', weight: -0.2 }], threshold: 50 },
      { actionType: 'reveal_info', variables: [{ source: 'trait', key: 'loyalty', weight: -0.2 }, { source: 'relationship', key: 'trust', weight: 0.6 }], threshold: 70 },
    ],
    dialogueStyles: generateDialogueStylesFromTraits({ greed: 10, patience: 70, aggression: 50, charisma: 60, loyalty: 95 }),
    intentMappings: getDefaultIntentMappings().map((m) => {
      if (m.intent === '警告') return { ...m, weight: 0.7 }
      if (m.intent === '恭维') return { ...m, weight: 0.1 }
      if (m.intent === '交易') return { ...m, weight: 0.1 }
      return m
    }),
    impressions: [],
  },
  {
    id: 'alchemist',
    name: '炼金术士 · 希尔',
    basePrompt: '你是一个隐居的炼金术士，痴迷于知识的探索。你对来访者既警惕又好奇，渴望有人能理解你的研究。你说话充满学术用语。',
    traits: { greed: 30, patience: 85, aggression: 5, charisma: 50, loyalty: 40 },
    pinnedMemories: ['mem-004'],
    roleTags: ['quest_giver', 'informant'] as NpcRole[],
    faction: '无',
    region: '希尔的小屋',
    schedule: [{ startHour: 0, endHour: 24, activity: '研究中(随时可访问)' }],
    relationships: [
      { targetId: 'player', targetType: 'player', trust: 30, affection: 40, fear: 5, tags: ['好奇'], lastUpdated: Date.now() },
      { targetId: 'mysterious_merchant', targetType: 'npc', trust: 55, affection: 50, fear: 5, tags: ['学术交流'], lastUpdated: Date.now() },
    ],
    currentEmotion: { primary: 'neutral', intensity: 0.05, decayRate: 0.02, lastUpdated: Date.now() },
    inclinationFormulas: [
      { actionType: 'reveal_info', variables: [{ source: 'trait', key: 'patience', weight: 0.3 }, { source: 'relationship', key: 'trust', weight: 0.5 }, { source: 'trait', key: 'charisma', weight: 0.2 }], threshold: 45 },
      { actionType: 'trade', variables: [{ source: 'trait', key: 'greed', weight: -0.4 }, { source: 'relationship', key: 'affection', weight: 0.4 }], threshold: 50 },
    ],
    dialogueStyles: generateDialogueStylesFromTraits({ greed: 30, patience: 85, aggression: 5, charisma: 50, loyalty: 40 }),
    intentMappings: getDefaultIntentMappings().map((m) => {
      if (m.intent === '回忆') return { ...m, weight: 0.6 }
      if (m.intent === '打听') return { ...m, weight: 0.5 }
      if (m.intent === '交易') return { ...m, weight: 0.1 }
      return m
    }),
    impressions: [],
  },
]

const mockMemories: Memory[] = [
  { id: 'mem-001', npcId: 'tavern_keeper', timestamp: Date.now() - 3600000, summary: '玩家帮助老韩赶走了闹事的强盗', importance: 8, pinned: true, sourceType: 'player_action', relatedEntityIds: ['player'], location: '风语镇·酒馆', layer: 'core', decayRate: 0.02, derivedEffects: { relationImpact: [{ targetId: 'player', trustDelta: 15, affectionDelta: 10, fearDelta: -5 }], intentTriggers: ['感谢'], taskFlags: [] } },
  { id: 'mem-002', npcId: 'tavern_keeper', timestamp: Date.now() - 7200000, summary: '玩家在老韩面前展示了罕见的龙鳞碎片', importance: 6, pinned: true, sourceType: 'player_action', relatedEntityIds: ['player'], location: '风语镇·酒馆', layer: 'core', decayRate: 0.03, derivedEffects: { relationImpact: [{ targetId: 'player', trustDelta: 5, affectionDelta: 8, fearDelta: 0 }], intentTriggers: ['回忆'], taskFlags: [] } },
  { id: 'mem-003', npcId: 'mysterious_merchant', timestamp: Date.now() - 1800000, summary: '玩家用古代符文换取了菲娜的信任', importance: 9, pinned: true, sourceType: 'player_action', relatedEntityIds: ['player'], location: '风语镇·路口', layer: 'core', decayRate: 0.02, derivedEffects: { relationImpact: [{ targetId: 'player', trustDelta: 20, affectionDelta: 15, fearDelta: -10 }], intentTriggers: ['交易', '打听'], taskFlags: [] } },
  { id: 'mem-004', npcId: 'alchemist', timestamp: Date.now() - 900000, summary: '玩家正确解答了希尔的炼金谜题', importance: 7, pinned: true, sourceType: 'player_action', relatedEntityIds: ['player'], location: '希尔的小屋', layer: 'core', decayRate: 0.03, derivedEffects: { relationImpact: [{ targetId: 'player', trustDelta: 12, affectionDelta: 10, fearDelta: 0 }], intentTriggers: ['回忆'], taskFlags: [] } },
  { id: 'mem-005', npcId: 'tavern_keeper', timestamp: Date.now() - 600000, summary: '玩家在酒馆打碎了杯子', importance: 2, pinned: false, sourceType: 'player_action', relatedEntityIds: ['player'], location: '风语镇·酒馆', layer: 'working', decayRate: 0.08, derivedEffects: { relationImpact: [{ targetId: 'player', trustDelta: -2, affectionDelta: -1, fearDelta: 0 }], intentTriggers: ['抱怨'], taskFlags: [] } },
  { id: 'mem-006', npcId: 'guard_captain', timestamp: Date.now() - 300000, summary: '玩家在城门与卫兵发生口角', importance: 4, pinned: false, sourceType: 'player_action', relatedEntityIds: ['player', 'guard_captain'], location: '风语镇·城门', layer: 'working', decayRate: 0.06, derivedEffects: { relationImpact: [{ targetId: 'player', trustDelta: -8, affectionDelta: -5, fearDelta: 5 }], intentTriggers: ['警告'], taskFlags: [] } },
  { id: 'mem-007', npcId: 'mysterious_merchant', timestamp: Date.now() - 450000, summary: '菲娜向玩家透露了龙墓的传说', importance: 7, pinned: false, sourceType: 'self_event', relatedEntityIds: ['player'], location: '风语镇·路边', layer: 'working', decayRate: 0.04, derivedEffects: { relationImpact: [{ targetId: 'player', trustDelta: 3, affectionDelta: 5, fearDelta: 0 }], intentTriggers: ['回忆'], taskFlags: ['dragon_quest_hint'] } },
  { id: 'mem-008', npcId: 'tavern_keeper', timestamp: Date.now() - 120000, summary: '玩家点了最贵的麦酒', importance: 1, pinned: false, sourceType: 'player_action', relatedEntityIds: ['player'], location: '风语镇·酒馆', layer: 'working', decayRate: 0.1, derivedEffects: { relationImpact: [{ targetId: 'player', trustDelta: 1, affectionDelta: 2, fearDelta: 0 }], intentTriggers: [], taskFlags: [] } },
  { id: 'mem-009', npcId: 'alchemist', timestamp: Date.now() - 240000, summary: '玩家带来了罕见的月光草样本', importance: 5, pinned: false, sourceType: 'player_action', relatedEntityIds: ['player'], location: '希尔的小屋', layer: 'working', decayRate: 0.05, derivedEffects: { relationImpact: [{ targetId: 'player', trustDelta: 5, affectionDelta: 8, fearDelta: 0 }], intentTriggers: ['感谢'], taskFlags: ['alchemy_quest_progress'] } },

  // NPC间记忆 + 环境记忆
  { id: 'mem-010', npcId: 'tavern_keeper', timestamp: Date.now() - 18000000, summary: '卫队长艾德在酒馆和老韩喝了一整晚的酒', importance: 4, pinned: false, sourceType: 'npc_action', relatedEntityIds: ['guard_captain'], location: '风语镇·酒馆', layer: 'working', decayRate: 0.07, derivedEffects: { relationImpact: [{ targetId: 'guard_captain', trustDelta: 2, affectionDelta: 5, fearDelta: 0 }], intentTriggers: ['回忆'], taskFlags: [] } },
  { id: 'mem-011', npcId: 'tavern_keeper', timestamp: Date.now() - 43200000, summary: '昨晚下了大暴雨，屋顶漏水了几个地方', importance: 3, pinned: false, sourceType: 'environment', relatedEntityIds: [], location: '风语镇·酒馆', layer: 'working', decayRate: 0.09, derivedEffects: { relationImpact: [], intentTriggers: ['抱怨'], taskFlags: [] } },
  { id: 'mem-012', npcId: 'tavern_keeper', timestamp: Date.now() - 5400000, summary: '菲娜路过酒馆没进来，老韩觉得这女人太傲', importance: 3, pinned: false, sourceType: 'witnessed', relatedEntityIds: ['mysterious_merchant'], location: '风语镇', layer: 'working', decayRate: 0.07, derivedEffects: { relationImpact: [{ targetId: 'mysterious_merchant', trustDelta: -2, affectionDelta: -3, fearDelta: 0 }], intentTriggers: ['抱怨'], taskFlags: [] } },
  { id: 'mem-013', npcId: 'tavern_keeper', timestamp: Date.now() - 7200000, summary: '镇上来了个陌生的旅行商人，买了三杯酒就匆匆走了', importance: 2, pinned: false, sourceType: 'witnessed', relatedEntityIds: [], location: '风语镇·酒馆', layer: 'working', decayRate: 0.1, derivedEffects: { relationImpact: [], intentTriggers: ['闲聊'], taskFlags: [] } },
  { id: 'mem-014', npcId: 'tavern_keeper', timestamp: Date.now() - 600000, summary: '今天生意不错，比平时多赚了三十个铜板', importance: 2, pinned: false, sourceType: 'self_event', relatedEntityIds: [], location: '风语镇·酒馆', layer: 'working', decayRate: 0.09, derivedEffects: { relationImpact: [], intentTriggers: ['闲聊'], taskFlags: [] } },
  { id: 'mem-015', npcId: 'mysterious_merchant', timestamp: Date.now() - 3600000, summary: '菲娜在路边看见卫队长教训了两个乞丐', importance: 3, pinned: false, sourceType: 'witnessed', relatedEntityIds: ['guard_captain'], location: '风语镇·城门', layer: 'working', decayRate: 0.08, derivedEffects: { relationImpact: [{ targetId: 'guard_captain', trustDelta: 1, affectionDelta: 0, fearDelta: 3 }], intentTriggers: ['闲聊'], taskFlags: [] } },
  { id: 'mem-016', npcId: 'guard_captain', timestamp: Date.now() - 7200000, summary: '北境巡逻队报告狼群活动明显增多', importance: 6, pinned: false, sourceType: 'npc_action', relatedEntityIds: [], location: '风语镇·城门', layer: 'working', decayRate: 0.04, derivedEffects: { relationImpact: [], intentTriggers: ['警告'], taskFlags: ['wolf_main_quest'] } },
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

const now = Date.now()

const mockRuntimeMemories: RuntimeMemoryRecord[] = [
  {
    id: 'rt-mem-001',
    ownerNpcId: 'tavern_keeper',
    participants: ['tavern_keeper', 'guard_captain'],
    summary: '酒馆老板把湿斗篷陌生人打听货船的事告诉了卫队长。',
    semanticTags: ['cargo', 'wet_cloak', 'tavern'],
    importance: 8,
    pinned: false,
    timestamp: now - 18_000,
  },
  {
    id: 'rt-mem-002',
    ownerNpcId: 'guard_captain',
    participants: ['guard_captain', 'mysterious_merchant'],
    summary: '卫队长盘问神秘游商，蓝色封蜡箱的来源仍然可疑。',
    semanticTags: ['blue_wax', 'crate', 'merchant'],
    importance: 8,
    pinned: false,
    timestamp: now - 11_000,
  },
  {
    id: 'rt-mem-003',
    ownerNpcId: 'alchemist',
    participants: ['mysterious_merchant', 'alchemist'],
    summary: '炼金术士检查了发冷盐晶样本，怀疑它与风暴残留有关。',
    semanticTags: ['salt_crystal', 'storm_residue', 'sample'],
    importance: 9,
    pinned: false,
    timestamp: now - 5_000,
  },
]

const mockSocialBeats: RuntimeSocialBeat[] = [
  {
    id: 'rt-beat-001',
    sourceNpcId: 'tavern_keeper',
    targetNpcId: 'guard_captain',
    summary: '报告湿斗篷陌生人与货船线索。',
    status: 'completed',
    memoryIds: ['rt-mem-001'],
    timestamp: now - 18_000,
  },
  {
    id: 'rt-beat-002',
    sourceNpcId: 'guard_captain',
    targetNpcId: 'mysterious_merchant',
    summary: '盘问蓝色封蜡箱来源。',
    status: 'completed',
    memoryIds: ['rt-mem-002'],
    timestamp: now - 11_000,
  },
  {
    id: 'rt-beat-003',
    sourceNpcId: 'mysterious_merchant',
    targetNpcId: 'alchemist',
    summary: '交出盐晶样本并等待判断。',
    status: 'active',
    memoryIds: ['rt-mem-003'],
    timestamp: now - 5_000,
  },
]

const mockRuntimeNpcStatuses: NpcStatusSnapshot[] = [
  { npcId: 'tavern_keeper', action: 'SPEAK', emotion: 'concerned', state: '检查酒桶封口', statusText: '检查酒桶封口', updatedAt: now - 4_000 },
  { npcId: 'guard_captain', action: 'QUESTION', emotion: 'alert', state: '搜查旧酒馆后门', statusText: '搜查旧酒馆后门', updatedAt: now - 8_000 },
  { npcId: 'mysterious_merchant', action: 'WHISPER', emotion: 'guarded', state: '压低声音应付盘问', statusText: '压低声音应付盘问', updatedAt: now - 6_000 },
  { npcId: 'alchemist', action: 'INSPECT', emotion: 'focused', state: '检查可疑盐晶', statusText: '检查可疑盐晶', updatedAt: now - 3_000 },
]

const mockDirectorMetrics: RuntimeDirectorMetrics = {
  flowIndex: 71,
  boredomSeconds: 12,
  pressureSeconds: 28,
  lastMeaningfulInteractionSeconds: 4,
  activeNpcCount: 4,
  memoryCount: mockRuntimeMemories.length,
  updatedAt: now,
}

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []

const normalizeRuntimeMemory = (payload: Record<string, unknown>): RuntimeMemoryRecord => ({
  id: typeof payload.id === 'string' ? payload.id : `rt-mem-${Date.now()}`,
  ownerNpcId: typeof payload.ownerNpcId === 'string' ? payload.ownerNpcId : typeof payload.owner === 'string' ? payload.owner : 'unknown',
  participants: asStringArray(payload.participants),
  summary: typeof payload.summary === 'string' ? payload.summary : '',
  semanticTags: asStringArray(payload.semanticTags ?? payload.tags),
  importance: typeof payload.importance === 'number' ? payload.importance : 5,
  pinned: Boolean(payload.pinned),
  timestamp: typeof payload.timestamp === 'number' ? payload.timestamp : Date.now(),
})

const normalizeSocialBeat = (payload: Record<string, unknown>): RuntimeSocialBeat => ({
  id: typeof payload.id === 'string' ? payload.id : `rt-beat-${Date.now()}`,
  sourceNpcId: typeof payload.sourceNpcId === 'string' ? payload.sourceNpcId : typeof payload.source === 'string' ? payload.source : 'unknown',
  targetNpcId: typeof payload.targetNpcId === 'string' ? payload.targetNpcId : typeof payload.target === 'string' ? payload.target : 'unknown',
  summary: typeof payload.summary === 'string' ? payload.summary : '',
  status: typeof payload.status === 'string' ? payload.status : 'completed',
  memoryIds: asStringArray(payload.memoryIds),
  timestamp: typeof payload.timestamp === 'number' ? payload.timestamp : Date.now(),
})

const normalizeNpcStatus = (value: unknown): NpcStatusSnapshot | null => {
  if (!value || typeof value !== 'object') return null
  const payload = value as Record<string, unknown>
  const npcId = typeof payload.npcId === 'string' ? payload.npcId : typeof payload.id === 'string' ? payload.id : null
  if (!npcId) return null
  return {
    npcId,
    action: typeof payload.action === 'string' ? payload.action : 'OBSERVE',
    emotion: typeof payload.emotion === 'string' ? payload.emotion : 'neutral',
    state: typeof payload.state === 'string' ? payload.state : typeof payload.statusText === 'string' ? payload.statusText : 'idle',
    statusText: typeof payload.statusText === 'string' ? payload.statusText : undefined,
    updatedAt: typeof payload.updatedAt === 'number' ? payload.updatedAt : Date.now(),
  }
}

const normalizeDirectorMetrics = (payload: Record<string, unknown>): RuntimeDirectorMetrics => ({
  flowIndex: typeof payload.flowIndex === 'number' ? payload.flowIndex : 0,
  boredomSeconds: typeof payload.boredomSeconds === 'number' ? payload.boredomSeconds : 0,
  pressureSeconds: typeof payload.pressureSeconds === 'number' ? payload.pressureSeconds : 0,
  lastMeaningfulInteractionSeconds:
    typeof payload.lastMeaningfulInteractionSeconds === 'number' ? payload.lastMeaningfulInteractionSeconds : 0,
  activeNpcCount: typeof payload.activeNpcCount === 'number' ? payload.activeNpcCount : 0,
  memoryCount: typeof payload.memoryCount === 'number' ? payload.memoryCount : 0,
  updatedAt: typeof payload.updatedAt === 'number' ? payload.updatedAt : Date.now(),
})

let runtimeWsSubscribed = false

const mockActions: ActionDefinition[] = [
  {
    actionId: 'SHOUT_WARNING',
    category: 'speech' as ActionCategory,
    ue5Class: 'UAICommand_ShoutWarning',
    params: [
      { name: 'target', type: 'actor', required: true, description: '警告的目标对象' },
      { name: 'message', type: 'string', required: true, description: '警告内容', constraints: { maxLength: 60 } },
      { name: 'intensity', type: 'float', required: false, defaultValue: 0.5, description: '警告强度', constraints: { min: 0, max: 1 } },
    ],
    preconditions: [
      { field: 'target.inLineOfSight', operator: 'eq', value: true },
      { field: 'self.state', operator: 'neq', value: 'SLEEPING' },
    ],
    effects: [
      { targetSystem: 'reputation', mutation: '-5' },
      { targetSystem: 'alert', mutation: 'notify_guards:15m' },
    ],
    interrupt: { interruptible: true, interruptByHigherPriority: true, exclusiveCategories: ['speech'], recoveryTimeMs: 300 },
    animation: { montage: '/Game/Animations/NPC/AM_Shout', blendIn: 0.15, blendOut: 0.2, loop: false },
    cooldownMs: 5000,
  },
  {
    actionId: 'FLEE_FROM',
    category: 'movement' as ActionCategory,
    ue5Class: 'UAICommand_Flee',
    params: [
      { name: 'target', type: 'actor', required: true, description: '逃离的目标' },
      { name: 'speed', type: 'enum', required: false, defaultValue: 'run', description: '移动速度', constraints: { enumValues: ['walk', 'run', 'sprint'] } },
    ],
    preconditions: [
      { field: 'self.canMove', operator: 'eq', value: true },
    ],
    effects: [
      { targetSystem: 'reputation', mutation: '-10' },
    ],
    interrupt: { interruptible: true, interruptByHigherPriority: true, exclusiveCategories: ['movement', 'combat'], recoveryTimeMs: 200 },
    animation: { montage: '/Game/Animations/NPC/AM_Flee', blendIn: 0.1, blendOut: 0.3, loop: true },
    cooldownMs: 3000,
  },
  {
    actionId: 'MOVE_TO',
    category: 'movement' as ActionCategory,
    ue5Class: 'UAICommand_MoveTo',
    params: [
      { name: 'target', type: 'actor', required: true, description: '移动目标' },
      { name: 'speed', type: 'enum', required: false, defaultValue: 'walk', description: '移动速度', constraints: { enumValues: ['walk', 'run', 'sprint'] } },
    ],
    preconditions: [
      { field: 'self.canMove', operator: 'eq', value: true },
    ],
    effects: [],
    interrupt: { interruptible: true, interruptByHigherPriority: true, exclusiveCategories: ['movement'], recoveryTimeMs: 200 },
    animation: { montage: '/Game/Animations/NPC/AM_Walk', blendIn: 0.2, blendOut: 0.2, loop: true },
    cooldownMs: 1000,
  },
  {
    actionId: 'SPEAK',
    category: 'speech' as ActionCategory,
    ue5Class: 'UAICommand_Speak',
    params: [
      { name: 'target', type: 'actor', required: false, description: '对话目标' },
      { name: 'message', type: 'string', required: true, description: '对话内容', constraints: { maxLength: 120 } },
    ],
    preconditions: [],
    effects: [],
    interrupt: { interruptible: true, interruptByHigherPriority: true, exclusiveCategories: ['speech'], recoveryTimeMs: 150 },
    animation: { montage: '/Game/Animations/NPC/AM_Talk', blendIn: 0.15, blendOut: 0.15, loop: true },
    cooldownMs: 2000,
  },
  {
    actionId: 'DO_NOTHING',
    category: 'meta' as ActionCategory,
    ue5Class: 'UAICommand_Idle',
    params: [],
    preconditions: [],
    effects: [],
    interrupt: { interruptible: true, interruptByHigherPriority: true, exclusiveCategories: [], recoveryTimeMs: 0 },
    animation: { montage: '/Game/Animations/NPC/AM_Idle', blendIn: 0.3, blendOut: 0.3, loop: true },
    cooldownMs: 500,
  },
  {
    actionId: 'OBSERVE',
    category: 'meta' as ActionCategory,
    ue5Class: 'UAICommand_Observe',
    params: [
      { name: 'target', type: 'actor', required: true, description: '观察目标' },
    ],
    preconditions: [
      { field: 'target.inLineOfSight', operator: 'eq', value: true },
    ],
    effects: [],
    interrupt: { interruptible: true, interruptByHigherPriority: true, exclusiveCategories: [], recoveryTimeMs: 100 },
    animation: { montage: '/Game/Animations/NPC/AM_LookAt', blendIn: 0.1, blendOut: 0.1, loop: true },
    cooldownMs: 1000,
  },
  {
    actionId: 'CALL_GUARD',
    category: 'combat' as ActionCategory,
    ue5Class: 'UAICommand_CallGuard',
    params: [
      { name: 'message', type: 'string', required: false, description: '呼叫内容', constraints: { maxLength: 60 } },
    ],
    preconditions: [
      { field: 'world.hasGuardsNearby', operator: 'eq', value: true },
    ],
    effects: [
      { targetSystem: 'alert', mutation: 'summon_guards' },
    ],
    interrupt: { interruptible: false, interruptByHigherPriority: false, exclusiveCategories: ['speech', 'combat'], recoveryTimeMs: 500 },
    animation: { montage: '/Game/Animations/NPC/AM_Shout', blendIn: 0.1, blendOut: 0.2, loop: false },
    cooldownMs: 15000,
  },
]

const mockQuests: QuestDefinition[] = [
  {
    id: 'quest_wolves_ch1',
    name: '第一章 · 北境狼患',
    category: 'main',
    minLevel: 3,
    maxLevel: 20,
    nodes: [
      { id: 'qw1_n1', questId: 'quest_wolves_ch1', name: '接取任务', type: 'dialogue', order: 0, triggerNpcId: 'guard_captain', triggerLocation: '城门守卫站', dialogueText: '北边的狼群越来越猖獗了。你有兴趣处理吗？', completionCondition: 'dialogue:accept', nextNodeId: 'qw1_n2', isOptional: false, rewards: [] },
      { id: 'qw1_n2', questId: 'quest_wolves_ch1', name: '收集线索', type: 'dialogue', order: 1, triggerNpcId: 'tavern_keeper', triggerLocation: '酒馆', dialogueText: '狼？北边老林子里到处都是。最近有头特别大的……', completionCondition: 'dialogue:complete', nextNodeId: 'qw1_n3', isOptional: false, rewards: [{ type: 'exp', value: '200' }] },
      { id: 'qw1_n3', questId: 'quest_wolves_ch1', name: '击败狼王', type: 'combat', order: 2, triggerLocation: '北境密林', combatTarget: 'wolf_alpha', completionCondition: 'combat:kill:wolf_alpha', nextNodeId: 'qw1_n4', isOptional: false, rewards: [{ type: 'gold', value: '300' }, { type: 'exp', value: '500' }, { type: 'item', value: 'wolf_fang', detail: '狼王之牙' }] },
      { id: 'qw1_n4', questId: 'quest_wolves_ch1', name: '交任务', type: 'dialogue', order: 3, triggerNpcId: 'guard_captain', triggerLocation: '城门守卫站', dialogueText: '干得漂亮！这是你的报酬。', completionCondition: 'dialogue:complete', isOptional: false, rewards: [{ type: 'gold', value: '500' }, { type: 'exp', value: '800' }, { type: 'reputation', value: '50', detail: '风语镇' }] },
    ],
    involvedNpcs: [
      { npcId: 'guard_captain', role: 'issuer' },
      { npcId: 'tavern_keeper', role: 'informant' },
    ],
  },
  {
    id: 'quest_dragon_ch2',
    name: '第二章 · 龙的预兆',
    category: 'main',
    minLevel: 8,
    maxLevel: 30,
    prerequisiteQuestId: 'quest_wolves_ch1',
    nodes: [
      { id: 'qd2_n1', questId: 'quest_dragon_ch2', name: '接取任务', type: 'dialogue', order: 0, triggerNpcId: 'alchemist', triggerLocation: '希尔的小屋', dialogueText: '狼群异常…我怀疑是更深层的原因。听说过「龙兆」吗？', completionCondition: 'dialogue:accept', nextNodeId: 'qd2_n2', isOptional: false, rewards: [] },
      { id: 'qd2_n2', questId: 'quest_dragon_ch2', name: '探索龙脉遗迹', type: 'explore', order: 1, triggerLocation: '龙脊山脉', completionCondition: 'explore:dragon_ruins', isOptional: false, rewards: [{ type: 'exp', value: '400' }, { type: 'item', value: 'dragon_scale_fragment', detail: '龙鳞碎片' }] },
    ],
    involvedNpcs: [
      { npcId: 'alchemist', role: 'issuer' },
      { npcId: 'mysterious_merchant', role: 'informant' },
    ],
  },
  {
    id: 'quest_shadow_ch3',
    name: '第三章 · 王城的阴影',
    category: 'main',
    minLevel: 14,
    maxLevel: 50,
    prerequisiteQuestId: 'quest_dragon_ch2',
    nodes: [],
    involvedNpcs: [{ npcId: 'guard_captain', role: 'issuer' }],
  },
  {
    id: 'quest_han_secret',
    name: '支线 · 老韩的私藏',
    category: 'side',
    minLevel: 3,
    maxLevel: 20,
    nodes: [
      { id: 'qhs_n1', questId: 'quest_han_secret', name: '触发信任', type: 'dialogue', order: 0, triggerNpcId: 'tavern_keeper', dialogueText: '你帮了我不少…好吧，告诉你个秘密。柜台下有瓶二十年陈酿，帮我拿给守墓人。', completionCondition: 'dialogue:accept', nextNodeId: 'qhs_n2', isOptional: false, rewards: [] },
      { id: 'qhs_n2', questId: 'quest_han_secret', name: '递送陈酿', type: 'deliver', order: 1, triggerLocation: '风语镇 · 墓园', completionCondition: 'deliver:aged_wine', isOptional: false, rewards: [{ type: 'gold', value: '200' }, { type: 'item', value: 'ancient_amulet', detail: '古老护身符' }, { type: 'reputation', value: '30', detail: '风语镇' }] },
    ],
    involvedNpcs: [{ npcId: 'tavern_keeper', role: 'issuer' }],
  },
  {
    id: 'ai_tavern_gossip',
    name: 'AI · 随机酒馆闲谈',
    category: 'ai_dynamic',
    minLevel: 1,
    maxLevel: 100,
    nodes: [],
    involvedNpcs: [{ npcId: 'tavern_keeper', role: 'informant' }],
    aiSettings: {
      triggerConditions: { npcAffectionMin: 30, playerLevelMin: 3, requiredRegion: '风语镇' },
      triggerFrequency: { min: 3, max: 8, unit: 'visit' },
      triggerChance: 60,
      questCategory: 'collect',
      targetCountRange: { min: 2, max: 5 },
      targetRegion: '风语镇周边',
      rewardBoundaries: {
        gold: { min: 50, max: 200 },
        exp: { min: 100, max: 400 },
        reputation: { faction: '风语镇', min: 5, max: 20 },
      },
      rareRewardChance: 15,
      rareRewardPool: [
        { itemId: 'wolf_fang_necklace', weight: 1 },
        { itemId: 'ancient_map_fragment', weight: 2 },
      ],
    },
  },
]

// ========== Store ==========
interface ConfigStore {
  // Navigation
  activeModule: ModuleId
  setActiveModule: (m: ModuleId) => void
  locale: 'zh' | 'en'
  setLocale: (l: 'zh' | 'en') => void

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

  // Action Registry
  actionDefinitions: ActionDefinition[]
  addActionDefinition: (def: ActionDefinition) => void
  updateActionDefinition: (id: string, def: Partial<ActionDefinition>) => void
  removeActionDefinition: (id: string) => void

  // WebSocket
  wsConnected: boolean
  connectWebSocket: (url?: string) => void
  disconnectWebSocket: () => void
  sendWsMessage: (type: string, payload?: Record<string, unknown>) => void

  // Runtime State
  npcStatuses: NpcStatusSnapshot[]
  runtimeMemories: RuntimeMemoryRecord[]
  socialBeats: RuntimeSocialBeat[]
  directorMetrics: RuntimeDirectorMetrics | null
  runtimeLastUpdated: number | null
  llmCallLogs: LlmCallLogEntry[]
  guardrailLogs: GuardrailLogEntry[]
  interventionLogs: InterventionLogEntry[]
  ingestRuntimeMessage: (msg: WebSocketMessage) => void
  clearRuntimeLogs: () => void

  // Context Assembly
  contextSections: ContextSection[]
  updateContextSection: (id: string, content: string) => void
  resetContextSections: () => void

  // LLM Call
  lastLlmResponse: Record<string, unknown> | null
  lastLlmUsage: { promptTokens: number; completionTokens: number; totalTokens: number } | null
  isLlmCalling: boolean
  llmCallError: string | null
  callLlm: () => Promise<void>
  checkLlmHealth: () => Promise<boolean>

  // Quest System
  questDefinitions: QuestDefinition[]
  selectedQuestId: string | null
  selectQuest: (id: string) => void
  addQuest: (quest: QuestDefinition) => void
  updateQuest: (id: string, partial: Partial<QuestDefinition>) => void
  removeQuest: (id: string) => void
  addQuestNode: (questId: string, node: QuestNode) => void
  updateQuestNode: (questId: string, nodeId: string, partial: Partial<QuestNode>) => void
  removeQuestNode: (questId: string, nodeId: string) => void
}

export const useConfigStore = create<ConfigStore>((set, get) => ({
  activeModule: 'npc_designer',
  setActiveModule: (m) => set({ activeModule: m }),

  // Language
  locale: 'zh' as 'zh' | 'en',
  setLocale: (l: 'zh' | 'en') => set({ locale: l }),

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

  // ===== Action Registry =====
  actionDefinitions: mockActions,
  addActionDefinition: (def) =>
    set((s) => ({ actionDefinitions: [...s.actionDefinitions, def] })),
  updateActionDefinition: (id, partial) =>
    set((s) => ({
      actionDefinitions: s.actionDefinitions.map((a) =>
        a.actionId === id ? { ...a, ...partial } : a
      ),
    })),
  removeActionDefinition: (id) =>
    set((s) => ({
      actionDefinitions: s.actionDefinitions.filter((a) => a.actionId !== id),
    })),

  // ===== WebSocket =====
  wsConnected: false,
  connectWebSocket: (url) => {
    if (!runtimeWsSubscribed) {
      wsClient.subscribe(null, (msg) => {
        useConfigStore.getState().ingestRuntimeMessage(msg)
      })
      runtimeWsSubscribed = true
    }
    wsClient.connect(url, (connected) => {
      useConfigStore.setState({ wsConnected: connected })
    })
  },
  disconnectWebSocket: () => wsClient.disconnect(),
  sendWsMessage: (type, payload) => wsClient.send(type, payload),

  // ===== Runtime State =====
  npcStatuses: mockRuntimeNpcStatuses,
  runtimeMemories: mockRuntimeMemories,
  socialBeats: mockSocialBeats,
  directorMetrics: mockDirectorMetrics,
  runtimeLastUpdated: mockDirectorMetrics.updatedAt,
  llmCallLogs: [],
  guardrailLogs: [],
  interventionLogs: [],
  ingestRuntimeMessage: (msg) => {
    const receivedAt = Date.now()
    const payload = msg.payload ?? {}

    if (msg.type === 'memory_snapshot') {
      const rawMemories = Array.isArray(payload.memories) ? payload.memories : []
      set({
        runtimeMemories: rawMemories
          .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
          .map(normalizeRuntimeMemory),
        runtimeLastUpdated: receivedAt,
      })
      return
    }

    if (msg.type === 'memory_added') {
      const memory = normalizeRuntimeMemory(payload)
      set((s) => ({
        runtimeMemories: [memory, ...s.runtimeMemories.filter((m) => m.id !== memory.id)].slice(0, 200),
        runtimeLastUpdated: receivedAt,
      }))
      return
    }

    if (msg.type === 'social_beat') {
      const beat = normalizeSocialBeat(payload)
      set((s) => ({
        socialBeats: [beat, ...s.socialBeats.filter((b) => b.id !== beat.id)].slice(0, 80),
        runtimeLastUpdated: receivedAt,
      }))
      return
    }

    if (msg.type === 'npc_status_snapshot') {
      const rawStatuses = Array.isArray(payload.npcs) ? payload.npcs : Array.isArray(payload.statuses) ? payload.statuses : []
      const statuses = rawStatuses.map(normalizeNpcStatus).filter((status): status is NpcStatusSnapshot => Boolean(status))
      set({ npcStatuses: statuses, runtimeLastUpdated: receivedAt })
      return
    }

    if (msg.type === 'director_metrics') {
      set({ directorMetrics: normalizeDirectorMetrics(payload), runtimeLastUpdated: receivedAt })
      return
    }

    if (msg.type === 'llm_call_log') {
      const entry = payload as unknown as LlmCallLogEntry
      set((s) => ({ llmCallLogs: [entry, ...s.llmCallLogs].slice(0, 80), runtimeLastUpdated: receivedAt }))
      return
    }

    if (msg.type === 'guardrail_fire') {
      const entry = payload as unknown as GuardrailLogEntry
      set((s) => ({ guardrailLogs: [entry, ...s.guardrailLogs].slice(0, 80), runtimeLastUpdated: receivedAt }))
    }
  },
  clearRuntimeLogs: () =>
    set({
      npcStatuses: [],
      runtimeMemories: [],
      socialBeats: [],
      directorMetrics: null,
      runtimeLastUpdated: null,
      llmCallLogs: [],
      guardrailLogs: [],
      interventionLogs: [],
    }),

  // ===== Context Assembly =====
  contextSections: [
    { id: 'A', title: '核心公理 · IMMUTABLE', content: '', tokenBudget: 400, editable: false },
    { id: 'B', title: '最近记忆 · RECENT', content: '', tokenBudget: 600, editable: false },
    { id: 'C', title: '当前感知 · NOW', content: '', tokenBudget: 400, editable: true },
    { id: 'D', title: '可用行为 · TOOLKIT', content: '', tokenBudget: 400, editable: false },
  ],
  updateContextSection: (id, content) =>
    set((s) => ({
      contextSections: s.contextSections.map((sec) =>
        sec.id === id ? { ...sec, content } : sec
      ),
    })),
  resetContextSections: () =>
    set({
      contextSections: [
        { id: 'A', title: '核心公理 · IMMUTABLE', content: '', tokenBudget: 400, editable: false },
        { id: 'B', title: '最近记忆 · RECENT', content: '', tokenBudget: 600, editable: false },
        { id: 'C', title: '当前感知 · NOW', content: '', tokenBudget: 400, editable: true },
        { id: 'D', title: '可用行为 · TOOLKIT', content: '', tokenBudget: 400, editable: false },
      ],
    }),

  // ===== LLM Call =====
  lastLlmResponse: null,
  lastLlmUsage: null,
  isLlmCalling: false,
  llmCallError: null,
  callLlm: async () => {
    const s = useConfigStore.getState()
    const systemPrompt = s.contextSections
      .map((sec) => `[SECTION ${sec.id}: ${sec.title}]\n${sec.content}`)
      .join('\n\n')

    // 取 Section C 作为 user message
    const sectionC = s.contextSections.find((sec) => sec.id === 'C')
    const userMessage = sectionC?.content
      ? sectionC.content
      : undefined

    set({ isLlmCalling: true, llmCallError: null })

    try {
      const result = await llmService.chatCompletion({
        systemPrompt,
        userMessage,
        temperature: 0.7,
        maxTokens: 300,
      })

      set({
        lastLlmResponse: result.json,
        lastLlmUsage: result.usage,
        isLlmCalling: false,
      })
    } catch (e) {
      set({
        isLlmCalling: false,
        llmCallError: e instanceof Error ? e.message : 'Unknown error',
      })
    }
  },
  checkLlmHealth: () => llmService.healthCheck(),

  // ===== Quest System =====
  questDefinitions: mockQuests,
  selectedQuestId: null,
  selectQuest: (id) => set({ selectedQuestId: id }),
  addQuest: (quest) => set((s) => ({ questDefinitions: [...s.questDefinitions, quest] })),
  updateQuest: (id, partial) =>
    set((s) => ({
      questDefinitions: s.questDefinitions.map((q) => (q.id === id ? { ...q, ...partial } : q)),
    })),
  removeQuest: (id) =>
    set((s) => ({ questDefinitions: s.questDefinitions.filter((q) => q.id !== id) })),
  addQuestNode: (questId, node) =>
    set((s) => ({
      questDefinitions: s.questDefinitions.map((q) =>
        q.id === questId ? { ...q, nodes: [...q.nodes, node].sort((a, b) => a.order - b.order) } : q
      ),
    })),
  updateQuestNode: (questId, nodeId, partial) =>
    set((s) => ({
      questDefinitions: s.questDefinitions.map((q) =>
        q.id === questId
          ? { ...q, nodes: q.nodes.map((n) => (n.id === nodeId ? { ...n, ...partial } : n)) }
          : q
      ),
    })),
  removeQuestNode: (questId, nodeId) =>
    set((s) => ({
      questDefinitions: s.questDefinitions.map((q) =>
        q.id === questId ? { ...q, nodes: q.nodes.filter((n) => n.id !== nodeId) } : q
      ),
    })),
}))
