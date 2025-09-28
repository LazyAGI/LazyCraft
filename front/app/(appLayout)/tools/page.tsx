'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, Col, Form, Input, Modal, Popconfirm, Row, Switch, Tabs, Tag, Tooltip } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import styles from './page.module.scss'
import InfoModal from './InfoModule'
import InfoMcpModel from './InfomcpModel'
import PageDrawer from './pageDrawer'
import TagMode from '@/app/components/tagSelect/TagMode'
import ClassifyMode from '@/app/components/tagSelect/ClassifyMode'
import CreatorSelect from '@/app/components/tagSelect/creatorSelect'
import Toast from '@/app/components/base/flash-notice'
import { useApplicationContext } from '@/shared/hooks/app-context'
import Iconfont from '@/app/components/base/iconFont'
import { deleteTools, downloadTool, enableTools, getToolsList } from '@/infrastructure/api/tool'
import { deleteMcp, enableMcp, getMcpList } from '@/infrastructure/api/toolmcp'
import type { DeleteMcpParams, DeleteMcpResponse, McpItem, McpListResponse, TagItem } from '@/shared/types/toolsMcp'
import ReferenceResultModal from '@/app/components/referenceResultModal'
import useRadioAuth from '@/shared/hooks/use-radio-auth'
import { pageCache } from '@/shared/utils'

