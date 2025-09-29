import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react'
import { Form, Select } from 'antd'
import { DownOutlined } from '@ant-design/icons'
import { getTagList } from '@/infrastructure/api//tagManage'
import './index.scss'

const { Option } = Select
type IProps = {
  onChange?: (value: any) => void
  value?: any
  type: string
}

export default forwardRef((props: IProps, ref) => {
  const { onChange, value, type } = props
  const [selectLabels, setSelectLabels] = useState([]) as any
  const [tags, setTags] = useState<any>([])
  const [expand, setExpand] = useState(false)
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
  const getLabelsActive = useCallback(
    (option: any) => {
      const arr = selectLabels.filter((item: any) => item.id == option.id)
      return arr.length !== 0
    },
    [selectLabels],
  )
  const labelsClick = useCallback(
    (e) => {
      const optionId = e.target.getAttribute('data-id')
      const name = e.target.getAttribute('data-name')
      const arr = selectLabels.filter((item: any) => item.id == optionId)
      if (arr.length !== 0) {
        // 取消已选
        const temp = selectLabels.filter((item: any) => item.id != optionId)
        setSelectLabels(temp)
      }
      else {
        const temp = [...selectLabels, { id: optionId, name }]
        setSelectLabels(temp)
      }
    },
    [selectLabels],
  )
  const count = expand ? tags.length : 10
  return (
    <div>
      <Form.Item label="应用类别" rules={[{ required: true, message: '请选择应用类别' }]}>
        <div className="labels-item-wrap">
          {tags.slice(0, count).map((option: any) => (
            <div
              key={option.id}
              className={`labelItem ${getLabelsActive(option) ? 'label-active' : ''}`}
              data-id={option.id}
              data-name={option.name}
              onClick={labelsClick}
            >
              {option.name}
            </div>
          ))}
        </div>
        {tags.length > 10 && <a
          style={{ fontSize: 12 }}
          className='icon-sty'
          onClick={() => {
            setExpand(!expand)
          }}
        >
          <DownOutlined rotate={expand ? 180 : 0} /> {expand ? '收起' : '展开'}
        </a>}
        {/* <Select
          style={{ width: 150 }}
          placeholder='请选择标签'
          onChange={onChange}
          value={value}
        >
          <Option key='all_全部' value='all'>全部</Option>
          {
            tags.map(item => <Option key={item?.name} value={item?.name}>{item?.name}</Option>)
          }
        </Select> */}
      </Form.Item>

    </div>

  )
})
