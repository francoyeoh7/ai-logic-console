# AI 语义与逻辑控制台 v2.0 —— 系统设计规格

> 版本: 2.0.0  
> 日期: 2026-06-29  
> 作者: 架构设计  
> 目标引擎: Unreal Engine 5  
> LLM 运行时: llama.cpp (server mode)  
> NPC 规模: 同场景 5-20 个活跃 NPC  
> 推理延迟目标: < 2s (包含网络+推理+校验+调度)

---

## 一、系统架构总览

### 1.1 三进程拓扑

```
┌───────────────────────┐   WebSocket(9090)   ┌───────────────────────┐   HTTP(8080)   ┌───────────────────────┐
│   AI 语义控制台         │◄──────────────────►│   UE5 游戏端            │◄─────────────►│   llama.cpp server      │
│   (Browser/Electron)   │                     │   (C++ GameInstance    │               │   /v1/chat/completions  │
│                        │   WebSocket(9090)   │    Subsystem)          │               │   /v1/embeddings        │
│   Zustand Store        │◄──────────────────►│                        │               │                         │
│   配置编辑 + 监控       │                     │   行为调度 + 状态采集   │               │   推理 + 向量化         │
└───────────────────────┘                     └───────────────────────┘               └───────────────────────┘
```

连接关系：
- **UE5 ↔ llama.cpp**: UE5 直接调 HTTP，控制台不代理请求。避免额外一跳延迟。控制台只在调试/沙盒时直接调 LLM。
- **控制台 ↔ UE5**: 单条 WebSocket 长连接。复用同一连接传输配置同步 + 状态监控 + 调试指令。
- **控制台 ↔ llama.cpp**: 仅对话沙盒模式使用。正常运行时控制台不碰 LLM。

### 1.2 为何 UE5 直连 llama.cpp 而非通过控制台中转

| 方案 | 延迟 | 可靠性 | 调试体验 |
|---|---|---|---|
| UE5 → 控制台 → LLM → 控制台 → UE5 | +2 跳 (~20ms 额外) | 控制台崩溃 = 全挂 | 控制台可记录所有请求 |
| **UE5 → LLM → UE5 (选中)** | 最短 | 控制台崩溃不影响游戏 | 控制台从 UE5 订阅 LLM 调用日志 |

独立游戏开发阶段，控制台频繁改代码重启。如果游戏中转，改控制台 = 游戏 NPC 全傻。直连方案让控制台随时热重载，不影响游戏。

### 1.3 单 NPC 一次决策的全链路时序

```
时间轴 →

T+0ms     UE5 WorldCollector 检测到 NPC 感知范围内有新事件
T+1ms     上下文编排器拼装 4 段 System Prompt
T+2ms     POST llama.cpp /v1/chat/completions  (grammar 约束)
T+200ms   (8B 模型在 RTX 3060 上推理约 150-400ms)
T+600ms   收到结构化 JSON 响应
T+601ms   安全校验层: 动作白名单 + 参数边界 + 护栏规则
T+602ms   ActionDispatcher 入队
T+603ms   (如果 NPC 空闲) 开始执行 → 播放动画/显示字幕
T+800ms   执行中... (动画时长由 UE5 AnimBP 控制)
T+2000ms  动画播完，回调 OnActionComplete
T+2001ms  世界状态已变化，记忆已写入
T+2002ms  如果仍有新事件 → 触发下一轮
```

**关键约束：同一 NPC 两次 LLM 调用最小间隔 1.5s。** 如果在此期间有新事件，事件入缓存队列，下次调用时一并处理。

---

## 二、通信协议规范

### 2.1 WebSocket 消息信封

所有 WebSocket 消息使用统一信封格式：

```json
{
  "type": "message_type",
  "seq": 1,
  "timestamp": 1719676800000,
  "payload": { }
}
```

`seq` 单调递增，用于检测丢包和重排序。接收方如果发现 seq 跳跃 > 1，记录警告日志但不中断连接。

### 2.2 消息类型清单

**UE5 → 控制台 (上行):**

| type | 频率 | payload 内容 |
|---|---|---|
| `npc_status_snapshot` | 每 0.5s | 所有活跃 NPC 的 id/位置/当前动作/情绪/状态机 |
| `director_metrics` | 每 0.5s | 6 项指标 + 融合心流指数 + 当前区域 |
| `llm_call_log` | 事件驱动 | 请求/响应摘要 + 延迟 + token 数 + 成功/失败 |
| `guardrail_fire` | 事件驱动 | 触发规则 ID + 输入内容 + 拦截动作 |
| `intervention_log` | 事件驱动 | 导演决策: 触发原因 + 选中事件 + 执行结果 |
| `event_broadcast` | 事件驱动 | 游戏事件 (战斗/对话/拾取/发现) 通知 |
| `world_state_response` | 请求-响应 | 响应控制台的 `request_world_state` |

**控制台 → UE5 (下行):**

