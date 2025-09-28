import { useEffect, useState } from 'react'

/**
 * 切换展开Hook参数接口
 */
type UseWorkflowNodeToggleExpandParams = {
  /** 是否包含底部区域，影响展开高度计算 */
  hasFooter?: boolean
  /** 是否在节点内部，影响展开样式 */
  isNodeEnv?: boolean
  /** 容器元素的引用，用于获取高度信息 */
  ref: React.RefObject<HTMLDivElement>
}

/**
 * 工作流节点切换展开Hook
 *
 * 该Hook用于管理工作流节点的展开/收起状态，支持：
 * - 展开状态管理
 * - 动态高度计算
 * - 条件样式应用
 * - 位置和阴影效果
 * - 节点内外不同布局
 *
 * @param params Hook参数
 * @returns 展开相关的状态和样式
 */
const useWorkflowNodeToggleExpand = ({ hasFooter = true, isNodeEnv, ref }: UseWorkflowNodeToggleExpandParams) => {
  // 展开状态管理
  const [isOpened, setIsOpened] = useState(false)

  // 包装容器高度状态
  const [wrapHeight, setWrapHeight] = useState(ref.current?.clientHeight)

  /**
   * 计算编辑器展开高度
   * 根据展开状态和底部区域存在与否调整高度
   */
  const editorExpandHeight = isOpened ? wrapHeight! - (hasFooter ? 56 : 29) : 0

  // 监听展开状态变化，更新包装容器高度
  useEffect(() => {
    setWrapHeight(ref.current?.clientHeight)
  }, [isOpened, ref])

  /**
   * 动态计算包装容器的CSS类名
   * 根据展开状态和位置应用不同的样式
   */
  const wrapperClassName = (() => {
    if (!isOpened)
      return ''

    if (isNodeEnv)
      return 'fixed z-10 right-[11px] top-[164px] bottom-[10px] p-4 bg-white rounded-xl'

    return 'fixed z-10 left-5 right-5 top-[72px] bottom-0 pb-4 bg-white'
  })()

  /**
   * 动态计算包装容器的样式
   * 展开时应用阴影和位置效果
   */
  const wrapStyle = isOpened
    ? {
      right: '11px',
      boxShadow: '0px 0px 14px -3px rgba(16, 24, 40, 0.06), 0px -2px 8px -1px rgba(16, 24, 40, 0.04)',
    }
    : { margin: '10px 0px' }

  return {
    /** 编辑器展开时的高度 */
    editorExpandHeight,
    /** 当前是否处于展开状态 */
    isOpened,
    /** 设置展开状态的函数 */
    setIsOpened,
    /** 包装容器的CSS类名 */
    wrapperClassName,
    /** 包装容器的内联样式 */
    wrapStyle,
  }
}

export default useWorkflowNodeToggleExpand
