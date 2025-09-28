import React from 'react'
import { InputNumber } from 'antd'
import type { InputNumberProps } from 'antd/lib/input-number'
import classNames from 'classnames'
import './index.scss'

type CustomInputNumberProps = {
  readOnly?: boolean
} & InputNumberProps

const CustomInputNumber: React.FC<CustomInputNumberProps> = (props) => {
  const { readOnly, className, ...restProps } = props

  return (
    <InputNumber
      readOnly={readOnly}
      className={classNames('custom-input-number', className, { 'custom-input-number-readonly': !!readOnly })}
      {...restProps}
    />
  )
}

export default CustomInputNumber
