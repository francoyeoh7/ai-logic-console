# AI 语义控制台 → UE5 程序员对接文档

> 版本: 1.0.0 | 日期: 2026-06-30
> 适用引擎: Unreal Engine 5.x
> 前提: 开发者熟悉 UE5 DataTable、C++ Struct、GameInstanceSubsystem

---

## 1. 概述

你的 UE5 项目需要加载由「AI 语义控制台」导出的 JSON 配置文件。这些文件定义了 NPC 人格、任务节点链和护栏规则。你需要在 UE5 工程中完成以下工作：

- 定义 3 个 C++ Struct（对应 3 张 DataTable）
- 创建一个 GameInstanceSubsystem 启动时加载 DataTable
- 提供 API 给其他模块查询 NPC 配置

**预期 C++ 代码量: 约 150 行。**

---

## 2. 导出的 JSON 文件

控制台（Web 编辑器）生成 3 个 JSON 文件，放在你指定的 UE5 Content 目录：

| 文件名 | 对应 DataTable | 行数 |
|---|---|---|
| `DT_NpcPersonas.json` | NPC 人设表 | 每个 NPC 一行 |
| `DT_QuestDefinitions.json` | 任务定义表 | 每个任务一行 |
| `DT_GuardrailAxioms.json` | 护栏规则表 | 每条规则一行 |

---

## 3. UE5 C++ 代码

### 3.1 新建 C++ 类: `AIConfigTypes.h`

```cpp
// AIConfigTypes.h
#pragma once

#include "CoreMinimal.h"
#include "Engine/DataTable.h"
#include "AIConfigTypes.generated.h"

USTRUCT(BlueprintType)
struct FAINpcPersonaRow : public FTableRowBase
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    FString DisplayName;

    UPROPERTY(BlueprintReadOnly)
    FString BasePrompt;

    UPROPERTY(BlueprintReadOnly)
    float Greed = 50;

    UPROPERTY(BlueprintReadOnly)
    float Patience = 50;

    UPROPERTY(BlueprintReadOnly)
    float Aggression = 50;

    UPROPERTY(BlueprintReadOnly)
    float Charisma = 50;

    UPROPERTY(BlueprintReadOnly)
    float Loyalty = 50;

    // 以下字段是分号/竖线分隔的复合字符串，业务层自行解析
    // RoleTags: "merchant;informant"
    // Schedule: "6-8:起床/用餐|8-22:营业中|22-6:休息"
    // Relationships: "player:player:T50/A60/F30:观望中|guard_captain:npc:T80/A70/F25:老朋友"
    // DialogueStyles: "粗暴=用短句语气粗鲁|贪财=对话中频繁提价格"
    UPROPERTY(BlueprintReadOnly)
    FString RoleTags;

    UPROPERTY(BlueprintReadOnly)
    FString Faction;

    UPROPERTY(BlueprintReadOnly)
    FString Region;

    UPROPERTY(BlueprintReadOnly)
    FString Schedule;

    UPROPERTY(BlueprintReadOnly)
    FString Relationships;

    UPROPERTY(BlueprintReadOnly)
    FString DialogueStyles;

    UPROPERTY(BlueprintReadOnly)
    FString CurrentEmotion;
};

USTRUCT(BlueprintType)
struct FAIQuestDefinitionRow : public FTableRowBase
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    FString DisplayName;

    UPROPERTY(BlueprintReadOnly)
    FString Category;  // "main" / "side" / "ai_dynamic"

    UPROPERTY(BlueprintReadOnly)
    int32 MinLevel = 1;

    UPROPERTY(BlueprintReadOnly)
    int32 MaxLevel = 100;

    UPROPERTY(BlueprintReadOnly)
    FString PrerequisiteQuestId;

    // 以下字段是 JSON 字符串，业务层用 FJsonObject 解析
    UPROPERTY(BlueprintReadOnly)
    FString NodesJson;       // QuestNode[] 的 JSON 数组

    UPROPERTY(BlueprintReadOnly)
    FString InvolvedNpcsJson; // [{ "npcId": "...", "role": "..." }]

    UPROPERTY(BlueprintReadOnly)
    FString AiSettingsJson;   // AiQuestSettings 的 JSON 对象，AI 动态任务用
};

USTRUCT(BlueprintType)
struct FAIGuardrailRuleRow : public FTableRowBase
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    FString Condition;

    UPROPERTY(BlueprintReadOnly)
    FString Action;

    UPROPERTY(BlueprintReadOnly)
    int32 Enabled = 1;
};
```

### 3.2 新建 C++ 类: `UAIConfigSubsystem`

```cpp
// AIConfigSubsystem.h
#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "Engine/DataTable.h"
#include "AIConfigTypes.h"
#include "AIConfigSubsystem.generated.h"

UCLASS()
class UAIConfigSubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()

public:
    virtual void Initialize(FSubsystemCollectionBase& Collection) override;

    // 查询 API
    const FAINpcPersonaRow* GetNpcConfig(const FName& NpcId) const;
    TArray<FAINpcPersonaRow*> GetAllNpcConfigs() const;

    const FAIQuestDefinitionRow* GetQuestConfig(const FName& QuestId) const;
    TArray<FAIQuestDefinitionRow*> GetAllQuestConfigs() const;

    TArray<FAIGuardrailRuleRow*> GetEnabledGuardrails() const;

private:
    UPROPERTY()
    TObjectPtr<UDataTable> NpcTable;

    UPROPERTY()
    TObjectPtr<UDataTable> QuestTable;

    UPROPERTY()
    TObjectPtr<UDataTable> GuardrailTable;
};
```

