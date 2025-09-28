'use client'
import type { FC } from 'react'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Form, Typography } from 'antd'
import classNames from 'classnames'
import { uniqBy } from 'lodash'
import type { FieldItemProps } from '../types'
import { Select } from '@/app/components/taskStream/elements/_foundation/components/form/base'
import { get, post } from '@/infrastructure/api/base'
import { useResources } from '@/app/components/taskStream/logicHandlers/resStore'

const SelectComponent: FC<Partial<FieldItemProps>> = ({
  name,
  label,
  value,
  options = [],
  optionsTip,
  placeholder,
  disabled,
  readOnly,
  allowClear = true,
  options_fetch_api,
  options_fetch_method = 'get',
  options_fetch_params,
  options_keys,
  filterOptions,
  echoOptionsLinkageObj,
  onChange,
  itemProps = {},
}) => {
  const { className, ...restProps } = itemProps
  const [optionsData, setOptionsData] = useState<any[]>(options || [])
  const fetchApiCalled = useRef<boolean>(false)
  const isUpdatingRef = useRef<boolean>(false)
  const lastProcessedResourceRef = useRef<string>('')
  const eventListenerRef = useRef<((e: any) => void) | null>(null)
  const { resources: allResourceList } = useResources()
  const formInstance = Form.useFormInstance()

  // 使用 useMemo 来稳定 echoOptionsLinkageObj 的引用
  const stableEchoOptionsLinkageObj = useMemo(() => {
    if (!echoOptionsLinkageObj)
      return null

    return {
      formKey: echoOptionsLinkageObj.formKey,
      getValueKey: echoOptionsLinkageObj.getValueKey,
      type: echoOptionsLinkageObj.type,
    }
  }, [
    echoOptionsLinkageObj?.formKey,
    echoOptionsLinkageObj?.getValueKey,
    echoOptionsLinkageObj?.type,
  ])

  // 使用 useCallback 来避免闭包陷阱
  const handleChangeSelectOptionsKey = useCallback((e: any) => {
    if (e.detail && name === e.detail.key && !isUpdatingRef.current) {
      isUpdatingRef.current = true

      // 使用函数式更新，避免依赖外部状态
      setOptionsData((prevOptions) => {
        const newOptions = uniqBy([...prevOptions, ...e.detail.value], 'value')

        // 使用 setTimeout 来异步重置标志
        setTimeout(() => {
          isUpdatingRef.current = false
        }, 50)

        return newOptions
      })
    }
  }, [name])

  // 组件挂载时添加事件监听器
  useEffect(() => {
    eventListenerRef.current = handleChangeSelectOptionsKey
    window.addEventListener('changeSelectOptionsKey', handleChangeSelectOptionsKey)

    // 清理函数
    return () => {
      if (eventListenerRef.current) {
        window.removeEventListener('changeSelectOptionsKey', eventListenerRef.current)
        eventListenerRef.current = null
      }
    }
  }, [handleChangeSelectOptionsKey])

  // 将获取选项的逻辑抽取为独立的函数
  const fetchOptionsList = useCallback(() => {
    if (!options_fetch_api)
      return Promise.resolve([])

    const method = options_fetch_method?.toLowerCase() || 'get'
    const params = options_fetch_params || {}
    return method === 'get' ? get(options_fetch_api) : post(options_fetch_api, { body: params })
  }, [options_fetch_api, options_fetch_method, options_fetch_params])

  // 处理 API 请求的 useEffect
  useEffect(() => {
    if (options_fetch_api && !fetchApiCalled.current && !isUpdatingRef.current) {
      fetchApiCalled.current = true
      isUpdatingRef.current = true

      fetchOptionsList().then((res: any) => {
        const data = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : res?.list
        if (options_keys?.length) {
          const currentOptions = data
            ?.filter((item: any) => typeof item[options_keys[0]] !== 'undefined')
            ?.filter((item: any) => filterOptions
              ? Array.isArray(filterOptions)
                ? filterOptions.every(optionItem => typeof item[optionItem?.key] !== 'undefined'
                  ? item[optionItem?.key] === optionItem?.value
                  : true,
                )
                : typeof item[filterOptions?.key] !== 'undefined'
                  ? item[filterOptions?.key] === filterOptions?.value
                  : true
              : true,
            )
            ?.map((item: any) => {
              const value = item[options_keys[0]]
              const label = item[options_keys[1]]
              return { value, label }
            }) || []

          setOptionsData(currentOptions)
        }
        else {
          setOptionsData(data || [])
        }
      }).catch((error) => {
        console.error('Failed to fetch options:', error)
        setOptionsData([])
      }).finally(() => {
        isUpdatingRef.current = false
      })
    }
  }, [options_fetch_api, fetchOptionsList, options_keys, filterOptions])

  // 动态获取联动选项，类似于 select-target.tsx 的逻辑
  const dynamicOptions = useMemo(() => {
    if (!stableEchoOptionsLinkageObj)
      return []

    // 获取匹配的类型的资源数组
    const selectedResourceId = formInstance?.getFieldValue(stableEchoOptionsLinkageObj.formKey)
    if (!selectedResourceId)
      return []

    const temp = allResourceList.find(el => el.type === stableEchoOptionsLinkageObj.type && el.id === selectedResourceId)
    if (!temp)
      return []

    // 合并来自两个数据源的选项：payload__activated_groups 和 payload__node_group
    let combinedOptions: any[] = []

    // 获取激活的内置节点组（如 CoarseChunk, MediumChunk, FineChunk）
    const activatedGroups = temp.data.payload__activated_groups
    if (activatedGroups && Array.isArray(activatedGroups)) {
      const activatedOptions = activatedGroups
        .filter(item => item.name)
        .map(el => ({ label: el.name, value: el.name }))
      combinedOptions = [...combinedOptions, ...activatedOptions]
    }

    // 获取用户自定义的节点组（如 Group 1）
    const nodeGroups = temp.data.payload__node_group
    if (nodeGroups && Array.isArray(nodeGroups)) {
      const nodeGroupOptions = nodeGroups
        .filter(item => item.name)
        .map(el => ({ label: el.name, value: el.name }))
      combinedOptions = [...combinedOptions, ...nodeGroupOptions]
    }

    // 兼容原有逻辑：如果 getValueKey 指定了特定字段，使用该字段
    const arrTemp = temp.data[stableEchoOptionsLinkageObj.getValueKey]
    if (arrTemp && Array.isArray(arrTemp)) {
      const originalOptions = arrTemp
        .filter(item => item.name)
        .map(el => ({ label: el.name, value: el.key || el.name }))
      combinedOptions = [...combinedOptions, ...originalOptions]
    }

    const uniqueOptions = uniqBy(combinedOptions, 'value')

    return uniqueOptions
  }, [stableEchoOptionsLinkageObj, allResourceList, formInstance, name])

  // 合并所有选项数据
  const finalOptions = useMemo(() => {
    let allOptions = [...options]

    // 如果有联动配置，使用动态选项（即使为空也要处理）
    if (stableEchoOptionsLinkageObj) {
      // 对于文档切片组名字段，确保总是显示可用选项
      if (name === 'payload__group_name' && dynamicOptions.length === 0) {
        // 如果动态选项为空，尝试手动构建选项
        const selectedResourceId = formInstance?.getFieldValue(stableEchoOptionsLinkageObj.formKey)
        const temp = allResourceList.find(el => el.type === stableEchoOptionsLinkageObj.type && el.id === selectedResourceId)

        if (temp?.data) {
          const manualOptions: any[] = []

          // 再次尝试获取激活组
          const activatedGroups = temp.data.payload__activated_groups
          if (activatedGroups && Array.isArray(activatedGroups)) {
            activatedGroups.forEach((item) => {
              if (item.name)
                manualOptions.push({ label: item.name, value: item.name })
            })
          }

          // 再次尝试获取自定义组
          const nodeGroups = temp.data.payload__node_group
          if (nodeGroups && Array.isArray(nodeGroups)) {
            nodeGroups.forEach((item) => {
              if (item.name)
                manualOptions.push({ label: item.name, value: item.name })
            })
          }
          allOptions = [...allOptions, ...uniqBy(manualOptions, 'value')]
        }
      }
      else {
        allOptions = [...allOptions, ...dynamicOptions]
      }
    }
    // 如果没有联动配置，使用从 API 获取的选项或事件监听器更新的选项
    else if (optionsData.length > 0) {
      allOptions = [...allOptions, ...optionsData]
    }

    // 去重处理
    const uniqueOptions = uniqBy(allOptions, 'value')

    return uniqueOptions.map(item => ({
      ...item,
      label: item.label === 'CoarseChunk' ? '长段分块' : item.label === 'MediumChunk' ? '段落分块' : item.label === 'FineChunk' ? '短句分块' : item.label,
    }))
  }, [options, dynamicOptions, optionsData, stableEchoOptionsLinkageObj, name, allResourceList, formInstance])

  // 获取当前选中选项的描述
  const selectedOptionDesc = useMemo(() => {
    if (!value)
      return null
    const selectedOption = finalOptions.find(option => option.value === value)
    return selectedOption?.desc || null
  }, [value, finalOptions])

  // 当 options 改变时更新 optionsData
  useEffect(() => {
    if (!isUpdatingRef.current && !options_fetch_api && !stableEchoOptionsLinkageObj)
      setOptionsData(options || [])
  }, [options, options_fetch_api, stableEchoOptionsLinkageObj, name])

  return (
    <>
      {(typeof value !== 'undefined' && optionsTip)
        ? <Typography.Text className="ant-form-text" type="secondary" style={{ transform: 'translateY(-8px)' }}>
          {optionsTip}
        </Typography.Text>
        : null}
      <Select
        className={classNames(className, 'w-full')}
        value={finalOptions.find(item => item.value === value)?.value}
        allowClear={allowClear}
        disabled={disabled}
        readOnly={readOnly}
        onChange={(_value) => {
          if (name === 'payload__setmode')
            window.sessionStorage.setItem('payload__setmode_manually_set', 'true')
          // 检查是否有自定义的 onChange 配置
          if (name === 'payload__database_id') {
            // 获取当前选中的完整选项信息
            const selectedOption = finalOptions.find(option => option.value === _value)
            // 同时更新数据库ID和名称
            onChange && onChange({
              payload__database_id: _value,
              payload__database_name: selectedOption?.label || '',
            })
          }
          else {
            // 使用默认的 onChange 逻辑
            onChange && onChange(name, _value)
          }
        }}
        placeholder={placeholder || `请选择${label}`}
        options={finalOptions}
        {...restProps}
      />
      {selectedOptionDesc && (
        <Typography.Text
          className="ant-form-text"
          type="secondary"
          style={{
            display: 'block',
            marginTop: '8px',
            fontSize: '12px',
            lineHeight: '1.4',
            color: '#666',
          }}
        >
          {selectedOptionDesc}
        </Typography.Text>
      )}
    </>
  )
}

export default React.memo(SelectComponent)
