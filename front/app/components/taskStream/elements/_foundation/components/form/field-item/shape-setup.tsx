'use client'
import type { FC } from 'react'
import React, { useEffect, useMemo, useRef } from 'react'
import { v4 as uuid4 } from 'uuid'
import { Button as BtnAntd, Tooltip } from 'antd'
import type { FieldItemProps } from '../types'
import { ValueType, formatValueByType } from './utils'
import cn from '@/shared/utils/classnames'
import { Input, InputNumber, Select, Switch } from '@/app/components/taskStream/elements/_foundation/components/form/base'
import { useFileResources } from '@/app/components/taskStream/logicHandlers/resStore'
import { LazyCodeEditor, LazyTextEditor } from '@/app/components/taskStream/elements/_foundation/components/editor'
import TypeSelector from '@/app/components/taskStream/elements/_foundation/components/picker'
import { currentLanguage } from '@/app/components/taskStream/elements/script/types'
import Icon from '@/app/components/base/iconFont'
import './config-shape.scss'
import { EffectType, generateTypeReadOnlyShape } from '@/infrastructure/api/universeNodes/universe_default_config'

const baseTypeOptions = [
  { label: 'str', value: 'str' },
  { label: 'int', value: 'int' },
  { label: 'float', value: 'float' },
  { label: 'bool', value: 'bool' },
  { label: 'file', value: 'file' },
  { label: 'time', value: 'time' },
  { label: 'union', value: 'union' },
  { label: 'any', value: 'any' },
]

// 为dict和list子项创建不包含multimedia的类型选项
const childTypeOptions = baseTypeOptions.filter(option => option.value !== 'multimedia')

// 新增：file类型的子类型选项
let fileTypeOptions = [
  { label: 'image', value: 'image' },
  { label: 'audio', value: 'audio' },
  { label: 'video', value: 'video' },
  { label: 'voice', value: 'voice' },
  { label: 'docx', value: 'docx' },
  { label: 'pdf', value: 'pdf' },
  { label: 'pptx', value: 'pptx' },
  { label: 'excel/csv', value: 'excel/csv' },
  { label: 'txt', value: 'txt' },
  { label: 'markdown', value: 'markdown' },
  { label: 'code', value: 'code' },
  { label: 'zip', value: 'zip' },
  { label: 'default', value: 'default' },
]

const dataTypeOptions = [
  ...baseTypeOptions,
  { label: 'dict', value: 'dict' },
  { label: 'list', value: 'list' },
]

