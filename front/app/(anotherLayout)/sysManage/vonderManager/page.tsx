'use client'

import React from 'react'
import TagCom from './tagCom'
import styles from './page.module.scss'

const VendorManager = () => {
  const vendorComponents: any = [
    { name: '在线大模型', type: 'llm' },
    { name: '在线Embedding', type: 'embedding' },
    { name: '在线reranker', type: 'reranker' },
  ]

  const renderVendorComponents = () => {
    return vendorComponents.map(item => (
      <TagCom key={item?.type} name={item?.name} type={item?.type} />
    ))
  }

  return (
    <div className={styles.tagManageWrap}>
      {renderVendorComponents()}
    </div>
  )
}

export default VendorManager
