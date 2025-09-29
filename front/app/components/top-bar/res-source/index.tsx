'use client'
import { useRouter, useSelectedLayoutSegment } from 'next/navigation'

import styles from './index.module.scss'
import IconFont from '@/app/components/base/iconFont'

import classNames from '@/shared/utils/classnames'

type DemoNavProps = {
  className?: string
}

const ResourceBaseNav = ({
  className,
}: DemoNavProps) => {
  const router = useRouter()
  const selectedSegment = useSelectedLayoutSegment()
  const actived = selectedSegment === 'resourceBase'

  return (
    <div
      // href="/resourceBase/knowledgeBase"
      onClick={() => {
        router.replace(`/resourceBase/${sessionStorage.getItem('resource-base-tab') ? sessionStorage.getItem('resource-base-tab').replace(/"/g, '') : 'knowledgeBase'}`)
      }}
      className={classNames(
        className, 'group',
        actived && 'bg-white',
        actived ? 'text-primary-600' : 'text-gray-500',
        styles.wrapNav,
      )}
    >
      <div className={actived ? styles.activeIcon : styles.normal}>
        <IconFont type='icon-ziyuanku' className={'w-4 h-4'} />
      </div>
      资源库
    </div>
  )
}

export default ResourceBaseNav
