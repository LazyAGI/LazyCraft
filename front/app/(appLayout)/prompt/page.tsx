'use client'
import React, { useEffect, useRef, useState } from 'react'
import { Button, Col, Empty, Form, Input, Modal, Popconfirm, Row, Spin, Tag, message } from 'antd'
import InfiniteScroll from 'react-infinite-scroll-component'
import { useUpdateEffect } from 'ahooks'
import Image from 'next/image'
import p1 from './assets/promptModel.png'
import style from './page.module.scss'
import Iconfont from '@/app/components/base/iconFont'
import useRadioAuth from '@/shared/hooks/use-radio-auth'
import TagSelect from '@/app/components/tagSelect'
import { bindTags } from '@/infrastructure/api/tagManage'
import TagMode from '@/app/components/tagSelect/TagMode'
import CreatorSelect from '@/app/components/tagSelect/creatorSelect'
import { useApplicationContext } from '@/shared/hooks/app-context'
import { createPrompt, deletePrompt, getAdjustList, getPromptDetail } from '@/infrastructure/api/prompt'
import { pageCache } from '@/shared/utils'
import AIPromptModal from '@/app/components/AIPromptModal'
import { usePermitContext } from '@/shared/hooks/permit-context'
const Prompt = () => {
  const [form] = Form.useForm()
  const authRadio = useRadioAuth()
  const [value, setValue] = useState(pageCache.getTab({ name: pageCache.category.promptBelong }) || 'prompt')
  const { statusAi } = usePermitContext()
  const [id, setId] = useState('')
  const [title, setTitle] = useState('新建Prompt')
  const [isEdit, setIsEdit] = useState(false)
  const [isView, setIsView] = useState(false)
  const [isCopy, setIsCopy] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [icon, setIcon] = useState(p1)
  const [list, setList] = useState<any>([])
  const [btnLoading, setBtnLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [haveMore, setHaveMore] = useState(true)
  const [pageOption, setPageOption] = useState({ page: 1, per_page: 16 })
  const [promptType, setPromptType] = useState<'string' | 'dict'>('string')
  const [searchVal, setSearchVal] = useState('')
  const [sName, setSName] = useState('')
  const [creator, setCreator] = useState([]) as any
  const [selectTags, setSelectTags] = useState([]) as any
  const [refreshFlag, setRefreshFlag] = useState(false)
  const [tagSelectKey, setTagSelectKey] = useState(0)
  const isPrompt = value == 'prompt'
  const selectRef: any = useRef()
  const { userSpecified } = useApplicationContext()
  const [isAIModalOpen, setIsAIModalOpen] = useState(false)
  const [systemContent, setSystemContent] = useState('')

  useEffect(() => {
    if (isModalOpen)
      setTagSelectKey(prev => prev + 1)
  }, [isModalOpen])

  const getList = async (flag: any, page) => {
    const url = isPrompt ? '/prompt/list' : '/prompt-template/list'
    const param: any = {
      ...pageOption,
      page,
      per_page: 16,
      search_tags: selectTags?.map(item => item.name),
      user_id: creator,
      search_name: sName,
    }
    setLoading(true)
    try {
      const res: any = await getAdjustList({
        url,
        body: param,
      })
      if (res?.result) {
        const { templates = [], next_page, prompts = [] } = res?.result
        if (flag === 1)
          setList([...templates, ...prompts])
        else
          setList([...list, ...templates, ...prompts])

        if (!next_page)
          setHaveMore(false)
        else
          setHaveMore(true)
      }
    }
    finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    getList(2, pageOption.page)
  }, [pageOption.page])

  useUpdateEffect(() => {
    getList(1, 1)
  }, [value, sName, creator, selectTags, refreshFlag])
  const syncSystemContentFromForm = () => {
    setSystemContent(form.getFieldValue('system') || '')
  }

  const handleUpdate = async (e, item: any) => {
    e.stopPropagation()
    setIsView(false)
    setIsEdit(true)
    setIsCopy(false)
    setId(item?.id)
    setTitle(isPrompt ? '编辑Prompt' : '编辑Prompt 模版')
    const url = isPrompt ? `/prompt/${item?.id}` : `/prompt-template/${item?.id}`
    const res: any = await getPromptDetail({ url })
    if (res?.status === 0) {
      const { result } = res
      const currentData: any = {
        name: result?.name,
        describe: result?.describe,
        content: result?.content,
        tag_names: item?.tags,
      }
      // 解析角色内容
      try {
        currentData.system = JSON.parse(result?.content)?.find((item: any) => item.role === 'system')?.content?.trim() || ''
        currentData.user = JSON.parse(result?.content)?.find((item: any) => item.role === 'user')?.content?.trim() || ''
      }
      catch (error) {
        currentData.system = ''
        currentData.user = ''
      }
      form.setFieldsValue({
        ...currentData,
      })
      syncSystemContentFromForm()
      setIsModalOpen(true)
    }
  }

  const handleCopy = async (e, item: any) => {
    e.stopPropagation()
    setIsView(false)
    setIsEdit(false)
    setIsCopy(true)
    setId('')
    setTitle(isPrompt ? '复制Prompt' : '复制Prompt 模版')
    const url = isPrompt ? `/prompt/${item?.id}` : `/prompt-template/${item?.id}`
    const res: any = await getPromptDetail({ url })
    if (res?.status === 0) {
      const { result } = res
      let systemContent = ''
      let userContent = ''

      try {
        const contentArray = JSON.parse(result?.content || '[]')
        systemContent = contentArray.find((item: any) => item.role === 'system')?.content?.trim() || ''
        userContent = contentArray.find((item: any) => item.role === 'user')?.content?.trim() || ''
      }
      catch (error) {
        systemContent = ''
        userContent = ''
      }

      const currentData = {
        name: `${result?.name}`,
        describe: result?.describe,
        category: result?.category || 'string',
        system: systemContent,
        user: userContent,
        tag_names: item?.tags,
      }

      form.setFieldsValue(currentData)
      setSystemContent(systemContent)
      setIsModalOpen(true)
    }
  }

  const viewDetail = async (item: any) => {
    setIsView(true)
    setIsEdit(false)
    setIsCopy(false)
    setId(item?.id)
    setTitle(isPrompt ? '查看Prompt' : '查看Prompt 模版')
    const url = isPrompt ? `/prompt/${item?.id}` : `/prompt-template/${item?.id}`
    const res: any = await getPromptDetail({ url })
    if (res?.status === 0) {
      const { result } = res

      const currentData: any = {
        name: result?.name,
        describe: result?.describe,
        content: result?.content,
        tag_names: item?.tags,
      }

      // 解析角色内容
      try {
        currentData.system = JSON.parse(result?.content)?.find((item: any) => item.role === 'system')?.content?.trim() || ''
        currentData.user = JSON.parse(result?.content)?.find((item: any) => item.role === 'user')?.content?.trim() || ''
      }
      catch (error) {
        currentData.system = ''
        currentData.user = ''
      }

      form.setFieldsValue({
        ...currentData,
      })
      syncSystemContentFromForm()
      setIsModalOpen(true)
    }
  }
  const handleDelete = async (e, id: any) => {
    e.stopPropagation()
    const url = isPrompt ? `/prompt/delete/${id}` : `/prompt-template/delete/${id}`
    const res: any = await deletePrompt({ url, body: {} })
    if (res.status === 0) {
      message.success('删除成功')
      setPageOption({ ...pageOption, page: 1 })
      setList([])
      getList(1, 1)
      // 重新获取标签
      selectRef.current.getList()
    }
  }
  const handleCreatePrompt = () => {
    setIsEdit(false)
    setIsView(false)
    setIsCopy(false)
    // isPrompt && getOriginList()
    isPrompt && setPromptType('string')
    setTitle(isPrompt ? '新建Prompt' : '新建Prompt 模版')
    form.resetFields()
    setSystemContent('')
    setIsModalOpen(true)
  }
  const handleOk = () => {
    selectRef.current.getList()
    if (isView) {
      setIsModalOpen(false)
      setIsView(false)
      return
    }
    let gUrl = ''
    if (isEdit)
      gUrl = isPrompt ? `/prompt/${id}` : `/prompt-template/${id}`
    else
      gUrl = isPrompt ? '/prompt' : '/prompt-template'

    form.validateFields().then(async (values) => {
      setBtnLoading(true)

      const params = { ...values }
      // 始终使用角色格式
      params.content = JSON.stringify([
        { role: 'system', content: params.system || '' },
        { role: 'user', content: params.user || '' },
      ])
      delete params.system
      delete params.user

      try {
        const res: any = await createPrompt({
          url: gUrl,
          body: params,
        })
        if (res.status == 0) {
          message.success('保存成功')
          form.resetFields()
          await bindTags({ url: 'tags/bindings/update', body: { type: isPrompt ? 'prompt' : 'prompt_template', tag_names: params?.tag_names, target_id: isEdit ? id : res?.result?.id } })
          setIsModalOpen(false)
          setPageOption({ ...pageOption, page: 1 })
          selectRef.current.getList()
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
    setSystemContent('')
    setIsModalOpen(false)
    form.resetFields()
  }
  const onSearchApp = (e) => {
    if (sName === e)
      // 触发effect重新请求数据
      setRefreshFlag(!refreshFlag)

    setSName(e)
    setHaveMore(true)
    setList([])
    setPageOption({ ...pageOption, page: 1 })
    !e && getList(1, 1)
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
  const handleAIConfirm = (content: string) => {
    const trimmedContent = content.trim()
    setSystemContent(trimmedContent)
    form.setFieldsValue({ system: trimmedContent })
    setIsAIModalOpen(false)
  }

  return (
    <div className={style.promptWrap}>
      <div className={style.top}>
        <TagMode ref={selectRef} selectLabels={selectTags} setSelectLabels={setSelectTags} type='prompt' />
        <Button type='primary' onClick={handleCreatePrompt}>{isPrompt ? ' 新建 Prompt' : '新建 Prompt模版'}</Button>
      </div>
      <div className='flex justify-between mt-[15px]'>
        <Form.Item label="其他选项">
          <CreatorSelect value={creator} setCreator={setCreator} type='prompt' />
        </Form.Item>
        <Input.Search
          placeholder='请输入搜索内容'
          value={searchVal}
          allowClear
          onChange={e => setSearchVal(e.target.value)}
          onSearch={onSearchApp}
          style={{ width: 270 }}
        />
      </div>
      <Spin spinning={loading}>
        {list?.length
          ? <div className={style.scrollWrap} id='scrollableDiv'>
            <InfiniteScroll
              // scrollThreshold={0.3}
              dataLength={list.length}
              next={loadMoreData}
              hasMore={haveMore}
              loader={<Spin style={{ width: '100%' }} />}
              endMessage={<div style={{ margin: '20px 0', width: '100%' }}></div>}
              scrollableTarget="scrollableDiv"
              className={style.middle}
            >
              {
                list.map((item: any) => <div key={item.id} onClick={() => viewDetail(item)} className={style.prpItem}>
                  <div className={style.first}>
                    <div className={style.left}>
                      <Image src={icon} alt="" />
                    </div>
                    <div className={style.right} >{item?.name}</div>
                  </div>
                  <div className={style.account}>创建人：{item?.user_name}</div>
                  <div className={style.second} >{item?.describe || '暂无描述'}</div>
                  <div className={style.tagWrap} onClick={e => e.stopPropagation()}>
                    {item?.tags?.map(item => <Tag key={item}>{item}</Tag>)}
                  </div>
                  <div className={style.third}>
                    <div className={`${style.iconWrap} ${style.actionsIcon}`} onClick={e => handleCopy(e, item)}>
                      <Iconfont type='icon-fuzhi' />
                    </div>
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
                          overlayStyle={{ zIndex: 1000 }}
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
                </div>)
              }
            </InfiniteScroll>
          </div>
          : <Empty className='pt-[150px]' description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
      </Spin>
      <Modal width={1022} cancelText="取消" confirmLoading={btnLoading} okText={isView ? '确定' : '保存'} title={title} open={isModalOpen} onOk={handleOk} onCancel={handleCancel}>
        <div className={style.createWrap}>
          <Form form={form} className={style.resetForm} layout="vertical">
            <Form.Item
              name="name"
              validateTrigger="onBlur"
              label={isPrompt ? 'Prompt 名称' : 'Prompt 模版名称'}
              rules={[
                { required: true, message: '请输入名称' },
                { whitespace: true, message: '输入不能为空或仅包含空格' },
              ]}
            >
              <Input
                placeholder="请输入名称"
                maxLength={30}
                className={style.antInput}
                disabled={isView}
              />
            </Form.Item>
            <Form.Item
              noStyle
            >
              {/* TagSelect内部已自带Form.Item */}
              <TagSelect label={isPrompt ? 'prompt 标签' : 'prompt 模版标签'} key={tagSelectKey} disabled={isView} fieldName="tag_names" type="prompt" onRefresh={async () => {
                await selectRef.current.getList()
              }} onTagsDeleted={() => {
                // 当标签被删除时，清空筛选状态
                setSelectTags([])
                setCreator([])
                setSName('')
                setSearchVal('')
              }} />
            </Form.Item>
            <Form.Item
              name="describe"
              validateTrigger="onBlur"
              label="简介"
            >
              <Input.TextArea
                showCount
                maxLength={100}
                disabled={isView}
                placeholder="请输入Prompt介绍"
                rows={4}
              />
            </Form.Item>
            <Form.Item label="Prompt">
              <Row>
                <Col span={24} style={{ marginBottom: 10 }}>
                  <Form.Item
                    name="system"
                    label="系统角色"
                    rules={[
                      { required: true, message: '请输入系统提示词' },
                      { whitespace: true, message: '系统角色内容不能为空或仅包含空格' },
                    ]}
                  >
                    <Input.TextArea placeholder='系统提示词编辑区域' value={systemContent} disabled={isView} autoSize={{ minRows: 5 }} onChange={(e) => {
                      setSystemContent(e.target.value)
                      form.setFieldsValue({ system: e.target.value })
                    }} />
                    {statusAi && <Iconfont
                      type='icon-AIshengcheng1'
                      style={{
                        color: isView ? '#ccc' : '#1890ff',
                        fontSize: 16,
                        position: 'absolute',
                        right: 10,
                        bottom: 10,
                        cursor: isView ? 'not-allowed' : 'pointer',
                      }}
                      onClick={() => !isView && setIsAIModalOpen(true)}
                    />}
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item
                    name="user"
                    label="用户角色"
                    rules={[
                      { whitespace: true, message: '用户角色内容不能为空格' },
                    ]}
                  >
                    <Input.TextArea placeholder='用户提示词编辑区域' disabled={isView} autoSize={{ minRows: 5 }} />
                  </Form.Item>
                </Col>
              </Row>
            </Form.Item>
          </Form>
        </div>
      </Modal>
      <AIPromptModal
        open={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        onConfirm={handleAIConfirm}
      />
    </div>
  )
}

export default Prompt
