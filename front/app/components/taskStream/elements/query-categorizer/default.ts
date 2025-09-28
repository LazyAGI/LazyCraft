import { v4 as uuid4 } from 'uuid'
import { ExecutionBlockEnum, type ExecutionNodeDefault } from '../../types'
import { type QuestionClassifierNodeType } from './types'
import { currentLanguage } from '@/app/components/taskStream/elements/script/types'
import { ALL_CHAT_ENABLED_BLOCKS, ALL_COMPLETION_AVAILABLE_BLOCKS } from '@/app/components/taskStream/fixed-values'

const nodeDefault: ExecutionNodeDefault<QuestionClassifierNodeType> = {
  defaultValue: {
    payload__kind: 'Intention',
    desc: '判断用户输入的意图识别，将其与预设意图选项进行匹配',
    config__can_run_by_single: false,
    config__input_ports: [{
      id: 'target',
    }],
    config__output_ports: [
      {
        id: uuid4(),
        cond: '',
        label: '意图 1',
      },
      {
        id: 'false',
        cond: '',
        label: '默认',
      },
    ],
    config__input_shape: [{
      variable_name: 'query',
      // variable_name_readonly: true,
      variable_type: 'str',
      // variable_type_readonly: true,
      readOnly: true,
    }],
    config__output_shape: [
      {
        variable_name: 'output',
        // variable_name_readonly: true,
        variable_type: 'str',
        // variable_type_readonly: true,
        readOnly: true,
      },
    ],
    config__parameters: [
      {
        name: 'config__input_shape',
        type: 'config__input_shape',
        label: '输入参数',
        readOnly: true,
        tooltip: '需要进行意图识别的参数',
      },
      {
        name: 'config__output_shape',
        type: 'config__output_shape',
        label: '输出参数',
        readOnly: true,
        tooltip: '意图识别后输出的参数',
      },
      {
        name: 'config__input_ports',
        type: 'config__input_ports',
        label: '输入端点',
        tooltip: '输入参数的数量，需保证与输入参数数量保持一致',
      },
      {
        label: '模型来源',
        name: 'payload__model_source',
        type: 'select',
        allowClear: false,
        options: [
          { value: 'online_model', label: '在线模型' },
          { value: 'inference_service', label: '平台推理服务' },
        ],
        required: true,
        defaultValue: 'online_model',
        watch: [
          {
            conditions: [
              {
                key: 'payload__model_source',
                value: ['online_model', 'inference_service'],
                operator: 'include',
              },
            ],
            actions: [
              {
                key: 'payload__source',
                value: undefined,
              },
              {
                key: 'payload__base_model_selected_keys',
                value: undefined,
              },
              {
                key: 'payload__inference_service',
                value: undefined,
              },
              {
                key: 'payload__inference_service_selected_keys',
                value: undefined,
              },
              {
                key: 'payload__jobid',
                value: undefined,
              },
              {
                key: 'payload__token',
                value: undefined,
              },
              {
                key: 'payload__stream',
                value: false,
              },
              {
                key: 'payload__prompt',
                value: undefined,
              },
              {
                key: 'payload__prompt_template',
                value: undefined,
              },
              {
                key: 'payload__use_history',
                value: false,
              },
            ],
            children: [
              {
                conditions: [{
                  key: 'payload__model_source',
                  value: 'online_model',
                }],
                actions: [
                  {
                    key: 'config__parameters',
                    extend: true,
                    value: [
                      {}, {}, {}, {},
                      {
                        label: '',
                        type: 'online_model_select',
                        _check_names: ['payload__source', 'payload__base_model_selected_keys'],
                        required: true,
                      },
                      {}, {}, {},
                    ],
                  },
                ],
              },
              {
                conditions: [{
                  key: 'payload__model_source',
                  value: 'inference_service',
                }],
                actions: [
                  {
                    key: 'config__parameters',
                    extend: true,
                    value: [
                      {}, {}, {}, {},
                      {
                        label: '推理服务',
                        name: 'payload__inference_service',
                        type: 'inference_service_select',
                        required: true,
                        tooltip: '选择推理服务',
                        _check_names: [],
                        itemProps: {
                          model_type: 'localLLM',
                        },
                      },
                      {}, {}, {},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        type: 'online_model_select',
        _check_names: ['payload__source', 'payload__base_model_selected_keys'],
        required: true,
      },
      {
        type: 'intention',
        label: '意图识别',
        name: 'payload__intention',
        required: true,
        tooltip: '添加想要识别的意图，每个意图最好简洁清晰，意图之间没有交叉',
      },
    ],
    code_language: currentLanguage.python3,
  },
  getAccessiblePrevNodes(isChatMode: boolean) {
    const nodes = isChatMode
      ? ALL_CHAT_ENABLED_BLOCKS
      : ALL_COMPLETION_AVAILABLE_BLOCKS.filter(type => type !== ExecutionBlockEnum.FinalNode)
    return nodes
  },
  getAccessibleNextNodes(isChatMode: boolean) {
    const nodes = isChatMode ? ALL_CHAT_ENABLED_BLOCKS : ALL_COMPLETION_AVAILABLE_BLOCKS
    return nodes
  },
  checkValidity(payload: QuestionClassifierNodeType, t?: any) {
    let errorInfo = ''
    let checkFields: Array<{ name: string; error?: string }> = [
      { name: 'payload__intention', error: '' },
    ]
    const { config__output_ports } = payload
    if (!config__output_ports || config__output_ports.length === 0) {
      errorInfo = '意图不能为空'
      checkFields = checkFields.map((item) => {
        if (item.name === 'payload__intention')
          item.error = errorInfo
        return item
      })
    }

    config__output_ports?.filter(({ id }) => id !== 'false').forEach((caseItem, index) => {
      if (!caseItem?.cond) {
        errorInfo = `意图 ${index + 1} 不能为空`
        checkFields = checkFields.map((item) => {
          if (item.name === 'payload__intention' && !item.error)
            item.error = errorInfo
          return item
        })
      }
    })
    return {
      isValid: !errorInfo,
      errorMessage: errorInfo,
      checkFields,
    }
  },
}

export default nodeDefault
