'use client'

import type { FC } from 'react'
import React, { useEffect, useState } from 'react'
import {PlusOutlined} from '@ant-design/icons'
import { Input, Select, Tooltip } from 'antd'
import { v4 as uuid4 } from 'uuid'
import type { FieldItemProps } from '../../types'
import type { ValidationError, WhileLoopCondition } from './types'
import { validateCondition } from './validator'
import IconFont from '@/app/components/base/iconFont'
import Button from '@/app/components/base/click-unit'
import cn from '@/shared/utils/classnames'
import './index.scss'

const OPTIONS = [
  { name: '<', value: '<' },
  { name: '<=', value: '<=' },
  { name: '==', value: '==' },
  { name: '!=', value: '!=' },
  { name: '>', value: '>' },
  { name: '>=', value: '>=' },
]

const WhileLoopComponent: FC<Partial<FieldItemProps & { variableOptions?: { name: string; value: string }[] }>> = ({
  disabled,
  readOnly,
  onChange,
  name,
  value: conditions = [],
  onValidate, // 新增验证回调
  variableOptions = [],
  nameSet = new Set<string>(),
}) => {
  const [errors, setErrors] = useState<ValidationError[]>([])

  // 验证逻辑
  const validate = (currentConditions: WhileLoopCondition[]) => {
    if (!Array.isArray(currentConditions))
      return []

    return currentConditions.reduce((acc: ValidationError[], condition: WhileLoopCondition) => {
      return [...acc, ...validateCondition(condition, nameSet)]
    }, [])
  }

  const nameSetId = Array.from(nameSet).join(',')

  useEffect(() => {
    const validationErrors = validate(conditions)
    setErrors(validationErrors)

    // 向外层FieldItem报告验证状态
    onValidate?.({
      validateStatus: validationErrors.length > 0 ? 'error' : 'success',
      help: validationErrors.map(error => error.message).join('; '),
      errors: validationErrors,
    })
  }, [conditions, onValidate, nameSetId])

  const handleAdd = (type?: 'and' | 'or') => {
    const newCondition: WhileLoopCondition = {
      id: uuid4(),
      variable_name: '',
      value: '',
      operator: '',
    }

    if (type)
      newCondition.conjunction = type

    onChange?.(name, [...conditions, newCondition])
  }

  const handleDelete = (id: string) => {
    onChange?.(name, conditions.filter(item => item.id !== id))
  }

  const handleInputChange = (id: string, key: string, value: string) => {
    onChange?.(name, conditions.map(item => item.id === id ? { ...item, [key]: value } : item))
  }

  const onOperatorSelect = (id: string, value: string) => {
    onChange?.(name, conditions.map(item => item.id === id ? { ...item, operator: value } : item))
  }

  const onVariableNameSelect = (id: string, value: string) => {
    onChange?.(name, conditions.map(item => item.id === id ? { ...item, variable_name: value } : item))
  }

  const isEmpty = conditions.length === 0
  const showAnd = conditions.length <= 1 || conditions.some(item => item.conjunction === 'and')
  const showOr = conditions.length <= 1 || conditions.some(item => item.conjunction === 'or')
  const canDelete = (id: string) => conditions.length <= 1 || id !== conditions[0].id

  return (
    <div>
      <div className="leading-[18px] text-xs font-normal text-text-tertiary">
        用于定义 while-loop 满足的逻辑条件
      </div>
      <div>
        {conditions.map(item => (
          <div key={item.id}>
            <div className={cn('group relative py-1 px-0 min-h-[40px] rounded-[10px] bg-components-panel-bg')}>
              <div className={cn('relative flex ml-1 leading-4 text-[13px] font-semibold text-text-secondary')}>
                <div className={cn('flex items-center justify-between pl-[10px] pr-[16px] min-w-[10%] mt-1')}>
                  {item.conjunction?.toUpperCase()}
                </div>
                <div className={cn('flex flex-1 items-center justify-between pl-[10px] pr-[30px] gap-2 mt-1')}>
                  <div className="flex-1">
                    <Tooltip
                      open={errors?.[0]?.id === item.id && errors?.[0]?.field === 'variable_name'}
                      title={errors.find(e => e.id === item.id && e.field === 'variable_name')?.message}
                      color="#ff4d4f"
                    >
                      <Select
                        status={errors.some(e => e.id === item.id && e.field === 'variable_name') ? 'error' : undefined}
                        style={{ width: '100%' }}
                        options={variableOptions}
                        value={item.variable_name}
                        placeholder="请选择变量名"
                        onSelect={v => onVariableNameSelect(item.id, v)} />
                    </Tooltip>
                  </div>
                  <div className="flex-1">
                    <Tooltip
                      open={errors?.[0]?.id === item.id && errors?.[0]?.field === 'operator'}
                      title={errors.find(e => e.id === item.id && e.field === 'operator')?.message}
                      color="#ff4d4f"
                    >
                      <Select
                        status={errors.some(e => e.id === item.id && e.field === 'operator') ? 'error' : undefined}
                        style={{ width: '100%' }}
                        options={OPTIONS}
                        value={item.operator}
                        placeholder="请选择运算符"
                        onSelect={v => onOperatorSelect(item.id, v)}
                      />
                    </Tooltip>
                  </div>
                  <div className="flex-1">
                    <Tooltip
                      open={errors?.[0]?.id === item.id && errors?.[0]?.field === 'value'}
                      title={errors.find(e => e.id === item.id && e.field === 'value')?.message}
                      color="#ff4d4f"
                    >
                      <Input
                        status={errors.some(e => e.id === item.id && e.field === 'value') ? 'error' : undefined}
                        style={{ width: '100%' }}
                        value={item.value}
                        onChange={e => handleInputChange(item.id, 'value', e.target.value)}
                        placeholder="值"
                      />
                    </Tooltip>
                  </div>
                  <Button
                    className="hover:text-components-button-Terminate-ghost-text"
                    size="small"
                    variant="ghost"
                    disabled={readOnly || disabled || !canDelete(item.id)}
                    onClick={() => handleDelete(item.id)}
                  >
                    <IconFont type='icon-shanchu1' className="mr-1 w-3.5 h-3.5" />
                    {'移除'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
        <div className="px-4 py-2">
          {isEmpty && (
            <Button
              className="w-full mb-2"
              variant="tertiary"
              onClick={() => handleAdd()}
              disabled={readOnly || disabled}
            >
              <PlusOutlined className="mr-1 w-4 h-4" />
            </Button>
          )}
          {!isEmpty && showAnd && (
            <Button
              className="w-full mb-2"
              variant="tertiary"
              onClick={() => handleAdd('and')}
              disabled={readOnly || disabled}
            >
              <PlusOutlined className="mr-1 w-4 h-4" />
              AND
            </Button>
          )}
          {!isEmpty && showOr && (
            <Button
              className="w-full"
              variant="tertiary"
              onClick={() => handleAdd('or')}
              disabled={readOnly || disabled}
            >
              <PlusOutlined className="mr-1 w-4 h-4" />
              OR&nbsp;&nbsp;
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default React.memo(WhileLoopComponent)
