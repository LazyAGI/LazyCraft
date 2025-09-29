'use client'

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { RadioChangeEvent } from 'antd'
import { Button, Col, Empty, Form, Input, Popconfirm, Radio, Row, Select, Spin, Tag, Tooltip } from 'antd'
import { useRouter } from 'next/navigation'
import ProcessCom from '../components/processCom'
import ModelList from './ModelListModal'
import CreateModal from './CreateModule'
import EditModel from './EditModel'
import styles from './page.module.scss'
import Toast from '@/app/components/base/flash-notice'
import HoverGuide from '@/app/components/base/hover-tip-pro'
import IconFont from '@/app/components/base/iconFont'
import { deleteModel, getModelListNew } from '@/infrastructure/api/modelWarehouse'
import { useApplicationContext } from '@/shared/hooks/app-context'
import { usePermitCheck } from '@/app/components/app/permit-check'
import TagMode from '@/app/components/tagSelect/TagMode'
import useRadioAuth from '@/shared/hooks/use-radio-auth'
import useValidateSpace from '@/shared/hooks/use-validate-space'
import { pageCache } from '@/shared/utils'

const TagContainer = ({ tags }) => {
  const wrapperRef = useRef(null)
  const [visibleTags, setVisibleTags] = useState([])

  useLayoutEffect(() => {
    const calculateVisibleTags = () => {
      if (!wrapperRef.current)
        return

      const containerWidth = wrapperRef.current.offsetWidth
      let currentWidth = 0
      let visibleCount = 0

      const reservedWidth = 76
      // 计算标签宽度
      for (let i = 0; i < tags.length; i++) {
        const tagWidth = 88 // 8px margin
        const total = currentWidth + tagWidth + reservedWidth
        if (total > containerWidth)
          break
        currentWidth += tagWidth
        visibleCount++
      }
      // 设置可见的标签数
      setVisibleTags(tags.slice(0, visibleCount))
    }

    requestAnimationFrame(calculateVisibleTags)

    // 监听窗口变化，动态调整标签显示
    window.addEventListener('resize', calculateVisibleTags)
    return () => window.removeEventListener('resize', calculateVisibleTags)
  }, [tags])

  return (
    <div ref={wrapperRef} className={styles.tagContainer}>
      {tags.map((tag, index) => {
        return <div key={index} className={styles.tag} style={{ display: visibleTags.includes(tag) ? 'inline' : 'none' }} title={tag}>
          {tag}
        </div>
      },

      )}

      <div className={styles.moreTag} style={{ display: visibleTags.length !== tags.length ? 'inline' : 'none' }}>
        共 {tags.length} 个模型
      </div>
    </div>
  )
}

