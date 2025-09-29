import React from 'react'
import './index.scss'

function InfoTitle(props: any) {
  const { text } = props
  return (
    <div className="info-title-wrap">
      <i className="title-icon"></i>
      <span className="title-text">
        {text}
      </span>
    </div>
  )
}

export default InfoTitle
