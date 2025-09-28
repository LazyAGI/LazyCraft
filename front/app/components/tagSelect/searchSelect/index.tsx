import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { Select } from 'antd'
import { getTagList } from '@/infrastructure/api//tagManage'

const { Option } = Select
type IProps = {
  onChange?: (value: any) => void
  value?: any
  type: string
}

export default forwardRef((props: IProps, ref) => {
  const { onChange, value, type } = props
  const [tags, setTags] = useState<any>([])

  const getList = async () => {
    const res: any = await getTagList({ url: '/tags', options: { params: { type } } })
    if (res)
      setTags(res)
  }
  useImperativeHandle(ref, () => ({
    getList,
  }))
  useEffect(() => {
    getList()
  }, [])

  return (
    <Select
      style={{ width: 150 }}
      placeholder='请选择标签'
      onChange={onChange}
      value={value}
    >
      <Option key='all_全部' value='all'>全部</Option>
      {
        tags.map(item => <Option key={item?.name} value={item?.name}>{item?.name}</Option>)
      }
    </Select>
  )
})
