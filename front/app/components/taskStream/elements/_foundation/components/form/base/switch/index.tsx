import React from 'react'
import { Switch } from 'antd'
import type { SwitchProps } from 'antd/lib/switch'
import classNames from 'classnames'
import './index.scss'

type CustomSwitchProps = {
  readOnly?: boolean
} & SwitchProps

const CustomSwitch: React.FC<CustomSwitchProps> = (props) => {
  const { readOnly, disabled, className, checked, ...restProps } = props
  return (
    <Switch
      disabled={disabled || readOnly}
      className={classNames('custom-switch', className, { 'custom-switch-readonly': !!readOnly })}
      {...restProps}
      defaultChecked={checked}
    />
  )
}

export default CustomSwitch
