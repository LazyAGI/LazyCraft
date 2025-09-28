'use client'
import type { FC } from 'react'
import React, { useRef } from 'react'
import { Form } from 'antd'
import type { FieldItemProps } from '../../types'
import { CUSTOM_RESOURCE_CATEGORY_ALIAS_MAP } from './constant'
import { ResourceSelectorComponentMap } from '@/app/components/taskStream/resources/constants'
import { ResourceClassificationEnum } from '@/app/components/taskStream/resource-type-selector/types'
import './index.scss'

const FieldItem: FC<Partial<FieldItemProps>> = ({
  type,
  name,
  value,
  disabled,
  readOnly,
  placeholder,
  onChange,
  itemProps,
  onSelect,
  resourceId,
  ...rest
}) => {
  // 是否多选
  const { multiple = false } = itemProps || {}
  const resourceType = type ? type.replace('_resource_selector', '') : undefined
  const isCustomResource = resourceType && !!CUSTOM_RESOURCE_CATEGORY_ALIAS_MAP[resourceType]
  const formInstance = Form.useFormInstance()
  const isProcessingRef = useRef<boolean>(false)

  // 支持多种工具类型的选择器
  const getResourceSelector = () => {
    if (!resourceType)
      return undefined

    if (isCustomResource)
      return ResourceSelectorComponentMap[ResourceClassificationEnum.Custom]

    // 对于工具类型，使用通用的工具选择器，支持工具和MCP工具
    if (resourceType === 'tool' || resourceType === 'mcp')
      return ResourceSelectorComponentMap.tool // 使用工具选择器，它会同时显示工具和MCP工具

    return ResourceSelectorComponentMap[resourceType.replace(/_/g, '-')]
  }

  const ResourceSelector = getResourceSelector()

  const handleSelect = (resourceId: any, resourceItem: any) => {
    // 防止重复处理
    if (isProcessingRef.current) {
      console.warn('ResourceSelector: 正在处理中，跳过重复调用')
      return
    }

    // 防止在没有资源项时继续执行
    if (!resourceItem && resourceId) {
      console.warn('ResourceSelector: resourceId 存在但 resourceItem 为空')
      return
    }

    isProcessingRef.current = true

    try {
      onSelect && onSelect(resourceItem)

      if ('linkageObj' in rest && !multiple) {
        const obj = rest.linkageObj
        if (resourceId && resourceItem) {
          // 先更新 onChange，再重置字段和触发事件，避免循环
          const newValue = {
            [name]: resourceId,
            [obj.key]: undefined, // 先清空关联字段
          }

          // 立即更新表单值
          onChange && onChange(newValue)

          // 异步处理关联逻辑，避免阻塞主流程
          setTimeout(() => {
            try {
              formInstance.resetFields([obj.key])
              const optionValue = resourceItem?.data?.[obj.insertKeyFromValueKey]
                ?.filter(el => !!el.name)
                ?.map(el => ({ label: el.name, value: el.key })) || []

              window.dispatchEvent(new CustomEvent('changeSelectOptionsKey', {
                detail: {
                  key: obj.key,
                  value: optionValue,
                },
              }))
            }
            catch (error) {
              console.error('ResourceSelector: 处理联动逻辑时出错', error)
            }
            finally {
              isProcessingRef.current = false
            }
          }, 100) // 增加延迟时间
        }
        else {
          // 清空逻辑
          onChange && onChange({
            [name]: resourceId,
            [obj.key]: undefined,
          })

          setTimeout(() => {
            try {
              formInstance.resetFields([obj.key])
              window.dispatchEvent(new CustomEvent('changeSelectOptionsKey', {
                detail: {
                  key: obj.key,
                  value: [],
                },
              }))
            }
            catch (error) {
              console.error('ResourceSelector: 清空联动逻辑时出错', error)
            }
            finally {
              isProcessingRef.current = false
            }
          }, 100)
        }
      }
      else {
        onChange && onChange({
          [name]: resourceId,
          [`${name}_name`]: resourceItem?.name,
        })
        isProcessingRef.current = false
      }
    }
    catch (error) {
      console.error('ResourceSelector: handleSelect 出错', error)
      isProcessingRef.current = false
    }
  }

  return ResourceSelector
    ? (
      <ResourceSelector
        value={value}
        multiple={multiple}
        requiredFilterKey={rest?.requiredFilterKey}
        category={(isCustomResource && resourceType) ? CUSTOM_RESOURCE_CATEGORY_ALIAS_MAP[resourceType] : undefined}
        onSelect={handleSelect}
        placeholder={placeholder}
        placement='bottom-start'
        disabled={disabled}
        readOnly={readOnly}
        resourceId={resourceId}
      />
    )
    : null
}

export default React.memo(FieldItem)
