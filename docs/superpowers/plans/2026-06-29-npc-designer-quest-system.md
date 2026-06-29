# NPC 设定 & 任务系统 —— Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development

**Goal:** 将「灵魂锻造台」重构为「NPC 设定」（新增角色类型/阵营/节律+任务关联面板），将「事件总线路由图」重构为「任务网络图」（玩家中心辐射图），新增「任务编排台」（主线节点编排+AI支线边界+奖励池）。

**Architecture:** 三批改动 — 类型+Store 基础层 → NpcDesigner 重构+NpcTaskList 新增 → QuestNetwork 重构 → QuestEditor 新增 → 导航更新。每批独立可测。

**Tech Stack:** React 18 + TypeScript + Vite + Zustand + Tailwind CSS + Radix UI + React Flow + Lucide Icons

## Global Constraints

- 所有组件暗色模式 (Dark Mode)
- Zustand 单一 store，新增 quest slice
- React Flow 自定义节点用 memo 包裹
- 导航更新通过 App.tsx modules 映射注册
- 原 EventBus/PersonaForge 目录完整替换，不保留旧组件

---

### Task 1: 类型定义扩展

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: 新增类型**

在 `src/types/index.ts` 末尾追加：

```typescript
// ========== NPC Roles & Schedule ==========
export type NpcRole = 'merchant' | 'quest_giver' | 'informant' | 'combat_ally' | 'artisan' | 'official'

export interface DailySchedule {
  startHour: number
  endHour: number
  activity: string
}

// 修改 NpcPersona，新增字段（不删旧字段）：
// roleTags: NpcRole[]
// faction: string
// region: string
// schedule: DailySchedule[]

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
  status: 'draft' | 'active' | 'completed' | 'locked'
  minLevel: number
  maxLevel: number
  prerequisiteQuestId?: string
  nodes: QuestNode[]
  involvedNpcs: QuestInvolvedNpc[]
  aiSettings?: AiQuestSettings
}
```

- [ ] **Step 2: 编译验证 + 提交**

```bash
npx tsc --noEmit && git add src/types/index.ts && git commit -m "feat: add quest system and npc role types"
```

---

### Task 2: Store 扩展 — Quest slice + Mock 数据

**Files:**
- Modify: `src/useConfigStore.ts`

- [ ] **Step 1: 在 store interface 中追加 quest slice**

```typescript
  // ===== Quest System =====
  questDefinitions: QuestDefinition[]
  selectedQuestId: string | null
  selectQuest: (id: string) => void
  addQuest: (quest: QuestDefinition) => void
  updateQuest: (id: string, partial: Partial<QuestDefinition>) => void
  removeQuest: (id: string) => void
  addQuestNode: (questId: string, node: QuestNode) => void
  updateQuestNode: (questId: string, nodeId: string, partial: Partial<QuestNode>) => void
  removeQuestNode: (questId: string, nodeId: string) => void
```

- [ ] **Step 2: 在 mock 数据区追加**

在 mockActions 之后追加：

