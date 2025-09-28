'use client'

import {
  Button, Col, Divider, Dropdown, Empty, Form, Image,
  Input, Modal, Popconfirm, Row, Select, Space,
  Spin, Switch, Tag, Tooltip, Typography, Upload,
  message,
} from 'antd'
import { DownOutlined, DownloadOutlined, InboxOutlined, LoadingOutlined, PlusOutlined } from '@ant-design/icons'
import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMount, useToggle, useUpdateEffect } from 'ahooks'
import InfiniteScroll from 'react-infinite-scroll-component'
import { debounce, isEmpty } from 'lodash'
import NextImage from 'next/image'
import copy from 'copy-to-clipboard'

import {
  APP_CREATE_ENUM, APP_MODE, appCreateItems, dragDSLFileProps,
  urlPrefix,
} from './utils'
import style from './style.module.scss'
import DefaultLogo from './app-default-logo.png'
import AppTemplate from './app-template'
import ApiKeyModel from './apiKeyModel'
import type { AppItem } from '@/core/data/common'
import useAuthPermissions from '@/shared/hooks/use-radio-auth'
import TagMode from '@/app/components/tagSelect/TagMode'
import { apiPublish, bindTags, getTagList } from '@/infrastructure/api//tagManage'
import TagSelect from '@/app/components/tagSelect'
import useTimestamp from '@/shared/hooks/use-timestamp'
import IconModal from '@/app/components/iconModal'
import ReferenceResultModal from '@/app/components/referenceResultModal'

import { appAddToTemplateApp, createApp, createTemplateApp, deleteApp, downloadAppJson, enableApi, importApp, updateAppInfo } from '@/infrastructure/api//apps'
import Iconfont from '@/app/components/base/iconFont'
import PermitCheck from '@/app/components/app/permit-check'
import { useApplicationContext } from '@/shared/hooks/app-context'
import { noOnlySpacesRule, pageCache } from '@/shared/utils'

const { Paragraph } = Typography
const { Dragger } = Upload

