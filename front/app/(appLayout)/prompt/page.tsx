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
import TagMode from '@/app/components/tagSelect/TagMode'
import CreatorSelect from '@/app/components/tagSelect/creatorSelect'
import { useApplicationContext } from '@/shared/hooks/app-context'
import { PromptService, Service } from '@/infrastructure/api/generated'
import AIPromptModal from '@/app/components/AIPromptModal'
import { usePermitContext } from '@/shared/hooks/permit-context'
const Prompt = () => {
  const [form] = Form.useForm()
  const authRadio = useRadioAuth()
  const { statusAi } = usePermitContext()
  const [id, setId] = useState('')
  const [title, setTitle] = useState('新建Prompt')
  const [isEdit, setIsEdit] = useState(false)
  const [isView, setIsView] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [icon] = useState(p1)
  const [list, setList] = useState<any>([])
  const [btnLoading, setBtnLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [haveMore, setHaveMore] = useState(true)
  const [pageOption, setPageOption] = useState({ page: 1, per_page: 16 })
  const [searchVal, setSearchVal] = useState('')
  const [sName, setSName] = useState('')
  const [creator, setCreator] = useState([]) as any
  const [selectTags, setSelectTags] = useState([]) as any
  const [refreshFlag, setRefreshFlag] = useState(false)
  const [tagSelectKey, setTagSelectKey] = useState(0)
  const selectRef: any = useRef()
  const { userSpecified } = useApplicationContext()
  const [isAIModalOpen, setIsAIModalOpen] = useState(false)
  const [systemContent, setSystemContent] = useState('')

  useEffect(() => {
    if (isModalOpen)
      setTagSelectKey(prev => prev + 1)
  }, [isModalOpen])

  const getList = async (flag: any, page) => {
    setLoading(true)
    try {
      const res = await PromptService.postPromptList({
        page,
        per_page: 16,
        search_tags: selectTags?.map(item => item.name),
        user_id: Array.isArray(creator) ? creator : (creator ? [creator] : []),
        search_name: sName,
      })
      const data = res?.data ?? (res as any)?.result
      if (data) {
        const prompts = data.prompts ?? []
        const next_page = data.next_page
        if (flag === 1)
          setList(prompts)
        else
          setList([...list, ...prompts])

        if (!next_page)
          setHaveMore(false)
        else
          setHaveMore(true)
      }
    }
    catch (error) {
      console.error('获取列表失败:', error)
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
  }, [sName, creator, selectTags, refreshFlag])
  const syncSystemContentFromForm = () => {
    setSystemContent(form.getFieldValue('system') || '')
  }

  const handleUpdate = async (e, item: any) => {
    e.stopPropagation()
    setIsView(false)
    setIsEdit(true)
    setId(item?.id)
    setTitle('编辑Prompt')
    setTagSelectKey(prev => prev + 1)
    setIsModalOpen(true)
    try {
      const id = item?.id != null ? Number(item.id) : item?.id
      if (id == null || Number.isNaN(id)) {
        message.warning('无法获取该 Prompt 的 ID')
        return
      }
      const res: any = await PromptService.getPrompt(id)
      const resultData = res?.data ?? res?.result
      if (!resultData) {
        message.warning('获取详情失败，请重试')
        return
      }
      const currentData: any = {
        name: resultData?.name,
        describe: resultData?.describe,
        content: resultData?.content,
        tag_names: item?.tags ?? [],
      }
      try {
        currentData.system = JSON.parse(resultData?.content || '[]')?.find((x: any) => x.role === 'system')?.content?.trim() || ''
        currentData.user = JSON.parse(resultData?.content || '[]')?.find((x: any) => x.role === 'user')?.content?.trim() || ''
      }
      catch {
        currentData.system = ''
        currentData.user = ''
      }
      form.setFieldsValue({ ...currentData })
      syncSystemContentFromForm()
    }
    catch (err) {
      console.error('获取详情失败:', err)
      message.error('获取详情失败，请重试')
    }
  }

  const handleCopy = async (e, item: any) => {
    e.stopPropagation()
    setIsView(false)
    setIsEdit(false)
    setId('')
    setTitle('复制Prompt')
    try {
      const res: any = await PromptService.getPrompt(Number(item?.id))
      const result = res?.data ?? res?.result
      if (!result)
        return
      let systemContent = ''
      let userContent = ''
      try {
        const contentArray = JSON.parse(result?.content || '[]')
        systemContent = contentArray.find((x: any) => x.role === 'system')?.content?.trim() || ''
        userContent = contentArray.find((x: any) => x.role === 'user')?.content?.trim() || ''
      }
      catch {
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
    catch (err) {
      console.error('获取详情失败:', err)
    }
  }

  const viewDetail = async (item: any) => {
    setIsView(true)
    setIsEdit(false)
    setId(item?.id)
    setTitle('查看Prompt')
    try {
      const res: any = await PromptService.getPrompt(Number(item?.id))
      const result = res?.data ?? res?.result
      if (!result)
        return
      const currentData: any = {
        name: result?.name,
        describe: result?.describe,
        content: result?.content,
        tag_names: item?.tags ?? [],
      }
      try {
        currentData.system = JSON.parse(result?.content || '[]')?.find((x: any) => x.role === 'system')?.content?.trim() || ''
        currentData.user = JSON.parse(result?.content || '[]')?.find((x: any) => x.role === 'user')?.content?.trim() || ''
      }
      catch {
        currentData.system = ''
        currentData.user = ''
      }
      form.setFieldsValue({ ...currentData })
      syncSystemContentFromForm()
      setIsModalOpen(true)
    }
    catch (err) {
      console.error('获取详情失败:', err)
    }
  }
  const handleDelete = async (e, id: any) => {
    e.stopPropagation()
    try {
      const res: any = await PromptService.postPromptDelete(Number(id))
      const ok = res?.status === 0 || res?.code === 0 || res?.code === 200
      if (ok) {
        message.success('删除成功')
        setPageOption(prev => ({ ...prev, page: 1 }))
        setList([])
        await getList(1, 1)
        selectRef.current?.getList()
      }
    }
    catch (err) {
      console.error('删除失败:', err)
    }
  }
  const handleCreatePrompt = () => {
    setIsEdit(false)
    setIsView(false)
    setId('')
    setTitle('新建Prompt')
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
    form.validateFields().then(async (values) => {
      setBtnLoading(true)
      const params = { ...values }
      params.content = JSON.stringify([
        { role: 'system', content: params.system || '' },
        { role: 'user', content: params.user || '' },
      ])
      delete params.system
      delete params.user

      try {
        const body = { name: params.name, describe: params.describe, content: params.content, category: params.category }
        const res: any = isEdit
          ? await PromptService.postPrompt1(Number(id), body)
          : await PromptService.postPrompt(body)
        const ok = res?.status === 0
        if (ok) {
          message.success('保存成功')
          setIsModalOpen(false)
          form.resetFields()
          setSystemContent('')
          setPageOption(prev => ({ ...prev, page: 1 }))
          setList([])
          if (!isEdit)
            setHaveMore(true)
          const targetId = isEdit ? String(id) : String(res?.result?.id)
          try {
            await Service.postTagsBindingsUpdate({
              type: 'prompt',
              tag_names: params?.tag_names ?? [],
              target_id: targetId,
            })
          }
          finally {
            selectRef.current?.getList()
            await getList(1, 1)
          }
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
        <Button type='primary' onClick={handleCreatePrompt}>新建 Prompt</Button>
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
              label="Prompt 名称"
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
              <TagSelect label="prompt 标签" key={tagSelectKey} disabled={isView} fieldName="tag_names" type="prompt" onRefresh={async () => {
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