```typescript
const mockQuests: QuestDefinition[] = [
  {
    id: 'quest_wolves_ch1',
    name: '第一章 · 北境狼患',
    category: 'main',
    status: 'active',
    minLevel: 3,
    maxLevel: 20,
    nodes: [
      {
        id: 'qw1_node1',
        questId: 'quest_wolves_ch1',
        name: '接取任务: 北境狼患',
        type: 'dialogue',
        order: 0,
        triggerNpcId: 'guard_captain',
        triggerLocation: '城门守卫站',
        dialogueText: '北边的狼群最近越来越猖獗了，我们需要一个猎人。你有兴趣吗？',
        completionCondition: 'dialogue:accept',
        nextNodeId: 'qw1_node2',
        isOptional: false,
        rewards: [],
      },
      {
        id: 'qw1_node2',
        questId: 'quest_wolves_ch1',
        name: '收集线索: 询问酒馆老板',
        type: 'dialogue',
        order: 1,
        triggerNpcId: 'tavern_keeper',
        triggerLocation: '风语镇 · 酒馆',
        dialogueText: '狼？哈！北边的老林子里到处都是。不过最近好像有头特别大的……你去问问卫队长吧，他知道更多。',
        completionCondition: 'dialogue:complete',
        nextNodeId: 'qw1_node3',
        isOptional: false,
        rewards: [{ type: 'exp', value: '200' }],
      },
      {
        id: 'qw1_node3',
        questId: 'quest_wolves_ch1',
        name: '猎杀: 击败狼王',
        type: 'combat',
        order: 2,
        triggerLocation: '北境密林',
        combatTarget: 'wolf_alpha',
        completionCondition: 'combat:kill:wolf_alpha',
        nextNodeId: 'qw1_node4',
        isOptional: false,
        rewards: [
          { type: 'gold', value: '300' },
          { type: 'exp', value: '500' },
          { type: 'item', value: 'wolf_fang', detail: '狼王之牙' },
        ],
      },
      {
        id: 'qw1_node4',
        questId: 'quest_wolves_ch1',
        name: '交任务: 向卫队长汇报',
        type: 'dialogue',
        order: 3,
        triggerNpcId: 'guard_captain',
        triggerLocation: '城门守卫站',
        dialogueText: '干得漂亮！这是你的报酬。镇上的人都会感谢你的。',
        completionCondition: 'dialogue:complete',
        isOptional: false,
        rewards: [
          { type: 'gold', value: '500' },
          { type: 'exp', value: '800' },
          { type: 'reputation', value: '50', detail: '风语镇' },
        ],
      },
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
    status: 'locked',
    minLevel: 8,
    maxLevel: 30,
    prerequisiteQuestId: 'quest_wolves_ch1',
    nodes: [
      {
        id: 'qd2_node1',
        questId: 'quest_dragon_ch2',
        name: '接取任务: 龙的预兆',
        type: 'dialogue',
        order: 0,
        triggerNpcId: 'alchemist',
        triggerLocation: '希尔的小屋',
        dialogueText: '狼群的行为异常……我怀疑是更深层的原因。你听说过「龙兆」吗？',
        completionCondition: 'dialogue:accept',
        nextNodeId: 'qd2_node2',
        isOptional: false,
        rewards: [],
      },
      {
        id: 'qd2_node2',
        questId: 'quest_dragon_ch2',
        name: '调查: 探索龙脉遗迹',
        type: 'explore',
        order: 1,
        triggerLocation: '龙脊山脉 · 古代遗迹',
        completionCondition: 'explore:dragon_ruins',
        isOptional: false,
        rewards: [
          { type: 'exp', value: '400' },
          { type: 'item', value: 'dragon_scale_fragment', detail: '龙鳞碎片' },
        ],
      },
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
    status: 'locked',
    minLevel: 14,
    maxLevel: 50,
    prerequisiteQuestId: 'quest_dragon_ch2',
    nodes: [],
    involvedNpcs: [
      { npcId: 'guard_captain', role: 'issuer' },
    ],
  },
  {
    id: 'quest_cret',
    name: '支线 · 老韩的私藏',
    category: 'side',
    status: 'active',
    minLevel: 3,
    maxLevel: 20,
    nodes: [
      {
        id: 'qhs_node1',
        questId: 'quest_han_secret',
        name: '触发: 老韩的信任',
        type: 'dialogue',
        order: 0,
        triggerNpcId: 'tavern_keeper',
        dialogueText: '你帮了我不少忙……好吧，我告诉你一个秘密。柜台下面有瓶二十年的陈酿，帮我拿给镇子东边的守墓人。他会给你好东西的。',
        completionCondition: 'dialogue:accept',
        nextNodeId: 'qhs_node2',
        isOptional: false,
        rewards: [],
      },
      {
        id: 'qhs_node2',
        questId: 'quest_han_secret',
        name: '递送: 陈酿给守墓人',
        type: 'deliver',
        order: 1,
        triggerLocation: '风语镇 · 墓园',
        completionCondition: 'deliver:aged_wine',
        isOptional: false,
        rewards: [
          { type: 'gold', value: '200' },
          { type: 'item', value: 'ancient_amulet', detail: '古老的护身符' },
          { type: 'reputation', value: '30', detail: '风语镇' },
        ],
      },
    ],
    involvedNpcs: [
      { npcId: 'tavern_keeper', role: 'issuer' },
    ],
  },
  {
    id: 'ai_tavern_gossip',
    name: 'AI · 随机酒馆闲谈',
    category: 'ai_dynamic',
    status: 'active',
    minLevel: 1,
    maxLevel: 100,
    nodes: [],
    involvedNpcs: [
      { npcId: 'tavern_keeper', role: 'informant' },
    ],
    aiSettings: {
      triggerConditions: {
        npcAffectionMin: 30,
        playerLevelMin: 3,
        requiredRegion: '风语镇',
      },
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
```

