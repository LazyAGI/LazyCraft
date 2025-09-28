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
    const res: any = await getTagList({ url: '/brands', options: { params: { type } } })
    if (res)
      setAppTags(res)
  }

  useEffect(() => {
    getList()
  }, [])

  const handleDelete = async (record, e) => {
    e.preventDefault()
    const res = await deleteTag({ url: '/brands/delete', body: { name: record?.name, type } })
    if (res) {
      Toast.notify({ type: ToastTypeEnum.Success, message: '删除成功' })
      getList()
    }
  }

  const tagInputStyle: React.CSSProperties = {
    width: 200,
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
      Toast.notify({ type: ToastTypeEnum.Error, message: '厂商名称不能全为空' })
      setAppVisible(false)
      setInputValue('')
      return
    }
    const validPattern = /^(?!.*[\u4E00-\u9FA5]).*$/
    if (!validPattern.test(inputValue)) {
      Toast.notify({ type: ToastTypeEnum.Warning, message: '仅允许英文字母、数字及符号' })
      return
    }
    createTag({ url: '/brands/create', body: { name: inputValue, type } }).then((res) => {
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
              placeholder='仅支持英文字母、数字及符号'
              style={tagInputStyle}
              value={inputValue}
              maxLength={50}
              onChange={handleInputChange}
              onBlur={handleInputConfirm}
            />
          )
          : (
            <Tag className={styles.tagPlusStyle} icon={<PlusOutlined />} onClick={showInput}>
              添加厂商
            </Tag>
          )}
      </div>
    </Card>
  )
}

export default TagCom
