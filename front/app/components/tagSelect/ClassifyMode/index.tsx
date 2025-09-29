import React, { forwardRef, useCallback } from 'react'
import { Form } from 'antd'
import './index.scss'

type TagOption = {
  name: string
  id: string
  options?: Omit<TagOption, 'options'>[]
}

type IProps = {
  type: string
  selectLabels?: TagOption[]
  setSelectLabels: (labels: TagOption[]) => void
  needSpace?: boolean
  label?: string
  singleSelect?: boolean
}

export const tagList: Record<string, TagOption[]> = {
  dataset: [{ name: '文本', id: 'doc' }], // [{ name: '文本', id: 'doc' }, { name: '图片', id: 'pic' }],
  script: [{ name: '数据过滤', id: '数据过滤' }, { name: '数据增强', id: '数据增强' }, { name: '数据去噪', id: '数据去噪' }, { name: '数据标注', id: '数据标注' }],
  modelAdjust: [{ name: '排队中', id: 'Pending' }, { name: '进行中', id: 'InProgress' }, { name: '已完成', id: 'Completed' }, { name: '失败', id: 'Failed' }, { name: '已取消', id: 'Cancel' }],
  inference: [{ name: '启动中', id: 'Done' }, { name: '在线', id: 'Ready' }, { name: '离线', id: 'Cancelled' }, { name: '异常', id: 'Invalid' }],
  toolType: [{ name: '代码工具', id: 'IDE' }, { name: 'API工具', id: 'API' }],
  toolStatu: [{ name: '已发布', id: 'true' }, { name: '未发布', id: 'false' }],
}

const ClassifyMode = (props, ref) => {
  const { type, selectLabels = [], setSelectLabels, needSpace = true, singleSelect = false } = props
  const getLabelsActive = useCallback(
    (option: TagOption) => {
      const arr = selectLabels.filter((item: TagOption) => item.id === option.id)
      return arr.length !== 0
    },
    [selectLabels],
  )
  const labelsClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLDivElement
      const optionId = target.getAttribute('data-id')
      const name = target.getAttribute('data-name')
      if (!optionId || !name)
        return

      const arr = selectLabels.filter((item: TagOption) => item.id === optionId)
      if (arr.length !== 0) {
        // 取消已选
        const temp = selectLabels.filter((item: TagOption) => item.id !== optionId)
        setSelectLabels(temp)
      }
      else {
        if (singleSelect) {
          // 单选模式，直接替换
          setSelectLabels([{ id: optionId, name }])
        }
        else {
          // 多选模式，添加到数组
          const temp = [...selectLabels, { id: optionId, name }]
          setSelectLabels(temp)
        }
      }
    },
    [selectLabels, setSelectLabels],
  )
  return (
    <div>
      <Form.Item label={props?.label || '类别'} style={{ marginBottom: 15 }} >
        <div className="labels-item-wrap" style={{ marginLeft: needSpace ? 30 : 0 }}>
          {tagList[type]?.map((option: TagOption) => (
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
      </Form.Item>

    </div>

  )
}

export default forwardRef<HTMLDivElement, IProps>(ClassifyMode)
