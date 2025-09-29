'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { Breadcrumb, Button, Card, Divider, Form, Input, Radio, Space, Spin } from 'antd'
import { useDebounceFn } from 'ahooks'
// import useUrlState from '@ahooksjs/use-url-state';
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import InfoTitle from '../../../components/InfoTitle'
import styles from './index.module.scss'
import Toast, { ToastTypeEnum } from '@/app/components/base/flash-notice'
import { getAdjustInfo, getResultInfo, saveChoose } from '@/infrastructure/api/modelTest'

const Dimension = (req) => {
  const { id } = req.params
  const [form] = Form.useForm()
  const [baseInfo, setBaseInfo] = useState<any>({})
  const [resultInfo, setResultInfo] = useState<any>({})
  const [rightInfo, setRightInfo] = useState<any>([])
  const [maxPage, setMaxPage] = useState<any>()
  const [spinning, setSpinning] = useState<any>(false)
  const [value, setValue] = useState()
  const [page, setPage] = useState(1)
  const searchParams = useSearchParams()
  // 获取参数值
  const option_select_id = searchParams.get('option_id')
  const getInfo = useCallback(() => {
    getAdjustInfo({ url: `/model_evalution/task_info/${id}` }).then((res) => {
      setBaseInfo(res?.result?.task_info)
    })
  }, [id])

  const getLeftInfo = () => {
    setSpinning(true)
    getResultInfo({ url: `/model_evalution/evaluation_data/${id}`, options: { params: { page, option_select_id: option_select_id === 'view' ? '' : option_select_id } } }).then((res) => {
      setResultInfo(res?.result?.data)
      setMaxPage(res?.result?.total_pages || 1)
      if (res?.result?.data?.evaluations.length > 0)
        form.setFieldValue('evaluations', res?.result?.data?.evaluations)
    }).finally(() => {
      setSpinning(false)
    })
  }

  const getRightInfo = () => {
    getAdjustInfo({ url: `/model_evalution/get_evaluation_dimensions/${id}` }).then((res) => {
      setRightInfo(res?.result)
    })
  }

  useEffect(() => {
    getInfo()
  }, [getInfo])
  useEffect(() => {
    getLeftInfo()
  }, [page, option_select_id])
  useEffect(() => {
    getRightInfo()
  }, [])
  const onChange = (e: any, index) => {
    setValue(e.target.value)
  }
  const handleOk = () => {
    form.validateFields().then((values) => {
      saveChoose({ url: '/model_evalution/evaluate_save', body: { ...values, task_id: +id, data_id: resultInfo?.id } }).then((res) => {
        if (res.status === 500) {
          Toast.notify({
            type: ToastTypeEnum.Error, message: res?.message,
          })
        }
        if (res?.status === 0) {
          Toast.notify({
            type: ToastTypeEnum.Success, message: '保存成功',
          })
          getInfo()
          if (page < maxPage) {
            const temp = page + 1
            setPage(temp)
            form.resetFields()
          }
        }
      })
    })
  }
  const { run } = useDebounceFn(
    handleOk,
    {
      wait: 500,
    },
  )
  const prevClick = () => {
    if (page === 1)
      return

    const temp = page - 1
    setPage(temp)
  }
  const nextClick = () => {
    if (page < maxPage) {
      const temp = page + 1
      setPage(temp)
    }
  }
  return (
    <Spin spinning={spinning}>
      <div className={styles.dimensionWrap}>
        <div className={styles.container}>
          <div className={styles.breadcrumb}>
            <Breadcrumb
              items={[
                {
                  title: <Link href='/modelWarehouse/modelTest'>模型测评</Link>,
                },
                {
                  title: option_select_id === 'view' ? '查看' : '标注',
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
                创建人：{baseInfo?.username}
              </div>
              <div className={styles.detailWrap}>
                <div>模型：<span style={{ color: '#071127' }}>{baseInfo?.model_name}</span></div>
                <div>测评进度：<span style={{ color: '#071127' }}>{baseInfo?.process}</span></div>
              </div>
            </div>
          </Card>
          <Card type='inner' title={<div className={styles.title} >
            结果
          </div>}>
            <div className={styles.resultWrap}>
              <div className={styles.leftWrap}>
                <div>
                  <InfoTitle text="指令" />
                  <Divider style={{ margin: '8px 0' }} />
                  <div className={styles.textWrap}>{resultInfo?.instruction}</div>
                </div>
                <div>
                  <InfoTitle text="测评集结果" />
                  <Divider style={{ margin: '8px 0' }} />
                  <div className={styles.textWrap}>{resultInfo?.output}</div>
                </div>
                <div>
                  <InfoTitle text="推理结果" />
                  <Divider style={{ margin: '8px 0' }} />
                  <div className={styles.textWrap}>{resultInfo?.response}</div>
                </div>
              </div>
              <div className={styles.rightWrap}>
                <InfoTitle text="测评标注" />
                <Divider style={{ margin: '8px 0' }} />
                <div className={styles.chooseWrap}>
                  <Form form={form}>
                    {
                      rightInfo?.map((item: any, index) => <div key={item?.id} className={styles.chooseItem}>
                        <div className={styles.chooseTitle}> <span style={{ color: '#FF5E5E' }}>*</span>{index + 1}. {item?.dimension_name}</div>
                        <div className={styles.radioList}>
                          <Form.Item
                            name={['evaluations', index, 'option_select_id']}
                            rules={[{ required: true, message: '请选择' }]}
                          >
                            <Radio.Group onChange={(value: any) => onChange(value, index)}>
                              <Space direction="vertical">
                                {
                                  item?.options?.map((child: any) => <Radio key={child?.id} value={child?.id}>{child?.option_description}</Radio>)
                                }
                              </Space>
                            </Radio.Group>
                          </Form.Item>
                          <Form.Item
                            // name={'dimension_id'}
                            name={['evaluations', index, 'dimension_id']}
                            hidden
                            initialValue={item?.id}
                          >
                            <Input />
                          </Form.Item>
                        </div>
                      </div>)
                    }
                  </Form>
                </div>
              </div>
            </div>
          </Card>
        </div >
        <div className={styles.saveWrap}>
          <Divider style={{ marginBottom: 10, marginTop: 0 }} />
          <Button onClick={prevClick} disabled={page === 1} style={{ marginRight: 20 }}>&lt; 上一个</Button>
          {!option_select_id && <Button onClick={run} type='primary' style={{ marginRight: 20 }}>保存 {page === maxPage ? '' : '>'}</Button>}
          {option_select_id && <Button disabled={page === maxPage} onClick={nextClick} style={{ marginRight: 20 }}>下一个 &gt;</Button>}
          <Divider style={{ marginTop: 10, marginBottom: 5 }} />
        </div>
      </div >
    </Spin>
  )
}

export default Dimension
