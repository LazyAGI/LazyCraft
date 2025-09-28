import type { ExecutionNodeDefault } from '../../types'
import type { EntryNodeCategory } from './types'
import {
  ALL_CHAT_ENABLED_BLOCKS,
  ALL_COMPLETION_AVAILABLE_BLOCKS,
} from '@/app/components/taskStream/fixed-values'

const EntryNodeDefaults: ExecutionNodeDefault<EntryNodeCategory> = {
  defaultValue: {
    payload__kind: '__start__',
    config__output_ports: [{
      id: 'source',
    }],
    variables: [],
    config__input_ports: [],
    config__output_shape: [],
    config__parameters: [
      {
        name: 'config__output_shape',
        type: 'config__output_shape',
        label: '参数',
        tooltip: '定义LazyLLM工作流需要的输入参数，可以选择多种格式',
      },
    ],
  },

  checkValidity() {
    return {
      isValid: true,
    }
  },

  getAccessiblePrevNodes() {
    return []
  },

  getAccessibleNextNodes(isChatMode: boolean) {
    return isChatMode ? ALL_CHAT_ENABLED_BLOCKS : ALL_COMPLETION_AVAILABLE_BLOCKS
  },
}

export default EntryNodeDefaults