const ConfigShape: FC<Partial<FieldItemProps>> = ({
  nodeId,
  nodeData,
  name,
  value = [],
  onChange,
  readOnly,
  action: variableTypeAction,
  min: variableMin = 0,
  max: variableMax = Infinity,
  variable_name_readonly: variableNameReadOnly,
  variable_type_options: variableTypeOptions,
  variable_type_readonly: variableTypeReadOnly,
  variable_port_readonly: variablePortReadOnly,
  variable_mode_readonly: variableModeReadOnly,
  variable_mode_select_readonly: variableModeSelectReadOnly,
  variable_mode_input_readonly: variableModeInputReadOnly,
  isWarp = false,
  isBatchParmas = false,
  effects,
  // ...others
}) => {
  // const store = useStoreApi()
  // const { edges, getNodes } = store.getState()
  // const nodes = getNodes()
  const self = useRef({ defaultConfigList: [] })
  const { fileResources } = useFileResources()
  const [openModal, setOpenModal] = React.useState(false)

  const isOutputShape = name === 'config__output_shape'

  readOnly = readOnly || nodeData?.readOnly || false

  function getFiledTitle(name: string) {
    switch (name) {
      case 'config__input_shape':
        return '输入参数'
      case 'config__output_shape':
        return '输出参数'
      default:
        return '参数'
    }
  }

  const filedTitle = getFiledTitle(name)

  const currentVariableTypeOptions = useMemo(() => {
    let options = variableTypeOptions

    if (nodeData.config__parameters && Array.isArray(nodeData.config__parameters)) {
      const parametersConfig = nodeData.config__parameters[0]
      if (parametersConfig && parametersConfig.variable_type_options)
        options = parametersConfig.variable_type_options
    }

    if (!options && nodeData.config__input_shape && Array.isArray(nodeData.config__input_shape)) {
      const inputShape = nodeData.config__input_shape[0]
      if (inputShape && inputShape.variable_type_options)
        options = inputShape.variable_type_options
    }

    return options
  }, [nodeData.config__parameters, nodeData.config__input_shape, variableTypeOptions])

  useEffect(() => {
    if (!self.current.defaultConfigList?.length)
      self.current.defaultConfigList = value
  }, [JSON.stringify(value)])

  const valueList = useMemo(() => {
    const dataList = Array.isArray(value) ? value : []
    const nameList = dataList.map(item => item.variable_name).filter(item => !!item)
    return dataList.map((item) => {
      item.variable_mode = item.variable_mode || 'mode-line'
      item.id = item.id || uuid4()
      let check_result = true
      let warn_text = ''
      if (!readOnly && !item.variable_name_readonly) {
        if (!item.variable_name) {
          check_result = false
          warn_text = '请输入变量名称'
        }
        else if (/^[$A-Z_][0-9A-Z_$]*$/i.test(item.variable_name)) {
          if (nameList.filter(val => val === item.variable_name).length > 1) {
            check_result = false
            warn_text = '变量名称设置重复'
          }
          else if (!item.variable_type) {
            check_result = false
            warn_text = '请选择变量类型'
          }
          else if (item.variable_type === 'file') {
            // file 类型二级校验
            if (!item.variable_file_type) {
              check_result = false
              warn_text = 'file 类型必须指定文件类型'
            }
          }
        }
        else {
          if (item.variable_name) {
            check_result = false
            warn_text = '变量名称和内容的首字符只能是字母或下划线'
          }
        }
      }
      return { ...item, warn_text, check_result }
    })
  }, [value, nodeData])

  // const inputPortOptions = useMemo(() => {
  //   const { config__input_ports } = nodeData
  //   return (name === 'config__input_shape' && Array.isArray(config__input_ports))
  //     ? config__input_ports.map((item, index) => ({
  //       label: `PORT ${index + 1}`,
  //       value: item.id,
  //     }))
  //     : []
  // }, [name, nodeData])

  const {
    inputErrorTags,
    inputSuccessTags,
    inputChainParams,
    simpleTitle,
    nodeKind,
    nodeSetmode,
    inputerrorInfo,
  } = useMemo(() => {
    let errorParams: any[] = []
    let successParams: any[] = []
    let inputChainParams: any[] = []
    const errorInfo: Record<string, string> = {}
    const { config__input_ports, payload__kind, payload__setmode } = nodeData

    if (name === 'config__input_shape' && Array.isArray(config__input_ports)) {
      config__input_ports.forEach((item) => {
        if (item.param_check_success === false && item.param_input_error?.length > 0) {
          errorParams = [...errorParams, ...item.param_input_error]

          item.param_input_error.forEach((errParam) => {
            const errorTag = errParam.variable_name

            if (errParam.error_type === 'count_more') {
              errorInfo[errorTag] = '输入输出变量数量不一致'
            }
            else if (errParam.error_type === 'count_less') {
              errorInfo[errorTag] = '输入输出变量数量不一致'
            }
            else if (errParam.error_type === 'type_mismatch') {
              const sourceInfo = errParam.source_info || {}
              const sourceNodeTitle = sourceInfo.node_title || ''
              const sourceParamName = sourceInfo.variable_name || ''
              const sourceParamType = sourceInfo.variable_type || ''

              let errorMsg = `${errParam.variable_name} 类型不匹配-`

              if (sourceNodeTitle) {
                errorMsg += sourceNodeTitle
                if (sourceParamName)
                  errorMsg += `·${sourceParamName}`
                if (sourceParamType)
                  errorMsg += `·${sourceParamType}`
              }

              errorInfo[errorTag] = errorMsg
            }
            else if (errParam.error_type === 'file_type_mismatch') {
              const sourceInfo = errParam.source_info || {}
              const sourceNodeTitle = sourceInfo.node_title || ''
              const sourceParamName = sourceInfo.variable_name || ''
              const sourceFileType = sourceInfo.variable_file_type || ''

              let errorMsg = `${errParam.variable_name} 文件类型不匹配-`

              if (sourceNodeTitle) {
                errorMsg += sourceNodeTitle
                if (sourceParamName)
                  errorMsg += `·${sourceParamName}`
                if (sourceFileType)
                  errorMsg += `·${sourceFileType}`
              }

              errorInfo[errorTag] = errorMsg
            }
            else {
              errorInfo[errorTag] = errParam.error_message || '参数错误'
            }
          })
        }
        else if (item.param_check_success === true && item.param_input_success?.length > 0) {
          successParams = [...successParams, ...item.param_input_success]
        }

        if (item.param_source_shape?.length > 0)
          inputChainParams = [...inputChainParams, ...item.param_source_shape]
      })
    }

    return {
      inputErrorTags: errorParams?.map(item => item.variable_name),
      inputSuccessTags: successParams?.map(item => item.variable_name),
      inputChainParams,
      simpleTitle: ['__start__', '__end__'].includes(payload__kind) ? '参数' : '',
      nodeKind: payload__kind,
      nodeSetmode: payload__setmode,
      inputerrorInfo: errorInfo,
    }
  }, [name, nodeData])

  const inputPortOptions = useMemo(() => {
    const { config__input_ports } = nodeData
    return (name === 'config__input_shape' && Array.isArray(config__input_ports))
      ? config__input_ports.map((item, index) => ({
        label: `端点 ${index + 1}`,
        value: item.id,
      }))
      : []
  }, [name, nodeData])

  const handleChange = (_name, _value) => {
    const data: any = {
      [_name]: _value,
    }
    if (name === 'config__input_shape' || (_name === 'config__output_shape' && effects)) {
      if (effects?.includes(EffectType.InputShape_InputShape_OneType)) {
        _value?.forEach((item, index) => {
          if (index > 0) {
            item.variable_type = _value[0]?.variable_type
            item.variable_type_readonly = true
          }
        })
      }

      if (effects?.includes(EffectType.InputShape_InputShape_ResetOptions)) {
        _value?.forEach((item) => {
          // Only reset specific problematic items, not user-entered parameters
          if (item.id === 'query' || item.id === 'file') {
            item.variable_type_readonly = false
            item.variable_type_options = null
            item.variable_name_readonly = false
            item.variable_mode_readonly = false
            item.id = uuid4()
          }
          // Only reset file/multimedia types that are system-generated or problematic
          if ((item.variable_type === 'file' || item.variable_type === 'multimedia')
              && (item.id === 'query' || item.id === 'file' || !item.variable_name || item.variable_name.length === 0)) {
            item.variable_type = undefined
            item.variable_file_type = undefined
            item.variable_type_readonly = false
          }
        })
      }

      if (effects?.includes(EffectType.InputShape_InputShape_ResetUnsupportedTypes)) {
        _value?.forEach((item) => {
          if (item.variable_type && variableTypeOptions?.length) {
            const isSupported = variableTypeOptions.includes(item.variable_type)
            if (!isSupported) {
              // 如果当前类型不被支持，则重置为undefined
              item.variable_type = undefined
              item.variable_file_type = undefined
              item.variable_type_detail = undefined
              item.variable_list_type = undefined
              item.payload__batch_flag = false
            }
          }
        })
      }
      let currentOptions = currentVariableTypeOptions

      // 尝试从更新后的数据中获取最新的 variable_type_options
      if (data.config__parameters && Array.isArray(data.config__parameters)) {
        const parametersConfig = data.config__parameters[0]
        if (parametersConfig && parametersConfig.variable_type_options)
          currentOptions = parametersConfig.variable_type_options
      }

      if (!currentOptions && data.config__input_shape && Array.isArray(data.config__input_shape)) {
        const inputShape = data.config__input_shape[0]
        if (inputShape && inputShape.variable_type_options)
          currentOptions = inputShape.variable_type_options
      }

      // 3. 如果都没有获取到，使用默认选项
      if (!currentOptions)
        currentOptions = dataTypeOptions.map(opt => opt.value)
      if (currentOptions?.length) {
        _value?.forEach((item) => {
          if (item.variable_type && !currentOptions.includes(item.variable_type)) {
            item.variable_type = currentOptions[0]
            item.variable_file_type = undefined
            item.variable_type_detail = undefined
            item.variable_list_type = undefined
            item.payload__batch_flag = false
          }
          // 新增：如果当前类型在可选列表中，什么都不做，保留原类型
        })
      }

      setTimeout(() => {
        if (data.config__parameters && Array.isArray(data.config__parameters)) {
          const parametersConfig = data.config__parameters[0]
          if (parametersConfig && parametersConfig.variable_type_options) {
            const latestOptions = parametersConfig.variable_type_options
            let hasChanges = false

            _value?.forEach((item) => {
              if (item.variable_type && !latestOptions.includes(item.variable_type)) {
                item.variable_type = latestOptions[0]
                item.variable_file_type = undefined
                item.variable_type_detail = undefined
                item.variable_list_type = undefined
                item.payload__batch_flag = false
                hasChanges = true
              }
            })

            if (hasChanges)
              onChange?.({ [_name]: _value })
          }
        }
      }, 200)

      if (effects?.includes(EffectType.InputShape_ToDictNames_JoinFormatter)) {
        const to_dict_names: string[] = []
        _value?.forEach((item) => {
          if (item.variable_name)
            to_dict_names.push(item.variable_name)
        })
        data.payload__names = to_dict_names
      }

      // sync output
      if (effects?.includes(EffectType.InputShape_OutputShape_Sum)) {
        const config__output_shape = (nodeData?.config__output_shape && nodeData.config__output_shape[0]) || generateTypeReadOnlyShape('output', '')
        const variable_type = _value[0]?.variable_type
        data.config__output_shape = [
          {
            ...config__output_shape,
            variable_type,
          },
        ]
      }
      else if (effects?.includes(EffectType.InputShape_OutputShape_Dict)) {
        const config__output_shape = (nodeData?.config__output_shape && nodeData.config__output_shape[0]) || generateTypeReadOnlyShape('output', 'dict')
        const variable_type_detail: any = []
        config__output_shape.variable_type = 'dict'
        _value?.forEach((item, index) => {
          const oldId = config__output_shape.variable_type_detail && config__output_shape.variable_type_detail[index] && config__output_shape.variable_type_detail[index].id
          // if (item.variable_name || item.variable_type) {
          const data = {
            id: oldId || uuid4(),
            variable_name: item.variable_name || '',
            variable_type: item.variable_type || '',
            variable_type_detail: undefined,
          }
          variable_type_detail.push(data)
          // }
        })
        config__output_shape.variable_type_detail = variable_type_detail
        data.config__output_shape = [config__output_shape]
      }
      else if (effects?.includes(EffectType.InputShape_OutputShape_Stack)) {
        const variable_type = _value[0]?.variable_type
        const config__output_shape = (nodeData?.config__output_shape && nodeData.config__output_shape[0]) || generateTypeReadOnlyShape('output', 'list')
        data.config__output_shape = [
          {
            ...config__output_shape,
            variable_type: 'list',
            variable_list_type: 'any',
            variable_type_detail: undefined,
          },
        ]
      }
      else if (effects?.includes(EffectType.InputShape_OutputShape_ModeIndependent)) {
        const portIds: string[] = []
        const shapeCache = {}
        _value?.forEach((item, index) => {
          if (!shapeCache[item.variable_port]) {
            portIds.push(item.variable_port)
            shapeCache[item.variable_port] = [item]
          }
          else {
            shapeCache[item.variable_port].push(item)
          }
        })
        if (portIds.length > 0) {
          data.config__output_shape = shapeCache[portIds[0]]?.map((item, index) => {
            const { variable_name, variable_type } = item || {}
            const consistentIds = portIds.filter((val) => {
              const shapeItem = shapeCache[val] || []
              return item.variable_type === shapeItem[index]?.variable_type
            })
            return { variable_name, variable_type: consistentIds.length === portIds.length ? variable_type : 'any' }
          })
        }
      }
      else if (effects?.includes(EffectType.InputShape_OutputShape_ModeSame)) {
        data.config__output_shape = data[_name]?.map(item => item)
      }
      else if (effects?.includes(EffectType.InputShape_OutputShape_IfsFull) || effects?.includes(EffectType.InputShape_OutputShape_SwitchFull)) {
        data.config__output_shape = data[_name]?.map(item => item)
      }
      else if (effects?.includes(EffectType.InputShape_OutputShape_IfsNoFull)) {
        data.config__output_shape = data[_name]?.filter(item => item.variable_name !== '条件').map(item => item)
      }
      else if (effects?.includes(EffectType.InputShape_OutputShape_SwitchNoFull)) {
        data.config__output_shape = data[_name]?.filter((item, index) => index >= 1).map(item => item)
      }
    }
    onChange?.(data)
  }

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null
    if (effects?.includes(EffectType.InputShape_InputShape_ResetOptions) && name === 'config__input_shape') {
      // Only trigger reset if there are actually items that need to be reset
      const needsReset = value?.some(item =>
        (item.id === 'query' || item.id === 'file')
        || ((item.variable_type === 'file' || item.variable_type === 'multimedia')
         && (!item.variable_name || item.variable_name.length === 0)),
      )

      if (needsReset) {
        !!timer && clearTimeout(timer)
        timer = setTimeout(() => {
          const _value = JSON.parse(JSON.stringify(value || [])).filter(Boolean)
          handleChange(name, _value)
        }, 500)
      }
    }
  }, [effects, name, value])

  // 监听 nodeData 变化，验证类型选项
  useEffect(() => {
    if (name === 'config__input_shape' && currentVariableTypeOptions?.length && value?.length) {
      const timer = setTimeout(() => {
        const _value = JSON.parse(JSON.stringify(value || [])).filter(Boolean)
        let hasChanges = false

        _value.forEach((item) => {
          // 特殊处理：对于Reranker节点的query参数，强制保持str类型
          if (nodeData?.payload__kind === 'Reranker' && item.variable_name === 'query') {
            if (item.variable_type !== 'str') {
              item.variable_type = 'str'
              item.variable_file_type = undefined
              item.variable_type_detail = undefined
              item.variable_list_type = undefined
              item.payload__batch_flag = false
              hasChanges = true
            }
          }
          // 其他参数的类型验证逻辑
          else if (item.variable_type && !currentVariableTypeOptions.includes(item.variable_type)) {
            item.variable_type = currentVariableTypeOptions[0]
            item.variable_file_type = undefined
            item.variable_type_detail = undefined
            item.variable_list_type = undefined
            item.payload__batch_flag = false
            hasChanges = true
          }
        })

        if (hasChanges)
          onChange?.({ [name]: _value })
      }, 100)

      return () => clearTimeout(timer)
    }
  }, [currentVariableTypeOptions, name, JSON.stringify(value?.map(item => item.variable_type)), nodeData?.payload__kind])

  const handleAddParam = () => {
    const _value = JSON.parse(JSON.stringify(value || [])).filter(Boolean)
    _value.push({
      id: uuid4(),
      variable_port: undefined,
      variable_mode: 'mode-line',
      // variable_tip: undefined,
      variable_const: undefined,
      variable_name: undefined,
      variable_type: undefined,
      variable_type_detail: undefined,
      variable_list_type: undefined,
      // variable_required: undefined,
    })
    handleChange(name, _value)
  }

  const handleRemovePort = (id: string) => {
    const _value = JSON.parse(JSON.stringify(value || [])).filter(Boolean).filter((item: any) => item.id !== id)
    handleChange(name, _value)
  }

  const paramTypeChange = (v, itemData, detailData?) => {
    let _value = JSON.parse(JSON.stringify(value || [])).filter(Boolean)
    _value?.every((item, index) => {
      if (item.id === itemData.id) {
        if (!detailData) {
          item.variable_type = v
          // if (nodeType === 'start' && v === 'file') {
          //   item.variable_mode = 'mode-const'
          //   item.preview_mode = true
          // }
          if (v === 'dict') {
            if (!item.variable_type_detail) {
              item.variable_type_detail = [{
                id: uuid4(),
                variable_name: undefined,
                variable_type: undefined,
                variable_type_detail: undefined,
              }]
            }
          }
          else if (v === 'union') {
            if (!item.variable_type_detail) {
              item.variable_type_detail = [
                {
                  id: uuid4(),
                  variable_type: undefined,
                  variable_type_detail: undefined,
                },
                {
                  id: uuid4(),
                  variable_type: undefined,
                  variable_type_detail: undefined,
                },
              ]
            }
          }
          else if (v === 'file') {
            // 新增：为file类型初始化子类型
            if (!item.variable_file_type)
              item.variable_file_type = 'default'

            item.variable_type_detail = undefined
          }
          else {
            item.variable_type_detail = undefined
            item.variable_file_type = undefined
            if (v !== 'list')
              item.payload__batch_flag = false
          }
        }
        else {
          item.variable_type_detail = item.variable_type_detail?.map(val => val.id === detailData.id ? { ...val, variable_type: v } : { ...val })
        }
        return false
      }
      return true
    })
    if (!isOutputShape && variableTypeAction === 'file_str' && nodeKind === 'VQA' && _value?.length > 0) {
      if (_value[0]?.variable_type === 'file')
        _value.length === 2 && _value.pop()
      else
        _value = JSON.parse(JSON.stringify(self.current.defaultConfigList || [])).filter(Boolean)
    }
    handleChange(name, _value)
  }

  // 新增：处理file子类型变化的函数
  const paramFileTypeChange = (v, itemData) => {
    const _value = JSON.parse(JSON.stringify(value || [])).filter(Boolean)
    _value?.every((item) => {
      if (item.id === itemData.id) {
        item.variable_file_type = v
        return false
      }
      return true
    })
    handleChange(name, _value)
  }

  const paramKeyChange = (v, itemData, detailData?) => {
    const _value = JSON.parse(JSON.stringify(value || [])).filter(Boolean)
    _value?.every((item) => {
      if (item.id === itemData.id) {
        if (detailData)
          item.variable_type_detail = item.variable_type_detail?.map(val => val.id === detailData.id ? { ...val, variable_name: v } : { ...val })
        else
          item.variable_name = v

        return false
      }
      return true
    })
    handleChange(name, _value)
  }
  const paramListTypeChange = (v, itemData) => {
    const _value = JSON.parse(JSON.stringify(value || [])).filter(Boolean)
    _value?.every((item) => {
      if (item.id === itemData.id) {
        item.variable_list_type = v
        return false
      }
      return true
    })
    handleChange(name, _value)
  }

  const dictTypeAdd = (itemData) => {
    const _value = JSON.parse(JSON.stringify(value || [])).filter(Boolean)
    _value?.every((item) => {
      if (item.id === itemData.id) {
        if (!item.variable_type_detail) {
          item.variable_type_detail = [{
            id: uuid4(),
            variable_name: undefined,
            variable_type: undefined,
            variable_type_detail: undefined,
          }]
        }
        else {
          item.variable_type_detail.push({
            id: uuid4(),
            variable_name: undefined,
            variable_type: undefined,
            variable_type_detail: undefined,
          })
        }
        return false
      }
      return true
    })
    handleChange(name, _value)
  }

  const dictTypeRemove = (itemData, detailData) => {
    const _value = JSON.parse(JSON.stringify(value || [])).filter(Boolean)
    _value?.every((item) => {
      if (item.id === itemData.id) {
        if (item.variable_type_detail.length > 1)
          item.variable_type_detail = item.variable_type_detail.filter(val => val.id !== detailData.id)

        return false
      }
      return true
    })
    handleChange(name, _value)
  }

  const unionTypeAdd = (itemData) => {
    const _value = JSON.parse(JSON.stringify(value || [])).filter(Boolean)
    _value?.every((item) => {
      if (item.id === itemData.id) {
        if (!item.variable_type_detail) {
          item.variable_type_detail = [
            {
              id: uuid4(),
              variable_type: undefined,
              variable_type_detail: undefined,
            },
            {
              id: uuid4(),
              variable_type: undefined,
              variable_type_detail: undefined,
            },
          ]
        }
        else {
          item.variable_type_detail.push({
            id: uuid4(),
            variable_type: undefined,
            variable_type_detail: undefined,
          })
        }
        return false
      }
      return true
    })
    handleChange(name, _value)
  }

  const unionTypeRemove = (itemData, detailData) => {
    const _value = JSON.parse(JSON.stringify(value || [])).filter(Boolean)
    _value?.every((item) => {
      if (item.id === itemData.id) {
        // 确保union类型至少保留2个选项
        if (item.variable_type_detail.length > 2)
          item.variable_type_detail = item.variable_type_detail.filter(val => val.id !== detailData.id)

        return false
      }
      return true
    })
    handleChange(name, _value)
  }

  const portChange = (v, itemData) => {
    const _value = JSON.parse(JSON.stringify(value || [])).filter(Boolean)
    _value?.every((item) => {
      if (item.id === itemData.id) {
        item.variable_port = v
        return false
      }
      return true
    })
    handleChange(name, _value)
  }

  const paramModeChange = (v, itemData) => {
    const _value = JSON.parse(JSON.stringify(value || [])).filter(Boolean)

    _value?.every((item) => {
      if (item.id === itemData.id) {
        item.variable_mode = v
        return false
      }
      return true
    })
    handleChange(name, _value)
  }

  const paramConstChange = (v, itemData) => {
    const _value = JSON.parse(JSON.stringify(value || [])).filter(Boolean)
    _value?.every((item) => {
      if (item.id === itemData.id) {
        item.variable_const = v
        // item.variable_type = 'str'
        return false
      }
      return true
    })
    handleChange(name, _value)
  }
  useEffect(() => {
    if (name === 'config__output_shape' && nodeData?.config__input_shape?.length > 0 && effects)
      handleChange('config__output_shape', nodeData.config__input_shape)
  }, [JSON.stringify(value)])

  function triggerModal() {
    setOpenModal(!openModal)
  }
  const syncBatchParams = () => {
    // 只在批处理画布中执行
    if (!isWarp || name !== 'config__input_shape' || !value?.length)
      return

    // 获取上游节点的参数源形状信息
    const paramSourceShape = (nodeData?.config__input_ports || []).reduce((pre, item) => {
      return [...pre, ...(item?.param_source_shape || [])]
    }, [])
    let hasChanges = false
    const updatedValue = value.map((item, idx) => {
      if (item.variable_type === 'list' && item.payload__batch_flag) {
        const paramSource = paramSourceShape[idx] || {}
        const upstreamListType = paramSource.variable_list_type || 'any'
        if (item.variable_list_type !== upstreamListType) {
          hasChanges = true
          return {
            ...item,
            variable_list_type: upstreamListType,
            id: uuid4(),
          }
        }
      }
      return item
    })

    // 如果有变化，触发更新
    if (hasChanges)
      handleChange(name, updatedValue)
  }

  useEffect(() => {
    if (isWarp && name === 'config__input_shape' && !readOnly)
      syncBatchParams()
  }, [JSON.stringify(value)])

  const batchChange = (v, itemData) => {
    const _value = value?.map((item) => {
      if (item.id === itemData.id) {
        return {
          ...item,
          payload__batch_flag: v === 'true',
        }
      }
      return item
    })
    handleChange(name, _value)
  }

  const isEmpty = useMemo(() => {
    if (!isBatchParmas)
      return valueList.length === 0
    return valueList.filter(item => item.payload__batch_flag).length === 0
  }, [valueList, isBatchParmas])

  return (
    <div className={cn('relative min-h-[32px]')}>
      {(Array.isArray(value) && value.length < variableMax) && !readOnly && !nodeData.isWarpSubModuleStart && <div className={cn(
        'absolute top-[-40px] right-0 z-1',
      )}>
        {
          <BtnAntd
            type="text"
            className="field-item-extra-add-btn"
            onClick={handleAddParam}
          >
            添加{simpleTitle || filedTitle}
            <Icon type="icon-tianjia1" style={{ color: '#0E5DD8' }} />
          </BtnAntd>
        }
      </div>}
      <div>
        {
          valueList.map((item: any, index: number) => {
            if (isBatchParmas && !item.payload__batch_flag)
              return null

            const isCheckSuccess = inputSuccessTags.includes(item.variable_name)
            const isCheckError = inputErrorTags.includes(item.variable_name)
            const errorTag = item.variable_name
            const errorMessage = inputerrorInfo[errorTag]
            const { variable_type: prevType, variable_name: prevName, sourceNodeTitle } = inputChainParams[index] || {}
            const isStartFile = (['__start__'].includes(nodeKind) && item.variable_type === 'file')
            const isConstMode = (item.variable_mode === 'mode-const' && !isOutputShape) // || (item.variable_mode === 'mode-const' && ['file'].includes(item.variable_type) && (!isOutputShape || (isOutputShape && isStartFile)))
            const isChainMode = item.variable_mode === 'mode-line' && !isOutputShape
            const nameReadOnly = typeof item.variable_name_readonly === 'boolean' ? item.variable_name_readonly : typeof variableNameReadOnly === 'boolean' ? variableNameReadOnly : readOnly
            let typeReadOnly = typeof item.variable_type_readonly === 'boolean' ? item.variable_type_readonly : typeof variableTypeReadOnly === 'boolean' ? variableTypeReadOnly : readOnly
            const portReadOnly = typeof item.variable_port_readonly === 'boolean' ? item.variable_port_readonly : typeof variablePortReadOnly === 'boolean' ? variablePortReadOnly : readOnly
            const modeSelectReadOnly = typeof item.variable_mode_select_readonly === 'boolean' ? item.variable_mode_select_readonly : typeof item.variable_mode_readonly === 'boolean' ? item.variable_mode_readonly : typeof variableModeSelectReadOnly === 'boolean' ? variableModeReadOnly : typeof variableModeReadOnly === 'boolean' ? variableModeReadOnly : readOnly
            const modeInputReadOnly = typeof item.variable_mode_input_readonly === 'boolean' ? item.variable_mode_input_readonly : typeof item.variable_mode_readonly === 'boolean' ? item.variable_mode_readonly : typeof variableModeInputReadOnly === 'boolean' ? variableModeReadOnly : typeof variableModeReadOnly === 'boolean' ? variableModeReadOnly : readOnly
            const ifsCanDelete = effects?.includes(EffectType.InputShape_OutputShape_IfsNoFull) ? index >= 2 : true
            const canDelete = (value.length > variableMin) && (!nameReadOnly || item.variable_delete_able) && ifsCanDelete
            // if (isBatchParmas)
            //   modeInputReadOnly = false

            // 获取当前配置的类型选项
            let variable_type_options: { label: string; value: string }[] = []

            // 处理不同的类型选项来源
            // 优先级：节点级别 > 组件级别 > 默认选项
            if (item.variable_type_options?.length) {
              // 使用节点级别定义的类型选项 - 完全尊重节点定义，不添加额外类型
              variable_type_options = item.variable_type_options.map(val => ({ label: val, value: val }))
            }
            else if (currentVariableTypeOptions?.length) {
              // 使用从配置中获取的类型选项
              variable_type_options = currentVariableTypeOptions.map(val => ({ label: val, value: val }))
            }
            else {
              // 只有在使用默认选项时，才确保添加time和multimedia类型
              variable_type_options = [...dataTypeOptions]
              // 确保默认选项中包含time和multimedia类型
              if (!variable_type_options.some(opt => opt.value === 'time'))
                variable_type_options.push({ label: 'time', value: 'time' })

              // if (!variable_type_options.some(opt => opt.value === 'multimedia'))
              //   variable_type_options.push({ label: 'multimedia', value: 'multimedia' })
            }
            const isIndependent = nodeSetmode === 'mode-independent'
            const hasChildConfig = isOutputShape || (!isOutputShape && ['LocalLLM', 'OnlineLLM', 'SharedLLM', 'VQA', 'STT', 'OCR', 'Reader'].includes(nodeKind))
            if (nodeKind === 'VQA') {
              fileTypeOptions = [{ label: 'image', value: 'image' }]
            }
            else if (nodeKind === 'STT') {
              fileTypeOptions = [{ label: 'audio', value: 'audio' }, { label: 'voice', value: 'voice' }]
            }
            else if (nodeKind === 'OCR') {
              if (Array.isArray(item.variable_file_type_list))
                fileTypeOptions = item.variable_file_type_list.map(val => ({ label: val, value: val }))

              else
                fileTypeOptions = [{ label: 'pdf', value: 'pdf' }, { label: 'image', value: 'image' }]
            }
            else if (nodeKind === 'Reader') {
              if (Array.isArray(item.variable_file_type_list))
                fileTypeOptions = item.variable_file_type_list.map(val => ({ label: val, value: val }))

              else
                fileTypeOptions = [{ label: 'pdf', value: 'pdf' }, { label: 'docx', value: 'docx' }, { label: 'csv/xslx', value: 'csv/xslx' }]
            }
            else {
              fileTypeOptions = [
                { label: 'image', value: 'image' },
                { label: 'audio', value: 'audio' },
                { label: 'video', value: 'video' },
                { label: 'voice', value: 'voice' },
                { label: 'docx', value: 'docx' },
                { label: 'pdf', value: 'pdf' },
                { label: 'pptx', value: 'pptx' },
                { label: 'excel/csv', value: 'excel/csv' },
                { label: 'txt', value: 'txt' },
                { label: 'markdown', value: 'markdown' },
                { label: 'code', value: 'code' },
                { label: 'zip', value: 'zip' },
                { label: 'default', value: 'default' },
              ]
            }
            if (effects?.includes(EffectType.InputShape_InputShape_OneType) && index > 0) {
              item.variable_type = valueList[0].variable_type
              typeReadOnly = true
            }

            return (<div
              className={`config-shape-row ${isCheckSuccess ? 'check-success' : isCheckError ? 'check-error' : ''}`}
              key={item.id}
            >
              <div className='config-shape-chunk' style={{ marginLeft: isCheckError ? '20px' : '0' }}>
                {isCheckError && (
                  <div className='args-error-indicator mt-1'>
                    <Tooltip
                      placement="topLeft"
                      title={errorMessage || '参数错误'}
                    >
                      <Icon type="icon-jinggao" style={{ fontSize: '16px', color: '#ff4d4f' }} />
                    </Tooltip>
                  </div>
                )}
                {isIndependent && !isOutputShape && <div className='args-set'>
                  <Select
                    value={item.variable_port}
                    onChange={v => portChange(v, item)}
                    options={inputPortOptions}
                    style={{ width: '100%' }}
                    readOnly={portReadOnly}
                    placeholder='端点'
                  />
                </div>}
                {isWarp && !isOutputShape && <div className='args-set'>
                  <Select
                    value={item.variable_type !== 'list' ? 'false' : (item.payload__batch_flag ? 'true' : 'false')}
                    onChange={v => batchChange(v, item)}
                    options={[
                      { label: '批处理', value: 'true' },
                      { label: '单处理', value: 'false' },
                    ]}
                    style={{ width: '100%' }}
                    readOnly={item.variable_type !== 'list'}
                    placeholder='批处理'
                  />
                </div>}
                {<div className='args-set'>
                  <Input
                    value={item.variable_name}
                    tooltip={item.variable_name_tooltip}
                    onChange={val => paramKeyChange(val, item)}
                    style={{ width: '100p%' }} // item.variable_type === 'dict' ? { width: '73px' } : { width: '130px' }
                    readOnly={nameReadOnly}
                    placeholder='名称'
                  />
                </div>}
                <div className='args-set'>
                  <Select
                    value={item.variable_type}
                    onChange={v => paramTypeChange(v, item)}
                    options={variable_type_options}
                    style={{ width: '100p%' }} // , marginRight: '10px'
                    readOnly={typeReadOnly}
                    placeholder='类型'
                  />
                </div>
                <div className='args-set'>
                  {
                    (!isOutputShape || isStartFile) && <Select
                      value={item.variable_mode}
                      onChange={v => paramModeChange(v, item)}
                      options={['__start__'].includes(nodeKind) ? [{ label: '连线', value: 'mode-line' }] : [{ label: '连线', value: 'mode-line' }, { label: '常量', value: 'mode-const' }]}
                      style={{ width: '100%' }}
                      readOnly={modeSelectReadOnly}
                      placeholder='模式'
                    />
                  }
                </div>
                <div className='args-info'>
                  {
                    isConstMode && <div className='args-input'>
                      {
                        ['file'].includes(item.variable_type) && <div className='args-const'>
                          {
                            <Select
                              value={item.variable_const}
                              onChange={v => paramConstChange(v, item)}
                              options={fileResources?.map(val => ({ label: val.title, value: val.id }))}
                              style={{ width: '100p%' }} // , marginRight: '10px'
                              readOnly={modeInputReadOnly}
                              placeholder='选择文件资源'
                              notFoundContent={<span style={{ fontSize: 13 }}>
                                没有找到文件资源，去
                                <a style={{ color: '#4791f3', cursor: 'pointer' }} onClick={() => {
                                  // trigger add resource action
                                  window.dispatchEvent(new CustomEvent('openResourceTab'))
                                }}>
                                  添加
                                </a>
                              </span>}
                            />
                          }
                        </div>
                      }
                      {
                        ['str'].includes(item.variable_type) && <div className='config-shape-textbox'>
                          <Input
                            readOnly={modeInputReadOnly}
                            value={item.variable_const}
                            onChange={v => paramConstChange(v, item)}
                          />
                          <div className='textbox-space'></div>
                        </div>
                      }
                      {
                        ['int', 'float'].includes(item.variable_type) && <div className='config-shape-textbox'>
                          <InputNumber
                            style={{ width: '100%' }}
                            readOnly={modeInputReadOnly}
                            value={item.variable_const}
                            onChange={v => paramConstChange(v, item)}
                          />
                          <div className='textbox-space'></div>
                        </div>
                      }
                      {
                        ['bool'].includes(item.variable_type) && <div className='config-shape-textbox'>
                          <Switch
                            readOnly={modeInputReadOnly}
                            value={formatValueByType(item.variable_const, ValueType.Boolean, false)}
                            onChange={v => paramConstChange(v, item)}
                          />
                          <div className='textbox-space'></div>
                        </div>
                      }
                    </div>
                  }
                  {
                    isChainMode && <div className='args-chain'>
                      <Tooltip
                        placement="topRight"
                        title={<div>{sourceNodeTitle}{prevName && '·'}<span className='prev-name'>{prevName}</span>{prevType && '·'}{prevType}</div>}
                      >
                        {sourceNodeTitle}{prevName && '·'}<span className='prev-name'>{prevName}</span>{prevType && '·'}{prevType}
                      </Tooltip>
                    </div>
                  }
                </div>
                {
                  item.payload__batch_flag && nodeData.payload__kind === '__start__' && <span className='bg-[#69d17b1f] px-[10px] rounded-[4px]'>批处理</span>
                }
                <div className='args-remove' >
                  {canDelete && <Icon type="icon-shanchu1" style={{ fontSize: '16px' }} onClick={() => !readOnly && handleRemovePort(item.id)} />
                  }</div>

              </div>

              {
                hasChildConfig && <div className='args-output'>
                  {['list'].includes(item.variable_type) && (!typeReadOnly || item.variable_list_type) && <div className='config-shape-chunk supply-cell'>
                    <div className='args-set'></div>
                    <div className='args-set'>
                      <Select
                        value={item.variable_list_type || 'any'}
                        onChange={v => paramListTypeChange(v, item)}
                        style={{ width: '100p%' }}
                        options={childTypeOptions}
                        placeholder='类型'
                        readOnly={typeReadOnly}
                      />
                    </div>
                  </div>}
                  {['file'].includes(item.variable_type) && (!typeReadOnly || item.variable_file_type) && <div className='config-shape-chunk supply-cell'>
                    <div className='args-set'></div>
                    <div className='args-set'>
                      <Select
                        value={item.variable_file_type}
                        onChange={v => paramFileTypeChange(v, item)}
                        style={{ width: '100p%' }}
                        options={fileTypeOptions}
                        placeholder='类型'
                        readOnly={typeReadOnly}
                      />
                    </div>
                  </div>}
                  {['dict'].includes(item.variable_type) && item.variable_type_detail?.map((val, key) => {
                    return <div className='config-shape-chunk supply-cell' key={key}>
                      <div className='args-set'></div>
                      <div className='args-set'>
                        <Input
                          value={val.variable_name}
                          onChange={v => paramKeyChange(v, item, val)}
                          style={{ width: '100p%' }} // item.variable_type === 'dict' ? { width: '73px' } : { width: '130px' }
                          readOnly={typeReadOnly}
                          placeholder='名称'
                        />
                      </div>
                      <div className='args-set'>
                        <Select
                          value={val.variable_type}
                          onChange={v => paramTypeChange(v, item, val)}
                          options={childTypeOptions}
                          style={{ width: '100p%' }} // , marginRight: '10px'
                          readOnly={typeReadOnly}
                          placeholder='类型'
                        />
                      </div>
                      <div className='dict-data-operate'>
                        {!typeReadOnly && <div className='dict-add' onClick={() => dictTypeAdd(item)}>
                          <Icon type="icon-tianjia" style={{ fontSize: '16px' }} />
                        </div>}
                        {!typeReadOnly && item.variable_type_detail.length > 1 && <div className='dict-remove' onClick={() => dictTypeRemove(item, val)}>
                          <Icon type="icon-shanchu1" style={{ fontSize: '16px' }} />
                        </div>}
                      </div>
                    </div>
                  })}
                  {['union'].includes(item.variable_type) && item.variable_type_detail?.map((val, key) => {
                    return <div className='config-shape-chunk supply-cell' key={key}>
                      <div className='args-set'></div>
                      <div className='args-set'>
                        <span style={{ width: '100p%', lineHeight: '32px', paddingLeft: '8px', color: '#666' }}>
                          选项 {key + 1}
                        </span>
                      </div>
                      <div className='args-set'>
                        <Select
                          value={val.variable_type}
                          onChange={v => paramTypeChange(v, item, val)}
                          options={childTypeOptions}
                          style={{ width: '100p%' }}
                          readOnly={typeReadOnly}
                          placeholder='类型'
                        />
                      </div>
                      <div className='dict-data-operate'>
                        {!typeReadOnly && <div className='dict-add' onClick={() => unionTypeAdd(item)}>
                          <Icon type="icon-tianjia" style={{ fontSize: '16px' }} />
                        </div>}
                        {!typeReadOnly && item.variable_type_detail.length > 2 && <div className='dict-remove' onClick={() => unionTypeRemove(item, val)}>
                          <Icon type="icon-shanchu1" style={{ fontSize: '16px' }} />
                        </div>}
                      </div>
                    </div>
                  })}
                </div>
              }
              {
                isConstMode && ['dict', 'list'].includes(item.variable_type) && <div className='config-shape-editor'>
                  <LazyCodeEditor
                    // className="field__code-editor-wrapper"
                    readOnly={modeInputReadOnly}
                    // placeholder={placeholder}
                    title={<TypeSelector
                      options={[{ label: 'Json', value: currentLanguage.json }]}
                      value={'json'}
                      readonly={true}
                      onChange={() => { }}
                    />}
                    language={currentLanguage.json}
                    value={item.variable_const}
                    onChange={v => paramConstChange(v, item)}
                    beautifyJSON={false}
                  />
                  <div className='code-editor-space'></div>
                </div>
              }
              {
                isConstMode && ['any'].includes(item.variable_type) && <div className='config-shape-textbox'>
                  <LazyTextEditor
                    readonly={modeInputReadOnly}
                    value={item.variable_const}
                    title=''
                    onChange={v => paramConstChange(v, item)}
                  />
                  <div className='textbox-space'></div>
                </div>
              }
              {(item.warn_text || isCheckError) && (
                <div className={`config-shape-check ${item.check_result ? 'check-success' : 'check-failed'}`}>
                  {item.warn_text || (isCheckError ? errorMessage : '')}
                </div>
              )}
            </div>
            )
          })
        }
        {isEmpty && <span style={{ display: 'inline-block', marginLeft: 8, lineHeight: '32px' }}>无</span>}

        {/* 循环分支输入输出参数验证提示 */}
        {(() => {
          // 只在循环分支的输出参数配置中显示
          if (nodeData?.payload__kind !== 'Loop' || name !== 'config__output_shape')
            return null

          const inputParams = nodeData?.config__input_shape || []
          const outputParams = Array.isArray(value) ? value : []

          // 确保输入参数是数组
          const safeInputParams = Array.isArray(inputParams) ? inputParams : []

          // 检查参数一致性
          let isValid = true
          let message = ''

          if (safeInputParams.length !== outputParams.length) {
            isValid = false
            message = '输入输出参数数量不一致'
          }
          else {
            for (let i = 0; i < safeInputParams.length; i++) {
              const inputParam = safeInputParams[i]
              const outputParam = outputParams[i]

              if (inputParam?.variable_name !== outputParam?.variable_name) {
                isValid = false
                message = `参数名称不一致：输入参数 "${inputParam?.variable_name}" 与输出参数 "${outputParam?.variable_name}" 不匹配`
                break
              }

              if (inputParam?.variable_type !== outputParam?.variable_type) {
                isValid = false
                message = `参数类型不一致：参数 "${inputParam?.variable_name}" 的输入类型 "${inputParam?.variable_type}" 与输出类型 "${outputParam?.variable_type}" 不匹配`
                break
              }
            }
          }

          // 只显示错误提示
          if (!isValid) {
            return (
              <div style={{
                color: '#ff4d4f',
                fontSize: '12px',
                marginTop: '8px',
                paddingLeft: '8px',
                lineHeight: '16px',
              }}>
                输入输出参数需一一对应，确保名称与类型一致
              </div>
            )
          }

          return null
        })()}
      </div>
    </div>
  )
}

export default ConfigShape
