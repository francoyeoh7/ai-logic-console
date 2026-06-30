/**
 * 预输出审核引擎
 * 在 LLM 生成的文本展示给玩家之前过一遍
 */

export interface AuditRule {
  name: string
  type: 'blacklist' | 'whitelist' | 'pattern' | 'capability' | 'knowledge'
  description: string
  enabled: boolean
  config: string[] | RegExp[]
}

export interface AuditResult {
  passed: boolean
  violations: AuditViolation[]
  correctedText?: string
  suggestion?: string
}

export interface AuditViolation {
  ruleName: string
  type: string
  originalText: string
  reason: string
}

// 默认认知黑名单（这些词说明 NPC 知道不该知道的东西）
const DEFAULT_COGNITIVE_BLACKLIST = [
  '手机', '微信', 'QQ', '互联网', 'WiFi', '电脑', '网络',
  'AI', '人工智能', 'ChatGPT', '生成式', '大模型', '算法',
  '飞机', '火箭', '坦克', '核弹', '原子弹', '枪', '手枪', '步枪',
  'GPS', '卫星', '导航', '系统Bug', '程序', '代码',
  '汽车', '摩托', '电', '电池', '充电',
  '抖音', 'B站', '微博', '小红书',
  '真实世界', 'NPC', '任务列表', '好感度', '属性面板',
  '回档', '存档', '读档', '重开',
  '公司', '上班', '老板', 'CEO', '会议', '邮件',
]

export const DEFAULT_AUDIT_RULES: AuditRule[] = [
  {
    name: '世界观边界',
    type: 'blacklist',
    description: '禁止使用现代词汇和概念',
    enabled: true,
    config: DEFAULT_COGNITIVE_BLACKLIST,
  },
  {
    name: '出戏检测',
    type: 'pattern',
    description: '禁止NPC提到自己是NPC/AI/程序',
    enabled: true,
    config: [/我是[一]?个NPC/, /我是[一]?个[人AI工智]/],
  },
  {
    name: '地名白名单',
    type: 'whitelist',
    description: '只能提及已知地点',
    enabled: true,
    config: [],
  },
  {
    name: '能力边界',
    type: 'capability',
    description: '禁止NPC声称能做出超出能力的行为',
    enabled: true,
    config: [],
  },
]

/**
 * 执行审核
 */
export function auditResponse(
  rawMessage: string,
  npcName: string,
  npcCapabilities: string[],
  knownLocations: string[],
  enabledRules: AuditRule[],
): AuditResult {
  const violations: AuditViolation[] = []

  for (const rule of enabledRules) {
    if (!rule.enabled) continue

    switch (rule.type) {
      case 'blacklist': {
        const blackWords = rule.config as string[]
        for (const word of blackWords) {
          if (rawMessage.includes(word)) {
            violations.push({
              ruleName: rule.name,
              type: 'cognitive',
              originalText: rawMessage,
              reason: `${npcName} 不应该知道/提到 "${word}"`,
            })
            break // 一条规则只报一次
          }
        }
        break
      }

      case 'pattern': {
        const patterns = rule.config as RegExp[]
        for (const pattern of patterns) {
          if (pattern.test(rawMessage)) {
            violations.push({
              ruleName: rule.name,
              type: 'OOC',
              originalText: rawMessage,
              reason: `${npcName} 出现出戏内容`,
            })
            break
          }
        }
        break
      }

      case 'cap检测 NPC 是否声称能做出能力之外的行动
        const capPatterns = [
          /我去帮你[杀打猎捕]/,
          /我[能会]?飞/,
          /我能传送/,
        ]
        for (const pat of capPatterns) {
          if (pat.test(rawMessage) && !npcCapabilities.some(c => rawMessage.includes(c))) {
            violations.push({
              ruleName: rule.name,
              type: 'capability',
              originalText: rawMessage,
              reason: `${npcName} 声称能做出超出能力范围的动作`,
            })
          }
        }
        break
      }

      case 'whitelist': {
        // 检测地名
        const locPattern = /(?:去|到|在)([一-龥]{2,6}(?:镇|城|峰|谷|林|洞|山|墓|屋|地|区|边|国|原|湖|河|海|岛|店|馆|场|堂|堡|塔|桥|路|街|村|庄|乡|集|市|站|港|屯|寨|坡|岭|崖|壁|渊|丘|沼|滩|湾|湾|口|关))/g
        let match
        while ((match = locPattern.exec(rawMessage)) !== null) {
          const place = match[1] + (match[2] || '')
          if (!knownLocations.some(loc => loc.includes(place) || place.includes(loc))) {
            violations.push({
              ruleName: rule.name,
              type: 'location',
              originalText: rawMessage,
              reason: `${npcName} 提到了未知地点 "${place}"`,
            })
          }
        }
        break
      }
    }
  }

  if (violations.length === 0) {
    return { passed: true, violations: [], correctedText: rawMessage }
  }

  return {
    passed: false,
    violations,
    suggestion: `审核未通过: ${violations.map(v => v.reason).join('; ')}`,
  }
}

/**
 * 生成矫正 Prompt
 */
export function generateCorrectionPrompt(originalPrompt: string, violations: AuditViolation[]): string {
  const reasons = violations.map(v => `- ${v.reason}`).join('\n')
  return `${originalPrompt}

你刚刚的回复违反了以下规则:
${reasons}

请重新回答。确保:
1. 不使用你不知道的概念和词汇
2. 不超出你作为这个世界居民的能力范围
3. 只提及你确实知道的地点和人物
4. 不偏离你的人格设定

重新回复:`
}
