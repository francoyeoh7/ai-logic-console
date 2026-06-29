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