| type | 频率 | payload 内容 |
|---|---|---|
| `config_sync` | 编辑时 | 全量或增量配置 JSON |
| `simulate_action` | 调试 | 手动注入一条 NPC 行为指令 |
| `director_override` | 调试 | 强制导演触发指定干预事件 |
| `request_world_state` | 调试 | 请求当前世界状态快照 |
| `request_memory_dump` | 调试 | 请求指定 NPC 的记忆列表 |

### 2.3 config_sync 增量更新协议

全量同步体积大（所有 NPC 人设+行为注册表+公理）。编辑阶段采用增量：

```json
{
  "type": "config_sync",
  "seq": 42,
  "timestamp": 1719676800000,
  "payload": {
    "mode": "delta",
    "path": "npcs.tavern_keeper.traits.greed",
    "value": 85
  }
}
```

UE5 收到后，用 JSON Pointer (RFC 6901) 路径定位到配置树节点，替换值。如果 delta 应用失败（路径不存在），UE5 回退请求全量同步。

---

## 三、LLM 接口契约

### 3.1 推理请求格式

```http
POST http://localhost:8080/v1/chat/completions
Content-Type: application/json

{
  "messages": [
    {
      "role": "system",
      "content": "<四段式上下文编排结果: Section A+B+C+D>"
    },
    {
      "role": "user",
      "content": "Respond to the current situation. Output a JSON action command."
    }
  ],
  "temperature": 0.7,
  "top_p": 0.9,
  "max_tokens": 256,
  "grammar": "<GBNF 语法字符串>",
  "stop": ["</s>", "<|end|>"],
  "stream": false
}
```

说明：
- `grammar` 字段为 llama.cpp 扩展，OpenAI 兼容 API 不支持。如果切换到云端模型，改用 `response_format: { type: "json_object" }`。
- `max_tokens` 设 256，足够输出一个结构化的原子动作。NPC 对话文本限制 120 字符（中文约 80 字）。
- `temperature` 固定 0.7，可在控制台的 NPC 人格编辑里按 NPC 单独覆盖。

### 3.2 推理响应格式

```json
{
  "choices": [
    {
      "message": {
        "content": "{\"action\":\"SHOUT_WARNING\",\"params\":{\"target\":\"player\",\"message\":\"把剑收起来！\",\"intensity\":0.8},\"emotion\":\"angry\",\"priority\":0.9,\"reasoning\":\"player_drew_weapon\"}"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 1680,
    "completion_tokens": 48,
    "total_tokens": 1728
  }
}
```

### 3.3 结构化输出 Schema

LLM 必须输出以下 JSON 结构（由 GBNF grammar 强制）：

```json
{
  "action": "string (必须等于行为注册表中的某个 action_id)",
  "params": {
    // 参数字段由具体 action 决定，见行为注册表
  },
  "emotion": "string (neutral|happy|sad|angry|fearful|surprised|disgusted)",
  "priority": "float (0.0-1.0, 表示此动作的紧迫程度)",
  "reasoning": "string (简短推理原因，用于调试日志，≤30字符)"
}
```

**校验顺序：**
1. `action` 是否在白名单 → 不在 → 丢弃，执行兜底
2. `params` 是否符合该 action 的 Schema → 不符合 → 丢弃，执行兜底
3. `priority` 是否在 0-1 → 不在 → clamp 到边界
4. 护栏规则检查 → 触发拦截 → 按公理规则覆盖 action

兜底行为：执行该 NPC 配置的 fallbackBehavior（idle / call_guard / leave / continue）。

### 3.4 嵌入向量接口

```http
POST http://localhost:8080/v1/embeddings
Content-Type: application/json

{
  "input": "玩家在酒馆亮出武器，老韩对此感到愤怒并警告了他",
  "model": "bge-small-zh"
}
```

响应：
```json
{
  "data": [{ "embedding": [0.012, -0.034, ...], "index": 0 }],
  "usage": { "prompt_tokens": 14, "total_tokens": 14 }
}
```

嵌入维度 384（BGE-small），用于记忆语义检索。

---

## 四、行为系统设计

### 4.1 行为注册表数据结构

```typescript
interface ActionDefinition {
  actionId: string           // 唯一标识，如 "SHOUT_WARNING"
  category: ActionCategory   // 7 大类之一
  ue5Class: string           // UE5 对应类名，如 "UAICommand_ShoutWarning"
  params: ActionParam[]      // 参数列表
  preconditions: Precondition[]  // 前置条件
  effects: ActionEffect[]    // 执行效果（广播给其他子系统）
  interrupt: InterruptRule   // 打断规则
  animation: AnimationHint   // 动画提示
  cooldownMs: number         // NPC 级别的冷却时间
}

interface ActionParam {
  name: string
  type: 'actor' | 'string' | 'float' | 'int' | 'bool' | 'enum'
  required: boolean
  defaultValue?: any
  description: string
  constraints?: {  // 值域约束
    min?: number
    max?: number
    enumValues?: string[]
    maxLength?: number
  }
}

interface Precondition {
  field: string       // 检查的字段路径，如 "target.inLineOfSight"
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'not_in' | 'exists'
  value: any
}

interface ActionEffect {
  targetSystem: string  // 目标子系统 ID
  mutation: string      // 变更表达式，如 "-30" 或 "multiplier:0.5" 或 "set_flag:trespassing"
}

interface InterruptRule {
  interruptible: boolean           // 是否可被打断
  interruptByHigherPriority: boolean // 是否被更高优先级打断
  exclusiveCategories: string[]    // 不能与这些类别的动作同时执行
  recoveryTimeMs: number           // 打断后恢复时间
}

interface AnimationHint {
  montage: string    // UE5 AnimMontage 路径
  blendIn: number    // 混入时间 (s)
  blendOut: number   // 混出时间 (s)
  loop: boolean
}
```

