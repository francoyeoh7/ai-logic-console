# Phase 1: LLM Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立控制台与 llama.cpp 的直接通信链路，新增上下文编排器和对话沙盒两个模块，让 NPC 能够基于结构化上下文做出文本回应。

**Architecture:** 新增 2 个模块（Context Composer、Conversation Sandbox），扩展 Zustand store 增加 action registry / runtime / WebSocket 状态切片，新增 llama.cpp HTTP 客户端和 GBNF grammar 生成器。保持现有 4 模块不变，仅 Sidebar 和 App 路由需要扩展。

**Tech Stack:** React 18 + TypeScript + Vite + Zustand + Tailwind CSS + Radix UI + Lucide Icons

## Global Constraints

- 所有组件使用暗色模式（Dark Mode），不新增浅色主题
- 新模块路由通过 App.tsx 的 `modules` 映射注册
- 新状态通过 Zustand 的独立切片扩展现有 store，不创建新 store
- 所有 API 调用通过 service 层封装，组件不直接调 fetch
- Tailwind 类名使用语义化色彩令牌（card/foreground/muted/border 等）

---

## File Structure

```
src/
├── types/
│   ├── index.ts              (修改: 新增 ActionDefinition, RuntimeState, WebSocketMessage 等)
│   └── actions.ts            (新建: 行为注册表相关类型)
├── services/
│   ├── llmService.ts         (新建: llama.cpp HTTP 客户端)
│   ├── websocket.ts          (新建: UE5 WebSocket 客户端 + 状态管理)
│   └── gbnfGenerator.ts      (新建: GBNF grammar 生成器)
├── store/
│   └── useConfigStore.ts     (修改: 新增 action/websocket/llm slice)
├── components/
│   ├── Layout/
│   │   └── Sidebar.tsx       (修改: 新增 2 个导航项)
│   ├── ContextComposer/
│   │   ├── ContextComposer.tsx     (新建: 四段式 Prompt 拼装容器)
│   │   ├── SectionPanel.tsx        (新建: 可编辑段落面板)
│   │   ├── TokenCounter.tsx        (新建: Token 预算计数器)
│   │   ├── MemoryPreview.tsx       (新建: 记忆检索预览)
│   │   └── ActionWhitelist.tsx     (新建: 行为白名单预览)
│   └── ConversationSandbox/
│       ├── ConversationSandbox.tsx (新建: 对话沙盒容器)
│       ├── ChatPanel.tsx           (新建: 聊天气泡界面)
│       └── ResponseInspector.tsx   (新建: LLM 响应解析展示)
├── App.tsx                   (修改: 新增模块路由)
└── index.css                 (修改: 新增聊天气泡样式)
```

---

### Task 1: 新增类型定义

**Files:**
- Create: `src/types/actions.ts`
- Modify: `src/types/index.ts`

**Interfaces:**
- Produces: `ActionDefinition`, `ActionParam`, `Precondition`, `ActionEffect`, `InterruptRule`, `AnimationHint`, `ActionCategory` (从 Section 4.1 完整导出)
- Produces: `ModuleId` 扩展为包含 `'context' | 'sandbox'`

- [ ] **Step 1: 创建 `src/types/actions.ts`**

```typescript
export enum ActionCategory {
  Movement = 'movement',
  Speech = 'speech',
  Social = 'social',
  Combat = 'combat',
  Interaction = 'interaction',
  Posture = 'posture',
  Meta = 'meta',
}

export interface ActionParam {
  name: string
  type: 'actor' | 'string' | 'float' | 'int' | 'bool' | 'enum'
  required: boolean
  defaultValue?: unknown
  description: string
  constraints?: {
    min?: number
    max?: number
    enumValues?: string[]
    maxLength?: number
  }
}

export interface Precondition {
  field: string
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'not_in' | 'exists'
  value: unknown
}

export interface ActionEffect {
  targetSystem: string
  mutation: string
}

export interface InterruptRule {
  interruptible: boolean
  interruptByHigherPriority: boolean
  exclusiveCategories: string[]
  recoveryTimeMs: number
}

export interface AnimationHint {
  montage: string
  blendIn: number
  blendOut: number
  loop: boolean
}

export interface ActionDefinition {
  actionId: string
  category: ActionCategory
  ue5Class: string
  params: ActionParam[]
  preconditions: Precondition[]
  effects: ActionEffect[]
  interrupt: InterruptRule
  animation: AnimationHint
  cooldownMs: number
}
```

- [ ] **Step 2: 修改 `src/types/index.ts` 增加新类型**

在文件末尾追加：

```typescript
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

// ModuleId 扩展
export type ModuleId = 'persona' | 'guardrails' | 'eventbus' | 'director' | 'context' | 'sandbox'
```

