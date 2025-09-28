'use client'
import React from 'react'
import TagCom from './tagCom'
import styles from './page.module.scss'

const TagManage = () => {
  const tagComs: any = [
    { name: '应用标签', type: 'app' },
    { name: '知识库标签', type: 'knowledgebase' },
    { name: 'prompt/prompt模版标签', type: 'prompt' },
    { name: '模型标签', type: 'model' },
    { name: '工具标签', type: 'tool' },
    { name: '数据集标签', type: 'dataset' },
  ]

  return (
    <div className={styles.tagManageWrap}>
      {
        tagComs.map(item =>
          <TagCom key={item?.type} name={item?.name} type={item?.type} />,
        )
      }
    </div>
  )
}

export default TagManage
