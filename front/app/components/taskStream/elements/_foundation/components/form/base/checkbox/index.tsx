import React from 'react'
import { Checkbox } from 'antd'
import type { CheckboxProps } from 'antd/lib/checkbox'
import classNames from 'classnames'
import './index.scss'

type CustomCheckboxProps = {
  readOnly?: boolean
} & CheckboxProps

const CustomCheckbox: React.FC<CustomCheckboxProps> = (props) => {
  const { readOnly, className, ...restProps } = props

  return (
    <Checkbox
      className={classNames('custom-checkbox', className, { 'custom-checkbox-readonly': !!readOnly })}
      {...restProps}
    />
  )
}

export default CustomCheckbox
