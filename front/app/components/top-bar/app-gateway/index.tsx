'use client'
import Nav from '../nav'
import { useStore as useAppStore } from '@/app/components/app/store'

const ApplicationNavigation = () => {
  const currentAppDetail = useAppStore(state => state.appDetail)

  const navigationConfig = {
    text: '应用商店',
    activeSegment: ['apps', 'app'],
    link: '/apps',
    curNav: currentAppDetail,
  }

  return (
    <>
      <Nav {...navigationConfig} />
    </>
  )
}

export default ApplicationNavigation