- [ ] **Step 3: 更新 mock NPCs 添加新字段**

给每个 mock NPC 追加以下字段（在 pinnedMemories 之后）：

```typescript
// tavern_keeper:
    roleTags: ['merchant', 'informant'] as NpcRole[],
    faction: '风语镇',
    region: '风语镇 · 酒馆',
    schedule: [
      { startHour: 6, endHour: 8, activity: '起床/用餐' },
      { startHour: 8, endHour: 20, activity: '营业中' },
      { startHour: 20, endHour: 6, activity: '休息' },
    ],

// mysterious_merchant:
    roleTags: ['merchant'] as NpcRole[],
    faction: '无',
    region: '各地游走',
    schedule: [{ startHour: 10, endHour: 22, activity: '游商活动' }],

// guard_captain:
    roleTags: ['quest_giver', 'combat_ally'] as NpcRole[],
    faction: '风语镇守卫',
    region: '风语镇 · 城门',
    schedule: [
      { startHour: 6, endHour: 18, activity: '站岗巡逻' },
      { startHour: 18, endHour: 6, activity: '休息' },
    ],

// alchemist:
    roleTags: ['quest_giver', 'informant'] as NpcRole[],
    faction: '无',
    region: '希尔的小屋',
    schedule: [{ startHour: 0, endHour: 24, activity: '研究中(随时可访问)' }],
```

- [ ] **Step 4: 在 store create 中追加 quest slice 实现**

```typescript
  // ===== Quest System =====
  questDefinitions: mockQuests,
  selectedQuestId: null,
  selectQuest: (id) => set({ selectedQuestId: id }),
  addQuest: (quest) =>
    set((s) => ({ questDefinitions: [...s.questDefinitions, quest] })),
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
```

- [ ] **Step 5: 编译验证 + 提交**

```bash
npx tsc --noEmit && git add src/useConfigStore.ts && git commit -m "feat: add quest slice and mock data to store"
```

---

### Task 3: NpcDesigner 重构 — NpcProfile 面板

**Files:**
- Modify: `src/components/NpcDesigner/NpcProfile.tsx` (原 BasePersona.tsx)

在现有 Core Prompt + 5 维滑块之后，追加角色标签/阵营/区域/节律表单。