### 4.2 7 大行为类别

```
category: "movement"    → MOVE_TO, FLEE_FROM, APPROACH, PATROL_PATH, WANDER
category: "speech"      → SPEAK, SHOUT, WHISPER, MONOLOGUE, GREET
category: "social"      → BOW, WAVE, KNEEL, HAND_OVER, REFUSE
category: "combat"      → ATTACK_MELEE, ATTACK_RANGED, DEFEND, SURRENDER, CALL_GUARD, FLEE_COMBAT
category: "interaction" → GIVE_ITEM, TAKE_ITEM, USE_OBJECT, OPEN_DOOR, CLOSE_DOOR, LOCK_DOOR
category: "posture"     → SIT, STAND, SLEEP, WAKE, LEAN, IDLE_POSE
category: "meta"        → CONTINUE_CURRENT, DO_NOTHING, OBSERVE, FOLLOW_PLAYER
```

### 4.3 前置条件引擎

UE5 的 C++ 实现不依赖 LLM——前置条件检查完全在引擎侧完成：

```cpp
// UPreconditionEvaluator::Evaluate(const FActionDefinition& Action, const FPerceptionSnapshot& Context)
// 返回 true/false，耗时 < 0.1ms

bool UPreconditionEvaluator::Evaluate(const FActionDefinition& Action, const FPerceptionSnapshot& Context)
{
    for (const FPrecondition& Pre : Action.Preconditions)
    {
        if (!CheckPrecondition(Pre, Context))
            return false;
    }
    return true;
}
```

上下文编排时，UE5 枚举所有 `actionId`，对每个调用 Evaluate。只有通过前置条件的动作才出现在 Context Section D 中。这构成**第一层行为护栏**。

### 4.4 从行为注册表生成 GBNF Grammar

```python
# 伪代码：控制台导出时自动生成
def generate_grammar(actions: list[ActionDefinition]) -> str:
    action_names = " | ".join(f'"{a.actionId}"' for a in actions)
    
    grammar = f'''
    root ::= action_object
    action_object ::= "{{" ws "\\"action\\"" ws ":" ws action_value ws "," ws "\\"params\\"" ws ":" ws params_object ws "," ws "\\"emotion\\"" ws ":" ws emotion_value ws "," ws "\\"priority\\"" ws ":" ws number ws "," ws "\\"reasoning\\"" ws ":" ws string ws "}}"
    action_value ::= {action_names}
    emotion_value ::= "neutral" | "happy" | "sad" | "angry" | "fearful" | "surprised" | "disgusted"
    ws ::= [ \\t\\n]*
    number ::= "0." [0-9]+ | "1.0"
    string ::= "\\"" [^"\\\\] [a-zA-Z0-9 .,!?\\u4e00-\\u9fff]* "\\""
    params_object ::= "{{" ws "}}"  // 由具体 action 展开
    '''
    return grammar
```

每个 action 的 params 展开为独立的 GBNF rule，控制台导出时合并进根 grammar。

---

## 五、上下文编排器

### 5.1 四段式拼装算法

```
输入: npcId, perceptionSnapshot
输出: systemPrompt (string, 预算 ≤ 1800 tokens)

Step 1: 构建 Section A (IMMUTABLE)
  - 读取 NPC 的 basePrompt 字段
  - 追加全局启用的公理规则（每条约 40t），最多加 3 条
  - 追加行为指令: "你必须输出合法的 JSON 动作指令，格式如下: ..."
  - 限制: ≤ 400 tokens

Step 2: 构建 Section B (RECENT MEMORIES)
  - 从 SQLite 检索: pinned 记忆全部纳入
  - 非 pinned 记忆: 用当前感知文本做 embedding，余弦相似度排序
  - 取 top 6 条（含 pinned），每条约 80-100t
  - 如果 embedding 模型不可用，退化为按时间排序取最近 6 条
  - 限制: ≤ 600 tokens

Step 3: 构建 Section C (NOW)
  - 序列化 perceptionSnapshot 为文本
  - 包含: NPC 自身状态, 视线内对象列表(名称+距离+关键属性), 最近 3 条对话/事件
  - 限制: ≤ 400 tokens

Step 4: 构建 Section D (TOOLKIT)
  - 枚举所有行为, 用前置条件引擎过滤
  - 对通过过滤的行为, 列出 actionId + 参数说明
  - 限制: ≤ 400 tokens

Step 5: 拼接
  return "[SECTION A]\n" + sectionA + "\n\n[SECTION B]\n" + sectionB + "\n\n[SECTION C]\n" + sectionC + "\n\n[SECTION D]\n" + sectionD

Step 6: Token 计数
  - 用简易估算: 中文每字 ≈ 1.2t, 英文每词 ≈ 1.3t, 符号每字符 ≈ 1t
  - 如果超预算, 逐段削减: 先减 Section B 记忆条数, 再减 Section D 行为数量
```

