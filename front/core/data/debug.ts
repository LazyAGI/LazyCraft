// 提示角色枚举
export enum InstructionRole {
  system = 'system',
  user = 'user',
  agent = 'agent',
}

// 提示项类型
export type InstructionItem = {
  role?: InstructionRole
  text: string
}

// 聊天提示配置
export type ChatPromptSettings = {
  prompt: InstructionItem[]
}

// 完成提示配置
export type CompletionPromptSettings = {
  prompt: InstructionItem
  conversation_histories_role: {
    user_prefix: string
    assistant_prefix: string
  }
}

// 提示变量
export type PromptParameter = {
  key: string
  name: string
  type: string
  required?: boolean
}

// 提示配置
export type PromptOptions = {
  prompt_variables: PromptParameter[]
}