const Apps = () => {
  const { push } = useRouter()
  const { formatTime } = useTimestamp()
  const authRadio = useAuthPermissions()
  const defaultAppMode = pageCache.getTab({ name: pageCache.category.appList })
  const [createAppModalVisible, { toggle }] = useToggle(false)
  const [importDSLModalVisible, { toggle: toggleDSLModal }] = useToggle(false)
  const [templateModalVisible, { toggle: toggleTemplateModal }] = useToggle(false)
  const { userSpecified, teamData } = useApplicationContext() // , permitData
  const [loading, setLoading] = useState(false)
  const [curApp, setCurApp] = useState<any>({})
  const [iconModal, setIconModal] = useState<any>(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [iconState, setIconState] = useState<string>('')
  const searchForm = Form.useForm()[0]
  const createAppForm = Form.useForm()[0]
  const importDSLForm = Form.useForm()[0]
  const [submitLoading, setSubmitLoading] = useState(false)

  const [tags, setTags] = useState<any>([])
  const [categories, setCategories] = useState<any>([])

  // 获取标签列表
  const getTagsList = async () => {
    try {
      const res: any = await getTagList({ url: '/tags', options: { params: { type: 'app' } } })
      if (res && Array.isArray(res)) {
        setTags(res)
        // 更新 categories
        const categoriesData = res.map(el => ({ ...el, label: el.name, value: el.id }))
        setCategories(categoriesData)
      }
      else {
        setTags([])
        setCategories([])
      }
    }
    catch (error) {
      console.error('获取标签列表失败:', error)
      setTags([])
      setCategories([])
    }
  }

  // 强制刷新标签数据
  const refreshTags = async () => {
    setTags([])
    setCategories([])
    await getTagsList()
  }

  useEffect(() => {
    getTagsList()
  }, [])

  // 列表数据相关
  const [appData, setAppData] = useState<any>({})
  const [appLoading, setAppLoading] = useState(false)
  const [currentPreDebuggingStatus, setCurrentPreDebuggingStatus] = useState({})
  const [appMode, setAppMode] = useState(defaultAppMode || APP_MODE.MINE)
  const [selectLabels, setSelectLabels] = useState([]) as any
  const [isPublished, setIsPublished] = useState<any>()
  const [statu, setStatu] = useState<any>()
  const [searchName, setSearchName] = useState<any>()
  const [templateId, setTemplateId] = useState<string>('')
  const [messageApi, contextHolder] = message.useMessage()
  const [apiPublishModal, setApiPublishModal] = useState(false)
  const [currentApiItem, setCurrentApiItem] = useState<AppItem | null>(null)
  const [apiModalType, setApiModalType] = useState<'success' | 'close'>('success')
  // 引用结果弹层
  const [refVisible, setRefVisible] = useState(false)
  const [refId, setRefId] = useState<string>('')
  const [refType] = useState<'app'>('app')

  // 添加一个state来存储选中的文件
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const tagModeRef = useRef<any>(null)

  const getAppData = async ({ page, ...rest }, isReduceMode = true) => {
    setAppLoading(true)
    try {
      // 过滤掉 undefined 值，确保清空的筛选条件不会传递给后端
      const filteredParams = Object.fromEntries(
        Object.entries(rest).filter(([_, value]) => value !== undefined && value !== null && value !== ''),
      )

      const res: any = await bindTags({
        url: '/apps/list/page',
        body: { page, limit: 30, qtype: 'already', ...filteredParams },
      })
      const { data = [], ...otherRest } = res
      setAppData({
        data: (appData.data && isReduceMode) ? [...appData.data, ...data] : data,
        ...otherRest,
      })
    }
    finally {
      setAppLoading(false)
    }
  }
  useMount(() => {
    getAppData({ page: 1 })
  })

  const toTemplate = (app) => {
    if (app.status === 'draft') {
      message.warning('请先发布应用')
      return
    }

    // Reset form completely before any other activities
    createAppForm.resetFields()

    // Set state variables for template mode
    setIsEditMode(false)
    setCurApp({ ...app, convertToTemplate: true })

    // Open modal only after state is set
    setTimeout(() => {
      toggle()

      // Set form values after modal is opened
      setTimeout(() => {
        createAppForm.setFieldsValue({
          name: app.name,
          description: app.description,
          icon: app.icon,
          tag_names: app.tags || [],
        })
      }, 100)
    }, 0)
  }

  // 添加清空数据的函数
  const clearFormAndModalData = () => {
    setIconState('')
    setIsEditMode(false)
    setCurApp({})
    createAppForm.resetFields()
    // 强制清除表单的所有字段值
    createAppForm.setFieldsValue({
      name: '',
      description: '',
      icon: '',
      tag_names: [],
    })
  }

  const handleMenuClick = (e: any) => {
    if (e.key === APP_CREATE_ENUM.CREATE_BLANK_APP) {
      clearFormAndModalData()
      setTimeout(() => {
        toggle()
      }, 100)
    }
    else if (e.key === APP_CREATE_ENUM.IMPORT_DSL) {
      toggleDSLModal()
    }
    else {
      toggleTemplateModal()
    }
  }
  const handleDelete = async (id: any) => {
    await deleteApp(id)
    message.success('删除成功')
    getTagsList()
    setSelectLabels([])
    getAppData({ page: 1 }, false)
  }
  const onImportDSLSubmit = async (values: any) => {
    try {
      const formData = new FormData()
      formData.append('file', values.dsl.file)
      const res = await importApp({ data: formData })
      message.success('导入Json文件成功')
      toggleDSLModal()
      sessionStorage.removeItem('canvas-tab-active-key')
      setTimeout(() => {
        push(`/app/${res.id}/workflow`)
      }, 20)
    }
    catch (e: any) {
      if (e?.response?.message) {
        // 如果已经有具体的错误信息，就不需要再显示通用错误
        console.error('Import app failed:', e.response.message)
      }
      else {
        // 只有在没有具体错误信息时才显示通用错误
        message.error('dsl文件格式有误，请检查上传文件')
      }
    }
  }

  const clearStorage = () => {
    sessionStorage.removeItem('top-tab-active-key')
    sessionStorage.removeItem('canvas-tab-active-key')
  }

  const handleEditApp = (item: any, e?: React.MouseEvent) => {
    e?.stopPropagation?.()
    item.icon = item.icon?.replace('app', 'static')
    // First completely reset the form to clear any previous valuesZ
    createAppForm.resetFields()

    // Then set the edit mode and current app data
    setIsEditMode(true)
    setCurApp(item)
    // 设置图标状态
    // setIconState(item.icon || '')

    // Only after resetting the form and setting the state, open the modal
    setTimeout(() => {
      toggle()

      // Wait for modal to open, then set form values
      setTimeout(() => {
        createAppForm.setFieldsValue({
          name: item.name,
          description: item.description,
          icon: item.icon.replace('app', 'static'),
          tag_names: item.tags || [],
        })
      }, 100)
    }, 0)
  }

  // 添加防抖的 onSubmit 函数
  const debouncedOnSubmit = debounce(async (values: any) => {
    if (submitLoading)
      return // 防止重复提交
    setSubmitLoading(true)
    try {
      // 使用useState中保存的icon值，而不是依赖表单
      const formValues = {
        ...values,
        icon: iconState || '',
      }

      if (isEditMode) {
        try {
          const res = await updateAppInfo({
            appID: curApp.id,
            name: formValues.name,
            description: formValues.description,
            icon: formValues.icon || '',
            icon_background: '',
          })

          if (formValues.tag_names && formValues.tag_names.length > 0) {
            await bindTags({
              url: 'tags/bindings/update',
              body: {
                type: 'app',
                tag_names: formValues.tag_names,
                target_id: curApp.id,
              },
            })
          }
          message.success('更新应用成功')
          toggle()
          getAppData({ page: 1 }, false)
          getTagsList()
        }
        catch (error) {
          message.error('更新应用失败')
        }
      }
      else if (!isEmpty(curApp)) {
        if (curApp.convertToTemplate) {
          await appAddToTemplateApp({ id: curApp.id, ...formValues })
          message.success('添加为应用模版成功，请在应用模版中查看')
          toggle()
        }
        else {
          const res = await createTemplateApp({ ...formValues, id: templateId })
          // const res = await createApp(formValues)
          if (res) {
            const bindResult = await bindTags({ url: 'tags/bindings/update', body: { type: 'app', tag_names: formValues?.tag_names, target_id: res?.id } })
            message.success('创建应用成功')
            toggle()
            clearStorage()
            setTimeout(() => {
              push(`/app/${res.id}/workflow`)
            }, 20)
          }
        }
      }
      else {
        // 创建新应用
        const res = await createApp(formValues)
        if (res) {
          const bindResult = await bindTags({ url: 'tags/bindings/update', body: { type: 'app', tag_names: formValues?.tag_names, target_id: res?.id } })
          message.success('创建应用成功')
          toggle()
          clearStorage()
          setTimeout(() => {
            push(`/app/${res.id}/workflow`)
          }, 20)
        }
      }
    }
    catch (error) {
      console.error('创建失败')
    }
    finally {
      setSubmitLoading(false)
    }
  }, 500) // 500ms 的防抖时间

  // 修改表单的 onFinish 处理函数
  const handleFormSubmit = (values: any) => {
    debouncedOnSubmit(values)
  }

  const handleAppTemplate = (item: any) => {
    // Reset form completely before any other activities
    createAppForm.resetFields()
    // Set state for template mode
    setIsEditMode(false)
    setCurApp(item)
    // 设置图标状态
    setIconState(item.icon || '')
    setTemplateId(item.id)
    // Open modal after state is set
    setTimeout(() => {
      toggle()

      // Set form values after modal is opened
      setTimeout(() => {
        createAppForm.setFieldsValue({
          name: item.name,
          description: item.description,
          icon: item.icon,
          tag_names: item.tags || [],
          id: item.id || '',
        })
      }, 100)
    }, 0)
  }

  const onEnableApi = async (e, data) => {
    const currentId = data.id
    if (!isEmpty(currentPreDebuggingStatus) && currentPreDebuggingStatus[currentId] === 'starting')
      return
    messageApi.destroy()

    if (e) {
      messageApi
        .open({
          type: 'loading',
          content: '启动服务中，请耐心等待',
          duration: 0,
        })
    }
    else {
      messageApi
        .open({
          type: 'loading',
          content: '关闭服务中，请稍候',
          duration: 0,
        })
    }

    await enableApi({ id: currentId, enable_api: e }, {
      onError: () => {
        messageApi.destroy()
        // 错误时也要重置状态
        setCurrentPreDebuggingStatus({ [currentId]: null })
        // messageApi.open({
        //   type: 'error',
        //   content: data,
        // })
      },
      onFinish: (params) => {
        // 操作完成后立即重置状态，避免阻塞后续操作
        setCurrentPreDebuggingStatus({ [currentId]: null })
        if (e) {
          // 启用API的情况
          if (params.data && params.data.status === 'succeeded') {
            messageApi.destroy()
            messageApi.open({
              type: 'success',
              content: '启动服务成功',
            })
            setAppData({
              ...appData,
              data: appData.data.map((item) => {
                if (item.id === currentId)
                  item.enable_api = true

                return item
              }),
            })
            // 重新获取appData，保持当前的搜索条件
            getAppData({
              page: 1,
              search_name: searchName,
              is_published: isPublished,
              enable_api: statu,
              search_tags: selectLabels.map(item => item.name),
            }, false)
          }
        }
        else {
          // 禁用API的情况
          messageApi.destroy()
          messageApi.open({
            type: 'success',
            content: '关闭服务成功',
          })
          setAppData({
            ...appData,
            data: appData.data.map((item) => {
              if (item.id === currentId)
                item.enable_api = false

              return item
            }),
          })
          // 重新获取appData，保持当前的搜索条件
          getAppData({
            page: 1,
            search_name: searchName,
            is_published: isPublished,
            enable_api: statu,
            search_tags: selectLabels.map(item => item.name),
          }, false)
        }
      },
    })
  }
  const navigateToCanvasPage = (data) => {
    clearStorage()
    push(`/app/${data.id}/workflow`)
  }

  // 添加一个函数来刷新应用列表数据
  const refreshAppList = () => {
    getAppData({ page: 1 }, false)
  }

  // 添加路由监听，当用户返回到应用列表页面时刷新数据
  useEffect(() => {
    // 初始加载数据
    getAppData({ page: 1 })

    // 创建一个函数来处理路由变化
    const handleRouteChange = () => {
      // 当路由包含/explore/app时刷新数据
      if (window.location.pathname.includes('/explore/app'))
        getAppData({ page: 1 }, false)
    }

    // 监听popstate事件（浏览器的前进/后退按钮）
    window.addEventListener('popstate', handleRouteChange)

    return () => {
      window.removeEventListener('popstate', handleRouteChange)
    }
  }, [])

  const downloadApp = async (val) => {
    const res = await downloadAppJson(val.id)
    const data = JSON.stringify(res)
    const blob = new Blob([data], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${val.name}.json`
    document.body.appendChild(a)
    a.click()
    setTimeout(() => {
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    }, 0)
  }

  const copyAppLink = (itemData) => {
    copy(`${location.origin}/agent/${itemData.id}`)
    message.success('复制应用链接成功')
  }

  const getAuthCode: any = (val) => {
    if (val === '00000000-0000-0000-0000-000000000000')
      return authRadio.isAdministrator
    else if (val === userSpecified?.id)
      return true
    else
      return authRadio.isAdministrator || authRadio.editPermit
  }
  const canDelete = (val) => {
    if (val === '00000000-0000-0000-0000-000000000000')
      return authRadio.isAdministrator
    else if (val === userSpecified?.id)
      return true
    else
      return authRadio.isAdministrator || authRadio.addDeletePermit
  }
  const onPubChange = (value) => {
    setIsPublished(value)
  }
  const onStaChange = (value) => {
    setStatu(value)
  }
  const onSearch = (value) => {
    setSearchName(value)
  }
  useUpdateEffect(() => {
    getAppData({ page: 1, search_name: searchName, is_published: isPublished, enable_api: statu, search_tags: selectLabels.map(item => item.name) }, false)
  }, [selectLabels, isPublished, statu, searchName])

  useEffect(() => {
    // 当模态框显示并且是编辑模式时，确保表单值被正确设置
    if (createAppModalVisible && isEditMode && curApp) {
      // 确保模态框已完全渲染，但不要重置表单，只设置需要的值
      setTimeout(() => {
        // 移除resetFields调用，避免清除已设置的图标值
        createAppForm.setFieldsValue({
          name: curApp.name,
          description: curApp.description,
          icon: curApp.icon,
          tag_names: curApp.tags || [],
        })
        // 同步更新图标状态
        setIconState(curApp.icon || '')
      }, 200)
    }
  }, [createAppModalVisible, isEditMode, curApp])

  const handleToggleModal = () => {
    if (createAppModalVisible)
      clearFormAndModalData()

    // 移除重复的getList调用，TagMode组件会自动加载标签
    // tagModeRef.current.getList()
    setSelectLabels([])
    toggle()
  }

  // 修改上传图标文件的函数，确保值被正确设置
  const uploadIconFile = async (file: File) => {
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`${urlPrefix}/console/api/mh/upload/icon`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('console_token')}`,
        },
        body: formData,
      })

      if (!response.ok)
        throw new Error('上传失败')

      const data = await response.json()
      if (data && data.file_path) {
        const iconPath = data.file_path
        // 先更新状态，再更新表单
        setIconState(iconPath.replace('app', 'static'))
        createAppForm.setFieldsValue({ icon: iconPath.replace('app', 'static') })
        message.success('上传成功')
      }
      else {
        message.error('上传失败，响应数据异常')
      }
    }
    catch (error) {
      message.error('上传失败，请重试')
    }
    finally {
      setLoading(false)
      setSelectedFile(null)
    }
  }

  // 处理文件选择
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0)
      return

    const file = files[0]

    // 验证文件类型和大小
    const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png'
    if (!isJpgOrPng) {
      message.error('只支持JPG/PNG格式的图片')
      return
    }

    const isLt1M = file.size / 1024 / 1024 < 1
    if (!isLt1M) {
      message.error('图片大小不能超过1MB')
      return
    }

    setSelectedFile(file)
    uploadIconFile(file)
  }
  const handleApiPublish = async (item) => {
    if (item.enable_api_call === '1') {
      setCurrentApiItem(item)
      setApiModalType('close')
      setApiPublishModal(true)
      return
    }
    try {
      const res = await apiPublish({
        url: `/apps/${item.id}/enable_api_call`,
        body: {
          enable_api_call: 1,
        },
      })
      message.success('API开启成功')
      refreshAppList()
      setCurrentApiItem({ ...item, enable_api_call: '1' })
      setApiModalType('success')
      setApiPublishModal(true)
    }
    catch (error) {
      message.error('API开启失败')
    }
  }

  const handleCloseApi = async (item) => {
    try {
      const res = await apiPublish({
        url: `/apps/${item.id}/enable_api_call`,
        body: {
          enable_api_call: 0,
        },
      })
      message.success('API关闭成功')
      refreshAppList()
    }
    catch (error) {
      message.error('API关闭失败')
    }
  }
  return (
    <div className={style.appContainer}>
      <div className='flex justify-between'>
        <TagMode
          ref={tagModeRef}
          selectLabels={selectLabels}
          setSelectLabels={setSelectLabels}
          type='app'
          tags={tags}
          onRefresh={refreshTags}
        />
        <PermitCheck value={appMode === APP_MODE.BUILTIN ? 'AUTH_3003' : appMode === APP_MODE.MINE ? 'AUTH_3000' : 'GROUP标签不能新建'}>
          <Dropdown menu={{
            items: appCreateItems,
            onClick: handleMenuClick,
          }}>
            <Button type="primary">
              <Space>
                新建应用
                <DownOutlined />
              </Space>
            </Button>
          </Dropdown>
        </PermitCheck>
      </div>
      <div className='flex justify-between'>
        <Form.Item label="其他选项" name="is_published">
          <Select
            allowClear
            placeholder="发布状态"
            onChange={onPubChange}
            value={isPublished}
            style={{ width: 150, marginRight: 10 }}
            options={[{ label: '已发布', value: true }, { label: '未发布', value: false }]}
          />
          <Select
            allowClear
            placeholder="应用状态"
            onChange={onStaChange}
            style={{ width: 150, marginRight: 10 }}
            options={[{ label: '已启用', value: true }, { label: '未启用', value: false }]}
          />
        </Form.Item>
        <Input.Search
          placeholder='请输入搜索内容'
          onSearch={onSearch}
          allowClear
          style={{ width: 240, marginLeft: 10 }}
        />
      </div>
      <Spin spinning={appLoading}>
        {(appData && !isEmpty(appData))
          ? ((appData.data?.length === 0)
            ? <Empty className='pt-[150px]' description={searchName ? '未找到相关内容' : '暂无数据'} image={Empty.PRESENTED_IMAGE_SIMPLE} />
            : <div className={style.scrollWrap} id='scrollableDiv'>
              <InfiniteScroll
                scrollThreshold={0.3}
                dataLength={appData.data.length}
                next={() => getAppData({
                  page: appData.page + 1,
                  search_name: searchName,
                  is_published: isPublished,
                  enable_api: statu,
                  search_tags: selectLabels.map(item => item.name),
                })}
                hasMore={appData.hasAdditional}
                loader={<Spin style={{ width: '100%' }} />}
                endMessage={<div style={{ margin: '20px 0', width: '100%' }}></div>}
                scrollableTarget="scrollableDiv"
                className={style.middle}
              >
                {
                  appData.data.map((item: any) => <div onClick={() => navigateToCanvasPage(item)} key={item.id} className={style.prpItem}>
                    <Row gutter={14} wrap={false}>
                      <Col flex="56px">
                        {
                          item.icon
                            ? <div className={style.avataWrap}><img src={urlPrefix + item.icon.replace('app', 'static')} alt="icon" className='rounded-lg' /> </div>
                            : <div className={style.avataWrap}><NextImage src={DefaultLogo} alt="icon" className='rounded-lg' /></div>
                        }
                      </Col>
                      <Col flex="auto">
                        <Row gutter={7}>
                          <Col span={18}>
                            <Paragraph style={{ lineHeight: '42px', marginBottom: 0 }} ellipsis title={item.name}>
                              {item.name}
                            </Paragraph>
                          </Col>
                          <Col span={6} className='text-right' onClick={e => e.stopPropagation()}>
                            {
                              getAuthCode(item.created_by_account.id)
                              && <Tooltip title={`${item.enable_api ? '关闭' : '启动'}服务`}>
                                <Switch className='mr-4' onChange={debounce(e => onEnableApi(e, item), 500)} checked={item.enable_api} />
                              </Tooltip>
                            }
                          </Col>
                        </Row>
                      </Col>
                    </Row>
                    <div className='text-[#5E6472] text-sm'>
                      <div className='mt-4 flex justify-between'>
                        <Paragraph ellipsis={{ rows: 1, tooltip: item.created_by_account.name }} style={{ marginBottom: 8 }}>
                          <span className='text-[#5E6472]'>
                            创建人：{item.created_by_account.name}
                          </span>
                          {getAuthCode(item.created_by_account.id) && (
                            <Button
                              type="link"
                              onClick={(e) => {
                                e.stopPropagation()
                                e.preventDefault()
                                debounce(it => handleEditApp(it, undefined), 500)(item)
                              }}
                            >
                              编辑
                            </Button>
                          )}
                          {
                            item?.ref_status && (
                              <Button
                                type="link"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setRefId(item.id)
                                  setRefVisible(true)
                                }}
                              >
                                引用中
                              </Button>
                            )
                          }
                        </Paragraph>
                        {item?.engine_status === '服务异常' && <span className='text-[red] text-[12px]'>{item?.engine_status}</span>}
                      </div>
                      <Paragraph ellipsis={{ rows: 2, tooltip: item.description }} style={{ marginBottom: 8 }} className='h-[44px]'>
                        <span className='text-[#5E6472] text-sm'>
                          {item.description}
                        </span>
                      </Paragraph>
                    </div>
                    <div className={style.tagWrap}>
                      {
                        item.tags?.map((el: any) => <Tag key={el}>{el}</Tag>)
                      }
                    </div>

                    <div className={style.lastLine}>
                      <div className='text-[#5E6472] text-sm, text-[0.7292vw]'>
                        {
                          item.status === 'draft'
                            ? '未发布'
                            : <span>
                              <Iconfont type="icon-fabu" style={{ color: '#0E5DD8' }} />
                              <span className='text-[#0E5DD8] ml-1'>已发布</span>
                              <Divider type="vertical" />
                              更新于
                              {formatTime(item.workflow_updated_at, 'YYYY-MM-DD HH:mm' as string)}
                            </span>
                        }

                      </div>
                      <div className='flex'>
                        {item.enable_api && <div
                          className={`${style.iconWrap} mr-2`}
                          onClick={(e) => {
                            e.stopPropagation()
                            copyAppLink(item)
                          }}
                        >
                          <Tooltip title="复制应用链接">
                            <Iconfont type="icon-fuzhilianjie" />
                          </Tooltip>
                        </div>}
                        {item.enable_api && <div
                          className={`${style.iconWrap} mr-2`}
                          style={{
                            color: item.enable_api_call === '1' ? '#2ea121' : '',
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleApiPublish(item)
                          }}
                        >
                          <Tooltip title="API发布">
                            <Iconfont type="icon-api" />
                          </Tooltip>
                        </div>}
                        {
                          getAuthCode(item.created_by_account.id) && <>
                            <div
                              className={`${style.iconWrap} mr-2`}
                              onClick={(e) => {
                                e.stopPropagation()
                                downloadApp(item)
                              }}
                            >
                              <Tooltip title="导出应用">
                                <DownloadOutlined />
                              </Tooltip>
                            </div>
                            <div
                              className={`${style.iconWrap} mr-2`}
                              onClick={(e) => {
                                e.stopPropagation()
                                toTemplate(item)
                              }}
                            >
                              <Tooltip title="添加为应用模版">
                                <PlusOutlined />
                              </Tooltip>
                            </div>
                          </>
                        }
                        {
                          canDelete(item.created_by_account.id) && <div onClick={e => e.stopPropagation()}>
                            <Popconfirm
                              title="删除"
                              description="删除不可逆，请确认"
                              onConfirm={(e) => {
                                e?.stopPropagation()
                                handleDelete(item?.id)
                              }}
                              // 点击取消的时候阻止冒泡
                              onCancel={e => e?.stopPropagation()}
                              okText="确认"
                              cancelText="取消"
                            >
                              <div className={style.iconWrap} onClick={e => e.stopPropagation()}>
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
            </div>)
          : <Empty className='pt-[150px]' description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        }
      </Spin>

      <Modal
        title={isEditMode ? '编辑应用' : (curApp.convertToTemplate ? '添加为模版' : '新建应用')}
        open={createAppModalVisible}
        okText="保存"
        cancelText="取消"
        okButtonProps={{
          autoFocus: true,
          htmlType: 'submit',
          loading: submitLoading,
          disabled: submitLoading,
        }}
        onOk={(e) => {
          if (submitLoading) {
            e.preventDefault()
            return
          }
          createAppForm.submit()
          getTagsList()
        }}
        onCancel={handleToggleModal}
        centered
        destroyOnClose={true}
        afterClose={() => {
          setSubmitLoading(false)
          clearFormAndModalData()
          // 移除重复的getList调用，避免不必要的网络请求
          // tagModeRef.current.getList()
        }}
        modalRender={dom => <Form
          layout="vertical"
          form={createAppForm}
          name="create_app_modal"
          preserve={true}
          key={`modal-form-${isEditMode ? 'edit' : 'create'}-${Date.now()}`}
          initialValues={(isEditMode || !isEmpty(curApp))
            ? {
              name: curApp.name,
              description: curApp.description,
              icon: curApp.icon,
              tag_names: curApp.tags || [],
            }
            : undefined}
          onFinish={handleFormSubmit}
        >
          {dom}
        </Form>}
      >
        <Form.Item label="应用图标">
          <div className="custom-upload-container">
            <Form.Item name="icon" noStyle>
              <Input type="hidden" />
            </Form.Item>

            <div className="upload-preview" style={{ width: 100, height: 100, position: 'relative' }}>
              {/* 优先使用 iconState，如果为空则使用表单值 */}
              {(iconState)
                ? (
                  <div className="image-preview">
                    <Image
                      preview={false}
                      // 确保使用正确的图标路径
                      src={createAppForm.getFieldValue('icon') || iconState.replace('app', 'static')}
                      alt="应用图标"
                      width={100}
                      height={100}
                      style={{ borderRadius: '8px' }}
                    />
                    <div
                      className="change-image"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        background: 'rgba(0,0,0,0.3)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        opacity: 0,
                        transition: 'opacity 0.3s',
                        borderRadius: '8px',
                        cursor: 'pointer',
                      }}
                      onClick={() => document.getElementById('icon-upload-input')?.click()}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                    >
                      <div style={{ color: 'white', fontWeight: 'bold' }}>更换图标</div>
                    </div>
                  </div>
                )
                : (
                  <div
                    className="upload-button"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      width: '100%',
                      height: '100%',
                      border: '1px dashed #d9d9d9',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: '#fafafa',
                    }}
                    onClick={() => document.getElementById('icon-upload-input')?.click()}
                  >
                    {loading ? <LoadingOutlined style={{ fontSize: 24 }} /> : <PlusOutlined style={{ fontSize: 24 }} />}
                    <div style={{ marginTop: 8 }}>上传图标</div>
                  </div>
                )
              }
            </div>

            <input
              id="icon-upload-input"
              type="file"
              accept=".jpg,.jpeg,.png"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />

            <div className='text-[#C1C3C9] text-xs mt-2'>注：建议尺寸 128px * 128px，支持.jpg、.png，大小不超过1MB。</div>
            <Button style={{ position: 'absolute', top: 75, left: 105 }} type='link' onClick={() => { setIconModal(true) }}>查看更多图标</Button>
          </div>
        </Form.Item>
        <Form.Item name="name" label={curApp.convertToTemplate ? '模版名称' : '应用名称'}
          rules={[
            {
              required: true,
              message: `请输入${curApp.convertToTemplate ? '模版' : '应用'}名称`,
            },
            { ...noOnlySpacesRule },
            {
              validator: (_, value) => {
                if (!value || value.trim() === '')
                  return Promise.resolve()
                // 添加名称格式校验
                const nameRegex = /^[a-zA-Z0-9\u4E00-\u9FA5][a-zA-Z0-9\u4E00-\u9FA5-_\s]{0,48}[a-zA-Z0-9\u4E00-\u9FA5]$/
                if (!nameRegex.test(value))
                  return Promise.reject(new Error('名称只能包含中文、英文、数字、下划线、中划线，首尾不能是特殊字符，长度2-50'))

                return Promise.resolve()
              },
            },
          ]}
        >
          {/* 首尾不能出现空格 */}
          <Input placeholder={`请输入${curApp.convertToTemplate ? '模版' : '应用'}名称`} maxLength={50} showCount />
        </Form.Item>
        <Form.Item name="description" label="应用简介">
          <Input.TextArea placeholder='请输入应用简介，简述描述主要功能和使用场景。该信息将帮助大模型理解应用能力，若不填写，该应用将无法被智能体识别和调用' rows={6} maxLength={100} showCount />
        </Form.Item>
        <TagSelect
          fieldName='tag_names'
          type='app'
          label={'应用类别'}
          tags={tags}
          onRefresh={refreshTags}
        />
        <IconModal
          onSuccess={(data) => {
            // 同时更新状态和表单值
            setIconState(data)
            createAppForm.setFieldValue('icon', data)
            setSelectedFile(null)
            setLoading(false)
          }}
          visible={iconModal}
          onClose={() => setIconModal(false)}
        />
      </Modal>
      <Modal
        title="导入Json文件"
        open={importDSLModalVisible}
        okText="保存"
        cancelText="取消"
        centered
        okButtonProps={{ autoFocus: true, htmlType: 'submit' }}
        onCancel={toggleDSLModal}
        destroyOnClose
        modalRender={dom => <Form
          layout="vertical"
          form={importDSLForm}
          name="import_dsl_modal"
          clearOnDestroy
          onFinish={onImportDSLSubmit}
        >
          {dom}
        </Form>}
      >
        <Form.Item name="dsl" label="上传文件" rules={[{ required: true }]}>
          <Dragger {...dragDSLFileProps}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">将文件拖拽至此区域或选择文件上传</p>
            <p className="ant-upload-description">导出的json文件支持一键导入到平台。</p>
          </Dragger>
        </Form.Item>
      </Modal>

      <Modal
        title="从模板中创建"
        width={1200}
        open={templateModalVisible}
        onCancel={toggleTemplateModal}
        footer={null}
        destroyOnClose
      >
        <AppTemplate handleAppTemplate={handleAppTemplate} />
      </Modal>

      <ApiKeyModel
        visible={apiPublishModal}
        onClose={() => setApiPublishModal(false)}
        appItem={currentApiItem}
        onConfirmClose={handleCloseApi}
        modalType={apiModalType}
      />

      <ReferenceResultModal visible={refVisible} type={refType} id={refId} onClose={() => setRefVisible(false)} />

      {contextHolder}
    </div>
  )
}

export default React.memo(Apps)
