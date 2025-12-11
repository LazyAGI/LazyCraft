'use client'
import React, { useEffect, useState } from 'react'
import { Button, Empty, Form, Input, Modal, Popconfirm, Radio, Select, Spin, Tooltip, Upload, message } from 'antd'
import { ExclamationCircleOutlined, InboxOutlined } from '@ant-design/icons'
import InfiniteScroll from 'react-infinite-scroll-component'
import { useUpdateEffect } from 'ahooks'
import Image from 'next/image'
import p1 from './assets/script.png'
import style from './page.module.scss'
import { useApplicationContext } from '@/shared/hooks/app-context'
import CreatorSelect from '@/app/components/tagSelect/creatorSelect'
import ClassifyMode, { tagList } from '@/app/components/tagSelect/ClassifyMode'
import Iconfont from '@/app/components/base/iconFont'
import useAuthPermissions from '@/shared/hooks/use-radio-auth'
import { createPrompt, deletePrompt } from '@/infrastructure/api/prompt'
import { getDatasetListNew } from '@/infrastructure/api/data'
import { API_PREFIX } from '@/app-specs'
const { Dragger } = Upload
const ScriptManage = () => {
  const [form] = Form.useForm()
  const authRadio = useAuthPermissions()
  const [name, setName] = useState('')
  const [sValue, setSValue] = useState('')
  const [title, setTitle] = useState('新建脚本')
  const [isEdit, setIsEdit] = useState(false)
  const [isView, setIsView] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [list, setList] = useState<any>([])
  const [fileList, setFileList] = useState<any>([])
  const [btnLoading, setBtnLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [haveMore, setHaveMore] = useState(true)
  const [pageOption, setPageOption] = useState({ page: 1, page_size: 16 })
  const [selectLabels, setSelectLabels] = useState([]) as any
  const [creator, setCreator] = useState([]) as any
  const token = localStorage.getItem('console_token')
  const { userSpecified } = useApplicationContext()
  const [refreshFlag, setRefreshFlag] = useState({})

  const getList = async (flag: any, page) => {
    const url = '/script/list'
    const param: any = {
      ...pageOption,
      page,
      per_page: 16,
      name,
      script_type: selectLabels?.map(item => item?.id),
      user_id: creator,
    }
    setLoading(true)
    try {
      const res: any = await getDatasetListNew({
        url,
        body: param,
      })
      if (res.data) {
        const { data = [], hasAdditional } = res
        if (flag === 1)
          setList([...data])
        else
          setList([...list, ...data])
        setHaveMore(hasAdditional)
      }
    }
    finally {
      setLoading(false)
    }
  }
  useUpdateEffect(() => {
    getList(2, pageOption.page)
  }, [pageOption.page])

  useEffect(() => {
    getList(1, 1)
  }, [selectLabels, name, creator, refreshFlag])
  const handleDownload = (e: React.MouseEvent<HTMLDivElement, MouseEvent>, item: { script_url?: string; name: string }) => {
    e.stopPropagation()
    if (item?.script_url) {
      // 创建一个临时的 a 标签来触发下载
      const link = document.createElement('a')
      link.href = item.script_url.replace('/app', '/static')
      link.download = item.script_url.split('/').pop() || `${item?.name}.py`
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
    else {
      message.error('文件链接不存在')
    }
  }

  const handleUpdate = async (e, item: any) => {
    e.stopPropagation()
    setIsView(false)
    setIsEdit(true)
    setTitle('编辑脚本')
    form.setFieldsValue({
      name: item?.name, description: item?.description, script_type: item?.script_type, script_url: item?.script_url, script_id: item?.id,
    })
    setFileList([{ name: item?.script_url.split('/').pop() }])
    setIsModalOpen(true)
  }
  const viewDetail = async (item: any) => {
    setIsView(true)
    setTitle('查看脚本')
    form.setFieldsValue({
      name: item?.name, description: item?.description, script_type: item?.script_type, script_url: item?.script_url,
    })
    setFileList([{ name: item?.script_url.split('/').pop() }])
    setIsModalOpen(true)
  }
  const handleDelete = async (e, id: any) => {
    e.stopPropagation()
    const url = '/script/delete'
    const res: any = await deletePrompt({ url, body: { script_id: id } })
    if (res.code === 200) {
      message.success('删除成功')
      setPageOption({ ...pageOption, page: 1 })
      setList([])
      getList(1, 1)
    }
  }

  const handleCreateScript = () => {
    setIsEdit(false)
    setIsView(false)
    setTitle('新建脚本')
    setFileList([])
    setIsModalOpen(true)
  }
  const handleOk = () => {
    if (isView) {
      setIsModalOpen(false)
      setIsView(false)
      return
    }
    let gUrl = ''
    if (isEdit)
      gUrl = '/script/update'
    else
      gUrl = '/script/create'

    form.validateFields().then(async (values) => {
      setBtnLoading(true)
      try {
        const res: any = await createPrompt({
          url: gUrl,
          body: { ...values, icon: '' },
        })
        if (res?.name) {
          message.success('保存成功')
          form.resetFields()
          setIsModalOpen(false)
          setPageOption({ ...pageOption, page: 1 })
          setList([])
          getList(1, 1)
          if (!isEdit)
            setHaveMore(true)
        }
      }
      finally {
        setBtnLoading(false)
      }
    })
  }
  const loadMoreData = () => {
    if (loading)
      return

    setPageOption({ ...pageOption, page: pageOption.page + 1 })
  }
  const handleCancel = () => {
    setIsModalOpen(false)
    form.resetFields()
  }
  const onSearch = (value: string) => {
    setList([])
    setPageOption({ ...pageOption, page: 1 })
    setName(value)
    setRefreshFlag({})
    // 调用重复统一由useEffect处调用
  }
  const onSearchChange = (e) => {
    setSValue(e.target.value)
  }
  const handleUpChange = (info) => {
    if (info.file.status === 'uploading') {
      setLoading(true)
      setFileList(info?.fileList)
    }

    else if (info.file.status === 'done') {
      setLoading(false)
      if (info.file.response?.file_path) {
        setFileList(info?.fileList)
        form.setFieldValue('script_url', info.file.response.file_path)
        message.success('上传成功')
      }
      else {
        // 响应数据异常，移除文件并清空 script_url
        const filteredFileList = info.fileList.filter((file: any) => file.status !== 'done' || file.response?.file_path)
        setFileList(filteredFileList)
        form.setFieldValue('script_url', '')
        message.error('上传失败，响应数据异常')
      }
    }

    else if (info.file.status === 'error') {
      setLoading(false)
      // 上传失败时，移除失败的文件，并清空 script_url
      const filteredFileList = info.fileList.filter((file: any) => file.status !== 'error')
      setFileList(filteredFileList)
      form.setFieldValue('script_url', '')
      const errorMessage = info.file.response?.message || info.file.error?.message || '上传失败，请重试'
      message.error(errorMessage)
    }

    else {
      setLoading(false)
    }
  }
  const onRemove = () => {
    setFileList([])
    form.setFieldValue('script_url', '')
    return true
  }
  const normFile = (e: any) => {
    if (Array.isArray(e))
      return e

    return e?.fileList
  }
  const beforeUpload = (file: any) => {
    return new Promise<boolean>((resolve, _reject) => {
      // 检查文件类型
      const isPyFile = file.name.toLowerCase().endsWith('.py')
      if (!isPyFile) {
        message.error('只能上传(.py) 文件！')
        resolve(false)
        return
      }

      // 检查文件大小
      const isLt2M = file.size / 1024 / 1024 < 1
      if (!isLt2M) {
        message.error('文件不能大于1M')
        resolve(false)
        return
      }

      resolve(true)
    })
  }
  const customRequest = async (options: any) => {
    const { file, onSuccess, onError, onProgress } = options
    const formData = new FormData()
    formData.append('file', file as File)

    try {
      const xhr = new XMLHttpRequest()

      // 监听上传进度
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const percent = (event.loaded / event.total) * 100
          onProgress({ percent })
        }
      })

      // 监听请求完成
      xhr.addEventListener('load', () => {
        try {
          const response = JSON.parse(xhr.responseText)

          // 检查响应的 code 字段
          if (response.code === 200) {
            // code 是 200，表示成功
            if (response.file_path)
              onSuccess?.(response)
            else
              onError?.(new Error('上传失败，响应数据异常'))
          }
          else if (xhr.status === 400 || response.code === 400) {
            // 400 错误，显示接口返回的 message
            const errorMessage = response.message || '上传失败'
            onError?.(new Error(errorMessage))
          }
          else {
            // 其他错误
            const errorMessage = response.message || `上传失败: ${xhr.status}`
            onError?.(new Error(errorMessage))
          }
        }
        catch (error) {
          // 响应解析失败
          onError?.(new Error(`响应解析失败: ${xhr.status}`))
        }
      })

      // 监听错误
      xhr.addEventListener('error', () => {
        onError?.(new Error('网络错误，上传失败'))
      })

      // 打开请求
      xhr.open('POST', `${API_PREFIX}/script/upload`)
      xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      // 不要手动设置 Content-Type，让浏览器自动设置（包含 boundary）

      // 发送请求
      xhr.send(formData)
    }
    catch (error) {
      onError?.(error)
    }
  }
  const canEdit = (val) => {
    if (val === '00000000-0000-0000-0000-000000000000')
      return authRadio.isAdministrator
    else if (val === userSpecified?.id)
      return true
    else
      return authRadio.isAdministrator || authRadio.editPermit
  }
  const canAddDelete = (val) => {
    if (val === '00000000-0000-0000-0000-000000000000')
      return authRadio.isAdministrator
    else if (val === userSpecified?.id)
      return true
    else
      return authRadio.isAdministrator || authRadio.addDeletePermit
  }

  const canDownload = (val) => {
    if (val === '00000000-0000-0000-0000-000000000000')
      return authRadio.isAdministrator
    else if (val === userSpecified?.id)
      return true
  }

  return (
    <div className={style.scriptWrap}>
      <div className={style.top}>
        {/* <Radio.Group options={authRadio.is_self_space ? mineAuthOptions : authOptions} onChange={altChange} value={authValue} optionType="button" /> */}
        <ClassifyMode selectLabels={selectLabels} setSelectLabels={setSelectLabels} type='script' singleSelect={true} />
        <Button type='primary' onClick={handleCreateScript}>新建脚本</Button>
      </div>
      <div className={style.search}>
        {/* <Radio.Group options={options} onChange={onChange} value={value} optionType="button" /> */}
        <Form.Item label="其他选项">
          <CreatorSelect value={creator} setCreator={setCreator} type='dataset' />

        </Form.Item>
        <Input.Search allowClear onChange={onSearchChange} value={sValue} onSearch={onSearch} style={{ width: 270 }} placeholder='请输入关键字进行搜索' />
      </div>
      {loading && !list?.length
        ? <div className='flex justify-center items-center' style={{ height: '400px' }}>
          <Spin size="large" tip="加载中..." />
        </div>
        : list?.length
          ? <div className={style.scrollWrap} id='scrollableDiv'>
            <InfiniteScroll
              // scrollThreshold={0.3}
              dataLength={list.length}
              next={loadMoreData}
              hasMore={haveMore}
              loader={<Spin style={{ width: '100%' }} />}
              endMessage={list.length && <div style={{ width: '100%', height: 40 }}></div>}
              scrollableTarget="scrollableDiv"
              className={style.middle}
            >
              {
                list.map((item: any) => <div key={item.id} onClick={() => viewDetail(item)} className={style.prpItem}>
                  <div className={style.first}>
                    <div className={style.left}>
                      <Image src={p1} alt="" />
                    </div>
                    <div className={style.right} >{item?.name}</div>
                  </div>
                  <div className={style.account}>创建人：{item?.user_name}</div>
                  <div className={style.second} >{item?.description}</div>
                  <div className={style.third}>
                    <div className={style.statuShow}>
                      {/* <Tag color={statuTag[item?.upload_status]['color']}>{statuTag[item?.upload_status]['text']}</Tag> */}
                    </div>
                    <div className={style.actionBtn}>
                      {
                        canDownload(item?.user_id) && <div className={`${style.iconWrap} ${style.actionsIcon}`} onClick={e => handleDownload(e, item)}>
                          <Iconfont type='icon-xiazai' />
                        </div>
                      }
                      {canEdit(item?.user_id) && <div className={`${style.iconWrap} ${style.actionsIcon}`} onClick={e => handleUpdate(e, item)}>
                        <Iconfont type='icon-bianji1' />
                      </div>}
                      {canAddDelete(item?.user_id)
                        && <div onClick={e => e.stopPropagation()}>
                          <Popconfirm
                            title="删除"
                            description="删除不可逆，请确认"
                            onConfirm={e => handleDelete(e, item?.id)}
                            onCancel={e => e?.stopPropagation()}
                            okText="确认"
                            cancelText="取消"
                          >
                            <div onClick={(e) => {
                              e.stopPropagation()
                            }} className={`${style.iconWrap} ${style.actionsIcon}`}>
                              <Iconfont type='icon-shanchu1' />
                            </div>
                          </Popconfirm>
                        </div>
                      }
                    </div>
                  </div>
                </div>)
              }
            </InfiniteScroll>
          </div>
          : <Empty className='pt-[150px]' description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
      <Modal width={500} cancelText="取消" confirmLoading={btnLoading || loading} okText={isView ? '确定' : '保存'} title={title} open={isModalOpen} onOk={handleOk} onCancel={handleCancel}>
        <div className={style.createWrap}>
          <Form form={form} className={style.resetForm} layout="vertical">
            <Form.Item name="script_id" hidden>
              <Input />
            </Form.Item>
            <Form.Item
              name="name"
              validateTrigger="onBlur"
              label={'脚本名称'}
              rules={[
                { required: true, message: '请输入名称' },
                { whitespace: true, message: '输入不能为空或仅包含空格' },
              ]}
            >
              <Input
                placeholder="请输入名称"
                maxLength={30}
                className={style.antInput}
                disabled={isEdit || isView}
              />
            </Form.Item>
            <Form.Item
              name="description"
              validateTrigger="onBlur"
              label="简介"
              rules={[
                { required: true, message: '请输入简介' },
                {
                  validator: (_, value) => {
                    if (value && value.trim() === '')
                      return Promise.reject('简介不能为空格')

                    return Promise.resolve()
                  },
                },
              ]}
            >
              <Input.TextArea
                showCount
                maxLength={300}
                disabled={isView}
                placeholder="请输入简介"
                rows={6}
              />
            </Form.Item>
            <Form.Item
              name="script_type"
              label={<div>脚本类型<Tooltip className='ml-1' title={<><div>数据增强：通过规则生成或数据回流机制，自动扩展原始数据集，生成新的文本样本，以弥补真实数据的不足，提升模型对多样化输入的适应能力。</div>
                <div>数据过滤：自动识别并剔除不符合结构要求或任务目标的样本，如缺失关键字段（如 instruction 或 output）、内容异常或与任务无关的数据，同时对文本长度进行规范化处理，确保输入稳定、有效。</div>
                <div> 数据去噪：清除文本中的乱码、错别字、重复内容、低质量表达等干扰项，或对其进行修正，从而提升语料质量和模型学习效果。</div>
                <div>数据标注：对原始文本进行结构化加工和语义提取，补充必要的元信息，以支持更精细化的任务驱动训练。</div></>}>
                <ExclamationCircleOutlined />
              </Tooltip></div>}
              rules={[
                { required: true, message: '请选择脚本类型' },
              ]}
              initialValue="数据过滤"
            >
              <Radio.Group disabled={isView}>
                {
                  tagList.script.map(item => <Radio value={item.id} key={item.id}>{item.name}</Radio>)
                }
              </Radio.Group>
            </Form.Item>
            <Form.Item
              name="data_type"
              label={'数据类型'}
              initialValue="文本类"
              rules={[
                { required: true, message: '请选数据类型' },
              ]}
            >
              <Radio.Group disabled={isView}>
                <Radio value={'文本类'}>文本数据集</Radio>
              </Radio.Group>
            </Form.Item>
            <Form.Item
              name="input_type"
              label={'导入方式'}
              rules={[
                { required: true, message: '请选导入方式' },
              ]}
              initialValue="local"
            >
              <Select
                disabled={isView}
                placeholder="请选择模版"
                options={[{ value: 'local', label: '本地导入' }]}
                allowClear
              />
            </Form.Item>
            <Form.Item
              label="导入文件"
              name="script_url"
              getValueFromEvent={normFile}
              rules={[
                { required: true, message: '请上传文件' },
              ]}
              extra={<div className="ant-upload-hint">
                <div>导入要求：</div>
                <div>1. 文件格式要求.py文件；</div>
                <div>2.文件名应按“数据格式_函数名”命名，例如：alpaca_clean_data.py</div>
                <div>3. 文件大小在1M以内</div>
              </div>}
            >
              <Dragger
                accept='.py'
                disabled={isView}
                maxCount={1}
                fileList={fileList}
                name="file"
                customRequest={customRequest}
                onChange={handleUpChange}
                beforeUpload={beforeUpload}
                onRemove={onRemove}
              >
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">将文件拖拽至此区域或选择文件上传</p>
              </Dragger>
            </Form.Item>
          </Form>
        </div>
      </Modal>
    </div>
  )
}

export default ScriptManage