const ModelWarehouse = () => {
  const router = useRouter()
  const selectRef: any = useRef()
  const authRadio = useRadioAuth()
  const [category, setCategory] = useState(pageCache.getTab({ name: pageCache.category.modelManage }) || 'mine')
  const [type, setType] = React.useState('local')
  const [kind, setKind] = React.useState('all')
  const { validate } = useValidateSpace()

  const [list, setList] = useState([])
  const [showModelList, setShowModelList] = useState(false)
  const [showCreateModule, setShowCreateModule] = useState(false)
  const [showEditModule, setShowEditModule] = useState(false)
  const [item, setItem] = useState()
  const [loading, setLoading] = useState(false)
  const [tags, setTags] = useState([])
  const [sValue, setSValue] = useState('all')
  const [tValue, setTValue] = useState()
  const [dValue, setDValue] = useState()
  const [searchVal, setSearchVal] = useState('')
  const [sName, setSName] = useState('')
  const [selectTags, setSelectTags] = useState([]) as any
  const { userSpecified, permitData } = useApplicationContext()
  const { hasPermit } = usePermitCheck()
  const isMine = userSpecified?.tenant?.status === 'private' ? 'private' : 'public'
  const getCardList = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getModelListNew({ url: '/mh/list', body: { page: '1', page_size: '9999', model_type: type === 'all' ? '' : type, model_kind: kind === 'all' ? '' : kind, status: dValue, search_tags: selectTags?.map(item => item?.name), available: tValue === 'all' ? -1 : tValue, search_name: sName } })
      setList(res.data)
    }
    finally { setLoading(false) }
  }, [type, category, sName, sValue, tValue, kind, dValue, selectTags])
  const handleCreate = async () => {
    const isValid = await validate()
    if (isValid)
      setShowCreateModule(true)
  }
  const handleDelete = async (item: any, e) => {
    e.stopPropagation()
    await deleteModel({ url: '/mh/delete', body: { model_id: item.id, qtype: category, namespace: isMine } })
    Toast.notify({ type: 'success', message: '删除成功' })
    getCardList()
  }
  const onChange = ({ target: { value } }: RadioChangeEvent) => {
    pageCache.setTab({ name: pageCache.category.modelKind, key: value })
    setType(value)
  }
  const onKindChange = ({ target: { value } }: RadioChangeEvent) => {
    setKind(value)
  }
  const handleCreateSuccess = () => {
    setShowCreateModule(false)
    selectRef.current.getList()
    getCardList()
  }

  const handleEditSuccess = () => {
    setShowEditModule(false)
    selectRef.current.getList()
    getCardList()
  }

  const handleEditClick = (item, e) => {
    e.stopPropagation()
    setShowEditModule(true)
    setItem(item)
  }

  const handleShowModelList = (data, e) => {
    e.stopPropagation()
    const tags = (data.model_list).map(item => item.model_key)
    setTags(tags)
    setShowModelList(true)
  }

  useEffect(() => {
    getCardList()
  }, [type, getCardList, sName, sValue, tValue, kind, dValue, selectTags])

  useEffect(() => {
    const intervalId = setInterval(() => {
      getCardList()
    }, 5000 * 60)

    return () => clearInterval(intervalId)
  }, [getCardList])

  const canEdit = () => {
    if (category === 'mine')
      return true

    return hasPermit('AUTH_5008')
  }
  const canDelete = (val) => {
    if (val === '00000000-0000-0000-0000-000000000000')
      return authRadio.isAdministrator
    else if (val === userSpecified?.id)
      return true
    else
      return authRadio.isAdministrator || authRadio.addDeletePermit
  }
  const sChange = (value) => {
    setSValue(value)
  }
  const handleChange = (value) => {
    setTValue(value)
  }
  const downChange = (value) => {
    setDValue(value)
  }
  const onSearchApp = (e) => {
    setSName(e)
  }
  return (
    <div className="page">
      <div className={styles.tabsWrap}>
        <div className={styles.pageTop}>
          <div></div>
          <div>
            <Button type='primary' onClick={handleCreate}>新建模型</Button>
          </div>
        </div>

        <Form.Item label='类别'>
          <Radio.Group style={{ marginLeft: 30 }} value={kind} onChange={onKindChange}>
            <Radio.Button value="all" style={{ marginRight: 10, borderRadius: 4 }}>全部</Radio.Button>
            {/* <Radio.Button value="localLLM" style={{ marginRight: 10, borderRadius: 4 }}>本地大模型</Radio.Button> */}
            <Radio.Button value="VQA" style={{ marginRight: 10, borderRadius: 4 }}>图文理解模型</Radio.Button>
            <Radio.Button value="SD" style={{ marginRight: 10, borderRadius: 4 }}>文生图模型</Radio.Button>
            <Radio.Button value="TTS" style={{ marginRight: 10, borderRadius: 4 }}>文字转语音模型</Radio.Button>
            <Radio.Button value="STT" style={{ marginRight: 10, borderRadius: 4 }}>语音转文字模型</Radio.Button>
            <Radio.Button value="Embedding" style={{ marginRight: 10, borderRadius: 4 }}>向量模型</Radio.Button>
            <Radio.Button value="localLLM" style={{ marginRight: 10, borderRadius: 4 }}>大模型</Radio.Button>
            <Radio.Button value="reranker" style={{ marginRight: 10, borderRadius: 4 }}>重排模型</Radio.Button>
            <Radio.Button value="OCR" style={{ marginRight: 10, borderRadius: 4 }}>文字识别</Radio.Button>
          </Radio.Group>
        </Form.Item>
        <div>
          <TagMode needSpace={false} label='模型标签' ref={selectRef} selectLabels={selectTags} setSelectLabels={setSelectTags} type='model' url='tags' />
        </div>
        <div className='mt-[1.0417vw] flex justify-between'>
          <Form.Item label='其他选项'>
            <Select
              value={tValue}
              allowClear
              style={{ width: 120, marginRight: 10 }}
              onChange={handleChange}
              placeholder='可用状态'
              options={[
                { value: 1, label: '可用模型' },
                { value: 0, label: '不可用模型' },
              ]}
            />
            <Select
              value={dValue}
              allowClear
              style={{ width: 120, marginRight: 10 }}
              onChange={downChange}
              placeholder='下载状态'
              options={[
                { value: 3, label: '已下载' },
                { value: 1, label: '未下载' },
                { value: 4, label: '下载失败' },
              ]}
            />
          </Form.Item>
          <div>
            <Input.Search
              placeholder='请输入搜索内容'
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
              onSearch={onSearchApp}
              style={{ width: 270 }}
              allowClear
            />
          </div>
        </div>
      </div>
      <Spin spinning={loading}>
        <div className={styles.content}>
          {list && list.length > 0
            ? (
              <Row gutter={[16, 16]}>
                {list.map((item: any) => (
                  <Col xs={24} sm={12} md={12} lg={8} xl={8} xxl={6} key={item.id}>
                    <div className={styles.cardWrap}>
                      <div className={styles.cardItem} onClick={() => router.push(`/modelWarehouse/modelManage/${item.id}?qtype=${item?.user_id === '00000000-0000-0000-0000-000000000000' ? 'builtin' : 'mine'}`)}>
                        <div className={styles.header}>
                          <div className={styles.imgWrap}>
                            <img src={item.model_icon.replace('app', 'static')} alt="icon" />
                          </div>
                          <div className={styles.infoWrap}>
                            <div className={styles.info}>
                              <div className={`${styles.name} ellipsis`} title={item.model_type === 'local' ? item.model_name : item.model_brand}>{item.model_type === 'local' ? item.model_name : item.model_brand}</div>
                              <div className={styles.stateWrap}>
                                {!type && <div className={styles.type}>{item.model_type === 'local' ? '本地模型' : '在线大模型'}</div>}
                                <div className={`${styles.type} ${styles.kind}`}>{item.model_kind_display}</div>
                                <div className={styles.loading}>
                                  {
                                    item?.model_type === 'local' && item.model_status == 1 && <Tag color="warning">
                                      未下载
                                    </Tag>
                                  }
                                  {item.model_status == 2 && <ProcessCom id={item?.id} getList={getCardList} />}
                                  {
                                    item.model_status == 4 && <HoverGuide popupContent={item.download_message || '无'}>
                                      <Tag color="error">
                                        下载失败
                                      </Tag>
                                    </HoverGuide>
                                  }
                                </div>
                              </div>
                            </div>
                          </div>
                          {item.model_type === 'online'
                            && <div>
                              {
                                item?.api_key
                                && <Tooltip title="API-KEY已配置，模型可正常使用" placement="bottom" ><IconFont className='text-[18px] mr-[5px]' style={{ color: '#69D17B' }} type='icon-chenggong' /></Tooltip>
                              }
                              <Tooltip title="添加API Key" placement="bottom" >
                                <IconFont className={styles.editIcon} type='icon-shezhi1' onClick={e => handleEditClick(item, e)}></IconFont>
                              </Tooltip>
                            </div>
                          }
                        </div>
                        <div className={styles.desc} >创建人：{item?.user_name}</div>
                        <div className={styles.desc} title={item.description}>{item.description}</div>
                        <div className={styles.tagWrap} onClick={e => e.stopPropagation()}>
                          <div className={styles.tagInner}>
                            {item?.tags?.map(item => (
                              <Tag key={item}>{item}</Tag>
                            ))}
                          </div>
                        </div>
                        <div className={styles.footer}>
                          <div className={styles.tagListWrap} onClick={e => handleShowModelList(item, e)}>
                            {
                              item.model_list && <TagContainer tags={item.model_list.map(item => item.model_key)} />
                            }
                          </div>
                          {canDelete(item?.user_id)
                            && <div onClick={e => e.stopPropagation()}>
                              <Popconfirm
                                title="提示"
                                description="是否确认删除"
                                onConfirm={e => handleDelete(item, e)}
                                onCancel={e => e.stopPropagation()}
                                okText="是"
                                cancelText="否"
                              >
                                <div className={`${styles.iconWrap} ${styles.actionsIcon}`} onClick={e => e.stopPropagation()}>
                                  <IconFont type='icon-shanchu1' />
                                </div>
                              </Popconfirm>
                            </div>
                          }
                        </div>
                      </div>
                    </div>
                  </Col>
                ))}
              </Row>
            )
            : (
              <Empty className='pt-[150px]' description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
        </div>
      </Spin>
      <ModelList visible={showModelList} tags={tags} onClose={() => setShowModelList(false)}></ModelList>
      <CreateModal visible={showCreateModule} modelType={type === 'all' ? 'local' : type} onClose={() => setShowCreateModule(false)} onSuccess={handleCreateSuccess} gettaglist={selectRef?.current?.getList}></CreateModal>
      <EditModel visible={showEditModule} data={item} onClose={() => setShowEditModule(false)} onSuccess={handleEditSuccess}></EditModel>
    </div >
  )
}
export default ModelWarehouse
