import React, { useEffect, useState } from 'react'
import { useWebSocket } from 'ahooks'
import IconFont from '@/app/components/base/iconFont'

type IProps = {
  id: string
  getList?: any
}

export default (props: IProps) => {
  const { id, getList } = props
  const [num, setNum] = useState(0)
  const WSURL = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/model_hub/ws/${id}`
  // const WSURL = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://192.168.2.197:50001/model_hub/ws/${id}`
  const { readyState, sendMessage, latestMessage, disconnect, connect } = useWebSocket(
    WSURL,
    {
      onMessage: (message: any) => {
        const { data } = message
        const res = JSON.parse(data)
        setNum(res?.percent)
        if (res?.is_end) {
          disconnect()
          getList()
        }
      },
      manual: true,
    },
  )
  useEffect(() => {
    connect()
  }, [id])
  return (
    <div>
      <IconFont type='icon-xiazai' style={{ color: '#0E5DD8' }} />
      <span className='text-[12px]'>
        下载中
      </span>
      <span className='text-[12px]'>
        &nbsp;{num}%
      </span>
    </div>

  )
}
