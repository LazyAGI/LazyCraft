import { ExecutionBlockEnum, VariableType } from '../../types'
import type { ExecutionNodeDefault } from '../../types'
import { type CodeBlockNodeType, currentLanguage } from './types'
import { ALL_CHAT_ENABLED_BLOCKS, ALL_COMPLETION_AVAILABLE_BLOCKS } from '@/app/components/taskStream/fixed-values'

const codeNodeDefaults: ExecutionNodeDefault<CodeBlockNodeType> = {
  defaultValue: {
    payload__code: `def main(input):
    # 构建输出对象
    key2= {
        "key21": "hi"
    }
    return input *2,["hello", "world"],key2`,
    payload__code_language: currentLanguage.python3,
    payload__kind: 'Code',
    desc: '编写代码，处理输入变量来生成返回值',
    variables: [],
    outputs: {
      key0: {
        type: VariableType.string,
        children: null,
      },
      key1: {
        type: VariableType.array,
        children: null,
      },
      key2: {
        type: VariableType.object,
        children: null,
      },
    },
    config__input_shape: [{
      id: 'input',
      variable_name: 'input',
      variable_type: 'str',
      variable_required: true,
    }],
    config__output_shape: [
      {
        id: 'x',
        variable_name: 'x',
        variable_type: 'str',
      },
      {
        id: 'y',
        variable_name: 'y',
        variable_type: 'list',
        variable_list_type: 'str',
      },
      {
        id: 'z',
        variable_name: 'z',
        variable_type: 'dict',
        variable_type_detail: [
          {
            id: 'z1',
            variable_name: 'z1',
            variable_type: 'str',
          },
        ],
      },
    ],
    config__input_ports: [{
      id: 'target',
    }],
    config__output_ports: [{
      id: 'source',
    }],
    config__parameters: [
      {
        name: 'payload__code',
        type: 'code',
        label: 'Code',
        code_language_options: [
          {
            label: 'python',
            value: currentLanguage.python3,
          },
        ],
        required: true,
        ai_hidden: false,
      },
      {
        name: 'config__input_shape',
        type: 'config__input_shape',
        label: '输入参数',
        tooltip: '输入需要添加到代码的变量，代码中可以直接引用此处添加的变量',
        variable_type_options: ['str', 'int', 'float', 'bool', 'dict', 'list', 'any'],
      },
      {
        name: 'config__output_shape',
        type: 'config__output_shape',
        label: '输出参数',
        tooltip: '代码运行完成后输出的变量，须保证此处的变量名、变量类型与代码的return中完全一致',
      },
      {
        name: 'config__input_ports',
        type: 'config__input_ports',
        label: '输入端点',
        tooltip: '输入参数的数量，需保证与输入参数数量保持一致',
      },
    ],
  },
  checkValidity(payload: CodeBlockNodeType) {
    let validationErrors = ''
    let validationFields = [{ name: 'payload__code', error: '' }]

    const { payload__code } = payload
    if (!validationErrors && !payload__code) {
      validationErrors = 'Code不能为空'
      validationFields = validationFields.map((field) => {
        if (field.name === 'payload__code')
          field.error = validationErrors
        return field
      })
    }

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

export default codeNodeDefaults
