'use client'
import { useState } from 'react'
import { Modal, Progress } from 'antd'
import { createContext, useContext, useContextSelector } from 'use-context-selector'

type ModalContextState = {
  runProgressMonitor: (p?: any) => void
  oepnProgressMonitor: (p?: any) => void
  stopProgressMonitor: () => void
}

const ModalContext = createContext<ModalContextState>({
  runProgressMonitor: () => { },
  oepnProgressMonitor: () => { },
  stopProgressMonitor: () => { },
})

export const useModalContext = () => useContext(ModalContext)
export function useModalContextSelector<T>(selector: (state: ModalContextState) => T): T {
  return useContextSelector(ModalContext, selector)
}

type ModalContextProviderProps = {
  children: React.ReactNode
}

export const LayerStackContextProvider = ({
  children,
}: ModalContextProviderProps) => {
  const [progressMonitor, setProgressMonitor] = useState<any>({ visible: false })
  const [progressTask, setProgressTask] = useState<any>({ list: [] })

  const runProgressMonitor = (payload = {}) => {
    setProgressTask({ ...progressTask, ...payload })
  }

  const oepnProgressMonitor = (payload = {}) => {
    setProgressMonitor({ ...progressMonitor, ...payload, visible: true })
  }

  const stopProgressMonitor = () => {
    setProgressMonitor({ visible: false })
  }

  return (
    <ModalContext.Provider value={{
      runProgressMonitor,
      oepnProgressMonitor,
      stopProgressMonitor,
    }}>
      <>
        {children}
        {
          <Modal
            title={progressMonitor.title || ''}
            open={progressMonitor.visible}
            onCancel={stopProgressMonitor}
            okButtonProps={{ style: { display: 'none' } }}
            cancelText={'关闭'}
            zIndex={9990}
          >
            <div style={{
              minHeight: '320px',
              maxHeight: '480px',
              margin: '10px 0 20px 0',
              padding: '0 10px 10px 0',
              overflowX: 'hidden',
              overflowY: 'auto',
            }}>
              {
                progressTask.list?.map((item, index) => {
                  return <div key={index} style={{ marginTop: '12px' }}>
                    <div style={{ display: 'flex' }}>
                      <div>{item.icon || ''}</div>
                      <div
                        style={{
                          marginLeft: '10px',
                          height: '22px',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                        }}
                      >{item.name}</div>
                      <div style={{ flex: 1, textAlign: 'right', marginLeft: '10px' }}>{item.progress}%</div>
                      <div style={{ color: '#8f8f8f', marginLeft: '12px' }}>{item.stateTag || ''}</div>
                    </div>
                    <div><Progress percent={item.progress} strokeColor='#0e5dd8' showInfo={false} /></div>
                  </div>
                })
              }
            </div>
          </Modal>
        }
      </>
    </ModalContext.Provider>
  )
}
