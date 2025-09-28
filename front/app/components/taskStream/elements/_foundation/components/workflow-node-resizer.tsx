import {
  memo,
  useCallback,
} from 'react'
import type { OnResize } from 'reactflow'
import { NodeResizeControl } from 'reactflow'
import { useNodesHandlers } from '../../../logicHandlers'
import type { CommonExecutionNodeType } from '../../../types'
import cn from '@/shared/utils/classnames'

/**
 * 调整大小图标组件
 *
 * 这是一个SVG图标，用于表示节点可以调整大小的功能
 * 使用斜向的调整大小箭头设计，视觉上直观地表达调整大小的含义
 *
 * @returns 调整大小图标的JSX元素
 */
const ResizeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M5.19009 11.8398C8.26416 10.6196 10.7144 8.16562 11.9297 5.08904" stroke="black" strokeOpacity="0.16" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

/**
 * 工作流节点调整器组件的属性接口
 * 定义了节点调整器接收的所有配置参数
 */
type WorkflowNodeResizerProps = {
  /** 自定义调整大小图标，默认为内置的ResizeIcon */
  icon?: JSX.Element
  /** 节点的最大宽度限制，单位为像素 */
  maxWidth?: number
  /** 节点的最小高度限制，单位为像素，默认为176px */
  minHeight?: number
  /** 节点的最小宽度限制，单位为像素，默认为272px */
  minWidth?: number
  /** 节点的数据对象，包含节点的各种属性和状态 */
  nodeData: CommonExecutionNodeType
  /** 节点的唯一标识符 */
  nodeId: string
}

/**
 * 工作流节点调整器组件
 *
 * 这是一个基于ReactFlow的节点大小调整组件，为工作流节点提供可视化的尺寸调整功能，
 * 提供以下特性：
 * - 支持节点的宽度和高度调整
 * - 可配置的最小/最大尺寸限制
 * - 自定义调整大小图标
 * - 智能显示逻辑（悬停时显示，选中时强制显示）
 * - 与工作流系统的无缝集成
 *
 * 组件使用React.memo进行性能优化，避免不必要的重渲染
 */
const WorkflowNodeResizer = ({
  icon = <ResizeIcon />,
  maxWidth,
  minHeight = 176,
  minWidth = 272,
  nodeData,
  nodeId,
}: WorkflowNodeResizerProps) => {
  // 从自定义hook获取节点交互功能
  const { handleNodeResize } = useNodesHandlers()

  /**
   * 处理节点大小调整的回调函数
   * 当用户拖拽调整节点大小时触发，调用工作流的节点调整逻辑
   *
   * @param _ - ReactFlow的调整大小事件对象（未使用）
   * @param params - 调整大小后的参数，包含新的宽度和高度
   */
  const handleResize = useCallback<OnResize>((_, params) => {
    handleNodeResize(nodeId, params)
  }, [nodeId, handleNodeResize])

  // 定义容器的显示逻辑
  // 默认隐藏，在group悬停时显示，当节点被选中时强制显示
  const containerClasses = cn(
    'hidden group-hover:block',
    nodeData.selected && '!block',
  )

  // 定义图标容器的定位样式
  // 绝对定位在节点的右下角，提供直观的调整大小入口
  const iconContainerClasses = 'absolute bottom-[1px] right-[1px]'

  return (
    <div className={containerClasses}>
      {/*
        ReactFlow的节点大小调整控制器
        提供拖拽调整大小的交互功能
        位置设置在右下角，符合用户的使用习惯
      */}
      <NodeResizeControl
        className='!border-none !bg-transparent'
        maxWidth={maxWidth}
        minHeight={minHeight}
        minWidth={minWidth}
        onResize={handleResize}
        position='bottom-right'
      >
        {/*
          调整大小图标容器
          显示可拖拽的视觉提示，引导用户进行大小调整操作
        */}
        <div className={iconContainerClasses}>{icon}</div>
      </NodeResizeControl>
    </div>
  )
}

// 使用React.memo包装组件，避免父组件重渲染时的不必要更新
// 只有当props发生变化时才会重新渲染
export default memo(WorkflowNodeResizer)
