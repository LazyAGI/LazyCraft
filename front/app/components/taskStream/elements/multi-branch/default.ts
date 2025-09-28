import { ExecutionBlockEnum, type ExecutionNodeDefault } from '../../types'
import { type SwitchCaseNodeType } from './types'
import { currentLanguage } from '@/app/components/taskStream/elements/script/types'
import { ALL_CHAT_ENABLED_BLOCKS, ALL_COMPLETION_AVAILABLE_BLOCKS } from '@/app/components/taskStream/fixed-values'
import { EffectType } from '@/infrastructure/api//universeNodes/universe_default_config'

const nodeDefault: ExecutionNodeDefault<SwitchCaseNodeType> = {
  defaultValue: {
    payload__kind: 'Switch',
    desc: '根据分支条件，判断具体执行哪个任务',
    config__can_run_by_single: false,
    config__input_ports: [{
      id: 'target',
    }],
    config__output_ports: [
      {
        id: 'true',
        label: 'CASE 1',
        cond: '',
      },
      {
        id: 'false',
        label: 'DEFAULT',
      },
    ],
    config__parameters: [
      {
        name: 'config__input_shape',
        type: 'config__input_shape',
        label: '输入参数',
        effects: [EffectType.InputShape_OutputShape_SwitchFull],
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
        name: 'payload__code',
        type: 'code',
        label: '判断代码',
        tooltip: '编写自定义的判断逻辑代码，返回对应的条件值来进行分支判断',
        code_language_options: [
          {
            label: 'Python',
            value: currentLanguage.python3,
          },
        ],
        required: false,
      },
      {
        type: 'switch_case',
        label: 'SWITCH',
        name: 'payload__switch_case',
        required: true,
      },
    ],
    code_language: currentLanguage.python3,
    payload__code: `# 根据input，确认处理逻辑，返回值参与后续的case判定
def handler(input1, input2):
    return input2
`,
  },
  getAccessiblePrevNodes(isChatMode: boolean) {
    const nodes = isChatMode ? ALL_CHAT_ENABLED_BLOCKS : ALL_COMPLETION_AVAILABLE_BLOCKS.filter(type => type !== ExecutionBlockEnum.FinalNode)
    return nodes
  },
  getAccessibleNextNodes(isChatMode: boolean) {
    const nodes = isChatMode ? ALL_CHAT_ENABLED_BLOCKS : ALL_COMPLETION_AVAILABLE_BLOCKS
    return nodes
  },
  checkValidity(payload: SwitchCaseNodeType) {
    let errorInfo = ''
    let checkFields: Array<{ name: string; error?: string; extra?: any }> = [
      { name: 'payload__switch_case', error: '' },
    ]

    const { config__output_ports } = payload
    if (!config__output_ports || config__output_ports.length === 0)
      errorInfo = 'CASE不能为空'

    config__output_ports?.filter(({ id }) => id !== 'false').forEach((caseItem, index) => {
      if (!caseItem?.cond) {
        errorInfo = `CASE ${index + 1} 不能为空`
        checkFields = checkFields.map((item) => {
          if (item.name === 'payload__switch_case' && !item.error)
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