```typescript
// 追加 import
import { Check, Plus, Trash2 } from 'lucide-react'
import type { NpcRole, DailySchedule } from '../../types'

// allRoles 常量
const allRoles: { value: NpcRole; label: string }[] = [
  { value: 'merchant', label: '商人' },
  { value: 'quest_giver', label: '任务发布者' },
  { value: 'informant', label: '情报源' },
  { value: 'combat_ally', label: '战斗盟友' },
  { value: 'artisan', label: '工匠' },
  { value: 'official', label: '官员' },
]

// 在 5 维滑块之后追加 JSX:
      {/* 角色标签 */}
      <div className="mb-6">
        <label className="mb-2 block text-xs font-medium text-neutral-400">角色类型</label>
        <div className="flex flex-wrap gap-1.5">
          {allRoles.map((role) => {
            const active = npc.roleTags?.includes(role.value)
            return (
              <button
                key={role.value}
                onClick={() => {
                  const tags = npc.roleTags ?? []
                  updateNpc(npc.id, {
                    roleTags: active ? tags.filter((t) => t !== role.value) : [...tags, role.value],
                  })
                }}
                className={`rounded-full px-2.5 py-1 text-[10px] transition-colors ${
                  active
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'bg-neutral-800 text-neutral-400 border border-neutral-700 hover:border-neutral-600'
                }`}
              >
                {role.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* 阵营 + 区域 */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-neutral-400">所属阵营</label>
          <input
            value={npc.faction ?? ''}
            onChange={(e) => updateNpc(npc.id, { faction: e.target.value })}
            className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-200 placeholder:text-neutral-600 focus:ring-1 focus:ring-primary"
            placeholder="输入阵营名"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-neutral-400">关联区域</label>
          <input
            value={npc.region ?? ''}
            onChange={(e) => updateNpc(npc.id, { region: e.target.value })}
            className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-200 placeholder:text-neutral-600 focus:ring-1 focus:ring-primary"
            placeholder="输入区域名"
          />
        </div>
      </div>

      {/* 日常节律 */}
      <div>
        <label className="mb-2 block text-xs font-medium text-neutral-400">日常节律</label>
        <div className="space-y-1.5">
          {(npc.schedule ?? []).map((s, i) => (
            <div key={i} className="flex items-center gap-2 rounded border border-neutral-800 bg-neutral-900/50 px-3 py-1.5">
              <span className="text-[10px] font-mono text-neutral-500">
                {String(s.startHour).padStart(2, '0')}:00 — {String(s.endHour).padStart(2, '0')}:00
              </span>
              <span className="flex-1 text-[10px] text-neutral-300">{s.activity}</span>
              <button
                onClick={() => {
                  const schedule = [...(npc.schedule ?? [])]
                  schedule.splice(i, 1)
                  updateNpc(npc.id, { schedule })
                }}
                className="p-0.5 text-neutral-600 hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() => {
            const schedule = [...(npc.schedule ?? []), { startHour: 0, endHour: 24, activity: '新活动' }]
            updateNpc(npc.id, { schedule })
          }}
          className="mt-1.5 flex items-center gap-1 text-[10px] text-neutral-500 hover:text-neutral-300"
        >
          <Plus className="h-3 w-3" /> 添加时段
        </button>
      </div>
```

- [ ] **Step 2: 编译验证 + 提交**

---

### Task 4: NpcDesigner — NpcTaskList 右侧面板

**Files:**
- Create: `src/components/NpcDesigner/NpcTaskList.tsx`

承载选中 NPC 的任务列表，点击进入 QuestEditor。

- 从 store 读取 questDefinitions，过滤 `involvedNpcs` 含当前 NPC 的任务
- 展示每条任务的名称/类型tag/角色
- `[进入编排]` 按钮 → `setActiveModule('quest_editor')` + `selectQuest(id)`

