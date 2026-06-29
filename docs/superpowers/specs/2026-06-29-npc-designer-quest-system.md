# NPC 设定 & 任务系统 —— 设计规格

> 版本: 1.0.0 | 日期: 2026-06-29 | 范围: 模块 A 重构 + 模块 C 重构 + 新增任务编排台

---

## 一、改动范围

| 原名称 | 改为 | 改动类型 |
|---|---|---|
| 灵魂锻造台 (PersonaForge) | NPC 设定 | 重构：新增角色类型/阵营/区域/节律 + 右侧任务关联面板 |
| 事件总线路由图 (EventBus) | 任务网络图 | 重构：从「事件→子系统」变为「玩家为中心→任务辐射图」 |
| — | 任务编排台 | 🆕 新增：主线节点编排 + AI 支线边界配置 + 奖励池 |

### 不受影响的模块

模块 B (护栏与公理)、模块 D (导演节奏控制台)、模块 F (上下文编排器)、模块 G (对话沙盒) 本次不变。

---

## 二、模块 A: NPC 设定 (重构)

### 2.1 新增 NPC 属性

在原有 5 维性格 (greed/patience/aggression/charisma/loyalty) 基础上增加：

```typescript
interface NpcPersona {
  // 原有
  id: string
  name: string
  basePrompt: string
  traits: NpcTraits  // greed/patience/aggression/charisma/loyalty
  pinnedMemories: string[]
  
  // 新增
  roleTags: NpcRole[]           // NPC 功能角色 (可多选)
  faction: string               // 所属阵营
  region: string                // 关联区域
  schedule: DailySchedule[]     // 日常节律
}

type NpcRole = 'merchant' | 'quest_giver' | 'informant' | 'combat_ally' | 'artisan' | 'official'

interface DailySchedule {
  startHour: number   // 0-23
  endHour: number
  activity: string    // 活动描述
}
```

### 2.2 布局: 三栏 → 四栏

```
┌───────────┬───────────────┬──────────────┬──────────────┐
│ NPC 列表   │ 基础信息+性格  │ 记忆修剪      │ 任务关联面板  │
│ (w-48)    │ (flex-1)      │ (w-72)       │ (w-72)       │
│           │               │              │              │
│ 搜索/过滤  │ Core Prompt   │ Pin/Forget   │ 该NPC参与    │
│           │ 5维滑块        │ 语义检索     │ 的任务列表   │
│           │               │              │              │
│           │ 新增:          │              │ 点击[进入编排]│
│           │ - 角色标签      │              │ → 打开编排台 │
│           │ - 所属阵营      │              │ [新建任务]   │
│           │ - 关联区域      │              │              │
│           │ - 日常节律      │              │              │
└───────────┴───────────────┴──────────────┴──────────────┘
```

### 2.3 右侧任务关联面板

从 store 读取所有 QuestDefinition，筛选 `involvedNpcs` 包含当前 NPC 的任务，展示列表：

- 每条显示：任务名称、类型标签(主线/支线/AI)、NPC 在此任务中的角色
- `[进入编排]` 按钮：切换到任务编排台并高亮该任务
- `[新建任务]` 按钮：创建新任务，自动将当前 NPC 加入 involvedNpcs

### 2.4 数据变更

- `src/types/index.ts`: NpcPersona 接口新增 roleTags/faction/region/schedule
- `src/useConfigStore.ts`: mockNpcs 追加新字段默认值
- `src/components/PersonaForge/`: 重命名为 `src/components/NpcDesigner/`，BasePersona 改名 NpcProfile

---

## 三、模块 C: 任务网络图 (重构)

### 3.1 核心理念

从抽象的「事件→子系统连线」变为地图式的「玩家为中心 → 任务节点 → NPC → 奖励」辐射图。

### 3.2 节点类型 (React Flow 自定义节点)

| 节点 | 颜色 | 内容 |
|---|---|---|
| PlayerCenterNode | 蓝色 | 玩家图标，固定在画布中央偏左 |
| MainQuestNode | 红色 | 主线任务：名称 + 状态(已完成/进行中/锁定) + 进度 |
| SideQuestNode | 绿色 | 支线任务：名称 + 触发条件摘要 |
| AiQuestNode | 白色/灰色 | AI 动态模板：名称 + 触发频率 |
| NpcNode | 黄色 | NPC 节点：名称 + 角色标签 |
| RewardNode | 紫色 | 奖励：金币/物品/声望/解锁 |

### 3.3 布局规则

- 主线区域：左上角，节点从左上到左上偏右水平排列（章节推进），自上而下排列次级任务
- 支线区域：左下角，节点自由分布
- AI 池区域：右上角，网格排列
- NPC 节点：散布在周围，与任务节点连线

### 3.4 连线含义

- **实线**: 任务推进 (A 完成 → B 解锁)
- **虚线**: AI 动态关联 (可能触发)
- **双线**: 必要条件 (A 必须完成 B 才能做)

### 3.5 顶部分类标签

```
[主线任务] [支线任务] [AI动态] [全部显示]   ← 点选后按类型高亮/淡出
```

### 3.6 交互

- 点击节点 → 底部弹出详情条（任务摘要 + NPC 列表 + 奖励预览 + `[进入编排]`）
- 拖拽布局自动保存

