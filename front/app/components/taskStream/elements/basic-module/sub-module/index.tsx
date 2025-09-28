import React, { type FC } from 'react'
import type { SubModuleNodeType } from './types'
import type { ExecutionNodeProps } from '@/app/components/taskStream/types'

/**
 * 子模块节点组件
 *
 * 该组件用于渲染工作流中的子模块节点，支持：
 * - 子模块预览图显示
 * - 自定义样式和布局
 * - 节点隔离功能
 * - 响应式图片展示
 *
 * @param props 组件属性
 * @returns 子模块节点JSX元素
 */
const BasicModuleSubModuleNode: FC<ExecutionNodeProps<SubModuleNodeType>> = (props) => {
  // 从配置中获取专利图表的预览URL
  const { config__patent_graph } = props.data
  const { preview_url } = config__patent_graph || {}

  return (
    <div style={{
      background: '#f1f1f1',
      borderRadius: '0 0 15px 15px',
      overflow: 'hidden',
    }}>
      {/* 条件渲染预览图片 */}
      {preview_url && (
        <img
          src={preview_url}
          style={{ height: '100%', width: '100%' }}
          alt="子模块预览图"
        />
      )}
    </div>
  )
}

// 设置默认属性：启用节点隔离
BasicModuleSubModuleNode.defaultProps = {
  isolateNode: true,
}

export default React.memo(BasicModuleSubModuleNode)
