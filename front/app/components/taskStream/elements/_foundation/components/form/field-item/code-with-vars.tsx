'use client'
import type { FC } from 'react'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import type { FieldItemProps } from '../types'
import { ValueType, formatValueByType } from './utils'
import CodeAiModal from './code-ai-modal'
import { LazyTextEditor, LazyVarEditor } from '@/app/components/taskStream/elements/_foundation/components/editor'
import TypeSelector from '@/app/components/taskStream/elements/_foundation/components/picker'
import { currentLanguage } from '@/app/components/taskStream/elements/script/types'
import Icon from '@/app/components/base/iconFont'
import { useCurrentNodeInputVars } from '@/app/components/taskStream/elements/_foundation/hooks/gain-part-detail'
import './code.scss'
import { canParseJSON } from '@/shared/utils'

const currentLanguages = [
  {
    label: 'Python3',
    value: currentLanguage.python3,
  },
  {
    label: 'JavaScript',
    value: currentLanguage.javascript,
  },
  {
    label: 'Sql',
    value: currentLanguage.sql,
  },
  {
    label: 'Json',
    value: currentLanguage.json,
  },
  {
    label: 'text',
    value: 'text',
  },
]

const FieldItem: FC<Partial<FieldItemProps>> = ({
  title,
  name,
  value: _value = '',
  readOnly,
  placeholder,
  onChange,
  nodeId,
  nodeData,
  resourceData,
  formatType = 'json',
  formatName, // json 格式同步转换的name
  currentLanguage, // 无需修改表单当前 code_language_name 时, 传入 currentLanguage, eg: JSONEditor
  code_language_options, // 设置可选的语言，eg：[{ label: 'python', value: currentLanguage.python3 }]
  code_language_name, // language多选的情况下，可以设置选中的语言对应的key，语言更新时通过onChange回调更新
  beautifyJSON, // language选中json时，是否美化json字符串
  itemProps = {},
  ai_ability = true,
}) => {
  const isNodeEnv = !!nodeId
  const inputs = nodeData || resourceData || {}
  const code_language_key = code_language_name || 'payload__code_language'
  const currentOptions = code_language_options || currentLanguages
  const currentLanguageValue = currentLanguage || inputs[code_language_key]
  const isPlainObject = value => value && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === Array.prototype)
  const value = (currentLanguageValue === 'json' && isPlainObject(_value)) ? _value : formatValueByType(_value, ValueType.String)

  // AI模态框状态
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)

  // 获取当前节点的输入参数
  const { inputVars } = useCurrentNodeInputVars(nodeId || '')

  // 转换 inputVars 为 CodeEditor 期望的格式
  const formattedVars = useMemo(() => {
    if (!inputVars || !Array.isArray(inputVars))
      return []

    // 如果 inputVars 已经是正确的格式（包含 nodeId, title, vars），直接返回
    if (inputVars.length > 0 && (inputVars[0] as any)?.nodeId && (inputVars[0] as any)?.title && (inputVars[0] as any)?.vars)
      return inputVars

    // 否则，将变量数组转换为正确的格式
    return [{
      nodeId: nodeId || 'current',
      title: nodeData?.title || '当前节点',
      vars: inputVars as any,
      isEntryNode: false,
    }]
  }, [inputVars, nodeId, nodeData])

  // 变量列表状态
  const [varList, setVarList] = useState<any[]>([])

  useEffect(() => {
    if (!currentLanguageValue)
      onChange && onChange(code_language_key, currentOptions[0]?.value || 'python3')
  }, [currentLanguageValue, code_language_key, currentOptions, onChange])

  const handlecurrentLanguageChange = (_language) => {
    onChange && onChange(code_language_key, _language)
  }

  const handleCodeChange = useCallback((_value) => {
    if (!onChange)
      return
    if (currentLanguageValue === 'json' && formatType === 'json' && formatName) {
      // json格式使用formatName作为payload
      let formatValue = {}
      try {
        if (canParseJSON(_value))
          formatValue = JSON.parse(_value)
        else
          formatValue = _value
      }
      catch (err) {
        formatValue = {}
      }
      onChange({
        [name]: _value,
        [formatName]: formatValue,
      })
    }
    else if (formatName) {
      // 非json编辑但存在formatName的情况, 例如 同字段编辑 text 和 json 切换, 为保证name统一, 使用formatName作为payload
      onChange({
        [name]: _value,
        [formatName]: _value,
      })
    }
    else {
      onChange(name, _value)
    }
  }, [name, formatName, formatType, onChange, currentLanguageValue])

  // AI生成的代码应用到编辑器
  const handleApplyAiCode = useCallback((aiCode: string) => {
    handleCodeChange(aiCode)
  }, [handleCodeChange])

  // 处理变量添加
  const handleAddVar = useCallback((newVar: any) => {
    setVarList(prev => [...prev, newVar])
  }, [])

  // 创建AI按钮组件
  const aiButton = useMemo(() => {
    if (readOnly || currentLanguageValue === 'text')
      return null

    return (
      <div
        className="flex items-center h-full cursor-pointer hover:bg-gray-100 px-2 rounded transition-colors"
        onClick={() => setIsAiModalOpen(true)}
        title="AI代码生成"
      >
        <Icon type="icon-AIshengcheng1" style={{ fontSize: 16, color: '#1890ff' }} />
      </div>
    )
  }, [readOnly, currentLanguageValue])

  return (
    <>
      {currentLanguageValue === 'text'
        ? (
          <LazyTextEditor
            inWorkflow={isNodeEnv}
            title={title || (
              <TypeSelector
                options={currentOptions}
                value={currentLanguageValue}
                readonly={readOnly}
                onChange={handlecurrentLanguageChange}
              />
            )}
            value={value}
            onChange={handleCodeChange}
            placeholder={placeholder}
            headerRight={ai_ability
              ? (
                <div className='flex items-center h-full'>
                  <div className='text-xs font-medium text-gray-500'>{value?.length || 0}</div>
                  <div className='mx-3 h-3 w-px bg-gray-200'></div>
                </div>
              )
              : null}
            readonly={readOnly}
            minHeight={200}
            {...itemProps}
          />
        )
        : (
          <LazyVarEditor
            inWorkflow={isNodeEnv}
            className="field__code-editor-wrapper"
            readOnly={readOnly}
            placeholder={placeholder}
            title={title || (
              <TypeSelector
                options={currentOptions}
                value={currentLanguageValue}
                readonly={readOnly}
                onChange={handlecurrentLanguageChange}
              />
            )}
            language={currentLanguageValue}
            value={value}
            onChange={handleCodeChange}
            beautifyJSON={currentLanguageValue === currentLanguage?.json && beautifyJSON}
            headerRight={ai_ability ? aiButton : null}
            availableVars={formattedVars}
            varList={varList}
            onAddVar={handleAddVar}
            {...itemProps}
          />
        )}

      {/* AI模态框 */}
      <CodeAiModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onApply={handleApplyAiCode}
        currentCode={value}
        language={currentLanguageValue}
      />
    </>
  )
}

export default React.memo(FieldItem)
