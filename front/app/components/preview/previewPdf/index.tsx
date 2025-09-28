'use client'

import React, { useEffect, useRef } from 'react'
import PDFObject from 'pdfobject'

type PreviewDocProps = {
  url: string
}

const PreviewDoc: React.FC<PreviewDocProps> = ({ url }) => {
  const pdfContainerRef = useRef<HTMLDivElement | null>(null)

  const embedPdf = (url: string) => {
    if (pdfContainerRef.current)
      PDFObject.embed(url, pdfContainerRef.current)
  }

  useEffect(() => {
    embedPdf(url)
  }, [url])

  return <div style={{ height: '100%' }} ref={pdfContainerRef} />
}

export default PreviewDoc
