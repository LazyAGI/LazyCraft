'use client'
import type { FC } from 'react'
import React, { useEffect, useRef, useState } from 'react'
import { Divider, Form } from 'antd'
import cn from 'classnames'
import { cloneDeep } from 'lodash-es'
import { type FieldProps, LabelStyle } from './types'
import InjectableCheckbox from './components/injectable-checkbox'
import './index.scss'
import { FieldType } from './fixed-vals'

const FragmentComponent = ({ children }) => {
  return (<>{children}</>)
}

// 默认采用title样式标题的list
// const titleStyledLabelFieldTypes: string[] = [
//   FieldType.config__input_ports,
//   FieldType.config__input_shape,
//   FieldType.config__output_ports,
//   FieldType.config__output_shape,
// ]
const inputOrOutputFieldLabelMap = {
  [FieldType.config__input_shape]: '输入参数',
  [FieldType.config__input_ports]: '输入端点',
  [FieldType.config__output_shape]: '输出参数',
  [FieldType.config__output_ports]: '输出端点',
}

/** 包裹表单项，属性包含antd Form.Item的属性，主要处理表单样式等 */
const Field: FC<FieldProps> = ({
  type,
  name,
  value,
  className,
  required,
  requiredMessage,
  label,
  labelStyle = LabelStyle.title,
  tooltip,
  children,
  desc,
  rules,
  shouldValidate = true,
  nodeId,
  nodeData,
  fieldProps,
}) => {
  const form = Form.useFormInstance() // 获取当前form实例
  const currentValue = Form.useWatch(name, form) // 该方法可以监听form.setFieldsValue以及用户输入操作触发的表单值变化
  const cachedValueRef = useRef<any>(currentValue)
  // const useTitleStyledLabel = labelStyle === LabelStyle.title || titleStyledLabelFieldTypes.includes(type as string)
  const useTitleStyledLabel = labelStyle === LabelStyle.title
  // tips：注意若是画布表单，需要传入nodeId和nodeData，否则无法获取及展示对应的表单校验错误信息
  const currentConfig = nodeData?.config__parameters?.find(child =>
    name && (
      (type && child?.name === name && child?.type === type) || child?._check_names?.includes(name)
    ),
  )
  const [errorMessage, setErrorMessage] = useState<any>('')

  useEffect(() => {
    checkAndUpdateErrorMsgFromConfig()
  }, [currentConfig?._error_message])

  function checkAndUpdateErrorMsgFromConfig() {
    // 监听当前节点表单的错误信息
    if (nodeId) {
      const errorMsgFromConfig = currentConfig?._check_names?.length
        ? currentConfig?._error_message?.indexOf(name) > -1
          ? currentConfig?._error_message
            ?.match(new RegExp(`\{${name}\}[^\{\},]+,?`))?.[0]?.replace(/\{[^\{\}]+\}/g, '此项')?.replace(/,/g, '')
          : ''
        : currentConfig?._error_message

      if ((errorMsgFromConfig || '') !== (errorMessage || ''))
        setErrorMessage(errorMsgFromConfig || '')
    }
  }

  useEffect(() => {
    if (!form || !name)
      return
    
    // 避免在用户正在输入时干扰表单状态
    const activeElement = document.activeElement
    const isUserTyping = activeElement && (
      activeElement.tagName === 'INPUT' || 
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.contentEditable === 'true' ||
      activeElement.closest('.ant-input') ||
      activeElement.closest('.custom-input')
    )
    
    if (isUserTyping) {
      return // 用户正在输入时，不干扰表单状态
    }
    
    // value值发生更新时，将新值更新到表单数据，同时做表单校验
    if (typeof value === 'object' && value !== null) {
      if (JSON.stringify(cachedValueRef.current) !== JSON.stringify(value)) {
        const currentValue = cloneDeep(value)
        cachedValueRef.current = currentValue
        form.setFieldValue(name, currentValue)
        // 延迟验证，避免干扰用户输入
        setTimeout(() => {
          shouldValidate && form.validateFields([name])
        }, 200)
      }
    }
    else if (cachedValueRef.current !== value) {
      cachedValueRef.current = value
      form.setFieldValue(name, value)
      // 延迟验证，避免干扰用户输入
      setTimeout(() => {
        shouldValidate && form.validateFields([name])
      }, 200)
    }
  }, [value, name, shouldValidate, form])

  const getRequiredMessage = () => {
    return requiredMessage || '此项为必填项'
  }
  return (
    <Form.Item
      name={name}
      label={(label || Object.keys(inputOrOutputFieldLabelMap).includes(type as string))
        ? (
          <>
            <span className={cn(
              'field-item-label',
              {
                'title-styled-label': useTitleStyledLabel,
              },
            )}>
              {useTitleStyledLabel && (
                <Divider type="vertical" className="title-divider" />
              )}
              {label || inputOrOutputFieldLabelMap[type as string]}
            </span>
            {nodeId && <InjectableCheckbox nodeId={nodeId} nodeData={nodeData} name={name} type={type} />}
          </>
        )
        : undefined}
      className={cn('field-item', className, {
        'is-input-or-output-field': Object.keys(inputOrOutputFieldLabelMap).includes(type as string),
      })}
      tooltip={tooltip}
      help={nodeId ? errorMessage : undefined}
      validateStatus={(nodeId && errorMessage) ? 'error' : undefined}
      validateTrigger={['onChange', 'onBlur']}
      extra={desc ? <div className='leading-[18px] mt-1 text-xs font-normal text-gray-600'>{desc}</div> : undefined}
      rules={
        (required && !rules?.find((item: any) => item?.required))
          ? [...(rules || []), { required: true, message: getRequiredMessage() }]
          : rules
      }
      {...fieldProps}
    >
      {/* 统一包一层FragmentComponent，隔离antd Form.Item自动透传onChange和value，在具体组件中手动添加onChange和value */}
      <FragmentComponent>{children}</FragmentComponent>
    </Form.Item>
  )
}
export default Field
