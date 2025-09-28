'use client'
import React from 'react'
import ImagePreview from '../pic-overview'
import AudioPreview from '../audio-preview'
import TextEditor from '../../text-composer'

const FieldItem = (props) => {
  return props.value.map((_value: any, index) => {
    if (/\.(wav|mp3)$/.test(_value))
      return <AudioPreview key={index} {...props} value={_value} />
    else if (/\.(jpe?g|png)$/i.test(_value))
      return <ImagePreview key={index} {...props} value={_value} style={{ width: '100%', height: 200 }} />
    else return <TextEditor key={index} {...props} value={_value} readOnly />
  })
}
export default React.memo(FieldItem)
