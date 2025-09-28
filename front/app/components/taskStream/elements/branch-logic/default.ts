import { ExecutionBlockEnum, type ExecutionNodeDefault } from '../../types'
import { type IfElseNodeType, LogicalConnector } from './types'
import { currentLanguage } from '@/app/components/taskStream/elements/script/types'
import { ALL_CHAT_ENABLED_BLOCKS, ALL_COMPLETION_AVAILABLE_BLOCKS } from '@/app/components/taskStream/fixed-values'
import { EffectType } from '@/infrastructure/api//universeNodes/universe_default_config'

const defaultOutputItem = { id: 'output_1' }
const defaultInputItem = { id: 'input_1' }

const ifElseNodeDefaults: ExecutionNodeDefault<IfElseNodeType> = {
  defaultValue: {
    payload__kind: 'Ifs',
    desc: '根据分支条件，判断执行哪个任务',
    config__can_run_by_single: false,
    config__input_ports: [{
      id: 'target',
    }],
    config__output_ports: [
      {
        id: 'true',
        label: 'IF',
        logical_operator: LogicalConnector.and,
        cond: '',
      },
      {
        id: 'false',
        label: 'ELSE',
      },
    ],
    config__input_shape: [{ ...defaultInputItem }],
    config__output_shape: [{ ...defaultOutputItem }],
    config__parameters: [
      {
        type: 'if_else',
        name: 'payload__if_else',
        required: true,
      },
      {
        name: 'config__input_shape',
        type: 'config__input_shape',
        label: '输入参数',
        effects: [EffectType.InputShape_OutputShape_IfsFull],
      },
      {
        name: 'config__output_shape',
        type: 'config__output_shape',
        label: '输出参数',
        readOnly: true,
      },
      {
        name: 'config__input_ports',
        type: 'config__input_ports',
        label: '输入端点',
        tooltip: '输入参数的数量，需保证与输入参数数量保持一致',
      },
    ],
    code_language: currentLanguage.python3,
    payload__judge_on_full_input: true,
  },

  checkValidity(payload: IfElseNodeType) {
    let validationErrors = ''
    let validationFields: Array<{ name: string; error?: string }> = [{ name: 'payload__if_else', error: '' }]

    const { config__output_ports } = payload
    if (!config__output_ports || config__output_ports.length === 0)
      validationErrors = 'IF不能为空'

    config__output_ports?.filter(({ id }) => id !== 'false')?.forEach((caseItem, index) => {
      if (!caseItem?.cond) {
        validationErrors = `${index === 0 ? 'IF' : 'ELIF'}不能为空`
        validationFields = validationFields.map((field) => {
          if (field.name === 'payload__if_else' && !field.error)
            field.error = validationErrors
          return field
        })
      }
    })

    return {
      isValid: !validationErrors,
      errorMessage: validationErrors,
      checkFields: validationFields,
    }
  },

  getAccessiblePrevNodes(isChatMode: boolean) {
    const enabledNodes = isChatMode
      ? ALL_CHAT_ENABLED_BLOCKS
      : ALL_COMPLETION_AVAILABLE_BLOCKS.filter(type => type !== ExecutionBlockEnum.FinalNode)
    return enabledNodes
  },

  getAccessibleNextNodes(isChatMode: boolean) {
    const enabledNodes = isChatMode ? ALL_CHAT_ENABLED_BLOCKS : ALL_COMPLETION_AVAILABLE_BLOCKS
    return enabledNodes
  },
}

export default ifElseNodeDefaults
