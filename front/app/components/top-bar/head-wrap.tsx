'use client'
import { usePathname } from 'next/navigation'
import s from './index.module.scss'
import classNames from '@/shared/utils/classnames'

type HeaderContainerProps = {
  children: React.ReactNode
}

/**
 * 头部包装器组件
 * 负责包装头部内容并提供边框样式控制
 */
const TopFrameEnclosure = ({
  children,
}: HeaderContainerProps) => {
  const currentPathname = usePathname()

  // 需要显示边框的路由列表
  const borderedRoutes = ['/apps', '/datasets', '/datasets/create', '/tools']
  const shouldShowBorder = borderedRoutes.includes(currentPathname)

  // 构建容器样式类名
  const buildContainerClassName = () => classNames(
    'sticky top-0 left-0 right-0 z-30 flex flex-col grow-0 shrink-0 basis-auto min-h-[56px]',
    s.header,
    shouldShowBorder ? 'border-b border-gray-200' : '',
  )

  return (
    <div className={buildContainerClassName()}>
      {children}
    </div>
  )
}
export default TopFrameEnclosure
