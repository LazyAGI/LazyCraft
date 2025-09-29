'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { Breadcrumb, Button, Card, Divider } from 'antd'
import Link from 'next/link'
import InfoTitle from '../../../components/InfoTitle'

import styles from './index.module.scss'
import { getAdjustInfo } from '@/infrastructure/api/modelAdjust'

const TestResult = (req) => {
  const { id } = req.params
  const [baseInfo, setBaseInfo] = useState<any>({})
  const getInfo = useCallback(() => {
    getAdjustInfo({ url: `/finetune/detail/${id}` }).then((res) => {
      setBaseInfo(res)
    })
  }, [id])

  useEffect(() => {
    getInfo()
  }, [getInfo])

  const handleOk = () => {
  }
  return (
    <div className={styles.testResultWrap}>
      <div className={styles.container}>
        <div className={styles.breadcrumb}>
          <Breadcrumb
            items={[
              {
                title: <Link href='/modelWarehouse/modelTest'>模型测评</Link>,
              },
              {
                title: '结果',
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
            </div>
            <div>
              创建人：{baseInfo?.created_from_info}
            </div>
            <div className={styles.detailWrap}>
              <div>模型：<span style={{ color: '#071127' }}>{baseInfo?.model_name}</span></div>
              <div>测评进度：<span style={{ color: '#071127' }}>{baseInfo?.process}</span></div>
              <div>AI测评器：<span style={{ color: '#071127' }}>{baseInfo?.process}</span></div>
            </div>
          </div>
        </Card>
        <Card type='inner' title={<div className={styles.title} >
          结果
        </div>}>
          <div className={styles.resultWrap}>
            <div className={styles.leftWrap}>
              <div>
                <InfoTitle text="Prompt" />
                <Divider style={{ margin: '8px 0' }} />
                <div className={styles.textWrap}>人工智能算法是用于模拟人工智能算法是用于模拟人类智能的计算方法</div>
              </div>
              <div>
                <InfoTitle text="测评集结果" />
                <Divider style={{ margin: '8px 0' }} />
                <div className={styles.textWrap}>人工智能算法是用于模拟人工智能算法是用于模拟人类智能的计算方法</div>
              </div>
              <div>
                <InfoTitle text="推理结果" />
                <Divider style={{ margin: '8px 0' }} />
                <div className={styles.textWrap}>人工智能算法是用于模拟人工智能算法是用于模拟人类智能的计算方法</div>
              </div>
            </div>
            <div className={styles.rightWrap}>
              <InfoTitle text="AI测评指标-评价结果" />
              <Divider style={{ margin: '8px 0' }} />
              <div className={styles.chooseWrap}>
                <div className={styles.chooseItem}>
                  <div className={styles.chooseTitle}>
                    <div>灵敏度</div>
                    <div className={styles.score}>得分：7</div>
                  </div>
                  <div className={styles.radioList}>
                    人工智能算法是用于模拟人类智能的计算方法
                  </div>
                  <Divider style={{ margin: '12px 0' }} />
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div >
      <div className={styles.saveWrap}>
        <Divider style={{ marginBottom: 10, marginTop: 0 }} />
        <Button onClick={handleOk} style={{ marginRight: 20 }}>&lt; 上一个</Button>
        <Button onClick={handleOk} style={{ marginRight: 20 }}>下一个 &gt;</Button>
        <Divider style={{ marginTop: 10, marginBottom: 5 }} />
      </div>
    </div >
  )
}

export default TestResult
