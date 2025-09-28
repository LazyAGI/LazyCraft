'use client'

import React, { Suspense, useState } from 'react'
import { Button, Card, Radio, Tooltip } from 'antd'
import { useMount } from 'ahooks'
import {
  useRouter,
  useSearchParams,
} from 'next/navigation'
import { ExclamationCircleOutlined } from '@ant-design/icons'
import styles from './page.module.scss'
import Api from './Api'
import IDE from './IDEMode'
import Toast from '@/app/components/base/flash-notice'

import { cancelPublish, getToolDetail, publishTools } from '@/infrastructure/api/tool'

type Detail = {
  created_at: string
  description: string
  enable: boolean
  id: string
  name: string
  publish: boolean
  publish_at: null
  tool_api_id: string
  tool_field_input_ids: string
  tool_field_output_ids: string
  tool_ide_code: string
  tool_ide_code_type: string
  tool_kind: string
  tool_mode: string
  tool_type: string
  updated_at: string
  user_id: string
  [property: string]: any
}

const ToolsInfoContent = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const id: string = searchParams.get('id') as string
  const defaultToolMode = searchParams.get('tool_mode')
  const [method, setMeThod] = useState(defaultToolMode?.toLocaleLowerCase() || 'api')
  const [detail, setDetail] = useState<Detail>()
  const [state, setState] = useState(0)
  const handleChange = (e) => {
    setMeThod(e.target.value)
  }
  const getDetail = () => {
    getToolDetail({
      url: '/tool/tool_api',
      options: {
        params: {
          tool_id: id,
        },
      },
    }).then((res: any) => {
      setDetail(res)
    })
  }
  useMount(() => {
    getDetail()
  })

  const handlePublish = (type: string) => {
    const isCancel = !type || type === ''
    // 提醒取消发布成功
    if (isCancel) {
      cancelPublish({ url: '/tool/cancel_publish', body: { id } }).then(() => {
        Toast.notify({ type: 'success', message: '取消发布成功' })
        router.replace('/tools?tab=custom')
      })
      return
    }
    if (state === 0 && !isCancel) {
      Toast.notify({ type: 'warning', message: '测试通过后才能发布' })
      return
    }
    publishTools({ url: '/tool/publish_tool', body: { id, publish_type: type } }).then(() => {
      Toast.notify({ type: 'success', message: '发布成功' })
      router.replace('/tools?tab=custom')
    })
  }
  const onTestSuccess = () => {
    setState(1)
  }
  return <div className={styles.toolInfoWrap}>
    <div className={styles.toolInfo}>
      <div className={styles.icon}>
        {detail?.icon && <img src={detail?.icon.replace('app', 'static')} alt="icon" />}
      </div>
      <div className={styles.middle}>
        <div className={styles.name}>
          {detail?.name}
        </div>
        <div className={styles.desc}>
          {detail?.description}
        </div>

      </div>
      {!detail?.publish && <div className={styles.submitBtn}>
        <Button type='primary' onClick={() => handlePublish('正式发布')}>发布</Button>
      </div>}
      {detail?.publish && detail?.publish_type == '取消发布' && <div className={styles.submitBtn}>
        <Button type='primary' onClick={() => handlePublish('正式发布')}>发布</Button>
      </div>}
      {detail?.publish && detail?.publish_type == '正式发布' && <div className={styles.submitBtn}>
        <Button type='primary' onClick={() => handlePublish('正式发布')}>更新发布</Button>
        <Button type='primary' onClick={() => handlePublish('')}>取消发布</Button>
      </div>}
    </div>
    <div className={styles.outer}>
      <div className={styles.card}>
        <Card title="工具创建方式" style={{ height: '100%' }}>
          <div className={styles.methodWrap}>
            <Radio.Group onChange={handleChange} value={method} >
              <Radio value='api'>使用外部API创建<Tooltip className='ml-1' title="直接将自己开发或公开的API配置为插件">
                <ExclamationCircleOutlined />
              </Tooltip>
              </Radio>
              <Radio style={{ marginLeft: 30 }} value='ide'>在IDE中创建<Tooltip className='ml-1' title="使用IDE进行代码开发，完成在Lazy平台上创建、开发、部署和发布整个工具的过程">
                <ExclamationCircleOutlined />
              </Tooltip></Radio>
            </Radio.Group>
          </div>
          <div className={styles.content}>
            {

              method === 'api' ? <Api data={detail} getDetail={getDetail} onTestSuccess={onTestSuccess} /> : <IDE getDetail={getDetail} detailData={detail} onTestSuccess={onTestSuccess} />
            }
          </div>
        </Card>
      </div>
    </div>
  </div>
}

const ToolsInfo = () => {
  return (
    <Suspense>
      <ToolsInfoContent />
    </Suspense>
  )
}

export default ToolsInfo