```typescript
import { useConfigStore } from '../../useConfigStore'
import { Plus, ArrowRight } from 'lucide-react'

const categoryColors: Record<string, string> = {
  main: 'text-red-400 bg-red-500/10 border-red-500/20',
  side: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  ai_dynamic: 'text-neutral-400 bg-neutral-700/30 border-neutral-600/30',
}

export function NpcTaskList() {
  const quests = useConfigStore((s) => s.questDefinitions)
  const selectedId = useConfigStore((s) => s.selectedNpcId)
  const npcs = useConfigStore((s) => s.npcs)
  const selectQuest = useConfigStore((s) => s.selectQuest)
  const setActiveModule = useConfigStore((s) => s.setActiveModule)

  const npc = npcs.find((n) => n.id === selectedId)
  if (!npc) return <div className="flex h-full items-center justify-center text-xs text-neutral-600">—</div>

  const npcQuests = quests.filter((q) => q.involvedNpcs.some((n) => n.npcId === npc.id))

  const handleEdit = (questId: string) => {
    selectQuest(questId)
    setActiveModule('quest_editor')
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-neutral-800 px-4 py-3 flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-300">关联任务</span>
        <span className="text-[10px] text-neutral-500">({npcQuests.length})</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {npcQuests.length === 0 ? (
          <p className="text-[10px] text-neutral-600 px-1">暂无关联任务</p>
        ) : (
          npcQuests.map((quest) => {
            const role = quest.involvedNpcs.find((n) => n.npcId === npc.id)?.role ?? '—'
            const catStyle = categoryColors[quest.category] ?? categoryColors.ai_dynamic
            return (
              <div key={quest.id} className="rounded-md border border-neutral-800 bg-neutral-900/50 p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium border ${catStyle}`}>
                    {quest.category === 'main' ? '主线' : quest.category === 'side' ? '支线' : 'AI'}
                  </span>
                  <span className="text-[10px] text-neutral-500">角色: {role}</span>
                </div>
                <p className="text-xs text-neutral-200 mb-2">{quest.name}</p>
                <button
                  onClick={() => handleEdit(quest.id)}
                  className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80"
                >
                  进入编排 <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            )
          })
        )}
      </div>
      <div className="border-t border-neutral-800 p-3">
        <button className="flex w-full items-center justify-center gap-1.5 rounded border border-neutral-700 py-2 text-[10px] text-neutral-400 hover:bg-neutral-800/50">
          <Plus className="h-3 w-3" /> 新建任务
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 编译验证 + 提交**

---

### Task 5: NpcDesigner 容器重构

**Files:**
- Modify: `src/components/NpcDesigner/NpcDesigner.tsx` (原 PersonaForge.tsx)

布局从三栏改为四栏，引入 NpcTaskList：

```typescript
import { NpcRoster } from './NpcRoster'
import { NpcProfile } from './NpcProfile'
import { MemoryPruner } from './MemoryPruner'
import { NpcTaskList } from './NpcTaskList'

export function NpcDesigner() {
  return (
    <div className="flex h-full">
      <div className="w-48 shrink-0 border-r border-neutral-800 bg-neutral-900/30">
        <NpcRoster />
      </div>
      <div className="flex-1 border-r border-neutral-800">
        <NpcProfile />
      </div>
      <div className="w-72 shrink-0 border-r border-neutral-800">
        <MemoryPruner />
      </div>
      <div className="w-72 shrink-0">
        <NpcTaskList />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 编译验证 + 提交**

---

### Task 6: QuestNetwork 重构 — 6 个 React Flow 自定义节点

**Files:**
- Create: `src/components/QuestNetwork/nodes/PlayerCenterNode.tsx`
- Create: `/QuestNetwork/nodes/MainQuestNode.tsx`
- Create: `src/components/QuestNetwork/nodes/SideQuestNode.tsx`
- Create: `src/components/QuestNetwork/nodes/AiQuestNode.tsx`
- Create: `src/components/QuestNetwork/nodes/NpcNode.tsx`
- Create: `src/components/QuestNetwork/nodes/RewardNode.tsx`
- Create: `src/components/QuestNetwork/QuestNetwork.tsx`

节点实现（简洁版，每个节点 ~30 行）：

**PlayerCenterNode:**
```typescript
import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import { User } from 'lucide-react'

function PlayerCenterNodeImpl() {
  return (
    <div className="rounded-full border-2 border-blue-500/50 bg-blue-500/10 px-6 py-4 shadow-lg shadow-blue-500/10">
      <Handle type="source" position={Position.Right} className="!bg-blue-400 !w-3 !h-3 !border-2 !border-neutral-900" />
      <Handle type="target" position={Position.Left} className="!bg-blue-400 !w-3 !h-3 !border-2 !border-neutral-900" />
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-blue-400" />
        <span className="text-xs font-semibold text-blue-200">玩家</span>
      </div>
    </div>
  )
}
export const PlayerCenterNode = memo(PlayerCenterNodeImpl)
```

**MainQuestNode:**
```typescript
import { memo } from 'react'
import { Handle, Position } from 'reactflow'

