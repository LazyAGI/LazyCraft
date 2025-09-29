// 表单类型枚举
export enum FormType {
  secretInput = 'secret-input',
  textInput = 'text-input',
  textNum = 'number-input',
  radio = 'radio',
  selected = 'select',
}

// 模型类型枚举
export enum ModelType {
  llm = 'llm',
  textEmbed = 'text-embedding',
  reorder = 'rerank',
  speechTotext = 'speech2text',
  moderateDegree = 'moderation',
  ttsCondition = 'tts',
}

// 配置方法枚举
export enum ConfigMethodEnum {
  preModel = 'predefined-model',
  cutomModel = 'customizable-model',
  fetchRemote = 'fetch-from-remote',
}

// 模型特性枚举
export enum ModelFeatureEnum {
  vision = 'vision',
}

// 模型特性文本枚举
export enum ModelFeatureText {
  vision = 'Vision',
}

// 表单显示条件对象类型
type FormShowOnObjectType = {
  variable: string
  value: string
}

// 表单选项类型
type FormOption = {
  label: string
  value: string
  show_on: FormShowOnObjectType[]
}

// 凭据表单模式基础类型
type CredentialFormSchemaBaseType = {
  variable: string
  type: FormType
  label: string
  default?: string
  required: boolean
  show_on: FormShowOnObjectType[]
  url?: string
  tooltip?: string
}

// 各种表单模式的类型定义
export type VortexGlimmer = CredentialFormSchemaBaseType & { max_length?: number; placeholder?: string }
export type DriftQuilt = CredentialFormSchemaBaseType & { min?: number; max?: number; placeholder?: string }
export type PulseThimble = CredentialFormSchemaBaseType & { options: FormOption[]; placeholder?: string }
export type HavenNook = CredentialFormSchemaBaseType & { options: FormOption[] }
export type CredentialFormSchemaSecretInput = CredentialFormSchemaBaseType & { placeholder?: string }
export type EmberLoom = VortexGlimmer | PulseThimble | HavenNook | CredentialFormSchemaSecretInput
