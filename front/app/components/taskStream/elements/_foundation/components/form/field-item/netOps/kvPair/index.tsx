'use client'
import type { FC } from 'react'
import React, { useMemo } from 'react'
import KeyValueEdit from './kvPairEdit'
import { generateKeyValueItem } from './kvPairEdit/helpers'

type Props = {
  readOnly: boolean
  nodeId: string
  nodeData: any
  name: string
  formatType?: string
  formatName: string
  value: any[]
  columns: any[]
  onChange: (name?: string | object, newValue?: any[]) => void
  placeholder?: string
  // toggleKeyValueEdit: () => void
}

const defaultColumns = [{ key: 'key', title: '键', placeholder: '键' }, { key: 'value', title: '值', placeholder: '值' }]

const KeyValueList: FC<Props> = ({
  readOnly,
  nodeId,
  nodeData,
  name,
  formatType = 'json',
  formatName,
  value,
  onChange,
  columns,
  placeholder,
}) => {
  const _columns = useMemo(() => {
    if (columns)
      return columns

    // 如果有placeholder，使用placeholder作为值的提示
    if (placeholder) {
      return [
        { key: 'key', title: '键', placeholder: '键' },
        { key: 'value', title: '值', placeholder },
      ]
    }
    return defaultColumns
  }, [columns, placeholder])

  const list = useMemo(() => {
    return (value?.length) ? value : [generateKeyValueItem(_columns)]
  }, [value, _columns])

  return <KeyValueEdit
    readonly={readOnly}
    nodeId={nodeId}
    nodeData={nodeData}
    name={name}
    formatType={formatType}
    formatName={formatName}
    list={list}
    columns={_columns}
    onChange={onChange}
  />
}

export default React.memo(KeyValueList)
