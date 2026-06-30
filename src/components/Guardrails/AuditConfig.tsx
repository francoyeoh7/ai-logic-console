import { useState } from 'react'
import { Shield, AlertTriangle, Search, CheckCircle2, XCircle, RefreshCw } from 'lucide-react'
import { AuditRule as AuditRuleType, DEFAULT_AUDIT_RULES, auditResponse, generateCorrectionPrompt } from '../../services/auditEngine'
import { useConfigStore } from '../../useConfigStore'

interface AuditRule extends AuditRuleType { }

export function AuditConfig() {
  const guardrailSettings = useConfigStore((s) => s.guardrailSettings)
  const updateSetting = useConfigStore((s) => s.updateGuardrailSetting)
  const [rules, setRules] = useState<AuditRule[]>(DEFAULT_AUDIT_RULES)
  const [testInput, setTestInput] = useState('')
  const [testResult, setTestResult] = useState<string | null>(null)
  const [showTest, setShowTest] = useState(false)

  const handleToggleRule = (index: number) => {
    const newRules = [...rules]
    newRules[index] = { ...newRules[index], enabled: !newRules[index].enabled }
    setRules(newRules)
  }

  const handleTest = () => {
    if (!testInput.trim()) return
    const result = auditResponse(
      testInput,
      '老韩',
      ['酒馆经营', '信息打听', '识人'],
      ['风语镇', '酒馆', '城门', '北境密林', '老矿洞', '城门守卫站', '墓园', '希尔的小屋'],
      rules
    )
    if (result.passed) {
      setTestResult('✅ 通过审核')
    } else {
      setTestResult(`❌ 未通过: ${result.suggestion}`)
    }
  }

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
      <h3 className="mb-3 text-xs font-semibold text-neutral-300 flex items-center gap-2">
        <Shield className="h-3.5 w-3.5 text-amber-400" />
        预输出审核流水线
      </h3>
      <p className="mb-4 text-[10px] text-neutral-500">
        LLM 生成的文本先经过审核引擎检查，通过后才展示给玩家。违规则注入矫正 Prompt 重新生成。
      </p>

      {/* 全局开关 */}
      <div className="mb-4 flex items-center justify-between rounded-md border border-neutral-800 bg-neutral-900 p-3">
        <div>
          <span className="text-[11px] font-medium text-neutral-300">预输出审核</span>
          <p className="text-[9px] text-neutral-500">启用后每次 LLM 响应都先经过规则引擎检查</p>
        </div>
        <button
          role="switch"
          aria-checked={guardrailSettings.antiOOC}
          onClick={() => updateSetting('antiOOC', !guardrailSettings.antiOOC)}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
            guardrailSettings.antiOOC ? 'bg-primary' : 'bg-neutral-700'
          }`}
        >
          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
            guardrailSettings.antiOOC ? 'translate-x-[18px]' : 'translate-x-[3px]'
          }`} />
        </button>
      </div>

      {/* 审核规则列表 */}
      <div className="mb-4 space-y-1.5">
        <span className="text-[10px] font-medium text-neutral-400">审核规则 ({rules.length})</span>
        {rules.map((rule, i) => (
          <div key={rule.name} className="flex items-center gap-2 rounded border border-neutral-800 bg-neutral-900 px-3 py-2">
            <button
              onClick={() => handleToggleRule(i)}
              className={`shrink-0 ${rule.enabled ? 'text-emerald-500' : 'text-neutral-600'}`}
            >
              {rule.enabled ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-medium text-neutral-300">{rule.name}</p>
              <p className="text-[8px] text-neutral-500 truncate">{rule.description}</p>
            </div>
            <span className="rounded-full bg-neutral-800 px-1.5 py-0.5 text-[8px] text-neutral-500">
              {rule.type === 'blacklist' ? '关键词' : rule.type === 'pattern' ? '正则' : rule.type === 'capability' ? '能力' : '白名单'}
            </span>
          </div>
        ))}
      </div>

      {/* 测试区 */}
      <div>
        <button
          onClick={() => setShowTest(!showTest)}
          className="flex items-center gap-1.5 text-[10px] text-neutral-500 hover:text-neutral-300"
        >
          <Search className="h-3 w-3" />
          {showTest ? '收起' : '测试审核规则'}
        </button>
        {showTest && (
          <div className="mt-2 space-y-2">
            <div className="flex gap-2">
              <input
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder='输入模拟的 NPC 回复，如"我会用手机联系你"'
                className="flex-1 rounded border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-[10px] text-neutral-200 placeholder:text-neutral-600"
                onKeyDown={(e) => e.key === 'Enter' && handleTest()}
              />
              <button
                onClick={handleTest}
                className="flex items-center gap-1 rounded bg-primary/20 px-2.5 py-1.5 text-[10px] text-primary hover:bg-primary/30"
              >
                <RefreshCw className="h-3 w-3" /> 测试
              </button>
            </div>
            {testResult && (
              <div className={`rounded border p-2 text-[9px] font-mono ${
                testResult.startsWith('✅') ? 'border-emerald-800 bg-emerald-500/5 text-emerald-400' :
                'border-red-800 bg-red-500/5 text-red-400'
              }`}>
                {testResult}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
