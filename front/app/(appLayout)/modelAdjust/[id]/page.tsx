'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { Breadcrumb, Button, Card, Tag } from 'antd'
import Link from 'next/link'
import styles from './index.module.scss'
import DrawInfo from './DrawInfo'
import { getAdjustInfo } from '@/infrastructure/api/modelAdjust'
import { apiPrefix } from '@/app-specs'

const _tags: any = {
  InQueue: { text: '排队中', color: 'warning' },
  Pending: { text: '排队中', color: 'warning' },
  InProgress: { text: '运行中', color: 'processing' },
  Completed: { text: '已完成', color: 'success' },
  Failed: { text: '失败', color: 'error' },
  Cancel: { text: '已取消', color: 'default' },
}
const AdjustDetail = (req) => {
  const { id } = req.params
  const [baseInfo, setBaseInfo] = useState<any>({})
  const [logLines, setLogLines] = useState<string[]>([])
  const [drawVisible, setDrawVisible] = useState(false)
  const token = localStorage.getItem('console_token')
  const getInfo = useCallback(async () => {
    try {
      const res = await getAdjustInfo({ url: `/finetune/detail/${id}` })
      setBaseInfo(res)
    }
    catch (error) {
      console.error('获取微调信息失败:', error)
    }
  }, [id])
  const getLog = useCallback(() => {
    fetch(`${apiPrefix}/finetune/log/${id}`, {
      method: 'GET', // 或 'POST', 'PUT', 'DELETE' 等
      headers: {
        Authorization: `Bearer ${token}`, // 设置 Authorization 头
      },
    })
      .then((response) => {
        // 检查响应是否成功
        if (!response.ok)
          throw new Error('error')
        return response.arrayBuffer()
      })
      .then((data) => {
        const uint8Array = new Uint8Array(data)
        const decoder = new TextDecoder('utf-8')
        const decodedString = decoder.decode(uint8Array)
        const processedString = decodedString
          .replace(/\\n/g, '\n')
          .replace(/\\t/g, '\t')
          .replace(/\\r/g, '\r')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\')
          .replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
        const lines = processedString.split('\n').filter(line => line.trim() !== '')
        setLogLines(lines)
      })
      .catch((error) => {
        console.error('There has been a problem with your fetch operation:', error)
      })
  }, [id])

  useEffect(() => {
    getInfo()
    getLog()
  }, [getInfo, getLog])

  const handleAddModalClose = () => {
    setDrawVisible(false)
  }

  const handleAddSuccess = () => {
    setDrawVisible(false)
  }

  return (
    <div className={styles.adjustDetailWrap}>
      <div className={styles.container}>
        <div className={styles.breadcrumb}>
          <Breadcrumb
            items={[
              {
                title: <Link href='/modelAdjust'>模型微调</Link>,
              },
              {
                title: '任务详情',
              },
            ]}
          />
        </div>
        <Card style={{ marginBottom: 20 }} type='inner' title={<div className={styles.title} >
          基础信息
        </div>}>
          <div className={styles.infoWrap}>
            <div className={styles.first}>
              <div className={styles.name}>{baseInfo?.name}</div>
              <div><Button type='primary' ghost onClick={() => setDrawVisible(true)}>查看完整配置</Button></div>
            </div>
            <div>
              来源：{baseInfo?.created_from_info}
            </div>
            <div className='flex justify-between'>
              <div className={styles.detailWrap}>
                <div>训练状态：<Tag color={_tags[baseInfo?.status]?.color}>{_tags[baseInfo?.status]?.text}</Tag></div>
                <div>耗时：<span style={{ color: '#071127' }}>{baseInfo?.train_runtime}s</span></div>
                <div>基础模型：<span style={{ color: '#071127' }}>{baseInfo?.base_model_name}</span></div>
                <div>训练数据集：{
                  baseInfo?.dataset_list?.map((item, index) => {
                    return (
                      <span style={{ color: '#071127' }} key={item.id}>{item?.name} &gt; {item?.version} {index + 1 < baseInfo?.dataset_list.length && '、'}</span>
                    )
                  })
                }</div>
              </div>
            </div>
          </div>
        </Card>
        <Card type='inner' title={<div className={styles.title} >
          训练日志
        </div>}>
          <div className={styles.logWrap}>
            {logLines.map((line, index) => (
              <div key={index} className={styles.logLine}>
                {line}
              </div>
            ))}
          </div>
        </Card>
      </div >
      <DrawInfo visible={drawVisible} id={id} baseInfo={baseInfo} onSuccess={handleAddSuccess} onClose={handleAddModalClose}></DrawInfo>
    </div >
  )
}

export default AdjustDetail