const Tools = () => {
  // 自定义工具
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectToolRef: any = useRef()
  const selectMcpRef: any = useRef()
  const authRadio = useRadioAuth()
  const [type, setType] = React.useState(pageCache.getTab({ name: pageCache.category.tools }) || 'mine')
  const [list, setList] = useState<any[]>([])
  const [item, setItem] = useState(null)
  const [showInfoModule, setShowInfoModule] = useState(false)
  const [sValue, setSValue] = useState('all')
  const [searchVal, setSearchVal] = useState('')
  const [sName, setSName] = useState('')
  const [selectLabels, setSelectLabels] = useState([])
  const [creator, setCreator] = useState([])
  const [selectTags, setSelectTags] = useState([])
  const [selectStatus, setSelectStatus] = useState([])
  const { userSpecified } = useApplicationContext()
  const currentTab = searchParams.get('tab') || 'custom'
  const [mcpList, setMcpList] = useState<McpItem[]>([])
  const [tagList, setTagList] = useState<TagItem[]>([])
  const [otherOptions, setOtherOptions] = useState<string[]>([])
  const [searchValmap, setSearchValmap] = useState<string>('')
  const [sNamemap, setSNamemap] = useState<string>('')
  const [showInfoModuleMap, setShowInfoModuleMap] = useState(false)
  const [itemMap, setItemMap] = useState<McpItem | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [refId, setRefId] = useState<string>('')
  const [refVisible, setRefVisible] = useState(false)
  const [referenceType, setReferenceType] = useState('tool')
  const refreshMcpTags = useCallback(async () => {
    try {
      setTagList([])
      await selectMcpRef.current?.getList?.()
    }
    catch { }
  }, [])

  const getCardList = useCallback(async () => {
    const res: any = await getToolsList({ url: '/tool/list', body: { page: 1, page_size: 9999, search_tags: selectTags.map(item => item.name), search_name: sName, user_id: creator, tool_mode: selectLabels.map(item => item?.id), published: selectStatus.map(item => item?.id) } })
    setList(res.data)
  }, [type, sName, selectLabels, selectTags, selectStatus, creator])

  const getType = (type: string) => {
    const map = [
      { label: '官方内置', value: 'defaultOfficial' },
      { label: '自定义', value: 'self' },
    ]
    return map.filter(item => item.value === type)[0].label
  }

  const onSwitchChange = (checked: boolean, data: any) => {
    if (!checked && data.enable && data.ref_status) {
      Modal.confirm({
        title: '确认关闭',
        content: '该资源正在被其他应用引用，关闭后引用该资源的应用将出现发布失败或引用异常，是否确定关闭启动？',
        width: 400,
        centered: true,
        maskdismissible: false,
        autoFocusButton: 'cancel',
        bodyStyle: {
          padding: '20px 24px',
        },
        onOk() {
          enableTools({ url: '/tool/enable_tool', body: { id: data.id, enable: checked } }).then(() => {
            Toast.notify({ type: 'success', message: '操作成功' })
            getCardList()
          })
        },
        onCancel() {
        },
      })
    }
    else {
      enableTools({ url: '/tool/enable_tool', body: { id: data.id, enable: checked } }).then(() => {
        Toast.notify({ type: 'success', message: '操作成功' })
        getCardList()
      })
    }
  }

  const onSwitchShareChange = (checked: boolean, data: any) => {
    enableTools({ url: '/tool/auth_share', body: { tool_id: data.id, share_status: checked } }).then(() => {
      Toast.notify({ type: 'success', message: '操作成功' })
      getCardList()
    })
  }

  const handleCreate = () => {
    setItem(null)
    setShowInfoModule(true)
  }
  const handleCreateMcp = () => {
    setItem(null)
    setShowCreateModal(true)
  }

  const handleCopy = async (item: any, e) => {
    e.stopPropagation()
    await deleteTools({ url: '/tool/copy_tool', body: { id: item.id } })
    Toast.notify({ type: 'success', message: '复制成功' })
    getCardList()
  }

  const handleVerify = async (item: any, e) => {
    e.stopPropagation()
    const res: any = await deleteTools({ url: '/tool/return_auth_url ', body: { tool_id: item.id } })
    if (res)
      window.open(res)
  }

  const cancelVerify = async (item: any, e) => {
    e.stopPropagation()
    await deleteTools({ url: '/tool/delete_auth_by_user', body: { tool_id: item.id } })
    Toast.notify({ type: 'success', message: '操作成功' })
    getCardList()
  }

  const handleDelete = async (item: any, e) => {
    e.stopPropagation()
    await deleteTools({ url: '/tool/delete_tool', body: { id: item.id } })
    Toast.notify({ type: 'success', message: '删除成功' })
    selectToolRef.current?.getList?.()
    getCardList()
  }
  const handleSuccess = (data) => {
    setShowInfoModule(false)
    setSelectTags([])
    getCardList()
    selectToolRef.current?.getList?.()
    router.push(`/tools/info?id=${data.id}&tool_mode=${data?.tool_mode || ''}`)
  }

  useEffect(() => {
    getCardList()
  }, [type, getCardList, sName, sValue])

  const handleSuccessMcp = (data) => {
    setShowInfoModuleMap(false)
    getCardList()
    selectMcpRef.current?.getList?.()
  }
  // 下载
  const downloadApp = async (val) => {
    const res = await downloadTool({ url: '/tool/export', options: { params: { id: val.id, format: 'json' } } })
    const data = JSON.stringify(res)
    const blob = new Blob([data], { type: 'application/json' })
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

  const canEdit = (val) => {
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

  const stopPropagation = (e) => {
    if (e && e.stopPropagation)
      e.stopPropagation()
  }

  const handleClick = (item) => {
    if (!canEdit(item?.user_id)) {
      Toast.notify({ type: 'error', message: '无权操作' })
      return
    }
    setItem(item)
    setShowInfoModule(true)
  }
  const onSearchApp = (e) => {
    setSName(e)
  }

  // 插件mcp
  const getmcpList = async () => {
    const res: McpListResponse = await getMcpList({ body: { page: 1, page_size: 9999, search_tags: tagList.map(item => item.name), search_name: sNamemap, user_id: otherOptions, tool_mode: selectLabels.map(item => item?.id), published: selectStatus.map(item => item?.id) } })
    setMcpList(res.data)
  }
  const onSearchAppMcp = (e) => {
    setSNamemap(e)
  }
  const onSwitchMcpChange = (checked: boolean, data: any) => {
    if (!checked && data.enable && data.ref_status) {
      Modal.confirm({
        title: '确认关闭',
        content: '该资源正在被其他应用引用，关闭后引用该资源的应用将出现发布失败或引用异常，是否确定关闭启动？',
        width: 400,
        centered: true,
        maskdismissible: false,
        autoFocusButton: 'cancel',
        bodyStyle: {
          padding: '20px 24px',
        },
        onOk() {
          enableMcp({ body: { id: data.id, enable: checked } }).then(() => {
            Toast.notify({ type: 'success', message: '操作成功' })
            getmcpList()
          })
        },
        onCancel() {
        },
      })
    }
    else {
      enableMcp({ body: { id: data.id, enable: checked } }).then(() => {
        Toast.notify({ type: 'success', message: '操作成功' })
        getmcpList()
      })
    }
  }
  const handleDeleteMcp = async (item: McpItem, e) => {
    e.stopPropagation()
    const deleteParams: DeleteMcpParams = { id: item.id }
    const deleteResult: DeleteMcpResponse = await deleteMcp({ body: deleteParams })
    if (deleteResult.code === 200) {
      Toast.notify({ type: 'success', message: '删除成功' })
      getmcpList()
      await refreshMcpTags()
    }
    else {
      Toast.notify({ type: 'error', message: '删除失败' })
    }
  }
  const handleEditMcp = (item: McpItem) => {
    if (!canEdit(item?.user_id)) {
      Toast.notify({ type: 'error', message: '无权操作' })
      return
    }
    setItemMap(item)
    setShowInfoModuleMap(true)
  }
  useEffect(() => {
    getmcpList()
  }, [type, tagList, sNamemap, otherOptions, selectLabels, selectStatus])

  // 使用 useMemo 来缓存自定义工具内容组件，避免重新渲染
  const CustomToolsContent = useMemo(() => (
    <div className={styles.toolWrap}>
      <div className={styles.tabsWrap}>
        <div className={styles.pageTop}>
          {/* <Radio.Group options={options.filter(item => userSpecified?.tenant?.status === 'private' ? item.value !== 'group' : true)} value={type} onChange={onChange} optionType="button" /> */}
          <TagMode ref={selectToolRef} selectLabels={selectTags} setSelectLabels={setSelectTags} type='tool' />
          <Button type='primary' onClick={handleCreate}>新建工具</Button>
        </div>
        <div><ClassifyMode label='形态' selectLabels={selectLabels} setSelectLabels={setSelectLabels} type='toolType' /></div>
        <div><ClassifyMode needSpace={false} label='发布情况' selectLabels={selectStatus} setSelectLabels={setSelectStatus} type='toolStatu' /></div>
        <div className='flex justify-between'>
          {/* <SearchSelect ref={selectRef} value={sValue} onChange={sChange} type='tool' /> */}
          <Form.Item label="其他选项">
            <CreatorSelect value={creator} setCreator={setCreator} type='tool' />
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
      </div>
      <div className={styles.content}>
        {list.length === 0
          ? (
            <div className="w-full flex justify-center items-center" style={{ minHeight: '500px' }}>
              <span className="text-[#999]">暂无数据</span>
            </div>
          )
          : (
            <Row gutter={[16, 16]}>
              {list.map(item => (
                <Col span={6} key={item.id}>
                  <div className={styles.cardWrap} onClick={() => handleClick(item)}>
                    <div className={styles.cardItem}>
                      <div className={styles.header}>
                        <div className={styles.imgWrap}>
                          {item.icon && (
                            process.env.FRONTEND_APP_API
                              ? (
                                <img
                                  src={`${process.env.FRONTEND_APP_API.replace('/api', '')}${item.icon.replace('app', 'static')}`}
                                  alt="icon"
                                  width={40}
                                  height={40}
                                />
                              )
                              : (
                                <img
                                  src={item.icon.replace('app', 'static')}
                                  alt="icon"
                                />
                              )
                          )}
                        </div>
                        <div className={styles.infoWrap}>
                          <div className={styles.info}>
                            <div className={`${styles.name} ellipsis`} title={item.name}>{item.name}</div>
                            <div className={styles.stateWrap}>
                              <div className={styles.type}>{getType(item.tool_type)}</div>
                            </div>

                          </div>
                          <div className='text-[#5E6472] text-[12px]'>
                            {item.publish && canEdit(item?.user_id) && <div>
                              是否开启：<Switch size='small' value={item.enable} onChange={(checked: boolean) => onSwitchChange(checked, item)} onClick={(checked, e) => { e.stopPropagation() }} />
                            </div>}
                            {item.need_share && canEdit(item?.user_id) && <div>
                              是否共享：<Switch size='small' value={item.share} onChange={(checked: boolean) => onSwitchShareChange(checked, item)} onClick={(checked, e) => { e.stopPropagation() }} />
                            </div>}
                          </div>
                        </div>

                      </div>
                      <div className='flex justify-between'>
                        <div className={styles.desc}>创建人：{item.user_name}</div>
                        {
                          item?.ref_status && item?.enable && (
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
                      </div>
                      <div className={styles.desc} title={item.description}>{item.description}</div>
                      <div className={styles.tagWrap} onClick={e => e.stopPropagation()}>
                        {item?.tags?.map(item => <Tag key={item}>{item}</Tag>)}
                      </div>
                      <div className={styles.footer}>
                        <div className={styles.statusWrap}>
                          <span>{item.publish ? '已发布' : '未发布'}</span>
                          <span style={{ color: '#D9DBE0' }}> I </span>
                          {item?.auth === 1 && <span>
                            <span>已激活</span>
                            <span style={{ color: '#D9DBE0' }}> I </span>
                          </span>}
                          {item.publish_at}
                        </div>
                        <div className='flex'>
                          {(item?.auth === -1 || item?.auth === 2 || item?.auth === 3) && canEdit(item?.user_id)
                            && <span onClick={stopPropagation}>
                              <Popconfirm
                                title="该插件需要授权才可运行"
                                description={<div className='w-[200px]' onClick={stopPropagation}>若要跳转第三方授权页面完成授权，请确保已正确输入客户端地址，否则可能会跳转到无用界面哦～是否继续跳转授权?</div>}
                                onConfirm={e => handleVerify(item, e)}
                                onCancel={stopPropagation}
                                okText="是"
                                cancelText="否"
                              >
                                <Button className='text-[12px]' onClick={stopPropagation} type='link' size='small'>去授权</Button>
                              </Popconfirm>
                            </span>
                          }
                          {(item?.auth === 1) && canEdit(item?.user_id)
                            && <span onClick={stopPropagation}>
                              <Popconfirm
                                title="确认后可取消授权"
                                description={<div className='w-[200px]' onClick={stopPropagation}>取消投权后，会删除你的授权数据</div>}
                                onConfirm={e => cancelVerify(item, e)}
                                onCancel={stopPropagation}
                                okText="是"
                                cancelText="否"
                              >
                                <Button className='text-[12px]' type='link' onClick={stopPropagation} size='small'>取消授权</Button>
                              </Popconfirm>
                            </span>
                          }
                          {canEdit(item?.user_id)
                            && <span onClick={stopPropagation}>
                              <Popconfirm
                                title="提示"
                                description={<div className='w-[200px]' onClick={stopPropagation}>确定复制该工具？</div>}
                                onConfirm={e => handleCopy(item, e)}
                                onCancel={stopPropagation}
                                okText="是"
                                cancelText="否"
                              >
                                <div className={`${styles.iconWrap} ${styles.actionsIcon}`} onClick={stopPropagation}>
                                  <Iconfont className='text-[14px]' type='icon-fuzhi' />
                                </div>
                              </Popconfirm>
                            </span>
                          }
                          {canEdit(item?.user_id) && (
                            <div
                              className={`${styles.iconWrap} ${styles.actionsIcon}`}
                              onClick={(e) => {
                                e.stopPropagation()
                                downloadApp(item)
                              }}
                            >
                              <Tooltip title="导出工具">
                                <DownloadOutlined />
                              </Tooltip>
                            </div>
                          )}
                          {canDelete(item?.user_id)
                            && <span onClick={stopPropagation}>
                              <Popconfirm
                                title="提示"
                                description={<div className='w-[200px]' onClick={stopPropagation}>{item?.ref_status ? '该工具正在被引用，删除后，历史引用了本资源的智能体或工作流将自动取消引用，此操作不可撤回。' : '删除后，历史引用了本资源的智能体或工作流将自动取消引用，此操作不可撤回。'}</div>}
                                onConfirm={e => handleDelete(item, e)}
                                onCancel={stopPropagation}
                                okText="是"
                                cancelText="否"
                              >
                                <div className={`${styles.iconWrap} ${styles.actionsIcon}`} onClick={stopPropagation}>
                                  <Iconfont type='icon-shanchu1' />
                                </div>
                              </Popconfirm>
                            </span>
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          )}
      </div>
      <InfoModal
        gettaglist={async () => {
          setSelectTags([])
          await selectToolRef.current?.getList?.()
        }}
        visible={showInfoModule}
        data={item}
        onClose={() => setShowInfoModule(false)}
        onSuccess={handleSuccess}
        getCardList={getCardList}
        onTagsDeleted={() => {
          // 当标签被删除时，清空筛选状态
          setSelectTags([])
        }}
      ></InfoModal>

    </div>
  ), [
    list,
    selectTags,
    selectLabels,
    selectStatus,
    creator,
    searchVal,
    showInfoModule,
    item,
    handleCreate,
    onSearchApp,
    handleClick,
    handleSuccess,
    selectToolRef.current,
  ])
  // 插件mcp
  const ToolsMcp = useMemo(() => (
    <div className={styles.toolWrap}>
      <div className={styles.tabsWrap}>
        <div className={styles.pageTop}>
          <TagMode ref={selectMcpRef} selectLabels={tagList} setSelectLabels={setTagList} type='mcp' />
          <Button type='primary' onClick={handleCreateMcp}>新建插件</Button>
        </div>
        <div className='flex justify-between'>
          <Form.Item label="其他选项">
            <CreatorSelect value={otherOptions} setCreator={setOtherOptions} type='tool' />
          </Form.Item>
          <Input.Search
            placeholder='请输入搜索内容'
            value={searchValmap}
            allowClear
            onChange={e => setSearchValmap(e.target.value)}
            onSearch={onSearchAppMcp}
            style={{ width: 270 }}
          />
        </div>
      </div>
      <div className={styles.content}>
        {mcpList.length === 0
          ? (
            <div className="w-full flex justify-center items-center" style={{ minHeight: '500px' }}>
              <span className="text-[#999]">暂无数据</span>
            </div>
          )
          : (
            <Row gutter={[16, 16]}>
              {mcpList.map(item => (
                <Col span={6} key={item.id}>
                  <div className={styles.cardWrap} onClick={() => handleEditMcp(item)}>
                    <div className={styles.cardItem}>
                      <div className={styles.header}>
                        <div className={styles.imgWrap}>
                          {item.icon && (
                            process.env.FRONTEND_APP_API
                              ? (
                                <img
                                  src={`${process.env.FRONTEND_APP_API.replace('/api', '')}${item.icon.replace('app', 'static')}`}
                                  alt="icon"
                                  width={40}
                                  height={40}
                                />
                              )
                              : (
                                <img
                                  src={item.icon.replace('app', 'static')}
                                  alt="icon"
                                />
                              )
                          )}
                        </div>
                        <div className={styles.infoWrap}>
                          <div className={styles.info}>
                            <div className={`${styles.name} ellipsis`} title={item.name}>{item.name}</div>
                            <div className={styles.stateWrap}>
                              <div className={styles.type}>Mcp</div>
                            </div>
                          </div>
                          <div className='text-[#5E6472] text-[12px]'>
                            {item.publish && canEdit(item?.user_id) && <div>
                              是否开启：<Switch size='small' value={item.enable} onChange={(checked: boolean) => onSwitchMcpChange(checked, item)} onClick={(checked, e) => { e.stopPropagation() }} />
                            </div>}
                          </div>
                        </div>

                      </div>
                      <div className='flex justify-between'>
                        <div className={styles.desc}>创建人：{item.user_name}</div>
                        {
                          item?.ref_status && item?.enable && (
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
                      </div>

                      <div className={styles.desc} title={item.description}>简介：{item.description}</div>
                      <div className={styles.tagWrap} onClick={e => e.stopPropagation()}>
                        {item?.tags?.map(item => <Tag key={item}>{item}</Tag>)}
                      </div>
                      <div className={styles.footer}>
                        <div className={styles.statusWrap}>
                          <span>{item.publish ? '已发布' : '未发布'}</span>
                          <span style={{ color: '#D9DBE0' }}> I </span>
                          {item.publish_at}
                        </div>
                        <div className='flex'>
                          {(canDelete(item?.user_id) && !item?.ref_status)
                            && <span onClick={stopPropagation}>
                              <Popconfirm
                                title="提示"
                                description={<div className='w-[200px]' onClick={stopPropagation}>删除后，历史引用了本资源的智能体或工作流将自动取消引用，此操作不可撤回。</div>}
                                onConfirm={e => handleDeleteMcp(item, e)}
                                onCancel={stopPropagation}
                                okText="是"
                                cancelText="否"
                              >
                                <div className={`${styles.iconWrap} ${styles.actionsIcon}`} onClick={stopPropagation}>
                                  <Iconfont type='icon-shanchu1' />
                                </div>
                              </Popconfirm>
                            </span>
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          )}
      </div>
      <InfoMcpModel
        gettaglist={refreshMcpTags}
        visible={showInfoModuleMap}
        data={itemMap}
        onSuccess={handleSuccessMcp}
        getmcpList={getmcpList}
        onClose={() => setShowInfoModuleMap(false)}
      ></InfoMcpModel>
      <PageDrawer
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        gettaglist={refreshMcpTags}
        getmcpList={getmcpList}
      ></PageDrawer>
    </div>
  ), [
    mcpList,
    selectLabels,
    otherOptions,
    searchValmap,
    showInfoModuleMap,
    itemMap,
    handleCreateMcp,
    onSearchAppMcp,
    selectMcpRef.current,
  ])

  // 使用 useMemo 缓存标签页配置，避免重新创建
  const tabItems = useMemo(() => [
    {
      key: 'custom',
      label: '自定义工具',
      children: CustomToolsContent,
    },
    {
      key: 'mcp',
      label: '插件工具（MCP）',
      children: ToolsMcp,
    },
  ], [CustomToolsContent])

  return (
    <div className={styles.toolWrap}>
      <div className={styles.tabsWrap}>
        <Tabs
          activeKey={currentTab}
          type="card"
          items={tabItems}
          onChange={(key) => {
            setReferenceType(key === 'custom' ? 'tool' : 'mcp')
            router.push(`/tools?tab=${key}`)
          }}
        />
        {/* {CustomToolsContent} */}
      </div>
      <ReferenceResultModal visible={refVisible} type={referenceType} id={refId} onClose={() => setRefVisible(false)} />
    </div>
  )
}
export default Tools