- [ ] **Step 3: 提交**

```bash
git add src/types/actions.ts src/types/index.ts
git commit -m "feat: add action registry and runtime types"
```

---

### Task 2: llama.cpp HTTP 客户端

**Files:**
- Create: `src/services/llmService.ts`

**Interfaces:**
- Consumes: `ActionDefinition` from Task 1
- Produces: `llmService.chatCompletion()`, `llmService.generateEmbedding()`

- [ ] **Step 1: 创建 `src/services/llmService.ts`**

```typescript
const LLM_BASE = 'http://localhost:8080/v1'

interface ChatCompletionRequest {
  systemPrompt: string
  grammar?: string
  temperature?: number
  maxTokens?: number
}

interface ChatCompletionResponse {
  json: Record<string, unknown>
  usage: { promptTokens: number; completionTokens: number; totalTokens: number }
}

interface EmbeddingResponse {
  embedding: number[]
  tokens: number
}

export const llmService = {
  async chatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const body: Record<string, unknown> = {
      messages: [
        { role: 'system', content: req.systemPrompt },
        { role: 'user', content: 'Respond to the current situation. Output a JSON action command.' },
      ],
      temperature: req.temperature ?? 0.7,
      top_p: 0.9,
      max_tokens: req.maxTokens ?? 256,
      stream: false,
    }

    if (req.grammar) {
      body.grammar = req.grammar
    }

    const res = await fetch(`${LLM_BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`LLM API error ${res.status}: ${text}`)
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(content)
    } catch {
      parsed = { raw: content }
    }

    return {
      json: parsed,
      usage: {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0,
      },
    }
  },

  async generateEmbedding(text: string): Promise<EmbeddingResponse> {
    const res = await fetch(`${LLM_BASE}/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: text }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Embedding API error ${res.status}: ${err}`)
    }

    const data = await res.json()
    return {
      embedding: data.data?.[0]?.embedding ?? [],
      tokens: data.usage?.prompt_tokens ?? 0,
    }
  },

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${LLM_BASE}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
        }),
      })
      return res.ok
    } catch {
      return false
    }
  },
}
```

- [ ] **Step 2: 提交**

```bash
git add src/services/llmService.ts
git commit -m "feat: add llama.cpp HTTP client service"
```

---

### Task 3: WebSocket 客户端

**Files:**
- Create: `src/services/websocket.ts`

**Interfaces:**
- Produces: `wsClient.connect()`, `wsClient.send()`, `wsClient.subscribe()`

- [ ] **Step 1: 创建 `src/services/websocket.ts`**

```typescript
import type { WebSocketMessage } from '../types'

type MessageHandler = (msg: WebSocketMessage) => void

class WebSocketClient {
  private ws: WebSocket | null = null
  private url: string = ''
  private handlers: Map<string, Set<MessageHandler>> = new Map()
  private globalHandlers: Set<MessageHandler> = new Set()
  private seqCounter = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private connected = false
  private onStatusChange?: (connected: boolean) => void

  connect(url: string = 'ws://localhost:9090', onStatus?: (connected: boolean) => void): void {
    this.url = url
    this.onStatusChange = onStatus
    this.doConnect()
  }

  private doConnect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return

    this.ws = new WebSocket(this.url)

    this.ws.onopen = () => {
      this.connected = true
      this.onStatusChange?.(true)
      this.reconnectTimer = null
    }

    this.ws.onmessage = (event) => {
      try {
        const msg: WebSocketMessage = JSON.parse(event.data)
        this.handlers.get(msg.type)?.forEach((h) => h(msg))
        this.globalHandlers.forEach((h) => h(msg))
      } catch {
        // 忽略解析失败的帧
      }
    }

    this.ws.onclose = () => {
      this.connected = false
      this.onStatusChange?.(false)
      this.scheduleReconnect()
    }

    this.ws.onerror = () => {
      // onclose 会紧随 onerror 触发，连接逻辑在 onclose 处理
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.doConnect()
    }, 3000)
  }

  send(type: string, payload: Record<string, unknown> = {}): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    const msg: WebSocketMessage = {
      type,
      seq: ++this.seqCounter,
      timestamp: Date.now(),
      payload,
    }
    this.ws.send(JSON.stringify(msg))
  }

  subscribe(type: string | null, handler: MessageHandler): () => void {
    if (type) {
      if (!this.handlers.has(type)) this.handlers.set(type, new Set())
      this.handlers.get(type)!.add(handler)
      return () => this.handlers.get(type)?.delete(handler)
    } else {
      this.globalHandlers.add(handler)
      return () => this.globalHandlers.delete(handler)
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.ws?.close()
    this.ws = null
    this.connected = false
    this.onStatusChange?.(false)
  }

  isConnected(): boolean {
    return this.connected
  }
}

