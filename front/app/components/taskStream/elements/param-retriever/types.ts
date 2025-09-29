import type { CommonExecutionNodeType as CommonNodeType, Ram, VisionConfig } from '@/app/components/taskStream/types'

export enum ParameterDataType {
  string = 'str',
  int = 'int',
  float = 'float',
}

export type ParameterDefinition = {
  name: string
  type: ParameterDataType
  options?: string[]
  description: string
  require?: boolean
}

export enum ExtractionMethodType {
  prompt = 'prompt',
  functionCall = 'function_call',
}

export type ModelConfiguration = {
  payload__base_model: string
  payload__base_model_name: string
  payload__model_source?: 'online_model' | 'inference_service'
  payload__source?: string
  payload__base_url?: string
  payload__source_id?: string
  payload__base_model_selected_keys?: string[]
  payload__model_id?: string
  payload__can_finetune?: boolean
  payload__model_generate_control?: any
  payload__inference_service?: string
  payload__inference_service_selected_keys?: string[]
  payload__jobid?: string
  payload__token?: string
  payload__deploy_method?: string
  payload__url?: string
}

export type ParameterParserNodeType = CommonNodeType & {
  config__input_shape: any[]
  config__output_shape: any[]
  payload__prompt: string
  instruction: string
  memory?: Ram
  payload__params?: ParameterDefinition[]
  vision: {
    enabled: boolean
    configs?: VisionConfig
  }
} & ModelConfiguration
