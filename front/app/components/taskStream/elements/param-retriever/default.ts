import type { ExecutionBlockEnum, ExecutionNodeDefault } from '../../types'
import { NODES_EXTRA_DATA } from '../../fixed-values'
import { type ParameterParserNodeType } from './types'

const parameterExtractorDefaults: ExecutionNodeDefault<ParameterParserNodeType> = {
  defaultValue: {
    payload__kind: 'parameterextractor',
    payload__base_model: '',
    config__can_run_by_single: true,
    config__input_shape: [{
      id: 'query',
      variable_name: 'query',
      variable_type: 'str',
      variable_mode: 'mode-line',
      variable_name_readonly: true,
      variable_type_readonly: true,
      variable_mode_readonly: true,
    }],
    config__output_shape: [],
    config__input_ports: [{
      id: 'target',
    }],
    config__output_ports: [{
      id: 'source',
    }],
    vision: {
      enabled: false,
    },
    config__parameters: [
      {
        name: 'payload__base_model',
        type: 'local_and_online_llm_resource_selector',
        label: '模型',
      },
      {
        name: 'config__input_shape',
        type: 'config__input_shape',
        label: '输入参数',
      },
      {
        name: 'config__output_shape',
        type: 'config__output_shape',
        label: '输出参数',
      },
      {
        name: 'config__input_ports',
        type: 'config__input_ports',
        label: '输入端点',
        tooltip: '输入参数的数量，需保证与输入参数数量保持一致',
      },
      {
        name: 'config__output_ports',
        type: 'config__output_ports',
        label: '输出端点',
      },
    ],
  },
  checkValidity(payload: ParameterParserNodeType, t: any) {
    let validationErrors = ''

    if (!validationErrors && payload.config__input_shape.length === 0)
      validationErrors = '输入变量 字段必填'

    // 根据模型来源验证不同的字段
    if (!validationErrors) {
      const isInferenceService = payload.payload__model_source === 'inference_service'
      if (isInferenceService) {
        // 平台推理服务：检查 payload__inference_service
        if (!payload.payload__inference_service)
          validationErrors = '推理服务 字段必填'
      }
      else {
        // 在线模型：检查 payload__base_model 或 payload__source
        if (!payload.payload__base_model && !payload.payload__source)
          validationErrors = '模型 字段必填'
      }
    }

    if (!validationErrors && !payload.payload__params?.length)
      validationErrors = '提取参数 字段必填'

    return {
      isValid: !validationErrors,
      errorMessage: validationErrors,
    }
  },
  getAccessiblePrevNodes(isChatMode: boolean) {
    return Object.keys(NODES_EXTRA_DATA) as ExecutionBlockEnum[]
  },
  getAccessibleNextNodes(isChatMode: boolean) {
    return Object.keys(NODES_EXTRA_DATA) as ExecutionBlockEnum[]
  },
}

export default parameterExtractorDefaults
