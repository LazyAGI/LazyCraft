import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react'
import { Form } from 'antd'
import { DownOutlined } from '@ant-design/icons'
import { getTagList } from '@/infrastructure/api//tagManage'
import './index.scss'

type IProps = {
  onChange?: (value: any) => void
  value?: any
  type: string
  label?: any
  needSpace?: any
  tags?: any[]
  onRefresh?: () => Promise<void>
}

const TagMode = forwardRef((props: any, ref) => {
  const {
    onChange,
    value,
    type,
    selectLabels = [],
    setSelectLabels,
    label,
    needSpace = true,
    url,
    tags: externalTags,
    onRefresh,
  } = props

  const [tags, setTags] = useState<any>(externalTags || [])
  const [expand, setExpand] = useState(false)

  const getList = async () => {
    // 如果有外部传入的标签数据，就不需要请求
    if (externalTags) {
      setTags(externalTags)
      return
    }

    try {
      const res: any = await getTagList({ url: `/${url || 'tags'}`, options: { params: { type } } })
      if (res && Array.isArray(res))
        setTags(res)
      else
        setTags([])
    }
    catch (error) {
      console.error('获取标签列表失败:', error)
      setTags([])
    }
  }

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
  }, [])

  useEffect(() => {
    if (externalTags)
      setTags(externalTags)
  }, [externalTags])

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
      <Form.Item label={label || '标签'} style={{ marginBottom: 15 }}>
        <div className="labels-item-wrap" style={{ marginLeft: needSpace ? 30 : 0 }}>
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
        {tags.length > 10 && (
          <a
            style={{ fontSize: 12 }}
            className='icon-sty'
            onClick={() => setExpand(!expand)}
          >
            <DownOutlined rotate={expand ? 180 : 0} /> {expand ? '收起' : '展开'}
          </a>
        )}
      </Form.Item>
    </div>
  )
})

TagMode.displayName = 'TagMode'

export default TagMode
