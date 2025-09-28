import { ExecutionBlockEnum } from '../../types'
import type { ExecutionNodeDefault } from '../../types'
import type { FinalNodeType } from './types'
import {
  ALL_CHAT_ENABLED_BLOCKS,
  ALL_COMPLETION_AVAILABLE_BLOCKS,
} from '@/app/components/taskStream/fixed-values'

const FinalNodeDefaults: ExecutionNodeDefault<FinalNodeType> = {
  defaultValue: {
    payload__kind: '__end__',
    outputs: [],
    config__input_ports: [{
      id: 'target',
    }],
    config__output_ports: [],
    config__input_shape: [],
    config__parameters: [
      {
        name: 'config__input_shape',
        type: 'config__input_shape',
        label: '参数',
      },
      {
        name: 'config__input_ports',
        type: 'config__input_ports',
        label: '输入端点',
        tooltip: '输入参数的数量，需保证与输入参数数量保持一致',
      },
    ],
  },

  checkValidity(payload: FinalNodeType) {
    const isValid = !!payload.type

    return {
      isValid,
      errorMessage: isValid ? '' : 'LazyLLM end node requires valid type',
      checkFields: [],
    }
  },

  getAccessiblePrevNodes(isChatMode: boolean) {
    return isChatMode
      ? ALL_CHAT_ENABLED_BLOCKS
      : ALL_COMPLETION_AVAILABLE_BLOCKS.filter(type => type !== ExecutionBlockEnum.FinalNode)
  },

  getAccessibleNextNodes() {
    return []
  },
}

export default FinalNodeDefaults
