import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { Button, Form, Select } from 'antd'
import { deleteTag, getTagList } from '@/infrastructure/api//tagManage'
import Toast from '@/app/components/base/flash-notice'

const { Option } = Select

type IProps = {
  fieldName: string
  label?: string
  type: string
  disabled?: boolean
  tags?: any[]
  onRefresh?: () => Promise<void>
  onTagsDeleted?: () => void
}

export type TagSelectRef = {
  getList: () => Promise<void>
  refresh: () => Promise<void>
}

const TagSelect = forwardRef<TagSelectRef, IProps>((props, ref) => {
  const {
    fieldName,
    label = '',
    type,
    disabled = false,
    tags: externalTags,
    onRefresh,
    onTagsDeleted,
  } = props

  const [tags, setTags] = useState<any>(externalTags || [])
  const [searchValue, setSearchValue] = useState<any>(null)
  const form = Form.useFormInstance()

  const filterBuiltinTags = (tagList: any[]) => {
    return tagList.filter(item => item?.name !== '平台内置')
  }

  const getList = async () => {
    // 如果有外部传入的标签数据，就不需要请求
    if (externalTags) {
      setTags(externalTags)
      return
    }

    // 如果已有数据，则不重复请求
    if (tags.length > 0)
      return

    try {
      const res: any = await getTagList({ url: '/tags', options: { params: { type } } })
      if (res && Array.isArray(res)) {
        const filteredTags = filterBuiltinTags(res)
        setTags(filteredTags)
      }
      else {
        setTags([])
      }
    }
    catch (error) {
      console.error('获取标签列表失败:', error)
      setTags([])
    }
  }

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    getList,
    refresh: async () => {
      if (onRefresh) {
        await onRefresh()
      }
      else {
        setTags([])
        await getList()
      }
    },
  }))

  useEffect(() => {
    if (!externalTags)
      getList()
  }, [type])

  useEffect(() => {
    if (externalTags)
      setTags(externalTags)
  }, [externalTags])

  const handleDelete = async (e, record) => {
    e.stopPropagation()
    try {
      const res = await deleteTag({ url: '/tags/delete', body: { name: record?.name, type } })
      if (res) {
        Toast.notify({ type: 'success', message: '删除成功' })
        // 刷新标签列表
        if (onRefresh) {
          await onRefresh()
          // // 同时更新本地状态，重新获取最新数据
          try {
            const newRes: any = await getTagList({ url: '/tags', options: { params: { type } } })
            if (newRes && Array.isArray(newRes)) {
              const filteredTags = filterBuiltinTags(newRes)
              setTags(filteredTags)
            }
            else {
              setTags([])
            }
          }
          catch (error) {
            console.error('刷新标签列表失败:', error)
            setTags([])
          }
        }
        else {
          setTags([])
          await getList()
        }
        if (onTagsDeleted)
          onTagsDeleted()
      }
    }
    catch (error) {
      Toast.notify({ type: 'error', message: '删除失败' })
    }
  }

  const handleChange = (value: string[]) => {
    // 限制最终标签结果的长度为10个字符
    const limitedValue = value.map(item => item.length > 10 ? item.substring(0, 10) : item)
    setSearchValue(null)
    // 如果有字符被截取，更新表单字段值
    if (JSON.stringify(limitedValue) !== JSON.stringify(value))
      form.setFieldsValue({ [fieldName]: limitedValue })
  }

  const onSearch = (value: string) => {
    setSearchValue(value.trim())
  }

  return (
    <Form.Item
      name={fieldName}
      label={label}
      rules={[{ required: true, message: '请选择' }]}
      shouldUpdate={(prevValues, curValues) => {
        const prevValue = prevValues[fieldName]
        const curValue = curValues[fieldName]
        const changed = JSON.stringify(prevValue) !== JSON.stringify(curValue)
        return changed
      }}
    >
      <Select
        mode='tags'
        placeholder='请选择标签'
        maxCount={8}
        disabled={disabled}
        optionLabelProp="label"
        onChange={handleChange}
        onSearch={onSearch}
        searchValue={searchValue}
      >
        {
          tags.map(item => (
            <Option key={item?.name} value={item?.name}>
              {item?.name}
              {item?.can_delete && (
                <Button
                  onClick={e => handleDelete(e, item)}
                  type='link'
                  size="small"
                >
                  删除
                </Button>
              )}
            </Option>
          ))
        }
      </Select>
    </Form.Item>
  )
})

TagSelect.displayName = 'TagSelect'

export default TagSelect
