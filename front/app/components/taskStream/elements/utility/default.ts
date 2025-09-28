import { NODES_EXTRA_DATA } from '../../fixed-values'
import type { ExecutionBlockEnum, ExecutionNodeDefault } from '../../types'
import type { ToolNodeType } from './types'

const nodeDefault: ExecutionNodeDefault<ToolNodeType> = {
  defaultValue: {
    payload__kind: 'HttpTool',
    config__can_run_by_single: true,
    config__input_ports: [{
      id: 'target',
    }],
    config__output_ports: [{
      id: 'source',
    }],
    config__parameters: [
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
  getAccessiblePrevNodes() {
    // const nodes = isChatMode
    //   ? ALL_CHAT_ENABLED_BLOCKS
    //   : ALL_COMPLETION_AVAILABLE_BLOCKS.filter(type => type !== ExecutionBlockEnum.FinalNode)
    return Object.keys(NODES_EXTRA_DATA) as ExecutionBlockEnum[]
  },
  getAccessibleNextNodes() {
    // const nodes = isChatMode ? ALL_CHAT_ENABLED_BLOCKS : ALL_COMPLETION_AVAILABLE_BLOCKS
    return Object.keys(NODES_EXTRA_DATA) as ExecutionBlockEnum[]
  },
  checkValidity(payload: ToolNodeType) {
    let isValid = true
    let errorInfo = ''
    const checkFields: Array<{ name: string; error?: string }> = []
    if (payload.type) {
      isValid = true
      errorInfo = ''
    }
    return {
      isValid,
      errorMessage: errorInfo,
      checkFields,
    }
  },
}

export default nodeDefault
