'use client'
import React from 'react'
import { ValueType, formatValueByType } from '../../utils'
import { PUBLIC_API_PREFIX } from '@/app-specs'

const FieldItem = ({
  value: _value,
}) => {
  // 处理数组形式的音频文件路径
  const audioPath = Array.isArray(_value) ? _value[0] : _value
  let value = formatValueByType(audioPath.replace('app', 'static'), ValueType.String)
  if (process.env.NODE_ENV === 'development')
    value = `${PUBLIC_API_PREFIX.replace('api', '')}${value}`
  return (
    <div>
      <div><audio controls src={value}></audio></div>
    </div>
  )
}
export default React.memo(FieldItem)