### 5.2 感知快照序列化格式

```
[CURRENT STATE]
NPC: tavern_keeper_01 (faction:townsfolk, health:100%, mood:calm)
Position: tavern_01 (-120.5, 340.2, 12.0), zone: safe_zone
Current action: IDLE_POSE (20s elapsed)

PERCEIVED ENTITIES (by distance):
  - player (dist:2.8m, faction:neutral, weapon:drawn, level:12, health:85%)
  - guard_captain_01 (dist:7.5m, faction:townsfolk, alert:true, facing:player)
  - ale_barrel_01 (dist:1.2m, usable:true, type:container)
  - tavern_door (dist:4.3m, state:closed)

RECENT EVENTS (last 60s):
  [18s ago] player entered tavern
  [12s ago] player drew weapon (longsword)
  [8s ago] guard_captain_01 shouted "Put that away!"
  [2s ago] player has not responded

AVAILABLE ACTIONS:
  - SHOUT_WARNING(target, message, intensity) — 警告某人
  - FLEE_FROM(target, speed) — 逃离某人
  - CALL_GUARD(message) — 呼叫警卫
  - DO_NOTHING — 什么都不做
  - OBSERVE(target) — 观察某人
```

### 5.3 GBNF Grammar 生成

控制台从行为注册表生成 grammar，与配置一起通过 `config_sync` 发给 UE5。UE5 缓存该 grammar 字符串，每次 LLM 调用时直接附在请求体中。

```
# 示例 GBNF (仅 5 个动作的版本)

root ::= action_object
action_object ::= "{" ws "\"action\"" ws ":" ws action_name ws "," ws "\"params\"" ws ":" ws params ws "," ws "\"emotion\"" ws ":" ws emotion ws "," ws "\"priority\"" ws ":" ws number ws "," ws "\"reasoning\"" ws ":" ws reason_str ws "}"
ws ::= [ \t\n]*
action_name ::= "SHOUT_WARNING" | "FLEE_FROM" | "CALL_GUARD" | "DO_NOTHING" | "OBSERVE"
emotion ::= "\"neutral\"" | "\"happy\"" | "\"sad\"" | "\"angry\"" | "\"fearful\"" | "\"surprised\"" | "\"disgusted\""
number ::= "0." [0-9] | "0." [0-9][0-9] | "1.0"
reason_str ::= "\"" [a-zA-Z0-9 _.,!?\u4e00-\u9fff]{1,30} "\""
params ::= shout_warning_params | flee_from_params | call_guard_params | do_nothing_params | observe_params

shout_warning_params ::= "{" ws "\"target\"" ws ":" ws string ws "," ws "\"message\"" ws ":" ws string ws "," ws "\"intensity\"" ws ":" ws number ws "}"
flee_from_params ::= "{" ws "\"target\"" ws ":" ws string ws "," ws "\"speed\"" ws ":" ws ("\"walk\"" | "\"run\"" | "\"sprint\"") ws "}"
call_guard_params ::= "{" ws "\"message\"" ws ":" ws string ws "}"
do_nothing_params ::= "{" ws "}"
observe_params ::= "{" ws "\"target\"" ws ":" ws string ws "}"

string ::= "\"" [a-zA-Z0-9 _.,!?\u4e00-\u9fff]{1,60} "\""
```

---

## 六、记忆系统

### 6.1 SQLite 存储结构

```sql
CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY,
    npc_id TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    summary TEXT NOT NULL,
    importance INTEGER NOT NULL DEFAULT 5 CHECK(importance >= 1 AND importance <= 10),
    pinned INTEGER NOT NULL DEFAULT 0,
    embedding BLOB,        -- float32[384] 小端序
    topic_tags TEXT,       -- JSON array: ["combat","player_threat"]
    dormant INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mem_npc_time ON memories(npc_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_mem_npc_pinned ON memories(npc_id, pinned) WHERE pinned = 1;
CREATE INDEX IF NOT EXISTS idx_mem_dormant ON memories(dormant, npc_id);
```

### 6.2 记忆生命周期状态机

```
                    ┌──────────────────────┐
                    │       ACTIVE          │
                    │  (可被检索进入上下文)   │
                    └──────┬───────────────┘
                           │
              48h 未访问且未 pin
                           │
                           ▼
                    ┌──────────────────────┐
                    │      DORMANT          │
                    │  (不参与常规检索)      │
                    │  (仅话题命中时唤醒)    │
                    └──────┬───────────────┘
                           │
              话题命中 (余弦相似度 > 0.75)
                           │
                           ▼
                    ┌──────────────────────┐
                    │   ACTIVE (重新激活)    │
                    └──────────────────────┘
```

