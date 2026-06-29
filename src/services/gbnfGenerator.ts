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
