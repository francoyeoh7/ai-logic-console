import type { NpcTraits, DialogueStyle, IntentMapping } from '../types'

const styleRules: { trait: keyof NpcTraits; threshold: number; label: string; description: string; promptHint: string }[] = [
  { trait: 'aggression', threshold: 60, label: '粗暴', description: '说话带刺，不客气', promptHint: '用短句，语气粗鲁，可以适当冒犯对方' },
  { trait: 'aggression', threshold: 35, label: '直率', description: '不绕弯子，实话实说', promptHint: '说话直接，不搞客套，但不算无礼' },
  { trait: 'patience', threshold: 30, label: '不耐烦', description: '讨厌拖沓和废话', promptHint: '语速偏快，不喜欢被追问同一个问题，容易打断对方' },
  { trait: 'patience', threshold: 65, label: '耐心', description: '愿意听对方把话说完', promptHint: '语气柔和，愿意重复解释，不容易被激怒' },
  { trait: 'charisma', threshold: 65, label: '有魅力', description: '说话有感染力', promptHint: '喜欢用比喻和幽默，容易让人产生好感' },
  { trait: 'charisma', threshold: 35, label: '木讷', description: '不善言辞，表达笨拙', promptHint: '说话简短、生硬，不懂社交技巧' },
  { trait: 'greed', threshold: 65, label: '贪财', description: '对金钱极度敏感', promptHint: '对话中频繁提价格、报酬、交易，喜欢讨价还价' },
  { trait: 'greed', threshold: 35, label: '淡泊', description: '对物质不太在意', promptHint: '很少主动提钱，可能拒绝明显的赚钱机会' },
  { trait: 'loyalty', threshold: 65, label: '忠诚', description: '对阵营极度忠诚', promptHint: '经常提到自己的阵营或效忠对象，为阵营辩护' },
  { trait: 'loyalty', threshold: 35, label: '自我', description: '优先考虑自身利益', promptHint: '把自身安全放在第一位，可能背叛阵营' },
]

export function generateDialogueStylesFromTraits(traits: NpcTraits): DialogueStyle[] {
  const styles: DialogueStyle[] = []
  for (const rule of styleRules) {
    const val = traits[rule.trait]
    if (rule.threshold >= 50 && val > rule.threshold) {
      styles.push({ label: rule.label, description: rule.description, promptHint: rule.promptHint })
    }
    if (rule.threshold < 50 && val <= rule.threshold) {
      styles.push({ label: rule.label, description: rule.description, promptHint: rule.promptHint })
    }
  }
  return styles
}

export function getDefaultIntentMappings(): IntentMapping[] {
  return [
    { intent: '感谢', weight: 0.5, description: '玩家帮助了NPC或其朋友' },
    { intent: '抱怨', weight: 0.3, description: 'NPC遭受了不愉快的事' },
    { intent: '警告', weight: 0.2, description: 'NPC感知到即将到来的危险' },
    { intent: '打听', weight: 0.3, description: 'NPC有好奇心或情报角色' },
    { intent: '恭维', weight: 0.2, description: 'NPC对玩家有好感且玩家做了值得赞扬的事' },
    { intent: '回忆', weight: 0.2, description: '不重要事件或闲聊场景' },
    { intent: '交易', weight: 0.4, description: 'NPC是商人且存在交易机会' },
    { intent: '拒绝', weight: 0.2, description: '玩家提出了NPC无法接受的要求' },
    { intent: '闲聊', weight: 0.3, description: '无事发生时的保底对话' },
  ]
}
