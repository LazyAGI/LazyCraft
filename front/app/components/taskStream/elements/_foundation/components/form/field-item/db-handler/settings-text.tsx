'use client'
import type { FC } from 'react'
import React from 'react'
import { v4 as uuid4 } from 'uuid'
import KeyValueEdit from '../netOps/kvPair/kvPairEdit'
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
  itemProps?: any
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
  columns = defaultColumns,
  // itemProps,
}) => {
  // const { max } = itemProps || {}
  const list = (value?.length && Array.isArray(value)) ? value : [{ id: uuid4(), key: 'schema', value: '' }]

  const handleChange = (_key, _value) => {
    onChange && onChange({
      [_key]: _value,
      payload__options_str: _value
        ?.filter(item => item.key && item.value)
        ?.map((item: any) => `${item.key}=${item.value}`)?.join('&') || '',
    })
  }

  return <KeyValueEdit
    readonly={readOnly}
    nodeId={nodeId}
    nodeData={nodeData}
    name={name}
    formatType={formatType}
    formatName={formatName}
    list={list}
    columns={columns}
    onChange={handleChange}
  />
}
export default React.memo(KeyValueList)
