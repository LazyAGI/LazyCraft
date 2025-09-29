import React from 'react'
import { Col, Row } from 'antd'
import './index.scss'

type Item = {
  label?: any
  content?: any
  labelSpan?: number
  style?: any
}

const InfoItem = (props: Item) => {
  return (
    <Row wrap={false} className="info__item" style={props.style}>
      <Col span={props.labelSpan} className="info__item--label">
        {props.label}
      </Col>
      <Col className="info__item--content">{props.content}</Col>
    </Row>
  )
}
export default InfoItem
