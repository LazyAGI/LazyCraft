/** LazyLLM 后端对应注册的节点类型 */
export enum ENodeKind {
  Rewrite = 'QustionRewrite',
  TextProcessor = 'TextProcessor',
  DataHandler = 'DataHandler',
  LLMProcessor = 'LLMProcessor',
  FormatConverter = 'FormatConverter',
}

/** LazyLLM 节点运行状态 */
export enum NodeStatus {
  Idle = 'idle',
  Running = 'running',
  Success = 'success',
  Failed = 'failed',
}

/** LazyLLM 节点配置接口 */
export type LazyLLMNodeConfig = {
  id: string
  type: string
  name: string
  title: string
  description?: string
  parameters?: Record<string, any>
  inputPorts?: Array<{ id: string; name: string; type: string }>
  outputPorts?: Array<{ id: string; name: string; type: string }>
}