export const wsClient = new WebSocketClient()
```

- [ ] **Step 2: 提交**

```bash
git add src/services/websocket.ts
git commit -m "feat: add WebSocket client service"
```

---

### Task 4: GBNF Grammar 生成器

**Files:**
- Create: `src/services/gbnfGenerator.ts`

**Interfaces:**
- Consumes: `ActionDefinition` from Task 1
- Produces: `generateGbnfGrammar(actions: ActionDefinition[]): string`

- [ ] **Step 1: 创建 `src/services/gbnfGenerator.ts`**

```typescript
import type { ActionDefinition } from '../types/actions'

const EMOTIONS = ['neutral', 'happy', 'sad', 'angry', 'fearful', 'surprised', 'disgusted']

function generateParamsRule(action: ActionDefinition): string {
  const fields = action.params.map((p) => {
    switch (p.type) {
      case 'string':
        return `"\\"${p.name}\\"" ws ":" ws string`
      case 'float':
      case 'int':
        return `"\\"${p.name}\\"" ws ":" ws number`
      case 'bool':
        return `"\\"${p.name}\\"" ws ":" ws ("true" | "false")`
      case 'enum':
        if (p.constraints?.enumValues?.length) {
          const vals = p.constraints.enumValues.map((v) => `"${v}"`).join(' | ')
          return `"\\"${p.name}\\"" ws ":" ws (${vals})`
        }
        return `"\\"${p.name}\\"" ws ":" ws string`
      case 'actor':
        return `"\\"${p.name}\\"" ws ":" ws string`
      default:
        return `"\\"${p.name}\\"" ws ":" ws string`
    }
  })

  if (fields.length === 0) return `${action.actionId}_params ::= "{" ws "}"`

  return `${action.actionId}_params ::= "{" ws ${fields.join(' ws "," ws ')} ws "}"`
}

export function generateGbnfGrammar(actions: ActionDefinition[]): string {
  const actionNames = actions.map((a) => `"${a.actionId}"`).join(' | ')
  const emotionNames = EMOTIONS.map((e) => `"${e}"`).join(' | ')
  const paramRules = actions.map(generateParamsRule).join('\n')
  const paramBranches = actions.map((a) => `${a.actionId}_params`).join(' | ')

  return `
root ::= action_object
action_object ::= "{" ws "\\"action\\"" ws ":" ws action_name ws "," ws "\\"params\\"" ws ":" ws params ws "," ws "\\"emotion\\"" ws ":" ws emotion ws "," ws "\\"priority\\"" ws ":" ws number ws "," ws "\\"reasoning\\"" ws ":" ws reason_str ws "}"
ws ::= [ \\t\\n]*
action_name ::= ${actionNames}
emotion ::= ${emotionNames}
number ::= "0." [0-9] | "0." [0-9][0-9] | "1.0"
reason_str ::= "\\"" [a-zA-Z0-9 _.,!?\\u4e00-\\u9fff]{1,30} "\\""
string ::= "\\"" [a-zA-Z0-9 _.,!?\\u4e00-\\u9fff]{1,60} "\\""
params ::= ${paramBranches}
${paramRules}
`.trim()
}
```

- [ ] **Step 2: 提交**

```bash
git add src/services/gbnfGenerator.ts
git commit -m "feat: add GBNF grammar generator"
```

---

### Task 5: 扩展 Zustand Store

**Files:**
- Modify: `src/useConfigStore.ts`

**Interfaces:**
- Consumes: types from Task 1
- Consumes: `wsClient` from Task 3
- Produces: store 新增 action/websocket/llm/context 切片

- [ ] **Step 1: 修改 `src/useConfigStore.ts`**

在文件顶部 import 区追加：

```typescript
import type {
  ActionDefinition,
  NpcStatusSnapshot,
  LlmCallLogEntry,
  GuardrailLogEntry,
  InterventionLogEntry,
  ContextSection,
} from './types'
import type { ActionCategory } from './types/actions'
import { wsClient } from './services/websocket'
import { llmService } from './services/llmService'
import { generateGbnfGrammar } from './services/gbnfGenerator'
```

在现有 `interface ConfigStore` 中追加新切片：

```typescript
  // ===== Action Registry =====
  actionDefinitions: ActionDefinition[]
  addActionDefinition: (def: ActionDefinition) => void
  updateActionDefinition: (id: string, def: Partial<ActionDefinition>) => void
  removeActionDefinition: (id: string) => void

  // ===== WebSocket =====
  wsConnected: boolean
  connectWebSocket: (url?: string) => void
  disconnectWebSocket: () => void
  sendWsMessage: (type: string, payload?: Record<string, unknown>) => void

  // ===== Runtime State =====
  npcStatuses: NpcStatusSnapshot[]
  llmCallLogs: LlmCallLogEntry[]
  guardrailLogs: GuardrailLogEntry[]
  interventionLogs: InterventionLogEntry[]
  clearRuntimeLogs: () => void

  // ===== Context Assembly =====
  contextSections: ContextSection[]
  updateContextSection: (id: string, content: string) => void
  resetContextSections: () => void

  // ===== LLM Call =====
  lastLlmResponse: Record<string, unknown> | null
  lastLlmUsage: { promptTokens: number; completionTokens: number; totalTokens: number } | null
  isLlmCalling: boolean
  llmCallError: string | null
  callLlm: () => Promise<void>
  checkLlmHealth: () => Promise<boolean>