### 3.7 数据变更

- 完全删除旧的 eventRouting / EventRoute 相关 UI（store 里保留接口兼容，不再展示）
- 新建 6 个 React Flow 自定义节点组件

---

## 四、任务编排台 (新增)

### 4.1 入口

- NPC 设定页右侧 → `[进入编排]`
- 任务网络图点击节点 → `[进入编排]`
- 左侧导航栏新增「任务编排台」

### 4.2 布局

```
┌──────────────────────────────┬──────────────────────────┐
│ 任务配置面板                   │ 实时预览                  │
│                              │                          │
│ ┌─ 基本信息 ────────────────┐ │ ┌─ 节点关系图 ────────┐ │
│ │ 任务名称/ID/类型/状态      │ │ │ 小型 React Flow      │ │
│ │ 推荐等级/前置任务          │ │ │ 展示当前任务节点链    │ │
│ │ 参与NPC列表               │ │ └─────────────────────┘ │
│ └──────────────────────────┘ │                          │
│                              │ ┌─ 奖励汇总 ──────────┐ │
│ ┌─ 任务节点编排 ────────────┐ │ │ 所有节点的奖励合并   │ │
│ │ 可排序的节点列表           │ │ │ 金币/经验/声望/物品  │ │
│ │ 每个节点:                 │ │ └─────────────────────┘ │
│ │   名称/类型/触发NPC/      │ │                          │
│ │   完成条件/对话/战斗/     │ │ ┌─ 关联NPC摘要 ──────┐ │
│ │   奖励配置                │ │ │ NPC + 角色 + 状态    │ │
│ │ [添加节点] [删除] [排序]  │ │ └─────────────────────┘ │
│ └──────────────────────────┘ │                          │
│                              │                          │
│ ┌─ AI 支线设置 ─────────────┐│  (仅 AI 类型任务显示)     │
│ │ 触发条件 / 触发频率        ││                          │
│ │ 任务边界 / 奖励边界        ││                          │
│ │ 稀有触发概率 / 稀有奖励池  ││                          │
│ └──────────────────────────┘ │                          │
└──────────────────────────────┴──────────────────────────┘
```

### 4.3 任务节点数据

```typescript
interface QuestNode {
  id: string
  questId: string
  name: string         // 节点名称 (如 "接取任务·狼患")
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
  rewards: { type: 'gold' | 'exp' | 'reputation' | 'item'; value: string; detail?: string }[]
}
```

### 4.4 任务定义数据

```typescript
interface QuestDefinition {
  id: string
  name: string
  category: 'main' | 'side' | 'ai_dynamic'
  status: 'draft' | 'active' | 'completed' | 'locked'
  minLevel: number
  maxLevel: number
  prerequisiteQuestId?: string
  nodes: QuestNode[]
  involvedNpcs: { npcId: string; role: string }[]
  aiSettings?: AiQuestSettings
}

interface AiQuestSettings {
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
```

---

## 五、导航变更

Sidebar `navItems` 调整：

```
1. 护栏与公理    (不变)
2. NPC 设定      (原名: 灵魂锻造台, 移至上位)
3. 任务网络图    (原名: 事件总线路由图, 移至上位)
4. 任务编排台    (新增)
5. 导演节奏控制台 (不变)
6. 上下文编排器  (不变)
7. 对话沙盒      (不变)
```

---

## 六、Store 变更

### 新增 slice

```typescript
interface ConfigStore {
  // 新增
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
```

### Mock 数据

新增 5 条任务定义（3 主线, 1 支线, 1 AI）：

1. **主线·第一章: 北境狼患** (main, active) — 3 个节点 (接取→收集线索→猎狼Boss→交任务)
2. **主线·第二章: 龙的预兆** (main, locked) — 前置任务=第一章
3. **主线·第三章: 王城的阴影** (main, locked) — 前置任务=第二章
4. **支线·老韩的私藏** (side, active) — 2 个节点 (触发条件: 老韩好感度>50)
5. **AI·随机酒馆闲谈** (ai_dynamic, active) — AI 边界配置

---

## 七、文件变更清单

| 操作 | 文件路径 |
|---|---|
| 重命名 | `src/components/PersonaForge/` → `src/components/NpcDesigner/` |
| 修改 | `src/types/index.ts` — 新增 NpcRole, DailySchedule, QuestDefinition, QuestNode, AiQuestSettings |
| 修改 | `src/useConfigStore.ts` — 新增 quest slice, mock quests, 更新 mock npcs |
| 新建 | `src/components/NpcDesigner/NpcTaskList.tsx` — 右侧任务关联面板 |
| 新建 | `src/components/QuestNetwork/` — 6 个 React Flow 自定义节点 + 容器 |
| 新建 | `src/components/QuestEditor/` — 任务编排台 (QuestEditor, NodeEditor, AiSettingsPanel, QuestPreview) |
| 修改 | `src/components/Layout/Sidebar.tsx` — 导航项更新 |
| 修改 | `src/App.tsx` — modules 映射更新 |
| 删除 | `src/components/PersonaForge/` 旧目录 |
| 删除 | `src/components/EventBus/` 旧目录 (保留 store 中 eventRouting 但不再渲染) |
