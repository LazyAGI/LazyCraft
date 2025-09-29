'use client'
import React, { useEffect, useRef, useState } from 'react'
import { Card, Input, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import styles from './page.module.scss'
import Toast, { ToastTypeEnum } from '@/app/components/base/flash-notice'
import { createTag, deleteTag, getTagList } from '@/infrastructure/api/tagManage'

type IProps = {
  name: string
  type: string
}
const TagCom = (props: IProps) => {
  const { name, type } = props
  const [appTags, setAppTags] = useState<any>()
  const [appVisible, setAppVisible] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const appInputRef = useRef<any>(null)
  useEffect(() => {
    if (appVisible)
      appInputRef.current?.focus()
  }, [appVisible])
  const getList = async () => {
    const res: any = await getTagList({ url: '/tags', options: { params: { type } } })
    if (res)
      setAppTags(res)
  }

  useEffect(() => {
    getList()
  }, [])

  const handleDelete = async (record, e) => {
    e.preventDefault()
    const res = await deleteTag({ url: '/tags/delete', body: { name: record?.name, type } })
    if (res) {
      Toast.notify({ type: ToastTypeEnum.Success, message: '删除成功' })
      getList()
    }
  }

  const tagInputStyle: React.CSSProperties = {
    width: 120,
    height: 32,
    marginInlineEnd: 8,
    verticalAlign: 'top',
  }
  const showInput = () => {
    setAppVisible(true)
  }
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  const handleInputConfirm = () => {
    if (!inputValue.trim()) {
      Toast.notify({ type: ToastTypeEnum.Warning, message: '标签名称不能全为空' })
      setAppVisible(false)
      setInputValue('')
      return
    }
    createTag({ url: '/tags/create', body: { name: inputValue, type } }).then((res) => {
      if (res) {
        Toast.notify({
          type: ToastTypeEnum.Success, message: '保存成功',
        })
        getList()
        setAppVisible(false)
        setInputValue('')
      }
    })
  }
  return (
    <Card type='inner' className={styles.updSty} style={{ marginBottom: '30px' }} title={<div className={styles.title}><span className={styles.leftIcon}></span>{name}</div>}>
      <div className={styles.detailWrap}>
        {
          appTags?.map((item: any) => <Tag
            key={item?.id}
            closable={true}
            className={styles.tagSty}
            onClose={e => handleDelete(item, e)}
          >
            {item?.name}
          </Tag>)
        }
        {appVisible
          ? (
            <Input
              ref={appInputRef}
              type="text"
              size="small"
              style={tagInputStyle}
              value={inputValue}
              maxLength={10}
              onChange={handleInputChange}
              onBlur={handleInputConfirm}
            />
          )
          : (
            <Tag className={styles.tagPlusStyle} icon={<PlusOutlined />} onClick={showInput}>
              添加标签
            </Tag>
          )}
      </div>
    </Card>
  )
}

export default TagCom
