import React, { useEffect, useState } from 'react'
import style from './index.module.scss'

/**
 * 高阶组件，为导航组件添加过渡效果
 * 提供淡入淡出的动画效果
 */
const withTransition = (WrappedComponent) => {
  return (props) => {
    const [hasTransitioned, setHasTransitioned] = useState(false)

    useEffect(() => {
      // 设置过渡定时器
      const transitionTimer = setTimeout(() => {
        setHasTransitioned(true)
      }, 50)

      return () => {
        clearTimeout(transitionTimer)
      }
    }, [])

    // 构建过渡样式类名
    const buildTransitionClassName = () => `${style.navItem} ${hasTransitioned ? style.fadeIn : style.fadeOut}`

    return (
      <div className={buildTransitionClassName()}>
        <WrappedComponent {...props} />
      </div>
    )
  }
}

export default withTransition
