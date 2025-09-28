import { useMemo } from 'react'
import {
  useStore,
} from '../../store'
import { useStore as useAppStore } from '@/app/components/app/store'

const useAppTitle = () => {
  const appDetail = useAppStore(s => s.appDetail)
  const patentState = useStore(s => s.patentState)
  const isMainFlow = !(patentState.historyStacks?.length >= 2)

  const appTitle = useMemo(() => {
    const appName = appDetail?.name || ''
    return isMainFlow ? appName : `${appName}-${patentState?.subModuleTitle || ''}`
  }, [isMainFlow, appDetail?.name, patentState?.subModuleTitle])

  return appTitle
}

export default useAppTitle
