import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { Select } from 'antd'
import { getTagList } from '@/infrastructure/api//tagManage'

const { Option } = Select
type IProps = {
  onChange?: (value: any) => void
  value?: any
  type: string
  setCreator: any
}

const CreatorSelect = forwardRef((props: IProps, ref) => {
  const { value, type, setCreator } = props
  const [data, setData] = useState<any>([])

  const getList = async () => {
    const res: any = await getTagList({ url: '/workspaces/tenant/user_list', options: { params: {} } })
    if (res)
      setData(res)
  }
  useImperativeHandle(ref, () => ({
    getList,
  }))
  useEffect(() => {
    getList()
  }, [])
  const onChange = (val) => {
    setCreator(val)
  }
  return (
    <Select
      style={{ width: 310 }}
      placeholder='创建人'
      onChange={onChange}
      value={value}
      filterOption={(input, option: any) => {
        return (option?.name ?? '').toLowerCase().includes(input.toLowerCase())
      }
      }
      mode="multiple"
      fieldNames={{ label: 'name', value: 'id' }}
      options={data}
      allowClear
      optionFilterProp="name"
    >
      {/* {
        data.map(item => <Option label={item?.name} key={item?.id} value={item?.id}>{item?.name}</Option>)
      } */}
    </Select>
  )
})

CreatorSelect.displayName = 'CreatorSelect'

export default CreatorSelect