```cpp
// AIConfigSubsystem.cpp
#include "AIConfigSubsystem.h"
#include "Engine/DataTable.h"

void UAIConfigSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
    Super::Initialize(Collection);

    // 资产路径: 把这些 JSON 导入 UE5 后，右键 → "Create DataTable from JSON"
    // Row Structure 选对应的 FAINpcPersonaRow / FAIQuestDefinitionRow / FAIGuardrailRuleRow
    NpcTable = LoadObject<UDataTable>(nullptr, TEXT("/Game/AI/DT_NpcPersonas"));
    QuestTable = LoadObject<UDataTable>(nullptr, TEXT("/Game/AI/DT_QuestDefinitions"));
    GuardrailTable = LoadObject<UDataTable>(nullptr, TEXT("/Game/AI/DT_GuardrailAxioms"));

    if (NpcTable)
    {
        UE_LOG(LogTemp, Log, TEXT("AI Config: Loaded %d NPC personas"), NpcTable->GetRowMap().Num());
    }
    else
    {
        UE_LOG(LogTemp, Warning, TEXT("AI Config: NPC table not found at /Game/AI/DT_NpcPersonas"));
    }
}

const FAINpcPersonaRow* UAIConfigSubsystem::GetNpcConfig(const FName& NpcId) const
{
    if (!NpcTable) return nullptr;
    return NpcTable->FindRow<FAINpcPersonaRow>(NpcId, TEXT(""));
}

TArray<FAINpcPersonaRow*> UAIConfigSubsystem::GetAllNpcConfigs() const
{
    TArray<FAINpcPersonaRow*> Rows;
    if (NpcTable) NpcTable->GetAllRows(TEXT(""), Rows);
    return Rows;
}

const FAIQuestDefinitionRow* UAIConfigSubsystem::GetQuestConfig(const FName& QuestId) const
{
    if (!QuestTable) return nullptr;
    return QuestTable->FindRow<FAIQuestDefinitionRow>(QuestId, TEXT(""));
}

TArray<FAIQuestDefinitionRow*> UAIConfigSubsystem::GetAllQuestConfigs() const
{
    TArray<FAIQuestDefinitionRow*> Rows;
    if (QuestTable) QuestTable->GetAllRows(TEXT(""), Rows);
    return Rows;
}

TArray<FAIGuardrailRuleRow*> UAIConfigSubsystem::GetEnabledGuardrails() const
{
    TArray<FAIGuardrailRuleRow*> Rows;
    if (GuardrailTable)
    {
        GuardrailTable->GetAllRows(TEXT(""), Rows);
        Rows.RemoveAll([](const FAIGuardrailRuleRow* R) { return R->Enabled == 0; });
    }
    return Rows;
}
```

### 3.3 使用示例

```cpp
// 在业务代码中获取 NPC 配置:
UAIConfigSubsystem* AiCfg = GetGameInstance()->GetSubsystem<UAIConfigSubsystem>();
const FAINpcPersonaRow* Npc = AiCfg->GetNpcConfig(TEXT("tavern_keeper"));
if (Npc)
{
    FString Prompt = Npc->BasePrompt;        // "你是一个脾气暴躁的老头..."
    float Greed = Npc->Greed;                // 80
    FString Faction = Npc->Faction;          // "风语镇"
    FString Styles = Npc->DialogueStyles;    // "粗暴=用短句语气粗鲁|贪财=说话总提钱"
    // 用竖线分割解析:
    TArray<FString> Parts;
    Styles.ParseIntoArray(Parts, TEXT("|"), true);
}
```

---

## 4. 操作步骤 (UI 操作)

1. 打开控制台 → 左侧底部点「导出 UE5 DataTable」
2. 分别下载 3 个 JSON 文件
3. 在 UE5 Content Browser 中右键 → `Miscellaneous` → `Data Table`
4. Row Structure 选 `FAINpcPersonaRow`→ 命名为 `DT_NpcPersonas`
5. 右键 DataTable → `Import from JSON` → 选择对应 JSON 文件
6. 对 Quest 和 Guardrail 重复步骤 3-5

**资产路径约定:** `/Game/AI/DT_NpcPersonas`

---

## 5. 给 AI 编程助手的提示词

如果你使用 GitHub Copilot / Cursor / Claude，直接把上面的 C++ 代码粘贴到 `.h` 和 `.cpp` 文件中即可。数据结构已在 `AIConfigTypes.h` 中完整定义。

如需扩展字段（比如控制台新增了 NPC 属性），同步更新对应 Struct 即可。

---

## 6. 常见问题

**Q: JSON 导入时字段不匹配？**
A: 确保 Struct 的 UPROPERTY 变量名和控制台导出的 JSON 字段名完全一致（大小写敏感）。

**Q: 复合字段（如 Schedule）如何解析？**
A: 这些字段是字符串，用竖线 (`|`) 分割记录，用短横 (`-`) 和冒号 (`:`) 分割子字段。详见代码注释。

**Q: 更新配置后需要重新打包吗？**
A: DataTable 是独立资产，可以热更新（通过 PAK 文件替换）。不需要重新编译 C++。
