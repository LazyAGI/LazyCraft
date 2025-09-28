import type { ExecutionBlockEnum, ExecutionNodeDefault } from '../../types'
import { type UniverseNodeType } from './types'
import { getPromptParametersFromInputShapes } from '@/app/components/taskStream/elements/_foundation/components/form/field-item/prompt-editor'
import { NODES_EXTRA_DATA } from '@/app/components/taskStream/fixed-values'
import { getVars } from '@/shared/utils/var'

const nodeDefault: ExecutionNodeDefault<UniverseNodeType> = {
  defaultValue: {
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
  getAccessiblePrevNodes(isChatMode: boolean) {
    return Object.keys(NODES_EXTRA_DATA) as ExecutionBlockEnum[]
  },
  getAccessibleNextNodes(isChatMode: boolean) {
    return Object.keys(NODES_EXTRA_DATA) as ExecutionBlockEnum[]
  },
  checkValidity(payload: UniverseNodeType) {
    let errorInfo = ''
    let checkFields: Array<{ name: string; error?: string }> = []

    if (payload?.payload__prompt) {
      // 对提示词格式进行校验
      checkFields = [{ name: 'payload__prompt', error: '' }]
      if (typeof payload?.payload__prompt === 'string') {
        const isValid = !payload?.payload__prompt

        return {
          isValid,
          errorMessage: isValid ? 'USER提示词为必填' : '',
          checkFields,
        }
      }

      if (!payload?.payload__prompt?.user) {
        errorInfo = 'USER提示词为必填'
      }
      else {
        const promptParams = getPromptParametersFromInputShapes(payload?.config__input_shape || [])
        const systemKeys = getVars(payload?.payload__prompt?.system || '') || []
        const userKeys = getVars(payload?.payload__prompt?.user || '') || []
        if (promptParams?.length && !systemKeys.length && !userKeys.length)
          errorInfo = '提示词须至少引用一个变量'
      }
      checkFields = checkFields.map((item) => {
        if (item.name === 'payload__prompt')
          item.error = errorInfo
        return item
      })
    }
    if (payload?.payload__example_dialogs?.length) {
      checkFields = [{ name: 'payload__example_dialogs', error: '' }]
      payload?.payload__example_dialogs?.forEach((item) => {
        if (!item?.content)
          errorInfo = '示例对话的USER、ASSISTANT提示词为必填'
      })
      checkFields = checkFields.map((item) => {
        if (item.name === 'payload__example_dialogs')
          item.error = errorInfo
        return item
      })
    }
    else if (payload.type) {
      errorInfo = ''
    }
    return {
      isValid: !errorInfo,
      errorMessage: errorInfo,
      checkFields,
    }
  },
}

export default nodeDefault
