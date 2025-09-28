'use client'
import type { FC } from 'react'
import React, { useEffect, useRef, useState } from 'react'
import classNames from 'classnames'
import type { FieldItemProps } from '../types'
import Field from '../field-unit'
import { ValueType, flattenTree, formatValueByType, traveTree } from './utils'
import { Cascader, Input } from '@/app/components/taskStream/elements/_foundation/components/form/base'
import { get } from '@/infrastructure/api/base'

const FieldItem: FC<Partial<FieldItemProps>> = ({
  disabled,
  readOnly,
  onChange,
  nodeData,
  resourceData,
}) => {
  const inputs = nodeData || resourceData || {}
  const [modelTreeData, setModelTreeData] = useState<any[]>([])
  const [flattenedTreeData, setFlattenedTreeData] = useState<any[]>([])
  const fetchApiCalled = useRef<boolean>(false)

  useEffect(() => {
    if (!fetchApiCalled.current) {
      fetchApiCalled.current = true

      get('/mh/models_tree?model_type=online&model_kind=Embedding&qtype=already').then((res: any) => {
        const data = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : res?.list
        const currentOnlineModelList = [...data?.filter((item: any) => item?.model_kind === 'Embedding')]
        const currentTreeData = traveTree(currentOnlineModelList || [], (item: any, parent) => {
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
        setModelTreeData([...currentTreeData])

        const currentFlattenedTreeData = flattenTree(currentTreeData)
        setFlattenedTreeData([...currentFlattenedTreeData])

        const currentValue = formatValueByType(inputs.payload__embed_model_name, ValueType.String)
        if (currentValue) {
          const matchedModel = currentFlattenedTreeData?.find(child => child.value === currentValue)
          const matchedKeys = matchedModel?.keys || []
          if (!inputs?.payload__embed_model_selected_keys?.length
            || !inputs?.payload__model_id
            || JSON.stringify(inputs?.payload__embed_model_selected_keys) !== JSON.stringify(matchedKeys)
          ) {
            onChange && onChange({
              payload__source: matchedModel?.model_brand,
              payload__embed_model_name: currentValue,
              payload__embed_model_selected_keys: matchedKeys,
              payload__model_id: matchedModel?.id,
              payload__embed_url: matchedModel?.model_url,
            })
          }
        }
      })
    }
  }, [])

  return (
    <>
      <div className='space-y-3'>
        <Field
          label="模型名"
          name="payload__embed_model_name"
          value={inputs?.payload__embed_model_name}
          className={classNames(
            'text-text-secondary', // system-sm-semibold-uppercase
          )}
        >
          <Cascader
            className={classNames('w-full')}
            placeholder="请选择模型（API-KEY已配置模型可正常使用）"
            allowClear
            showSearch
            disabled={disabled}
            readOnly={readOnly}
            options={modelTreeData || []}
            placement='bottomLeft'
            expandTrigger="click"
            value={inputs?.payload__embed_model_selected_keys}
            onChange={(val) => {
              const currentValue = val?.[val?.length - 1]
              const matchedModel = flattenedTreeData?.find(child => child.value === currentValue)
              onChange && onChange({
                payload__source: matchedModel?.model_brand,
                payload__embed_model_name: currentValue,
                payload__model_id: matchedModel?.id,
                payload__embed_model_selected_keys: val,
                payload__embed_url: matchedModel?.model_url,
              })
            }}
          />
        </Field>
      </div>

      {
        inputs?.payload__source === 'openai' && (
          <div className='space-y-3'>
            <Field
              label="URL"
              name="payload__base_url"
              value={inputs?.payload__base_url}
              className={classNames(
                'text-text-secondary', // system-sm-semibold-uppercase
              )}
            >
              <Input
                className={classNames('w-full')}
                readOnly
                disabled={disabled || !inputs?.payload__base_url}
                value={inputs?.payload__base_url}
                onChange={(val) => {
                  onChange && onChange({
                    payload__base_url: val,
                  })
                }}
                placeholder=""
              />
            </Field>
          </div>
        )
      }
    </>
  )
}
export default React.memo(FieldItem)