const statusColors: Record<string, string> = {
  completed: 'border-red-500/20 bg-red-500/5',
  active: 'border-red-500/40 bg-red-500/10',
  locked: 'border-neutral-700 bg-neutral-900/50 opacity-50',
}

function MainQuestNodeImpl({ data }: { data: { label: string; status: string; summary: string } }) {
  return (
    <div className={`rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm min-w-[160px] ${statusColors[data.status] ?? statusColors.active}`}>
      <Handle type="target" position={Position.Top} className="!bg-red-400 !w-2.5 !h-2.5 !border-2 !border-neutral-900" />
      <Handle type="source" position={Position.Bottom} className="!bg-red-400 !w-2.5 !h-2.5 !border-2 !border-neutral-900" />
      <p className="text-xs font-semibold text-red-200">{data.label}</p>
      <p className="mt-1 text-[9px] text-neutral-500">{data.summary}</p>
      <span className="mt-1.5 inline-block rounded-full bg-red-500/20 px-1.5 py-0.5 text-[8px] text-red-400">{data.status}</span>
    </div>
  )
}
export const MainQuestNode = memo(MainQuestNodeImpl)
```

**SideQuestNode** (同理，颜色变 emerald)、**AiQuestNode** (同理，颜色变 neutral/white)、**NpcNode** (同理，颜色变 yellow)、**RewardNode** (同理，颜色变 purple)。

**QuestNetwork 容器:**
```typescript
import { useMemo } from 'react'
import ReactFlow, { Background, Controls, MiniMap, MarkerType } from 'reactflow'
import 'reactflow/dist/style.css'
import { PlayerCenterNode } from './nodes/PlayerCenterNode'
import { MainQuestNode } from './nodes/MainQuestNode'
import { SideQuestNode } from './nodes/SideQuestNode'
import { AiQuestNode } from './nodes/AiQuestNode'
import { NpcNode } from './nodes/NpcNode'
import { RewardNode } from './nodes/RewardNode'
import { useConfigStore } from '../../useConfigStore'

const nodeTypes = {
  player: PlayerCenterNode,
  mainQuest: MainQuestNode,
  sideQuest: SideQuestNode,
  aiQuest: AiQuestNode,
  npc: NpcNode,
  reward: RewardNode,
}

export function QuestNetwork() {
  const quests = useConfigStore((s) => s.questDefinitions)
  const npcs = useConfigStore((s) => s.npcs)

  const { nodes, edges } = useMemo(() => {
    // 玩家节点固定在画布左侧中间
    return { nodes: [{ id: 'player', type: 'player', position: { x: 30, y: 250 }, data: {} }], edges: [] }
  }, [quests, npcs])

  // TODO: 实际 buildNodes/buildEdges 逻辑，根据 quests 和 npcs 数据生成节点位置和连线

  return (
    <div className="h-full">
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView>
        <Background color="#262626" gap={20} />
        <Controls className="!bg-neutral-900 !border-neutral-700 !fill-neutral-400" />
        <MiniMap className="!bg-neutral-900 !border-neutral-700" maskColor="rgba(0,0,0,0.7)" />
      </ReactFlow>
    </div>
  )
}
```

- [ ] **Step 2: 编译验证 + 提交**

---

### Task 7: QuestEditor 任务编排台

**Files:**
- Create: `src/components/QuestEditor/QuestEditor.tsx` — 容器
- Create: `src/components/QuestEditor/QuestInfoPanel.tsx` — 基本信息
- Create: `src/components/QuestEditor/NodeList.tsx` — 节点列表
- Create: `src/components/QuestEditor/AiSettingsPanel.tsx` — AI 边界设置
- Create: `src/components/QuestEditor/QuestPreview.tsx` — 右侧预览

**QuestEditor 容器:**
```typescript
import { useConfigStore } from '../../useConfigStore'
import { QuestInfoPanel } from './QuestInfoPanel'
import { NodeList } from './NodeList'
import { AiSettingsPanel } from './AiSettingsPanel'
import { QuestPreview } from './QuestPreview'

