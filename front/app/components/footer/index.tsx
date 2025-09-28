'use client'
import React from 'react'
import style from './page.module.scss'

/**
 * 页脚组件
 * 显示版权信息和备案号
 */
const FooterComponent = () => {
  // 页脚内容文本
  const footerText = '2013-2024 北京商汤 版权所有 京ICP备2023024729号'
  // 容器样式类名
  const containerClassName = style.footerWrap

  return (
    <div className={containerClassName}>
      {footerText}
    </div>
  )
}

export default FooterComponent