```

在 mock 数据区之后（第 70 行附近），追加 mock 行为注册表：

```typescript
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
      { name: 'target', type: 'actor', required: true, description: '移动目标 (实体ID 或位置标识)' },
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
      { name: 'target', type: 'actor', required: false, description: '对话目标（无则自言自语）' },
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
```

在 store 的 `create` 函数体内追加以下切片。定位到 `activeModule` 初始化行后追加：

```typescript
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
    wsClient.connect(url, (connected) => {
      useConfigStore.setState({ wsConnected: connected })
    })
  },
  disconnectWebSocket: () => wsClient.disconnect(),
  sendWsMessage: (type, payload) => wsClient.send(type, payload),

  // ===== Runtime State =====
  npcStatuses: [],
  llmCallLogs: [],
  guardrailLogs: [],
  interventionLogs: [],
  clearRuntimeLogs: () =>
    set({ npcStatuses: [], llmCallLogs: [], guardrailLogs: [], interventionLogs: [] }),

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

    const grammar = generateGbnfGrammar(s.actionDefinitions)

    set({ isLlmCalling: true, llmCallError: null })

    try {
      const result = await llmService.chatCompletion({
        systemPrompt,
        grammar,
        temperature: 0.7,
        maxTokens: 256,
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

  // ===== Export Global Config (unchanged, kept here for reference) =====
  exportGlobalConfig: () => {
    const s = useConfigStore.getState()
    const npcs: Record<string, {
      base_prompt: string
      traits: { greed: number; patience: number; aggression: number; charisma: number; loyalty: number }
      pinned_memories: string[]
    }> = {}
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
```

注意：以上追加的切片全部插入在 store `create` 回调函数体内。保留原有所有切片不变。

- [ ] **Step 2: 检查 TypeScript 编译**

```bash
npx tsc --noEmit 2>&1
```

预期：无类型错误。

- [ ] **Step 3: 提交**

```bash
git add src/useConfigStore.ts
git commit -m "feat: add action registry, WebSocket, and LLM slices to store"
```

---

### Task 6: Token 计算工具

**Files:**
- Modify: `src/lib/utils.ts` — 新增 `estimateTokens()` 函数

- [ ] **Step 1: 追加 `estimateTokens` 到 `src/lib/utils.ts`**

```typescript
export function estimateTokens(text: string): number {
  if (!text) return 0
  let tokens = 0
  for (const char of text) {
    const code = char.charCodeAt(0)
    if (code <= 0x7f) {
      tokens += 0.25
    } else if (code <= 0x7ff) {
      tokens += 0.5
    } else {
      tokens += 0.75
    }
  }
  return Math.ceil(tokens)
}
```

- [ ] **Step 2: 提交**

```bash
git add src/lib/utils.ts
git commit -m "feat: add estimateTokens utility"
```

---

### Task 7: Context Composer 组件

**Files:**
- Create: `src/components/ContextComposer/ContextComposer.tsx`
- Create: `src/components/ContextComposer/SectionPanel.tsx`
- Create: `src/components/ContextComposer/TokenCounter.tsx`
- Create: `src/components/ContextComposer/MemoryPreview.tsx`
- Create: `src/components/ContextComposer/ActionWhitelist.tsx`

- [ ] **Step 1: TokenCounter**

```typescript
// src/components/ContextComposer/TokenCounter.tsx
import { useConfigStore } from '../../useConfigStore'
import { estimateTokens } from '../../lib/utils'

export function TokenCounter() {
  const sections = useConfigStore((s) => s.contextSections)
  const totalBudget = sections.reduce((sum, sec) => sum + sec.tokenBudget, 0)
  const usedTokens = sections.reduce((sum, sec) => sum + estimateTokens(sec.content), 0)

  const usedPercent = Math.min(100, (usedTokens / totalBudget) * 100)
  const barColor =
    usedPercent > 95 ? 'bg-destructive' : usedPercent > 75 ? 'bg-yellow-500' : 'bg-primary'

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-3">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="text-neutral-400">Token 预算</span>
        <span className="font-mono text-neutral-200">
          {usedTokens} / {totalBudget}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-neutral-800">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.max(2, usedPercent)}%` }}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: SectionPanel**

```typescript
// src/components/ContextComposer/SectionPanel.tsx
import type { ContextSection } from '../../types'
import { estimateTokens } from '../../lib/utils'

interface Props {
  section: ContextSection
  onChange: (content: string) => void
}

export function SectionPanel({ section, onChange }: Props) {
  const used = estimateTokens(section.content)
  const pct = Math.min(100, (used / section.tokenBudget) * 100)

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 overflow-hidden">
      <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/20 text-[10px] font-bold text-primary">
            {section.id}
          </span>
          <span className="text-xs font-medium text-neutral-300">{section.title}</span>
        </div>
        <span className={`text-[10px] font-mono ${pct > 90 ? 'text-destructive' : 'text-neutral-500'}`}>
          {used}/{section.tokenBudget}t
        </span>
      </div>
      <textarea
        value={section.content}
        onChange={(e) => onChange(e.target.value)}
        readOnly={!section.editable}
        rows={6}
        className={`w-full resize-none bg-transparent px-4 py-3 font-mono text-xs leading-relaxed text-neutral-300 placeholder:text-neutral-600 focus:outline-none ${
          !section.editable ? 'cursor-not-allowed opacity-50' : ''
        }`}
        placeholder={section.editable ? '输入当前感知数据...' : '此段由系统自动填充'}
        spellCheck={false}
      />
    </div>
  )
}
```

- [ ] **Step 3: MemoryPreview**

```typescript
// src/components/ContextComposer/MemoryPreview.tsx
import { useConfigStore } from '../../useConfigStore'
import { GripVertical } from 'lucide-react'

export function MemoryPreview() {
  const memories = useConfigStore((s) => s.memories)
  const selectedId = useConfigStore((s) => s.selectedNpcId)

  const npcMemories = memories
    .filter((m) => m.npcId === selectedId)
    .sort((a, b) => b.timestamp - a.timestamp)

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50">
      <div className="border-b border-neutral-800 px-4 py-2.5">
        <span className="text-xs font-medium text-neutral-300">记忆检索预览</span>
        <span className="ml-2 text-[10px] text-neutral-500">
          实际 LLM 调用将取 top 6
        </span>
      </div>
      <div className="max-h-48 overflow-y-auto p-2 space-y-1">
        {npcMemories.slice(0, 6).map((mem, i) => (
          <div
            key={mem.id}
            className={`flex items-center gap-2 rounded px-2 py-1.5 text-xs ${
              mem.pinned ? 'bg-primary/10' : 'hover:bg-neutral-800/50'
            }`}
          >
            <GripVertical className="h-3 w-3 shrink-0 text-neutral-600" />
            <span className="text-[10px] font-mono text-neutral-500">#{i +span>
            <span className="flex-1 truncate text-neutral-300">{mem.summary}</span>
            <span className="text-[10px] font-mono text-neutral-500">
              重要度:{mem.importance}
            </span>
          </div>
        ))}
        {npcMemories.length === 0 && (
          <p className="px-2 py-3 text-xs text-neutral-600">无记忆数据</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: ActionWhitelist**

```typescript
// src/components/ContextComposer/ActionWhitelist.tsx
import { useConfigStore } from '../../useConfigStore'
import { CheckCircle2, XCircle } from 'lucide-react'

export function ActionWhitelist() {
  const actions = useConfigStore((s) => s.actionDefinitions)

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50">
      <div className="border-b border-neutral-800 px-4 py-2.5">
        <span className="text-xs font-medium text-neutral-300">行为白名单</span>
        <span className="ml-2 text-[10px] text-neutral-500">
          当前上下文将包含 {actions.length} 个可用动作
        </span>
      </div>
      <div className="max-h-48 overflow-y-auto p-2 space-y-1">
        {actions.map((action) => (
          <div
            key={action.actionId}
            className="flex items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-neutral-800/50"
          >
            <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />
            <span className="font-mono text-neutral-200">{action.actionId}</span>
            <span className="ml-auto text-[10px] text-neutral-500 capitalize">{action.category}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: ContextComposer 容器**

```typescript
// src/components/ContextComposer/ContextComposer.tsx
import { useConfigStore } from '../../useConfigStore'
import { TokenCounter } from './TokenCounter'
import { SectionPanel } from './SectionPanel'
import { MemoryPreview } from './MemoryPreview'
import { ActionWhitelist } from './ActionWhitelist'
import { Play, Loader2 } from 'lucide-react'

export function ContextComposer() {
  const sections = useConfigStore((s) => s.contextSections)
  const updateSection = useConfigStore((s) => s.updateContextSection)
  const npcs = useConfigStore((s) => s.npcs)
  const selectedId = useConfigStore((s) => s.selectedNpcId)
  const isCalling = useConfigStore((s) => s.isLlmCalling)
  const callLlm = useConfigStore((s) => s.callLlm)

  const npc = npcs.find((n) => n.id === selectedId)

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-neutral-200">上下文编排器</h2>
            <p className="mt-1 text-xs text-neutral-500">
              {npc ? `NPC: ${npc.name}` : '选择 NPC 后拼装上下文'}
            </p>
          </div>
          <button
            onClick={callLlm}
            disabled={isCalling}
            className="flex items-center gap-2 rounded-md bg-primary/20 px-4 py-2 text-xs font-medium text-primary hover:bg-primary/30 disabled:opacity-50"
          >
            {isCalling ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            模拟调用
          </button>
        </div>

        <TokenCounter />

        <div className="space-y-3">
          {sections.map((sec) => (
            <SectionPanel
              key={sec.id}
              section={sec}
              onChange={(content) => updateSection(sec.id, content)}
            />
          ))}
        </div>
      </div>

      <div className="w-72 shrink-0 border-l border-neutral-800 p-4 space-y-4 overflow-y-auto">
        <MemoryPreview />
        <ActionWhitelist />
      </div>
    </div>
  )
}
```

- [ ] **Step 6: 提交**

```bash
git add src/components/ContextComposer/
git commit -m "feat: add Context Composer module (module F)"
```

---

### Task 8: Conversation Sandbox 组件

**Files:**
- Create: `src/components/ConversationSandbox/ConversationSandbox.tsx`
- Create: `src/components/ConversationSandbox/ChatPanel.tsx`
- Create: `src/components/ConversationSandbox/ResponseInspector.tsx`

- [ ] **Step 1: ChatPanel**

```typescript
// src/components/ConversationSandbox/ChatPanel.tsx
import { useEffect, useRef } from 'react'
import { Send, User, Bot } from 'lucide-react'

export interface Message {
  role: 'user' | 'npc'
  content: string
  timestamp: number
}

interface Props {
  npcName: string
  messages: Message[]
  onSend: (message: string) => void
  isProcessing: boolean
  input: string
  setInput: (v: string) => void
}

export function ChatPanel({ npcName, messages, onSend, isProcessing, input, setInput }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = () => {
    const text = input.trim()
    if (!text || isProcessing) return
    setInput('')
    onSend(text)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-neutral-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20">
            <Bot className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-xs font-medium text-neutral-200">{npcName}</span>
          <span className="ml-auto text-[10px] text-neutral-500">对话沙盒</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                msg.role === 'user' ? 'bg-muted' : 'bg-primary/20'
              }`}
            >
              {msg.role === 'user' ? (
                <User className="h-3 w-3 text-neutral-400" />
              ) : (
                <Bot className="h-3 w-3 text-primary" />
              )}
            </div>
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-primary/10 text-primary-foreground'
                  : 'bg-neutral-800/70 text-neutral-200'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isProcessing && (
          <div className="flex gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20">
              <Bot className="h-3 w-3 text-primary" />
            </div>
            <div className="rounded-lg bg-neutral-800/70 px-3 py-2 text-xs text-neutral-500">
              <span className="animate-pulse">思考中...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-neutral-800 p-3">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="输入对话内容..."
            className="flex-1 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-neutral-200 placeholder:text-neutral-600 focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={handleSubmit}
            disabled={isProcessing || !input.trim()}
            className="rounded-md bg-primary/20 p-2 text-primary hover:bg-primary/30 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: ResponseInspector**

```typescript
// src/components/ConversationSandbox/ResponseInspector.tsx
import { useConfigStore } from '../../useConfigStore'
import { AlertCircle, Zap } from 'lucide-react'

export function ResponseInspector() {
  const response = useConfigStore((s) => s.lastLlmResponse)
  const usage = useConfigStore((s) => s.lastLlmUsage)
  const error = useConfigStore((s) => s.llmCallError)
  const isCalling = useConfigStore((s) => s.isLlmCalling)
  const actions = useConfigStore((s) => s.actionDefinitions)

  const actionId = response?.action as string
  const actionDef = actions.find((a) => a.actionId === actionId)
  const params = response?.params as Record<string, unknown> | undefined

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-neutral-800 px-4 py-3">
        <span className="text-xs font-medium text-neutral-300">响应检查器</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isCalling ? (
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <Zap className="h-3.5 w-3.5 animate-pulse text-yellow-500" />
            等待 LLM 响应...
          </div>
        ) : error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="h-3.5 w-3.5 text-destructive" />
              <span className="text-xs font-medium text-destructive">调用失败</span>
            </div>
            <p className="text-[10px] text-destructive/80">{error}</p>
          </div>
        ) : response ? (
          <>
            <div className="rounded-md border border-neutral-800 bg-neutral-900/50 p-3">
              <p className="mb-2 text-[10px] text-neutral-500">动作</p>
              <p className="font-mono text-xs font-semibold text-primary">
                {actionId ?? '—'}
              </p>
              {actionDef && (
                <p className="mt-1 text-[10px] text-neutral-500">
                  分类: {actionDef.category} · UE5Class}
                </p>
              )}
            </div>

            <div className="rounded-md border border-neutral-800 bg-neutral-900/50 p-3">
              <p className="mb-2 text-[10px] text-neutral-500">参数</p>
              <pre className="font-mono text-[10px] leading-relaxed text-neutral-300 whitespace-pre-wrap">
                {JSON.stringify(params, null, 2)}
              </pre>
            </div>

            <div className="rounded-md border border-neutral-800 bg-neutral-900/50 p-3">
              <p className="mb-2 text-[10px] text-neutral-500">情绪 · 优先级 · 推理</p>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="text-neutral-300">情绪: {response?.emotion as string ?? '—'}</span>
                <span className="font-mono text-neutral-300">优先级: {response?.priority as string ?? '—'}</span>
              </div>
              <p className="mt-1 text-[10px] text-neutral-400">
                推理: {response?.reasoning as string ?? '—'}
              </p>
            </div>

            {usage && (
              <div className="rounded-md border border-neutral-800 bg-neutral-900/50 p-3">
                <p className="mb-2 text-[10px] text-neutral-500">Token 消耗</p>
                <div className="flex items-center gap-4 text-[10px] font-mono">
                  <span className="text-neutral-400">Prompt: {usage.promptTokens}</span>
                  <span className="text-neutral-400">Completion: {usage.completionTokens}</span>
                  <span className="text-neutral-200">Total: {usage.totalTokens}</span>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-neutral-600">尚未调用。在左侧编辑上下文后点击「模拟调用」</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: ConversationSandbox 容器**

```typescript
// src/components/ConversationSandbox/ConversationSandbox.tsx
import { useState, useEffect, useCallback } from 'react'
import { useConfigStore } from '../../useConfigStore'
import { ChatPanel, type Message } from './ChatPanel'
import { ResponseInspector } from './ResponseInspector'

export function ConversationSandbox() {
  const npcs = useConfigStore((s) => s.npcs)
  const selectedId = useConfigStore((s) => s.selectedNpcId)
  const selectNpc = useConfigStore((s) => s.selectNpc)
  const callLlm = useConfigStore((s) => s.callLlm)
  const isCalling = useConfigStore((s) => s.isLlmCalling)
  const updateSection = useConfigStore((s) => s.updateContextSection)

  const npc = npcs.find((n) => n.id === selectedId)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')

  useEffect(() => {
    if (npc) {
      setMessages([{ role: 'npc', content: `*${npc.name} 抬起头，似乎在等你说什么*`, timestamp: Date.now() }])
    }
  }, [npc?.id])

  const handleSend = useCallback(async (text: string) => {
    if (!npc) return

    setMessages((prev) => [...prev, { role: 'user', content: text, timestamp: Date.now() }])

    updateSection('A', npc.basePrompt)
    updateSection('C', `[CURRENT STATE]
NPC: ${npc.name} (id:${npc.id})
Perceived: player (distance:2m, speaking:true)
Recent player message: "${text}"
Available actions: SPEAK, OBSERVE, DO_NOTHING`)

    await callLlm()
    const resp = useConfigStore.getState().lastLlmResponse
    const reply = resp
      ? ((resp.params as Record<string, unknown>)?.message as string ?? resp.action as string ?? '……')
      : '(无响应)'

    setMessages((prev) => [...prev, { role: 'npc', content: reply, timestamp: Date.now() }])
  }, [npc, updateSection, callLlm])

  return (
    <div className="flex h-full">
      <div className="w-56 shrink-0 border-r border-neutral-800">
        <div className="border-b border-neutral-800 px-4 py-3">
          <span className="text-xs font-medium text-neutral-300">测试 NPC</span>
        </div>
        <div className="p-2 space-y-0.5">
          {npcs.map((n) => (
            <button
              key={n.id}
              onClick={() => selectNpc(n.id)}
              className={`w-full rounded px-3 py-2 text-left text-xs transition-all ${
                selectedId === n.id
                  ? 'bg-primary/10 border border-primary/20 text-primary'
                  : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200'
              }`}
            >
              {n.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1">
        <ChatPanel
          npcName={npc?.name ?? '选择 NPC'}
          messages={messages}
          onSend={handleSend}
          isProcessing={isCalling}
          input={input}
          setInput={setInput}
        />
      </div>

      <div className="w-72 shrink-0 border-l border-neutral-800">
        <ResponseInspector />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 提交**

```bash
git add src/components/ConversationSandbox/
git commit -m "feat: add Conversation Sandbox module (module G)"
```

---

### Task 9: 更新 Sidebar 和 App 路由

**Files:**
- Modify: `src/components/Layout/Sidebar.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: 修改 Sidebar 新增导航项**

在 `src/components/Layout/Sidebar.tsx` 的 navItems 数组中追加：

```typescript
import { Puzzle, MessageSquare } from 'lucide-react'

// 在 navItems 数组末尾追加:
  { id: 'context', label: '上下文编排器', icon: Puzzle },
  { id: 'sandbox', label: '对话沙盒', icon: MessageSquare },
```

- [ ] **Step 2: 修改 App 路由**

在 `src/App.tsx` 中追加 import 和 routes：

```typescript
import { ContextComposer } from './components/ContextComposer/ContextComposer'
import { ConversationSandbox } from './components/ConversationSandbox/ConversationSandbox'

// 在 modules 对象中追加:
  context: ContextComposer,
  sandbox: ConversationSandbox,
```

- [ ] **Step 3: 提交**

```bash
git add src/components/Layout/Sidebar.tsx src/App.tsx
git commit -m "feat: add context composer and sandbox to navigation"
```

---

### Task 10: 升级 MemoryPruner 支持语义检索预览

**Files:**
- Modify: `src/components/PersonaForge/MemoryPruner.tsx`

在 MemoryPruner 顶部追加检索模拟条：

```typescript
// 在 "向量记忆修剪" 标题下方，插入查询输入:
import { Search, Brain } from 'lucide-react'
import { useState } from 'react'

// 在组件内部，return 之前追加:
const [searchQuery, setSearchQuery] = useState('')

// 在 <h3> 和 memory 列表之间插入:
<div className="mb-3 flex items-center gap-2">
  <div className="relative flex-1">
    <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-neutral-500" />
    <input
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      placeholder="语义检索测试..."
      className="w-full rounded border border-neutral-800 bg-neutral-900 py-1.5 pl-7 pr-2 text-[10px] text-neutral-200 placeholder:text-neutral-600"
    />
  </div>
  <span className="flex items-center gap-1 text-[9px] text-neutral-500">
    <Brain className="h-3 w-3" />
    模拟
  </span>
</div>

// 对 npcMemories 按 searchQuery 做简单文本匹配（无真实 embedding 时）
const filtered = searchQuery
  ? npcMemories.filter((m) => m.summary.includes(searchQuery))
  : npcMemories
```

将 `npcMemories` 换成 `filtered`。

- [ ] **Step 2: 提交**

```bash
git add src/components/PersonaForge/MemoryPruner.tsx
git commit -m "feat: add semantic search mock to memory pruner"
```

---

### Task 11: 添加聊天气泡 CSS

**Files:**
- Modify: `src/index.css`

在 `src/index.css` 末尾追加：

```css
/* Chat bubble animations */
@keyframes message-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.chat-message-enter {
  animation: message-in 0.2s ease-out;
}
```

- [ ] **Step 2: 提交**

```bash
git add src/index.css
git commit -m "style: add chat bubble animation"
```

---

### Task 12: 端到端验证

- [ ] **Step 1: 编译检查**

```bash
npx tsc --noEmit 2>&1
```

预期：无类型错误。

- [ ] **Step 2: 启动开发服务器**

```bash
npm run dev
```

打开 http://localhost:5173/，验证：
- 左侧 Sidebar 出现「上下文编排器」和「对话沙盒」
- 切换到 Context Composer：四个段落面板 + 右侧记忆/行为预览
- 切换到 Conversation Sandbox：左侧 NPC 列表 + 中间聊天 + 右侧检查器
- 原有 4 个模块不受影响

- [ ] **Step 3: 提交**

```bash
git commit --allow-empty -m "verify: Phase 1 build and smoke test pass"
```
