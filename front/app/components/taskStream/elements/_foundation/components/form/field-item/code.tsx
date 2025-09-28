'use client'
import type { FC } from 'react'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import type { FieldItemProps } from '../types'
import { ValueType, formatValueByType } from './utils'
import CodeAiModal from './code-ai-modal'
import { LazyCodeEditor, LazyTextEditor } from '@/app/components/taskStream/elements/_foundation/components/editor'

import TypeSelector from '@/app/components/taskStream/elements/_foundation/components/picker'
import { currentLanguage as currentLanguageEnum } from '@/app/components/taskStream/elements/script/types'
import { usePermitContext } from '@/shared/hooks/permit-context'
import Icon from '@/app/components/base/iconFont'
import './code.scss'
import { canParseJSON } from '@/shared/utils'

const currentLanguages = [
  {
    label: 'Python3',
    value: currentLanguageEnum.python3,
  },
  {
    label: 'JavaScript',
    value: currentLanguageEnum.javascript,
  },
  {
    label: 'Sql',
    value: currentLanguageEnum.sql,
  },
  {
    label: 'Json',
    value: currentLanguageEnum.json,
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
  LanguageType, // 无需修改表单当前 code_language_name 时, 传入 LanguageType, eg: JSONEditor
  code_language_options, // 设置可选的语言，eg：[{ label: 'python', value: LanguageType.python3 }]
  code_language_name, // language多选的情况下，可以设置选中的语言对应的key，语言更新时通过onChange回调更新
  beautifyJSON, // language选中json时，是否美化json字符串
  itemProps = {},
  ai_hidden = true,
}) => {
  const isNodeEnv = !!nodeId
  const inputs = nodeData || resourceData || {}
  const code_language_key = code_language_name || 'payload__code_language'
  const currentOptions = code_language_options || currentLanguages
  const currentLanguage = LanguageType || inputs[code_language_key] || currentLanguageEnum.python3
  const isPlainObject = value => value && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === Array.prototype)
  const value = (currentLanguage === 'json' && isPlainObject(_value)) ? JSON.stringify(_value, null, 2) : formatValueByType(_value, ValueType.String)
  const { statusAi } = usePermitContext()
  // AI模态框状态
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)

  useEffect(() => {
    if (!currentLanguage)
      onChange && onChange(code_language_key, currentOptions[0]?.value || currentLanguageEnum.python3)
  }, [currentLanguage, code_language_key, currentOptions, onChange])

  const handleLanguageTypeChange = (_language) => {
    onChange && onChange(code_language_key, _language)
  }

  const handleCodeChange = useCallback((_value) => {
    if (!onChange)
      return
    if (currentLanguage === 'json' && formatType === 'json' && formatName) {
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
  }, [name, formatName, formatType, onChange, currentLanguage])

  // AI生成的代码应用到编辑器
  const handleApplyAiCode = useCallback((aiCode: string) => {
    handleCodeChange(aiCode)
  }, [handleCodeChange])

  // 创建AI按钮组件
  const aiButton = useMemo(() => {
    if (readOnly || currentLanguage === 'text')
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
  }, [readOnly, currentLanguage])

  return (
    <>
      {currentLanguage === 'text'
        ? (
          <LazyTextEditor
            inWorkflow={isNodeEnv}
            title={title || (
              <TypeSelector
                options={currentOptions}
                value={currentLanguage}
                readonly={readOnly}
                onChange={handleLanguageTypeChange}
              />
            )}
            value={value}
            onChange={handleCodeChange}
            placeholder={placeholder}
            headerRight={(
              <div className='flex items-center h-full'>
                <div className='text-xs font-medium text-gray-500'>{value?.length || 0}</div>
                <div className='mx-3 h-3 w-px bg-gray-200'></div>
              </div>
            )}
            readonly={readOnly}
            minHeight={200}
            {...itemProps}
          />
        )
        : (
          <LazyCodeEditor
            inWorkflow={isNodeEnv}
            className="field__code-editor-wrapper"
            readOnly={readOnly}
            placeholder={placeholder}
            title={title || (
              <TypeSelector
                options={currentOptions}
                value={currentLanguage}
                readonly={readOnly}
                onChange={handleLanguageTypeChange}
              />
            )}
            language={currentLanguage}
            value={value}
            onChange={handleCodeChange}
            beautifyJSON={currentLanguage === currentLanguageEnum.json && beautifyJSON}
            headerRight={(statusAi && !ai_hidden) ? aiButton : null}
            {...itemProps}
          />
        )}

      {/* AI模态框 */}
      <CodeAiModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onApply={handleApplyAiCode}
        currentCode={value}
        language={currentLanguage}
      />
    </>
  )
}

export const JsonEditor = React.memo((props) => {
  const code_language_options = useMemo(() => ([{ label: 'Json', value: currentLanguageEnum.json }]), [])
  return <FieldItem code_language_options={code_language_options} currentLanguage={currentLanguageEnum.json} {...props} />
})
export default React.memo(FieldItem)
