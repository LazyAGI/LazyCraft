import React, { useCallback, useMemo } from 'react'
import { Input, Tooltip } from 'antd'
import type { InputProps } from 'antd/lib/input'
import classNames from 'classnames'
import './index.scss'
import { InfoCircleOutlined } from '@ant-design/icons'
type CustomInputProps = {
  readOnly?: boolean
  tooltip?: string
  /**  readOnly模式下根据状态设置背景颜色，default-透明色，success-绿色，error-红色，warning-黄色，processing-灰色 */
  status?: 'default' | 'success' | 'error' | 'warning' | 'processing'
  onChange?: (value: string) => void
} & Omit<InputProps, 'onChange'>

enum ReadOnlyBackgroundColors {
  default = 'rgba(0,0,0,0)',
  success = '#69D17B',
  error = '#FF5E5E',
  warning = '#fffbe8',
  processing = '#F5F6F7',
}

const CustomInput: React.FC<CustomInputProps> = (props) => {
  const { readOnly, onChange, tooltip, status = 'default', className, style, ...restProps } = props
  
  const handleChange = useCallback((e) => {
    // 确保onChange存在且事件有效时才调用
    if (onChange && e?.target) {
      // 直接调用onChange，避免setTimeout干扰中文输入法
      onChange(e.target.value)
    }
  }, [onChange])
  
  // 使用 useMemo 缓存背景颜色，避免每次渲染时都重新计算
  const backgroundColor = useMemo(() => ReadOnlyBackgroundColors[status || 'default'], [status])
  
  return readOnly
    ? (
      <div
        className={classNames(className, 'custom-input-readonly')}
        style={{
          ...style,
          backgroundColor, // 使用缓存的背景颜色
        }}
      >
        <span className="overflow-hidden text-ellipsis whitespace-nowrap custom-input-readonly-value">
          <Tooltip title={restProps?.value}>{restProps?.value}</Tooltip>
        </span>
        {tooltip && <Tooltip title={tooltip}>
          <InfoCircleOutlined style={{ color: '#5E6472', marginLeft: 2 }} />
        </Tooltip>}
      </div>
    )
    : (
      <Input
        className={classNames('custom-input', className)}
        style={style}
        suffix={tooltip
          ? (<Tooltip title={tooltip}>
            <InfoCircleOutlined style={{ color: '#5E6472' }} />
          </Tooltip>)
          : undefined}
        {...restProps}
        onChange={handleChange}
      />
    )
}

export default CustomInput