export function QuestEditor() {
  const quests = useConfigStore((s) => s.questDefinitions)
  const selectedId = useConfigStore((s) => s.selectedQuestId)
  const quest = quests.find((q) => q.id === selectedId)

  if (!quest) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-neutral-500">
        请从 NPC 设定或任务网络图中选择一个任务
      </div>
    )
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <h2 className="text-sm font-semibold text-neutral-200">任务编排台 · {quest.name}</h2>
        <QuestInfoPanel quest={quest} />
        <NodeList quest={quest} />
        {quest.category === 'ai_dynamic' && quest.aiSettings && (
          <AiSettingsPanel quest={quest} />
        )}
      </div>
      <div className="w-80 shrink-0 border-l border-neutral-800 p-4 overflow-y-auto">
        <QuestPreview quest={quest} />
      </div>
    </div>
  )
}
```

**QuestInfoPanel** (~80 行): 展示+编辑任务名称/ID/类别/状态/等级/前置任务/参与NPC。

**NodeList** (~100 行): 可排序的节点卡片列表，每张卡片展示节点名称/类型/触发NPC/完成条件。支持添加/删除/上下移动。

**AiSettingsPanel** (~120 行): 触发条件多选框 + 触发频率输入 + 任务边界选择 + 奖励边界输入 + 稀有奖励池编辑。

**QuestPreview** (~80 行): 小预览图 + 奖励汇总表 + 关联NPC摘要。

- [ ] **Step 2: 编译验证 + 提交**

---

### Task 8: 导航更新

**Files:**
- Modify: `src/components/Layout/Sidebar.tsx`
- Modify: `src/App.tsx`

Sidebar 导航项改为:
```typescript
  { id: 'guardrails', label: '护栏与公理', icon: Shield },
  { id: 'npc_designer', label: 'NPC 设定', icon: Users },
  { id: 'quest_network', label: '任务网络图', icon: GitBranch },
  { id: 'quest_editor', label: '任务编排台', icon: Edit3 },
  { id: 'director', label: '导演控制台', icon: Activity },
  { id: 'context', label: '上下文编排器', icon: Puzzle },
  { id: 'sandbox', label: '对话沙盒', icon: MessageSquare },
```

App.tsx 更新 modules 映射 + 更新 ModuleId 类型:
```typescript
export type ModuleId = 'guardrails' | 'npc_designer' | 'quest_network' | 'quest_editor' | 'director' | 'context' | 'sandbox'

const modules = {
  guardrails: Guardrails,
  npc_designer: NpcDesigner,
  quest_network: QuestNetwork,
  quest_editor: QuestEditor,
  director: DirectorDashboard,
  context: ContextComposer,
  sandbox: ConversationSandbox,
}
```

- [ ] **Step 2: 编译验证 + 提交**

---

### Task 9: QuestNetwork 完整实现 (buildNodes/buildEdges)

完善 Task 6 中的 useMemo 逻辑，从 quests 和 npcs 数据动态生成节点和连线。

节点布局规则：
- 主线放在左上 x:30-400 y:50-300 区域，从上到下排列分章
- 支线放在左下 x:30-400 y:380-600
- AI 放在右上 x:480-800 y:50-400
- NPC 节点散布在四周

- [ ] **Step 2: 编译验证 + 提交**

---

### Task 10: 端到端编译验证

```bash
npx tsc --noEmit && npm run dev
```

验证清单：
- [ ] 导航显示 7 个入口，顺序正确
- [ ] NPC 设定页四栏：列表/基础信息含角色标签+阵营+区域+节律/记忆修剪/任务关联
- [ ] NPC 设定右侧任务关联面板显示该NPC的任务
- [ ] 点击「进入编排」跳转到任务编排台并高亮该任务
- [ ] 任务网络图显示节点和连线
- [ ] 任务编排台显示基本信息/节点列表/AI设置/预览

```
git add -A && git commit -m "verify: NPC designer + quest system E2E"
```
