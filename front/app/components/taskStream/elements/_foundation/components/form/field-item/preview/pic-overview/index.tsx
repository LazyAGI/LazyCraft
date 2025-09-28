'use client'

import React, { useState } from 'react'
import { ValueType, formatValueByType } from '../../utils'
import ImagePreviewportal from './components/pic-view-portal'
import { PUBLIC_API_PREFIX } from '@/app-specs'

const FieldItem = ({
  name,
  label,
  value: _value,
  style = {},
  originType,
  placeholder,
  onLoadError,
}) => {
  let value = formatValueByType(_value.replace('app', 'static'), ValueType.String)
  const [openPortal, setOpenPortal] = useState<boolean>(false)
  if (process.env.NODE_ENV === 'development')
    value = `${PUBLIC_API_PREFIX.replace('api', '')}${value}`
  return (
    <React.Fragment>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="w-250 h-250 rounded-lg object-cover cursor-pointer border-[0.5px] border-black/5"
        alt=""
        onError={() => {
          onLoadError && onLoadError(value)
        }}
        src={value}
        onClick={() =>
          setOpenPortal(true)
        }
        style={style}
      />

      {/* 点击图片弹窗展示 */}
      {(openPortal && value) && (
        <ImagePreviewportal
          url={value}
          onCancel={() => setOpenPortal(false)}
        />
      )}
    </React.Fragment>
  )
}
export default React.memo(FieldItem)