### 6.3 检索算法

```
function retrieveMemories(npcId, queryText, budget=600, maxCount=6):
    pinned = SELECT * FROM memories WHERE npc_id = ? AND pinned = 1
    
   _model_available:
        queryVec = llama.cpp POST /v1/embeddings(input=queryText)
        candidates = SELECT * FROM memories WHERE npc_id = ? AND dormant = 0
        
        for each candidate:
            score = cosineSimilarity(queryVec, candidate.embedding) * 0.5
                  + normalizeImportance(candidate.importance) * 0.25
                  + timeDecay(candidate.timestamp) * 0.25
    else:
        candidates = SELECT * FROM memories WHERE npc_id = ? AND dormant = 0 
                     ORDER BY timestamp DESC LIMIT 20
        score = normalizeImportance(candidate.importance) * 0.5
              + timeDecay(candidate.timestamp) * 0.5
    
    sorted = sort by score DESC
    selected = pinned + sorted.top(N - len(pinned))
    return selected[:maxCount]

function timeDecay(timestamp):
    hoursAgo = (now - timestamp) / 3600000
    return 1.0 / (1.0 + hoursAgo / 24.0)
```

### 6.4 记忆写入触发条件

不是每句话都写记忆——只写「有意义事件」：

| 事件类型 | 默认重要度 | 示例 |
|---|---|---|
| 玩家攻击 NPC | 9 | "玩家用剑攻击了我" |
| 玩家送礼物 | 7 | "玩家送了一瓶稀有的葡萄酒" |
| NPC 目睹犯罪 | 8 | "我看到玩家偷了钱袋" |
| 玩家完成 NPC 任务 | 8 | "玩家帮我找到了丢失的猫" |
| 普通对话 | 3 | "玩家询问了天气" |
| 玩家离开/进入 | 2 | "玩家离开了酒馆" |

重要度可在控制台的事件总线面板里按事件类型配置。

---

## 七、导演 AI 系统

### 7.1 心流指数计算

```python
def computeFlowIndex(metrics):
    """
    输入: 6 项指标原始值
    输出: flow_index (0-100, 50 为最佳)
    
    6 项指标:
      m1: last_interaction_s   (距上次有意义交互的秒数, 0-300)
      m2: combat_count_5min    (5分钟内战斗次数, 0-10)
      m3: resource_pressure    (资源压力: HP%*0.4 + Ammo%*0.3 + BagSpace%*0.3, 0-1)
      m4: exploration_entropy  (空间探索熵, 0-1, 越高越新鲜)
      m5: quest_progress_gap   (距上次主线推进的分钟数, 0-60)
      m6: input_rhythm         (输入节律: 暂停次数/分钟, 0-10)
    """
    
    # 每个指标单独打分 (0-100, 50 = 理想)
    s1 = max(0, 75 - m1 * 1.5)       # m1=0→75, m1=50→0
    s2 = max(0, 80 - m2 * 20)        # m2=0→80, m2=4→0
    s3 = 50 + (m3 - 0.5) * 80        # m3=0→10, m3=0.5→50, m3=1→90
    s4 = 30 + m4 * 70                # m4=0→30(迷路), m4=1→100
    s5 = max(0, 80 - m5 * 3)         # m5=0→80, m5=30→0
    s6 = max(0, 60 - m6 * 10)        # m6=0→60, m6=6→0
    
    # 加权融合
    weights = {s1: 0.25, s2: 0.20, s3: 0.15, s4: 0.10, s5: 0.20, s6: 0.10}
    flow_index = sum(s * w for s, w in zip([s1,s2,s3,s4,s5,s6], weights.values()))
    
    return flow_index
```

### 7.2 干预决策状态机

```
           ┌───────────┐
           │ OBSERVING  │ ◄──────────── 正常状态
           └─────┬─────┘
                 │ 心流偏离
                 ▼
           ┌───────────┐
           │ ACCUMULATE │  累计偏离时间
           └─────┬─────┘
                 │ 累计时间 > 阈值
                 ▼
           ┌───────────┐
           │  DECIDE    │  查询可能性池 → 加权随机 → 激活
           └─────┬─────┘
                 │
                 ▼
           ┌───────────┐
           │ COOLDOWN   │  同类别干预冷却中
           └─────┬─────┘
                 │ 冷却结束
                 ▼
           ┌───────────┐
           │ OBSERVING  │  回到观察
           └───────────┘
```

### 7.3 梯度干预阈值表

| 等级 | 无聊累计 (flow<25) | 高压累计 (flow>75) | 响应类型 | 冷却 |
|---|---|---|---|---|
| 无干预 | ≤ 30s | ≤ 30s | — | — |
| LIGHT | 30-90s | 30-60s | 环境叙事 (天气/音效/NPC自言自语) | 60s |
| MEDIUM | 90-180s | 60-120s | 机会事件 (游商/小遭遇/隐藏路径) | 180s |
| HEAVY | > 180s | > 120s | 剧情钩子 (任务NPC搭话/远处冒烟) | 600s |

### 7.4 世界可能性池数据结构

