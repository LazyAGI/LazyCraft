'use client'

import React, { useEffect, useState } from 'react'

type PreviewDocProps = {
  url: string
}

const PreviewTxt = (props: PreviewDocProps) => {
  const { url } = props
  const [txtData, setTxtData] = useState<string>('')

  const getFile = () => {
    fetch(url).then((res) => {
      res.text().then((data) => {
        setTxtData(data)
      })
    })
  }

  useEffect(() => {
    getFile()
  }, [])

  return (
    <pre className="txt-pre-wrap">
      {txtData}
    </pre>
  )
}

export default PreviewTxt
