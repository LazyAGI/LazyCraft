'use client'
import React, { useEffect, useRef, useState } from 'react'
import { Button, Collapse, Empty, Form, Input, Modal, Pagination, Popconfirm, Select, Spin, Tag, Tooltip, message } from 'antd'
import { MinusCircleOutlined, PlusCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import { useUpdateEffect } from 'ahooks'
import style from './page.module.scss'
import ChatModal from './chatModal'
import ClassifyMode from '@/app/components/tagSelect/ClassifyMode'
import CreatorSelect from '@/app/components/tagSelect/creatorSelect'
import useRadioAuth from '@/shared/hooks/use-radio-auth'
import Toast, { ToastTypeEnum } from '@/app/components/base/flash-notice'
import { createPrompt, deletePrompt, getAdjustList, getPromptList } from '@/infrastructure/api/prompt'

const { Panel } = Collapse
const showText: any = {
  Invalid: { text: '异常', color: 'error' },
  Ready: { text: '在线', color: 'success' },
  Done: { text: '启动中', color: 'processing' },
  Cancelled: { text: '离线', color: 'default' },
  Failed: { text: '异常', color: 'error' },
  InQueue: { text: '启动中', color: 'processing' },
  Running: { text: '启动中', color: 'processing' },
  Pending: { text: '启动中', color: 'processing' },
}
const formItemLayout = {
  labelCol: {
    xs: { span: 24 },
    sm: { span: 4 },
  },
  wrapperCol: {
    xs: { span: 24 },
    sm: { span: 20 },
  },
}

const formItemLayoutWithOutLabel = {
  wrapperCol: {
    xs: { span: 24, offset: 0 },
    sm: { span: 20, offset: 4 },
  },
}

const InferenceService = () => {
  const [form] = Form.useForm()
  const authRadio = useRadioAuth()
  const [authValue, setAuthValue] = useState(authRadio.is_self_space ? 'mine' : 'group')
  const [info, setInfo] = useState<any>({})
  const [testInfo, setTestInfo] = useState<any>({})
  const [title, setTitle] = useState('新建模型服务')
  const [isEdit, setIsEdit] = useState(false)
  const [isView, setIsView] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [visible, setVisible] = useState(false)
  const [list, setList] = useState<any>([])
  const [btnLoading, setBtnLoading] = useState(false)
  const [modelType, setModelType] = useState('localLLM')
  const [modelList, setModelList] = useState<any>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [pageOption, setPageOption] = useState({ page: 1, per_page: 10 })
  const [searchVal, setSearchVal] = useState('')
  const [sName, setSName] = useState('')
  const [selectLabels, setSelectLabels] = useState([]) as any
  const [creator, setCreator] = useState([]) as any
  const [riskModalOpen, setRiskModalOpen] = useState(false)
  const [pendingValues, setPendingValues] = useState<any>(null)

  // 添加轮询相关的引用
  const pollingTimer = useRef<NodeJS.Timeout | null>(null)

  const getList = async (page, search_name = '') => {
    const url = '/infer-service/list'
    const param: any = {
      page,
      per_page: 10,
      search_name: search_name || sName,
      user_id: creator,
      status: selectLabels.map(item => item?.id),
    }
    setLoading(true)
    try {
      const res: any = await getAdjustList({
        url,
        body: param,
      })
      if (res?.result) {
        const { result = [], total } = res?.result
        setList(result)
        setTotal(total)
      }
    }
    finally {
      setLoading(false)
    }
  }

  // 检查是否有启动中的服务
  const hasStartingServices = () => {
    const startingStatuses = ['Done', 'InQueue', 'Running', 'Pending']
    return list.some((item: any) =>
      item.services?.some((service: any) => startingStatuses.includes(service.status)),
    )
  }

  // 启动轮询
  const startPolling = () => {
    if (pollingTimer.current)
      clearInterval(pollingTimer.current)

    pollingTimer.current = setInterval(() => {
      getList(pageOption.page, searchVal)
    }, 15000) // 15秒轮询
  }

  // 停止轮询
  const stopPolling = () => {
    if (pollingTimer.current) {
      clearInterval(pollingTimer.current)
      pollingTimer.current = null
    }
  }

  // 检查并管理轮询状态
  useEffect(() => {
    if (hasStartingServices())
      startPolling()
    else
      stopPolling()

    // 组件卸载时清理定时器
    return () => {
      stopPolling()
    }
  }, [list, pageOption.page, searchVal])

  const getModelList = async () => {
    const url = '/infer-service/model/list'
    const param: any = {
      model_type: 'local',
      model_kind: modelType,
      qtype: 'already',
    }
    try {
      const res: any = await getPromptList({
        url,
        options: { params: param },
      })
      if (res)
        setModelList(res)
    }
    finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    getList(pageOption.page, '')
  }, [pageOption.page])

  useUpdateEffect(() => {
    getList(1, '')
  }, [sName, creator, selectLabels])

  useEffect(() => {
    getModelList()
  }, [modelType])

  const altChange = ({ target: { value } }: any) => {
    setAuthValue(value)
    setSName('')
    setSearchVal('')
    setPageOption({ ...pageOption, page: 1 })
  }

  const handleDelete = async (e, id: any) => {
    e.stopPropagation()
    const url = '/infer-service/service/delete'
    const res: any = await deletePrompt({ url, body: { service_id: id } })
    if (res) {
      message.success('删除成功')
      setPageOption({ ...pageOption, page: 1 })
      getList(1, '')
    }
  }

  const handleCreatePrompt = () => {
    setIsEdit(false)
    setIsView(false)
    setTitle('新建模型服务')
    setIsModalOpen(true)
  }

  const submitFormValues = async (values: any) => {
    let gUrl = ''
    if (isEdit)
      gUrl = '/infer-service/service/create'

    else
      gUrl = '/infer-service/group/create'

    setBtnLoading(true)

    try {
      const res: any = await createPrompt({
        url: gUrl,
        body: values,
      })
      if (res) {
        message.success('保存成功')
        form.resetFields()
        setModelType('localLLM')
        getList(1, '')
        setIsModalOpen(false)
        setPageOption({ ...pageOption, page: 1 })
      }
    }
    finally {
      setBtnLoading(false)
      setPendingValues(null)
      setRiskModalOpen(false)
    }
  }

  const handleOk = () => {
    if (isView) {
      setIsModalOpen(false)
      setIsView(false)
      return
    }
    form.validateFields().then(async (values) => {
      if (!isEdit) {
        const selectedModel = modelList.find((item: any) => item.id === values.model_id)
        if (selectedModel && selectedModel.need_confirm === false) {
          setPendingValues(values)
          setRiskModalOpen(true)
          return
        }
      }
      submitFormValues(values)
    })
  }

  const handleCancel = () => {
    setIsModalOpen(false)
    form.resetFields()
    setModelType('localLLM')
    setPendingValues(null)
    setRiskModalOpen(false)
  }

  const onSearchApp = (e) => {
    setSName(e)
    setList([])
    setPageOption({ ...pageOption, page: 1 })
    getList(1, e)
  }

  const clickAdd = (e, item) => {
    e.stopPropagation()
    setIsEdit(true)
    setInfo(item)
    setTitle('添加推理服务')
    setIsModalOpen(true)
    form.setFieldsValue({ model_type: item?.model_type, group_id: item?.id })
  }

  const refreshList = () => {
    setPageOption({ ...pageOption, page: 1 })
    getList(pageOption.page, '')
  }

  const handleError = (e: Error) => {
    let message = e.message
    if (!message)
      message = '操作失败'

    if (message === 'request timeout') {
      message = '请求超时'
      refreshList()
    }
    Toast.notify({ type: ToastTypeEnum.Error, message })
  }

  const clickStartStopA = async (e, id, flag) => {
    e.stopPropagation()
    const params = { group_id: id }
    const url = flag === 'start' ? '/infer-service/group/start' : '/infer-service/group/close'
    setLoading(true)
    try {
      const res = await createPrompt({
        url,
        body: params,
      })
      if (res) {
        Toast.notify({ type: ToastTypeEnum.Success, message: '操作成功' })
        refreshList()
      }
    }
    catch (e) {
      handleError(e as Error)
    }
    finally {
      setLoading(false)
    }
  }

  const clickStartStop = async (e, id, flag) => {
    e.stopPropagation()
    const params = { service_id: id }
    const url = flag === 'start' ? '/infer-service/service/start' : '/infer-service/service/stop'
    setLoading(true)
    try {
      const res = await createPrompt({
        url,
        body: params,
      })
      if (res) {
        if ((res as any).status === 0) {
          Toast.notify({ type: ToastTypeEnum.Success, message: '操作成功' })
          refreshList()
        }
        else {
          Toast.notify({ type: ToastTypeEnum.Error, message: '操作失败' })
        }
      }
    }
    catch (e) {
      handleError(e as Error)
    }
    finally {
      setLoading(false)
    }
  }

  const openTest = (e, item) => {
    e.stopPropagation()
    setTestInfo(item)
    setVisible(true)
  }

  const onPageChange = (page) => {
    setPageOption({ ...pageOption, page })
  }

  const onTypeUpdate = (e) => {
    setModelType(e)
    form.setFieldValue('model_id', '')
  }

  const canAddDelete = (val) => {
    if (val === '00000000-0000-0000-0000-000000000000')
      return authRadio.isAdministrator

    else
      return authRadio.isAdministrator || authRadio.addDeletePermit
  }

  const canEdit = (val) => {
    if (val === '00000000-0000-0000-0000-000000000000')
      return authRadio.isAdministrator

    else
      return authRadio.isAdministrator || authRadio.editPermit
  }

  return (
    <Spin spinning={loading}>
      <div className={style.inferenceWrap}>
        <div className='mt-[1.0417vw] flex justify-between'>
          <ClassifyMode needSpace={false} label='运行状态' selectLabels={selectLabels} setSelectLabels={setSelectLabels} type='inference' />
          <Button type='primary' onClick={handleCreatePrompt}>新建推理服务</Button>
        </div>
        <div className='flex justify-between'>
          <Form.Item label="其他选项">
            <CreatorSelect value={creator} setCreator={setCreator} type='dataset' />
          </Form.Item>
          <Input.Search
            placeholder='请输入模型名称'
            value={searchVal}
            allowClear
            onChange={e => setSearchVal(e.target.value)}
            onSearch={onSearchApp}
            style={{ width: 270 }}
          />
        </div>
        {list?.length
          ? <div className={style.middleWrap}>
            <div className={style.title}>
              <div className={style.item1}>模型名称</div>
              <div className={style.item2}>启用服务数/总数（个）</div>
              <div className={style.item2}>模型类型</div>
              <div className={style.item3}>创建人</div>
              <div className={style.actionSty}>操作</div>
            </div>
            <Collapse bordered={false}>
              {
                list?.map((item: any) =>
                  <Panel
                    extra={
                      <div>
                        {canAddDelete(item?.user_id) && <Button type='link' size='small' onClick={e => clickAdd(e, item)}>添加服务</Button>}
                        {canEdit(item?.user_id) && <span>
                          {item?.online_count > 0 ? <Button type='link' size='small' onClick={e => clickStartStopA(e, item?.id, 'stop')}>关闭</Button> : <Button type='link' size='small' onClick={e => clickStartStopA(e, item?.id, 'start')}>开启</Button>}
                        </span>}
                      </div>
                    }
                    header={
                      <div className={style.colHeadSty}>
                        <div className={style.colName}>{item?.name}</div>
                        <div className={style.colNum}>{item?.online_count}/{item?.service_count}</div>
                        <div className={style.colNum2}>{item?.model_type_display}</div>
                        <div className={style.colNum3}>{item?.user_name}</div>
                      </div>
                    }
                    key={item?.id}
                    className={style.panelSty}
                  >
                    {
                      item?.services?.map((ite: any) =>
                        <div className={style.colBody} key={ite?.id}>
                          <div className={style.nameSty}>{ite?.name}（显卡：{ite?.model_num_gpus} 张）</div>
                          <div className={style.statuSty}><Tag color={showText[ite?.status]?.color}>{showText[ite?.status]?.text}</Tag></div>
                          <div className={style.creator}>创建者：{ite?.created_by}</div>
                          <div className={style.createTime}>创建时间: {ite?.updated_at}</div>
                          <div className={style.actionSty}>
                            {item?.model_type === 'localLLM' && <Button disabled={ite?.status !== 'Ready'} type='link' size='small' onClick={e => openTest(e, ite)}>测试</Button>}
                            {canEdit(item?.user_id) && <span>
                              {
                                ite?.status === 'Cancelled'
                                  ? <Button type='link' size='small' onClick={e => clickStartStop(e, ite?.id, 'start')}>启动</Button>
                                  : <Button type='link' size='small' onClick={e => clickStartStop(e, ite?.id, 'stop')}>关闭</Button>
                              }
                            </span>}
                            {canAddDelete(item?.user_id) && <Popconfirm
                              title="请确认"
                              description="该服务将被删除不可恢复!"
                              onConfirm={e => handleDelete(e, ite?.id)}
                              okText="是"
                              cancelText="否"
                            >
                              <Button type='link' size="small" danger>删除</Button>
                            </Popconfirm>}
                          </div>
                        </div>,
                      )
                    }
                    {item?.services.length === 0 && <div style={{ textAlign: 'center' }}>暂无数据，请先添加服务</div>}
                  </Panel>,
                )
              }
            </Collapse>
            <div>
              <Pagination style={{ justifyContent: 'flex-end', marginTop: 10 }} current={pageOption.page} onChange={onPageChange} total={total} />
            </div>
          </div>
          : <Empty className='pt-[150px]' description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
        <Modal width={520} cancelText="取消" confirmLoading={btnLoading} okText={'确定'} title={title} open={isModalOpen} onOk={handleOk} onCancel={handleCancel}>
          <div className={style.createWrap}>
            <Form form={form} className={style.resetForm}>
              <Form.Item
                name="model_type"
                label={'模型类型'}
                rules={[{ required: true, message: '请选择模型类型' }]}
                initialValue='localLLM'
              >
                <Select disabled={isEdit} onChange={onTypeUpdate} style={{ width: '80%' }} placeholder='请选择模型类型' options={[{ label: '大模型', value: 'localLLM' }, { label: '向量模型', value: 'Embedding' }, { label: '文字转语音', value: 'TTS' }, { label: '语音转文字', value: 'STT' }, { label: '重排序', value: 'reranker' }, { label: '视觉问答', value: 'VQA' }, { label: '文字识别', value: 'OCR' }]} />
              </Form.Item>
              {isEdit
                ? <Form.Item
                  name="group_id"
                  validateTrigger="onBlur"
                  label={'模型名称'}
                  rules={[{ required: true, message: '请选择模型' }]}
                >
                  <div>{info?.model_name}</div>
                </Form.Item>
                : <Form.Item
                  name="model_id"
                  validateTrigger="onBlur"
                  label={'模型名称'}
                  rules={[{ required: true, message: '请选择模型' }]}
                >
                  <Select style={{ width: '80%' }} placeholder='请选择模型名称' fieldNames={{ label: 'model_name', value: 'id' }} options={modelList} />
                </Form.Item>}
              <Form.List
                name="services"
                initialValue={[{ name: '', model_num_gpus: undefined }]}
              >
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name }, index) => (
                      <Form.Item
                        {...(index === 0 ? formItemLayout : formItemLayoutWithOutLabel)}
                        label={index === 0 ? '服务信息' : ''}
                        required
                        key={key}
                      >
                        <div className='flex flex-col gap-[8px]'>
                          <div className='flex items-center gap-[8px]'>
                            <Form.Item
                              name={[name, 'name']}
                              validateTrigger={['onChange', 'onBlur']}
                              rules={[
                                {
                                  required: true,
                                  whitespace: true,
                                  pattern: /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?\s]+$/,
                                  message: '支持大小写字母、数字和特殊符号',
                                },
                              ]}
                              style={{ width: '80%', marginBottom: 0 }}
                            >
                              <Input placeholder="请输入服务名称" />
                            </Form.Item>
                            <PlusCircleOutlined
                              style={{ color: '#0E5DD8', cursor: 'pointer' }}
                              onClick={() => {
                                const current = form.getFieldValue(['services', name]) || {}
                                add({ name: current?.name || '', model_num_gpus: current?.model_num_gpus || undefined })
                              }}
                            />
                            {index !== 0 && (
                              <MinusCircleOutlined
                                className="dynamic-delete-button"
                                style={{ color: '#0E5DD8', cursor: 'pointer' }}
                                onClick={() => remove(name)}
                              />
                            )}
                          </div>
                          <div className='flex items-center gap-[8px]'>
                            <Form.Item
                              name={[name, 'model_num_gpus']}
                              validateTrigger={['onChange', 'onBlur']}
                              rules={[
                                {
                                  required: true,
                                  message: '',
                                },
                                {
                                  validator: (_, value) => {
                                    if (value === undefined || value === null || value === '')
                                      return Promise.reject(new Error('请输入显卡数量'))
                                    const numValue = Number(value)
                                    if (!Number.isInteger(numValue) || numValue < 1)
                                      return Promise.reject(new Error('显卡数量需为大于等于1的整数'))
                                    return Promise.resolve()
                                  },
                                },
                              ]}
                              style={{ width: '80%', marginBottom: 0 }}
                            >
                              <Select placeholder="分配显卡数量" style={{ width: '100%' }} options={[{ label: '1', value: 1 }, { label: '2', value: 2 }, { label: '4', value: 4 }, { label: '8', value: 8 }]} />
                            </Form.Item>
                            <Tooltip
                              placement="top"
                              title={
                                <div className='text-xs leading-relaxed max-w-[280px]'>
                                  <p>运行大模型占用的显存主要由以下组成(以Qwen3-32B、精度为FP16为例计算，占用显存约为64+8+2=74G)：</p>
                                  <p>1）模型权重：32B × 2 = 64 GB，固定不变。</p>
                                  <p>2）KV缓存：2 × 并发数 × 32K × 64 × 128 × 8 × 2，示例为并发1上下文32K，约8G；并发翻倍显存同步增加。</p>
                                  <p>3）激活值与开销：推理中间计算与框架额外占用约1-2G。</p>
                                </div>
                              }
                            >
                              <QuestionCircleOutlined style={{ color: '#0E5DD8', cursor: 'pointer' }} />
                            </Tooltip>
                          </div>
                        </div>
                      </Form.Item>
                    ))}
                  </>
                )}
              </Form.List>
            </Form>
          </div>
        </Modal>
        <Modal
          open={riskModalOpen}
          title="启动风险提示"
          okText="坚持启动"
          cancelText="取消"
          onOk={() => pendingValues && submitFormValues(pendingValues)}
          onCancel={() => {
            setRiskModalOpen(false)
            setPendingValues(null)
          }}
        >
          <div className='leading-relaxed'>
            <p>当前模型不在官方支持清单内，启动推理服务时可能无法成功。</p>
            <p>是否仍然选择继续启动？</p>
          </div>
        </Modal>
        <ChatModal agentId={testInfo?.id} modelName={testInfo?.name} visible={visible} onOk={() => setVisible(false)} onCancel={() => setVisible(false)} />
      </div>
    </Spin>
  )
}

export default InferenceService