```cpp
// UE5 C++
USTRUCT(BlueprintType)
struct FWorldPossibility
{
    UPROPERTY()
    FString PossibilityId;           // "bandit_ambush_road_north"

    UPROPERTY()
    EInterventionTier Tier;          // Light / Medium / Heavy

    UPROPERTY()
    FString Category;                // "combat", "opportunity", "environment", etc.

    UPROPERTY()
    TArray<FPrecondition> Conditions; // 前置条件

    UPROPERTY()
    float Weight;                    // 相对权重 (同一Tier内)

    UPROPERTY()
    float CooldownSeconds;           // 激活后冷却

    UPROPERTY()
    FGameplayTag ActivationTag;      // 激活时广播的 GameplayTag

    UPROPERTY()
    TSoftObjectPtr<UDataAsset> Payload; // 具体内容引用
};
```

**前置条件检查示例：**

```cpp
bool UWorldPossibility::CanActivate(const FDirectorContext& Ctx) const
{
    for (const FPrecondition& Cond : Conditions)
    {
        // 支持: 区域/时间/天气/玩家等级/任务进度/世界状态标记
        if (!Cond.Evaluate(Ctx))
            return false;
    }
    return true;
}
```

---

## 八、护栏系统

### 8.1 三道防线

```
玩家输入/LLM 输出
       │
       ▼
  ┌─────────────┐
  │ 防线1: 输入过滤  │ ← Anti-Prompt Injection / 敏感词过滤
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐
  │ 防线2: Schema  │ ← GBNF Grammar 动作白名单
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐
  │ 防线3: 公理引擎 │ ← IF-THEN 规则, 参数边界检查
  └──────┬──────┘
         │
         ▼
      交给 ActionDispatcher
```

### 8.2 公理规则引擎

```cpp
// UE5 C++ 实现，轻量级规则匹配

struct FAxiomRule
{
    FString Condition;   // 条件表达式
    FString OverrideAction; // 强制覆盖的动作
    bool bEnabled;
};

// 条件语法 (简化 DSL):
//   "player.level < 10"
//   "npc.hostility > 0.5"
//   "request.type == 'buy' AND target.value > 1000"
//   "world.time.hour BETWEEN 22 AND 6"
//   "npc.asleep == true"

bool EvaluateAxiom(const FAxiomRule& Rule, const FWorldContext& Ctx)
{
    // 用简单表达式解析器求值，不涉及 LLM
    // 每个条件字段都注册了对应的 Getter 函数:
    //   "player.level" → GetPlayerLevel()
    //   "npc.hostility" → GetHostility(NpcId)
    //   "world.time.hour" → GetGameTimeHour()
    // 操作符: ==, !=, <, >, <=, >=, BETWEEN, IN, CONTAINS
    return ExpressionEvaluator::Evaluate(Rule.Condition, Ctx);
}
```

### 8.3 护栏触发后的处理

```
护栏触发 → 记录日志 → UE5 WebSocket 发 guardrail_fire 消息给控制台
         ↓
    按公理规则的 override_action 替换 LLM 输出的 action
         ↓
    如果 override_action 是:
      FORCE_REJECT  → 不执行任何动作, NPC 输出预设拒绝对话
      FORCE_ATTACK  → 切换到 combat 行为
      FORCE_RESPECT → 切换到社交尊敬行为
      FORCE_FLEE    → 触发逃跑行为
      CONTINUE       → 使用上一个合法输出循环
         ↓
    同时将触发事件写入 NPC 记忆 (importance=7)
```

---

## 九、UE5 C++ 模块规格

### 9.1 UAIWorldCollector

```cpp
// 职责: 采集 NPC 周围世界状态，序列化为文本
// 频率: 事件驱动 (NPC 收到新事件时调用) + 定期轮询 (每 0.5s)
// 线程: Game Thread

class UAIWorldCollector : public UWorldSubsystem
{
public:
    // 核心方法
    FPerceptionSnapshot CollectForNPC(AAIController* NPC);
    FString SerializeToText(const FPerceptionSnapshot& Snapshot);
    
    // 感知快照结构
    struct FPerceptionSnapshot
    {
        AActor* Self;
        FVector SelfLocation;
        FString SelfZone;
        FString SelfFaction;
        FString CurrentAction;
        FString CurrentEmotion;
        float HealthPercent;
        
        TArray<FPerceivedEntity> PerceivedEntities;
        TArray<FRecentEvent> RecentEvents;
    };
    
    struct FPerceivedEntity
    {
        AActor* Actor;
        float Distance;
        FString Faction;
        FString Type;
        TMap<FString, FString> Properties; "weapon:drawn", "alert:true"
    };
    
    struct FRecentEvent
    {
        float SecondsAgo;
        FString EventType;
        FString Description;
    };
};
```

### 9.2 UAIActionDispatcher

