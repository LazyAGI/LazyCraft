'use client'

import React from 'react'
import styles from './page.module.scss'

const DocumentCenterPage = () => {
  const renderDocumentFrame = () => {
    return (
      <iframe src={`${window.location.origin}/console/api/doc/view`} />
    )
  }

  return (
    <div className={styles.outerWrap}>
      <div className={styles.docWrap}>
        {renderDocumentFrame()}
      </div>
    </div>
  )
}

export default DocumentCenterPage
