import React from 'react'
import { Select } from 'antd'
import type { SelectProps } from 'antd/lib/select'
import classNames from 'classnames'
import './index.scss'

type CustomSelectProps = {
  readOnly?: boolean
} & SelectProps

const CustomSelect: React.FC<CustomSelectProps> = (props) => {
  const { readOnly, disabled, className, ...restProps } = props
  return (
    <Select
      allowClear
      showSearch
      optionFilterProp="label"
      disabled={disabled || readOnly}
      className={classNames('custom-select', className, { 'custom-select-readonly': !!readOnly })}
      {...restProps}
    />
  )
}

export default CustomSelect
