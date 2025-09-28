import React from 'react'
import { Cascader } from 'antd'
import type { CascaderAutoProps } from 'antd/lib/cascader'
import classNames from 'classnames'
import './index.scss'

type CustomCascaderProps = {
  readOnly?: boolean
} & CascaderAutoProps

const CustomCascader: React.FC<CustomCascaderProps> = (props) => {
  const { readOnly, disabled, className, ...restProps } = props

  return (
    <Cascader
      disabled={disabled || readOnly}
      className={classNames('custom-cascader', className, { 'custom-cascader-readonly': !!readOnly })}
      {...restProps}
    />
  )
}

export default CustomCascader