```cpp
// 职责: 接收 LLM 输出的结构化指令，排队执行
// 频率: 每帧 Tick
// 线程: Game Thread

class UAIActionDispatcher : public UWorldSubsystem
{
public:
    // 入队一个新命令
    void EnqueueCommand(const FAICommand& Command);
    
    // 每帧:
    //   1. 遍历所有 NPC 的命令队列
    //   2. 如果 NPC 空闲 → 弹出队首执行
    //   3. 如果 NPC 忙且队首优先级更高 → 打断，执行新命令
    //   4. 检查 TTL → 过期丢弃
    void Tick(float DeltaTime) override;
    
    // 命令执行完成回调
    void OnCommandComplete(FString NpcId, FString CommandId, bool bSuccess);
    
    struct FAICommand
    {
        FString CommandId;
        FString NpcId;
        FString ActionId;
        TMap<FString, FString> Params;
        float Priority;
        int64 TTLTimestampMs;
        FString Emotion;
        FString Reasoning;
    };
    
private:
    TMap<FString, TQueue<FAICommand>> CommandQueues;  // NPC → Queue
    TMap<FString, FAICommand> ActiveCommands;          // NPC → 当前执行
};
```

### 9.3 UAIDirectorRuntime

```cpp
// 职责: 心流计算 + 干预决策
// 频率: 每 5s 评估一次
// 线程: Game Thread

class UAIDirectorRuntime : public UWorldSubsystem
{
public:
    void Tick(float DeltaTime) override;
    
    // Metrics
    float GetLastInteractionSeconds() const;
    int32 GetCombatCount5Min() const;
    float GetResourcePressure() const;
    float GetExplorationEntropy() const;
    float GetQuestProgressGapMinutes() const;
    float GetInputRhythm() const;
    
    // Flow index
    float ComputeFlowIndex();
    
    // Intervention
    EInterventionTier DecideIntervention(float FlowIndex);
    FWorldPossibility* SelectPossibility(EInterventionTier Tier);
    bool ActivatePossibility(FWorldPossibility* Poss);
    
    // Config
    void SetMetricWeights(const TMap<FString, float>& Weights);
    void SetThresholds(const FDirectorThresholds& T);
    
private:
    float BoredomAccumulator;
    float TensionAccumulator;
    TMap<FString, float> CooldownTimers;  // 可能性 ID → 剩余冷却
    TArray<FAIInterventionLogEntry> Log;
};
```

### 9.4 UAIMemoryStore

```cpp
// 职责: SQLite 封装，记忆的读写检索
// 线程: 可独立线程（SQLite 用 WAL 模式支持并发读）
// 依赖: SQLite3 静态链接

class UAIMemoryStore : public UGameInstanceSubsystem
{
public:
    void Initialize(FSubsystemCollectionBase& Collection) override;
    
    // CRUD
    void WriteMemory(const FAIMemory& Mem);
    TArray<FAIMemory> RetrieveMemories(const FString& NpcId, const FString& QueryText, int32 MaxCount = 6, int32 TokenBudget = 600);
    
    // Pin/Forget
    void PinMemory(const FString& MemoryId);
    void ForgetMemory(const FString& MemoryId);
    
    // Dormant management
    void MarkDormant(const FString& MemoryId);
    TArray<FAIMemory> WakeByTopic(const FString& NpcId, const FString& Topic, float Threshold = 0.75f);
    
    // Embedding (delegates to llama.cpp)
    TArray<float> GenerateEmbedding(const FString& Text);
    
    struct FAIMemory
    {
        FString Id;
        FString NpcId;
        int64 Timestamp;
        FString Summary;
        int32 Importance;
        bool bPinned;
        TArray<float> Embedding;  // 384 dims
        TArray<FString> TopicTags;
        bool bDormant;
    };
    
private:
    sqlite3* Database;
    bool bEmbeddingAvailable;
    // Cosine similarity
    float CosineSimilarity(const TArray<float>& A, const TArray<float>& B);
};
```

### 9.5 UWorldPossibilityPool

```cpp
// 职责: 世界可能性的注册、前置条件检查、权重随机选择
// 频率: 导演决策时调用

class UWorldPossibilityPool : public UWorldSubsystem
{
public:
    void RegisterPossibility(const FWorldPossibility& Poss);
    TArray<FWorldPossibility*> GetEligible(EInterventionTier Tier, const FDirectorContext& Ctx);
    FWorldPossibility* WeightedRandomSelect(const TArray<FWorldPossibility*>& Candidates);
    bool Activate(FWorldPossibility* Poss);
    
private:
    TArray<FWorldPossibility> Possibilities;
};

struct FDirectorContext
{
    FVector PlayerLocation;
    FString CurrentZone;
    int32 PlayerLevel;
    float GameTimeHour;
    FString Weather;
    TArray<FName> ActiveQuestIds;
    TArray<FName> WorldStateFlags;
};
```

---

## 十、控制台模块最终清单

### 模块 A: 灵魂锻造台 (Persona Forge) — 升级
- NPC 列表 + 搜索 + 按阵营/区域过滤
- Core Prompt 编辑器 (Markdown 高亮)
- 5 维性格滑块 + 单 NPC 温度覆盖
- 记忆修剪器: Pin/Forget + 语义检索预览 + 话题标签编辑
- 新增: NPC 阵营/区域/日常节律编辑

