import { ExecutionBlockEnum } from '../../../types'
import type { ExecutionNodeDefault } from '../../../types'
import { validateWhileLoop } from '../../_foundation/components/form/field-item/while/validator'
import { type SubModuleNodeType } from './types'
import { ALL_CHAT_ENABLED_BLOCKS, ALL_COMPLETION_AVAILABLE_BLOCKS } from '@/app/components/taskStream/fixed-values'

const nodeDefault: ExecutionNodeDefault<SubModuleNodeType> = {
  defaultValue: {
    payload__patent_id: undefined,
    payload__stop_condition: {
      type: 'count',
      max_count: 100,
    },
    payload__kind: 'Loop', // SubGraph App Wrap Loop
    desc: '集成另一完整工作流，在子画布编辑',
    config__output_ports: [{
      id: 'source',
    }],
    config__input_ports: [{
      id: 'target',
    }],
    config__parameters: [
      {
        name: 'config__input_ports',
        type: 'config__input_ports',
        label: '输入端点',
        tooltip: '由子模块工作流定义的输入数量',
      },
      {
        name: 'payload__loop_type',
        type: 'select',
        label: '循环类型',
        options: [
          { label: 'count', value: 'count' },
          { label: 'while', value: 'while' },
        ],
        defaultValue: 'count',
      },
      {
        name: 'payload__loop_max_count',
        type: 'number',
        label: '最大次数',
        defaultValue: 10,
      },
      {
        name: 'payload__loop_condition',
        type: 'while_loop',
        label: '循环条件',
        defaultValue: [],
      },
    ],
    draggable: true,
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
  checkValidity(payload: SubModuleNodeType) {
    let isValid = true
    const isLoop = payload.payload__kind === 'Loop'
    const validOverride = isLoop
    let errorInfo = ''
    const checkFields: Array<{ name: string; error?: string }> = []

    if (payload.type) {
      isValid = true
      errorInfo = ''
    }

    // 循环模块的校验逻辑
    if (isLoop) {
      if (!payload.payload__stop_condition?.type) {
        isValid = false
        errorInfo = '请选择循环条件'
        checkFields.push({ name: 'payload__loop_type', error: errorInfo })
      }

      if (payload.payload__stop_condition?.type === 'count' && !payload.payload__stop_condition?.max_count) {
        isValid = false
        errorInfo = '请设置最大次数'
        checkFields.push({ name: 'payload__loop_max_count', error: errorInfo })
      }

      if (payload.payload__stop_condition?.type === 'while') {
        if (!payload.payload__stop_condition?.condition.length) {
          isValid = false
          errorInfo = '请至少设置一个循环条件'
        }
        if (validateWhileLoop(payload.payload__stop_condition?.condition, payload).length > 0) {
          isValid = false
          errorInfo = '循环条件不合法，请检查变量名、值和操作符'
        }
        checkFields.push({ name: 'payload__loop_condition', error: errorInfo })
      }

      // 循环分支输入输出参数一致性校验
      let inputParams = payload.config__input_shape || []
      let outputParams = payload.config__output_shape || []

      // 确保输入参数是数组
      if (!Array.isArray(inputParams))
        inputParams = []

      // 确保输出参数是数组
      if (!Array.isArray(outputParams))
        outputParams = []

      if (inputParams.length !== outputParams.length) {
        isValid = false
        errorInfo = '循环分支的输入参数和输出参数数量必须一致'
        checkFields.push({ name: 'config__input_shape', error: errorInfo })
        checkFields.push({ name: 'config__output_shape', error: errorInfo })
      }
      else {
        for (let i = 0; i < inputParams.length; i++) {
          const inputParam = inputParams[i]
          const outputParam = outputParams[i]

          if (inputParam.variable_name !== outputParam.variable_name) {
            isValid = false
            errorInfo = `参数名称不一致：输入参数 "${inputParam.variable_name}" 与输出参数 "${outputParam.variable_name}" 不匹配`
            checkFields.push({ name: 'config__input_shape', error: errorInfo })
            checkFields.push({ name: 'config__output_shape', error: errorInfo })
            break
          }

          if (inputParam.variable_type !== outputParam.variable_type) {
            isValid = false
            errorInfo = `参数类型不一致：参数 "${inputParam.variable_name}" 的输入类型 "${inputParam.variable_type}" 与输出类型 "${outputParam.variable_type}" 不匹配`
            checkFields.push({ name: 'config__input_shape', error: errorInfo })
            checkFields.push({ name: 'config__output_shape', error: errorInfo })
            break
          }
        }
      }
    }
    return {
      isValid,
      errorMessage: errorInfo,
      checkFields,
      validOverride,
    }
  },
}

export default nodeDefault
