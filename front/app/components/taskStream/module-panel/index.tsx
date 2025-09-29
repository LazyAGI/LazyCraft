import { Tabs, Tooltip } from 'antd'
import { useMount, useSessionStorageState } from 'ahooks'
import { useState } from 'react'

import IconFont from '../../base/iconFont'

import { useReadonlyNodes } from '../logicHandlers'
import { TAB_ENUM, TOP_TAB_ENUM, tabItems, topTabItems } from './utils'

import Components from './components'
import Tools from './tools'
import ResourceWidget from './resourceWidget'
import AppTemplate from './app-template'
import App from './app'

import cn from '@/shared/utils/classnames'
import './index.scss'

const ModulePanel = (props: any) => {
  const { children } = props

  const { nodesReadOnly } = useReadonlyNodes()

  const [isOpenFold, setOpenFold] = useSessionStorageState<boolean | undefined>('open-fold', {
    defaultValue: true,
  })
  const [topTabSSValue, setTopTabSSValue] = useSessionStorageState<string>('top-tab-active-key',
    {
      defaultValue: TOP_TAB_ENUM.CANVAS,
      listenStorageChange: true,
    })
  const [canvasTabSSValue, setCanvasTabSSValue] = useSessionStorageState('canvas-tab-active-key',
    {
      defaultValue: TAB_ENUM.COMPONENT,
      listenStorageChange: true,
    })
  const [isHistoryIconHovering, setHistoryIconHovering] = useState(false)

  const ShowComp = {
    [TAB_ENUM.COMPONENT]: Components,
    [TAB_ENUM.TOOL]: Tools,
    [TAB_ENUM.APP]: App,
    [TAB_ENUM.APP_TEMPLATE]: AppTemplate,
  }[canvasTabSSValue || TAB_ENUM.COMPONENT]

  useMount(() => {
    // 监听打开资源添加面板事件
    window.addEventListener('openResourceTab', (evt) => {
      setOpenFold(true)
      setTopTabSSValue(TOP_TAB_ENUM.RESOURCE)
      const isEmbedding = (evt as any).detail?.type === 'embedding'
      const resourceId = (evt as any).detail?.resourceId
      setTimeout(() => {
        if (isEmbedding)
          window.dispatchEvent(new CustomEvent('openAddEmbeddingResourceModal', { detail: { resourceId } }))
        else
          window.dispatchEvent(new CustomEvent('openAddResourceModal'))
      }, 200)
    })
  })

  return <div className='module-panel-container'>
    <div className="sider-container">
      {
        !nodesReadOnly && (isOpenFold
          ? <div className='sider-panel'>
            <div className='flex justify-between'>
              <Tabs items={topTabItems} style={{ marginLeft: 20 }} onChange={setTopTabSSValue} activeKey={topTabSSValue} size="small" />
              <Tooltip title="收起操作面板" placement='right'>
                <div
                  className="cursor-pointer unfold-btn"
                  onClick={() => setOpenFold(undefined)}
                >
                  <IconFont type="icon-shouqi1" />
                </div>
              </Tooltip>
            </div>
            {
              topTabSSValue === TOP_TAB_ENUM.CANVAS
                ? <>
                  <div className='flex items-center px-3 h-8 space-x-2 pb-2 border-b-[0.5px] border-black/[0.08] shadow-xs'>
                    {
                      tabItems.map(tab => (
                        <div
                          className={cn(
                            'flex items-center px-2 h-6 rounded-md bg-[#F2F6FF] cursor-pointer',
                            'text-xs font-medium text-[#8F949E]',
                            canvasTabSSValue === tab.key && 'text-[#0E5DD8] border-[1px] border-solid border-[#0E5DD8]',
                          )}
                          key={tab.key}
                          onClick={() => setCanvasTabSSValue(tab.key)}
                        >
                          {tab.label}
                        </div>
                      ))
                    }
                  </div>
                  {ShowComp && <ShowComp />}
                </>
                : <ResourceWidget />
            }
          </div>
          : <div className="btn-container">
            <Tooltip title="打开操作面板" placement='right'>
              <div
                className="com-btn history-btn"
                onClick={() => {
                  setHistoryIconHovering(false)
                  setOpenFold(true)
                }}
                onMouseOver={() => setHistoryIconHovering(true)}
                onMouseLeave={() => setHistoryIconHovering(false)}
              >
                <IconFont type="icon-zhankai" style={{ color: isHistoryIconHovering ? '#fff' : '' }} />
              </div>
            </Tooltip>
          </div>)
      }
    </div>
    <div className='w-full'>{children}</div>
  </div >
}

export default ModulePanel
