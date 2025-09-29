import React, { useEffect, useState } from 'react'
import { Button, Col, Form, Input, Row, Select } from 'antd'
import { SafetyCertificateOutlined } from '@ant-design/icons'
import type { FormItemProps } from 'antd/es/form/FormItem'
import styles from './phone.module.scss'
// import './index.less';

const { Option } = Select
type IProps = {
  name?: string
  label?: string
  rules?: any[]
  style?: React.CSSProperties
  placeholder?: string
  // buttonText?: React.ReactNode;
  countDown?: number
  getCaptchaButtonText: string
  getCaptchaSecondText: string
  btnType: 'link' | 'ghost' | 'default' | 'primary' | 'dashed'
  defaultValue?: string
  getFakeCaptcha: (data: any) => Promise<any>
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  [key: string]: any
  needCode?: boolean
  validateStatus?: 'error'
  help?: string
  required?: boolean
} & Partial<FormItemProps>
const Captcha = (props: IProps) => {
  const [count, setCount] = useState<number>(props.countDown || 0)
  const [timing, setTiming] = useState(false)
  const [loading, setLoading] = useState(false)
  const {
    onChange,
    defaultValue,
    placeholder,
    style,
    rules,
    name,
    label,
    getCaptchaButtonText,
    getCaptchaSecondText,
    getFakeCaptcha,
    countDown,
    btnType,
    validateStatus,
    help,
    required = false,
  } = props
  useEffect(() => {
    let interval = 0
    if (timing) {
      interval = window.setInterval(() => {
        setCount((preSecond) => {
          if (preSecond <= 1) {
            setTiming(false)
            clearInterval(interval)
            // 重置秒数
            return countDown || 60
          }
          return preSecond - 1
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [timing, countDown])
  const onGetCaptcha = async (values: any) => {
    setLoading(true)
    try {
      getFakeCaptcha(values).then(res => setTiming(res))
    }
    catch (error) {
    }
    finally {
      setLoading(false)
    }
  }
  return (
    <Form.Item style={{ ...style, marginBottom: 0 }} label={label} required={required}>
      <Row wrap={false}>
        <Col flex={1}>
          <Form.Item name={name} validateTrigger="onBlur" rules={rules} validateStatus={validateStatus} help={help}>
            <Input
              prefix={<SafetyCertificateOutlined style={{ color: '#5E6472' }} />}
              onChange={onChange}
              value={defaultValue}
              placeholder={placeholder}
              maxLength={200}
              style={{ height: 40 }}
              className={styles.antInput}
              autoComplete="off"
            />
          </Form.Item>
        </Col>
        <Col style={{ paddingLeft: 10 }}>
          <Form.Item>
            <Button style={{ width: 102, height: 40 }} loading={loading} disabled={timing} className="getCaptcha" onClick={onGetCaptcha}>
              {timing ? `${count} ${getCaptchaSecondText}` : getCaptchaButtonText}
            </Button>
          </Form.Item>
        </Col>
      </Row>
    </Form.Item>
  )
}

export default Captcha
