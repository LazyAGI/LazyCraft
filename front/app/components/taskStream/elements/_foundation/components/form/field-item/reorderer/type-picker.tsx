'use client'
import type { FC } from 'react'
import React, { useEffect, useRef, useState } from 'react'
import type { FieldItemProps } from '../../types'
import { ValueType, flattenTree, formatValueByType, traveTree } from '../utils'
import { Cascader } from '@/app/components/taskStream/elements/_foundation/components/form/base'
import { get } from '@/infrastructure/api//base'

const FieldItem: FC<Partial<FieldItemProps>> = ({
  disabled,
  readOnly,
  onChange,
  nodeData,
  resourceData,
  allowClear,
}) => {
  const inputs = nodeData || resourceData || {}
  const [originTreeData, setOriginTreeData] = useState<any[]>([])
  const [loadingTreeData, setLoadingTreeData] = useState<boolean>(false)
  const [flattenedTreeData, setFlattenedTreeData] = useState<any[]>([])
  const fetchApiCalled = useRef<boolean>(false)

  useEffect(() => {
    if (!fetchApiCalled.current) {
      fetchApiCalled.current = true

      setLoadingTreeData(true)
      Promise.all([
        get('/mh/models_tree?model_kind=reranker&qtype=already&model_type=online'),
        // get('/mh/list?page=1&page_size=999&model_type=online&model_kind=reranker&qtype=already'),
        Promise.resolve([]),
      ]).then(([res1, res2]: any[]) => {
        const mergedList = mergeList(res2?.data?.filter((item: any) => item?.model_kind === 'reranker') || [], res1 || [])
        const currentTreeData = traveTree(mergedList || [], (item: any, parent) => {
          item.children = item?.child?.length ? item.child : undefined
          item.value = item.children?.length
            ? `parent__${item?.model_brand}_${item?.id}`
            : item?.model_key
          item.keys = (parent?.keys || []).concat(item?.value)
          item.model_brand = item.model_brand || parent?.model_brand
          item.model_url = item.model_url || parent?.model_url
          item.model_key = item.model_key || parent?.model_key

          return {
            label: item?.model_key || item?.model_brand || item?.model_name,
            value: item?.value,
            children: item.children,
            keys: item.keys,
            model_brand: item.model_brand,
            model_name: item.model_name,
            model_key: item.model_key,
            model_url: item.model_url,
            id: item.id,
          }
        })
        setOriginTreeData(currentTreeData || [])
        const flattenedTreeData = flattenTree(currentTreeData || [])
        setFlattenedTreeData(flattenedTreeData || [])

        const currentValue = formatValueByType(inputs.payload__base_model, ValueType.String)
        if (currentValue) {
          const matchedKeys = flattenedTreeData?.find(child => child.value === currentValue)?.keys || []
          if (!inputs?.payload__base_model_selected_keys?.length
            || !inputs?.payload__base_model_id
            || JSON.stringify(inputs?.payload__base_model_selected_keys) !== JSON.stringify(matchedKeys)
          ) {
            onChange && onChange({
              payload__base_model: currentValue,
              payload__base_model_selected_keys: matchedKeys,
              payload__base_model_id: flattenedTreeData?.find(child => child.value === currentValue)?.id,
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
      if (!list2.find(child => child.model_brand === item?.model_brand)) {
        result.push({
          id: item?.id,
          model_name: item?.model_name,
          model_key: item?.model_key,
          model_brand: item?.model_brand,
          model_url: item?.model_url,
          can_select: false,
          child: item?.model_list?.map((_child: any) => ({
            id: item?.id,
            model_name: _child?.model_name,
            model_key: _child?.model_key,
            can_select: true,
          })),
        })
      }
    })
    return result
  }

  return (
    <Cascader
      placeholder="请选择模型"
      allowClear={allowClear}
      loading={loadingTreeData}
      showSearch
      disabled={disabled}
      readOnly={readOnly}
      options={originTreeData || []}
      placement='bottomLeft'
      expandTrigger="click"
      value={inputs?.payload__base_model_selected_keys}
      onChange={(val) => {
        onChange && onChange({
          payload__base_model: val?.[val?.length - 1],
          payload__base_model_id: flattenedTreeData?.find((item: any) => item?.value === val?.[val?.length - 1])?.id,
          payload__base_model_selected_keys: val,
          payload__model_source: 'online_model',
          payload__model: val?.[val?.length - 1],
          payload__model_id: flattenedTreeData?.find((item: any) => item?.value === val?.[val?.length - 1])?.id,
          payload__source: flattenedTreeData?.find((item: any) => item?.value === val?.[val?.length - 1])?.model_brand,
          payload__source_id: flattenedTreeData?.find((item: any) => item?.value === val?.[val?.length - 1])?.id,
          payload__base_url: flattenedTreeData?.find((item: any) => item?.value === val?.[val?.length - 1])?.model_url,
          payload__can_finetune: flattenedTreeData?.find((item: any) => item?.value === val?.[val?.length - 1])?.can_finetune,
        })
      }}
    />
  )
}
export default React.memo(FieldItem)