### 模块 B: 护栏与公理 (Guardrails) — 升级
- 全局开关 (Anti-OOC, Anti-Injection)
- IF-THEN 公理构建器 (横向级联)
- 兜底策略 (4 选 1)
- 新增: Prompt 注入检测规则编辑器

### 模块 C: 事件总线路由图 (Event Bus) — 升级
- React Flow 事件-子系统连线
- 边权重编辑 (+ Popover)
- 新增: 实时事件广播日志 (WebSocket 订阅)

### 模块 D: 导演节奏控制台 (Director) — 重构
- 6 指标实时仪表盘 + 心流融合指数
- Recharts 折线图 + 3 色警戒带
- 梯度干预策略编辑器
- 世界可能性池编辑器 (前置条件 + 权重 + 冷却)
- 干预日志 + 预演模式

### 模块 E: 行为编排台 (Action Orchestrator) — 🆕
- 行为分类树 (7 类可折叠)
- 行为注册表编辑器 (params + preconditions + effects + interrupt + anim)
- 行为-子系统影响图
- GBNF Grammar 自动生成 + 导出

### 模块 F: 上下文编排器 (Context Composer) — 🆕
- 四段式 Prompt 拼装面板 (标签页)
- Token 预算实时计数 (简易 tiktoken)
- 记忆检索预览 + 手动拖拽调整
- 行为白名单预览 (可用/锁定 + 锁定原因)
- 模拟调用按钮 (直接调 llama.cpp)

### 模块 G: 对话沙盒 (Conversation Sandbox) — 🆕
- 选 NPC → 打字 → 看结构化响应
- 展示: 完整 Prompt / JSON 输出 / action 解析 / 参数
- 模拟「世界感知」上下文 (手动编辑)
- 单轮耗时 + Token 消耗

### 模块 H: 运行时监控 (Runtime Monitor) — 🆕
- 活跃 NPC 状态网格 (实时刷新)
- LLM 调用统计面板 (QPS/延迟/成功率/Token)
- 护栏触发日志
- WebSocket 连接状态 + 心跳指示器
- 手动注入 NPC 指令 (调试)

### 模块 I: 导出中心 (Export Hub) — 升级
- JSON 快照导出 (给 UE5 Production 加载)
- GBNF Grammar 导出
- llama.cpp server 配置生成 (启动参数)
- 版本比对 (Diff 视图)
- 一键导出到 UE5 项目 Content 目录

---

## 十一、开发阶段划分

### Phase 1: LLM 链路跑通 (目标: 1 周)
- [ ] llama.cpp server 搭建 + 测试
- [ ] 模块 F (Context Composer) + 模块 G (对话沙盒)
- [ ] UE5 WebSocket 客户端 + 基础 WorldCollector
- [ ] UE5 发送感知 → LLM 回复 → UE5 显示字幕
- [ ] 目标: NPC 能对你的输入做出文字回应的最小闭环

### Phase 2: NPC 动起来 (目标: 1.5 周)
- [ ] 模块 E (Action Orchestrator) + 行为注册表
- [ ] UAIActionDispatcher C++ 实现
- [ ] GBNF Grammar 生成器
- [ ] 7 类行为各实现至少 2 个基础动作
- [ ] 目标: NPC 能移动/说话/做简单交互

### Phase 3: 导演+记忆 (目标: 1.5 周)
- [ ] 模块 D (Director Dashboard) 完整重构
- [ ] UAIDirectorRuntime + UWorldPossibilityPool C++ 实现
- [ ] UAIMemoryStore C++ 实现
- [ ] 6 项指标采集 + 心流融合
- [ ] 目标: 导演开始根据心流注入事件, NPC 有记忆

### Phase 4: 打磨+监控 (目标: 1 周)
- [ ] 模块 C 实时事件日志
- [ ] 模块 H (Runtime Monitor)
- [ ] 模块 I 导出工具
- [ ] 护栏日志 + 性能调优
- [ ] 目标: 完整闭环, 控制台可实时监控一切

**总计: 约 5 周**

---

## 十二、技术风险与缓解

| 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|
| 本地 8B 模型结构化输出不稳定 | 中 | 高 | GBNF grammar 强制约束；兜底行为回退；控制台沙盒预测试 |
| LLM 推理延迟峰值 > 2s | 中 | 中 | 播放「若有所思」动画掩盖；队列化处理避免阻塞主线程 |
| 记忆向量检索性能瓶颈 | 低 | 中 | SQLite 只做存储+简单索引；向量计算 C++ 原生实现；NPC 规模小(≤20)线性扫描可接受 |
| WebSocket 连接断开 | 高 | 低 | 控制台和 UE5 都自动重连；断开期间 UE5 用缓存配置独立运行 |
| llama.cpp embedding 模型不可用 | 中 | 中 | 回退为基于时间+重要度的检索，功能降级但不挂 |
| 导演过度干预破坏沉浸感 | 中 | 高 | 冷却机制 + 梯度响应 + 控制台可调阈值；可能性池策划可控 |
