'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Button, Col, Form, Input, Row } from 'antd'
import { useRouter } from 'next/navigation'
import { ReadOutlined } from '@ant-design/icons'
import styles from './page.module.scss'
import InfoModal from './InfoModal'
import UploadModule from './UploadModule'
import { deleteKnowledgeBase, getKnowledgeBaseList } from '@/infrastructure/api/knowledgeBase'
import Toast, { ToastTypeEnum } from '@/app/components/base/flash-notice'
import TagMode from '@/app/components/tagSelect/TagMode'
import CreatorSelect from '@/app/components/tagSelect/creatorSelect'
import useRadioAuth from '@/shared/hooks/use-radio-auth'
import { useApplicationContext } from '@/shared/hooks/app-context'
import ReferenceResultModal from '@/app/components/referenceResultModal'
import AppCard from '@/app/components/app-hub/AppCard'

const KnowledgeBase = () => {
  const router = useRouter()
  const selectRef: any = useRef()
  const authRadio = useRadioAuth()
  const [list, setList] = useState<any[]>([])
  const [data, setData] = useState({})
  const [id, setId] = useState('')
  const [infoModuleVisible, setInfoModuleVisible] = useState(false)
  const [uploadModuleVisible, setUploadModuleVisible] = useState(false)
  const [searchVal, setSearchVal] = useState('')
  const [sName, setSName] = useState('')
  const [creator, setCreator] = useState([]) as any
  const [selectTags, setSelectTags] = useState([]) as any
  const { userSpecified } = useApplicationContext()
  // 引用结果弹层
  const [refVisible, setRefVisible] = useState(false)
  const [refId, setRefId] = useState<string>('')
  const [refType] = useState<'kb'>('kb')

  const getCardList = async () => {
    const res: any = await getKnowledgeBaseList({ url: '/kb/list', body: { page: '1', page_size: '999', search_tags: selectTags.map(item => item.name), search_name: sName, user_id: creator } })
    setList(res.data)
  }
  const handleDelete = async (item: any, e?: any) => {
    e?.stopPropagation()
    await deleteKnowledgeBase({ url: '/kb/delete', body: { id: item.id } })
    Toast.notify({ type: ToastTypeEnum.Success, message: '删除成功' })
    getCardList()
  }

  const handleDeleteById = async (id: string) => {
    const item = list.find(i => i.id === id)
    if (item)
      await handleDelete(item)
  }
  const handleInfoSuccess = (id: string, type: 'create' | 'edit') => {
    setId(id)
    getCardList()
    selectRef.current.getList()
    setInfoModuleVisible(false)
    if (type === 'create')
      router.push(`/resourceBase/knowledgeBase/detail?id=${id}&state=create`)
  }
  const handleCreate = () => {
    setData('')
    setInfoModuleVisible(true)
  }
  const handleUpdate = (data, e) => {
    e.stopPropagation()
    setData(data)
    setInfoModuleVisible(true)
  }
  const onItemClick = (data) => {
    router.push(`/resourceBase/knowledgeBase/detail?id=${data.id}`)
  }
  const handleUploadSuccess = () => {
    setUploadModuleVisible(false)
    getCardList()
    selectRef.current.getList()
  }

  const showEdit = (val) => {
    if (val === '00000000-0000-0000-0000-000000000000')
      return authRadio.isAdministrator
    else if (val === userSpecified?.id)
      return true
    else
      return authRadio.isAdministrator || authRadio.editPermit
  }
  const showDelete = (val) => {
    if (val === '00000000-0000-0000-0000-000000000000')
      return authRadio.isAdministrator
    else if (val === userSpecified?.id)
      return true
    else
      return authRadio.isAdministrator || authRadio.addDeletePermit
  }

  useEffect(() => {
    getCardList()
  }, [sName, creator, selectTags])

  const onSearchApp = (e) => {
    setSName(e)
  }
  const onRefresh = async () => {
    setSelectTags([])
    await getCardList()
  }
  const handleClose = () => {
    setInfoModuleVisible(false)
    setSelectTags([])
  }
  return (
    <div className={styles.knowledgeWrap}>
      <div className={styles.pageTop}>
        <TagMode ref={selectRef} selectLabels={selectTags} setSelectLabels={setSelectTags} type='knowledgebase' onRefresh={onRefresh} />
        <Button className={styles.btnCreate} type="primary" onClick={handleCreate}>
          新建知识库
        </Button>
      </div>
      <div className='flex justify-between'>
        <Form.Item label="其他选项">
          <CreatorSelect value={creator} setCreator={setCreator} type='knowledgebase' />
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
      <div className={styles.content}>
        {list.length === 0
          ? (
            <div className="w-full flex justify-center items-center" style={{ minHeight: '500px' }}>
              <span className="text-[#999]">暂无数据</span>
            </div>
          )
          : (
            <Row gutter={[16, 16]}>
              {list.map((item, index) => {
                return (
                  <Col span={6} key={index}>
                    <AppCard
                      item={item}
                      customIcon={<ReadOutlined />}
                      iconClassName={styles.headerIcon}
                      onClick={onItemClick}
                      onEdit={handleUpdate}
                      onDelete={handleDeleteById}
                      onRefClick={(id) => {
                        setRefId(id)
                        setRefVisible(true)
                      }}
                      canEdit={showEdit}
                      canDelete={showDelete}
                      showRefButton={true}
                      showPublishStatus={false}
                      showApiActions={false}
                      showBottomActions={true}
                      creatorField="user_name"
                      className={styles.cardItem}
                    />
                  </Col>
                )
              })}
            </Row>
          )}
      </div>
      <InfoModal key={infoModuleVisible ? Date.now() : 'closed'} gettaglist={selectRef?.current?.getList} visible={infoModuleVisible} data={data} onClose={handleClose} onSuccess={handleInfoSuccess}></InfoModal>
      <UploadModule visible={uploadModuleVisible} id={id} onClose={() => setUploadModuleVisible(false)} onSuccess={handleUploadSuccess}></UploadModule>
      <ReferenceResultModal visible={refVisible} type={refType} id={refId} onClose={() => setRefVisible(false)} />
    </div >
  )
}
export default KnowledgeBase
