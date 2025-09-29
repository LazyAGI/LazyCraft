'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import IconFont from '../base/iconFont'
import AccountDropdown from './user-panel'
import styles from './index.module.scss'

import BrandMark from '@/app/components/base/brand-mark/logo-site'
import useBreakpoints, { MediaType } from '@/shared/hooks/use-breakpoints'
import { isAgentPage } from '@/shared/utils'

enum showText {
  'costAccounting' = '费用统计',
  'logs' = '日志记录',
  'docManage' = '文档中心',
  'docCenter' = '帮助文档',
  'user' = '团队',
  'sysManage' = '系统管理',
  'Tags' = '密钥管理',
}
const AnotherHeader = () => {
  const media = useBreakpoints()
  const router = useRouter()
  const isMobileView = media === MediaType.mobile
  const path: any = usePathname()
  const goAppStore = () => {
    router.push('/apps')
  }
  return (
    <div className='flex flex-1 items-center justify-between px-4'>
      <div className='flex items-center'>
        <Link href="/apps" className='flex items-center mr-4'>
          <BrandMark className='object-contain' />
        </Link>
        <div className={styles.titleText}>{showText[path.split('/')[1]]}</div>
      </div>
      <div className='flex items-center flex-shrink-0'>
        {!isAgentPage() && <div className={styles.backWrap} onClick={goAppStore}>返回到应用商店 <IconFont type='icon-nav_fanhui' /></div>}
        {!isAgentPage() && <AccountDropdown isMobileView={isMobileView} />}
      </div>
    </div>
  )
}
export default AnotherHeader
