'use client'
import type { FC } from 'react'
import React, { useEffect, useRef, useState } from 'react'
import type { FieldItemProps } from '../types'
import { ValueType, flattenTree, formatValueByType, traveTree } from './utils'
import { Cascader } from '@/app/components/taskStream/elements/_foundation/components/form/base'
import { get } from '@/infrastructure/api/base'

const FieldItem: FC<Partial<FieldItemProps>> = ({
  name,
  value: _value,
  disabled,
  readOnly,
  nodeData,
  resourceData,
  onChange,
  allowClear,
}) => {
  const value = formatValueByType(_value, ValueType.String)
  const inputs = nodeData || resourceData || {}
  const [treeData, setTreeData] = useState<any[]>([])
  const [loadingTreeData, setLoadingTreeData] = useState<boolean>(false)
  const fetchApiCalled = useRef<boolean>(false)

  useEffect(() => {
    if (!fetchApiCalled.current) {
      fetchApiCalled.current = true

      setLoadingTreeData(true)
      Promise.all([
        get('/mh/models_tree?model_type=local&model_kind=localLLM&qtype=already'),
        // get('/mh/list?page=1&page_size=999&model_type=local&model_kind=localLLM&qtype=already'),
        Promise.resolve([]),
      ]).then(([res1, res2]: any[]) => {
        const mergedList = mergeList(
          res2?.data?.filter((item: any) => item?.model_kind === 'localLLM' && item?.download_message !== 'Fail') || [],
          res1 || [],
        )
        const currentTreeData = traveTree(mergedList || [], (item: any, parent) => {
          item.children = item?.child?.length ? item.child : undefined
          item.value = item.children?.length ? `parent__${item?.model_name}` : item?.id
          item.keys = (parent?.keys || []).concat(item?.value)

          return {
            label: (item.can_finetune && !item?.children?.length) ? `${item.model_name}（支持微调）` : item?.model_name,
            value: item?.value,
            children: item.children,
            keys: item.keys,
            can_finetune: item.can_finetune,
          }
        })
        setTreeData(currentTreeData || [])

        const flattenedTreeData = flattenTree(currentTreeData || [])
        if (value) {
          const matchedKeys = flattenedTreeData?.find(child => child.value === value)?.keys || []
          if (!inputs?.payload__base_model_selected_keys?.length
            || !inputs?.payload__base_model_name
            || typeof inputs?.payload__can_finetune === 'undefined'
            || JSON.stringify(inputs?.payload__base_model_selected_keys) !== JSON.stringify(matchedKeys)
          ) {
            onChange && onChange({
              payload__base_model_selected_keys: matchedKeys,
              payload__base_model_name: flattenedTreeData?.find(child => child.value === value)?.label || '',
              payload__can_finetune: !!flattenedTreeData?.find(child => child.value === value)?.can_finetune,
            })
          }
        }
      }).finally(() => {
        setLoadingTreeData(false)
      })
    }
  }, [])

  function mergeList(list1: any[], list2: any[]): any[] {
    const result = [...list2]
    list1.forEach((item: any) => {
      if (!list2.find(child => child.model_name === item?.model_name)) {
        result.push({
          ...item,
          can_finetune: true, // LocalLLM暂时都默认可微调
        })
      }
    })
    return result
  }

  return (
    <div className="relative w-full">
      <Cascader
        options={treeData}
        placeholder="请选择模型"
        allowClear={allowClear}
        disabled={disabled}
        readOnly={readOnly}
        expandTrigger="click"
        loading={loadingTreeData}
        placement='bottomLeft'
        showSearch
        value={inputs?.payload__base_model_selected_keys}
        onChange={(val) => {
          const flattenedTreeData = flattenTree(treeData)
          onChange && onChange({
            [name]: val?.[val?.length - 1],
            payload__base_model_selected_keys: val,
            payload__base_model_name: flattenedTreeData?.find(child => child.value === val?.[val?.length - 1])?.label || '',
            payload__can_finetune: flattenedTreeData?.find(child => child.value === val?.[val?.length - 1])?.can_finetune,
          })
        }}
      />
    </div>
  )
}
export default React.memo(FieldItem)
