'use client'
import React, { type FC, useEffect, useRef, useState } from 'react'
import { useBoolean, useHover } from 'ahooks'
import { SearchOutlined } from '@ant-design/icons'
import { VariableType } from '@/app/components/taskStream/types'
import Iconfont from '@/app/components/base/iconFont'
import { AnchorPortal, AnchorPortalLauncher, BindPortalContent } from '@/app/components/base/promelement'
import { checkKeys } from '@/shared/utils/var'
import cn from '@/shared/utils/classnames'
import type { ExecutionNodeOutPutVar, ValueRetriever, Variable } from '@/app/components/taskStream/types'

/**
 * 对象子项组件的属性接口
 */
type ObjectChildrenProps = {
  /** 变量数据数组 */
  data: Variable[]
  /** 项目宽度 */
  itemWidth?: number
  /** 节点ID */
  nodeId: string
  /** 对象路径 */
  objPath: string[]
  /** 变量选择变化时的回调函数 */
  onChange: (value: ValueRetriever, item: Variable) => void
  /** 悬停状态变化时的回调函数 */
  onHovering?: (value: boolean) => void
  /** 标题 */
  title: string
}

/**
 * 变量项组件的属性接口
 */
type VariableItemProps = {
  /** 变量数据 */
  itemData: Variable
  /** 项目宽度 */
  itemWidth?: number
  /** 节点ID */
  nodeId: string
  /** 对象路径 */
  objPath: string[]
  /** 变量选择变化时的回调函数 */
  onChange: (value: ValueRetriever, item: Variable) => void
  /** 悬停状态变化时的回调函数 */
  onHovering?: (value: boolean) => void
  /** 标题 */
  title: string
}

/**
 * 对象子项组件
 *
 * 该组件用于显示对象的子属性，支持：
 * - 嵌套对象展示
 * - 悬停状态管理
 * - 路径导航显示
 *
 * @param props 组件属性
 * @returns 渲染的对象子项组件
 */
const ObjectChildren: FC<ObjectChildrenProps> = ({
  data,
  itemWidth,
  nodeId,
  objPath,
  onChange,
  onHovering,
  title,
}) => {
  const currentObjPath = objPath
  const itemRef = useRef(null)
  const [isItemHovering, setIsItemHovering] = useState(false)

  // 监听悬停状态
  const _ = useHover(itemRef, {
    onChange: (hovering) => {
      if (hovering) {
        setIsItemHovering(true)
      }
      else {
        // 延迟关闭，避免闪烁
        setTimeout(() => {
          setIsItemHovering(false)
        }, 100)
      }
    },
  })

  const [isChildrenHovering, setIsChildrenHovering] = useState(false)
  const isHovering = isItemHovering || isChildrenHovering

  // 通知父组件悬停状态变化
  useEffect(() => {
    onHovering && onHovering(isHovering)
  }, [isHovering, onHovering])

  useEffect(() => {
    onHovering && onHovering(isItemHovering)
  }, [isItemHovering, onHovering])

  return (
    <div ref={itemRef} className=' bg-white rounded-lg border border-gray-200 shadow-lg space-y-1' style={{
      right: itemWidth ? itemWidth - 10 : 215,
      minWidth: 252,
    }}>
      {/* 显示当前路径 */}
      <div className='flex items-center h-[22px] px-3 text-xs font-normal text-gray-700'>
        <span className='text-gray-500'>{title}.</span>{currentObjPath.join('.')}
      </div>
      {/* 渲染子变量项 */}
      {
        (data && data.length > 0)
        && data.map((v, i) => (
          <VariableItem
            key={i}
            itemData={v}
            itemWidth={itemWidth}
            nodeId={nodeId}
            objPath={objPath}
            onChange={onChange}
            onHovering={setIsChildrenHovering}
            title={title}
          />
        ))
      }
    </div>
  )
}

/**
 * 变量项组件
 *
 * 该组件用于显示单个变量项，支持：
 * - 变量类型图标显示
 * - 悬停展开子项
 * - 变量选择
 * - 系统变量和环境变量特殊处理
 *
 * @param props 组件属性
 * @returns 渲染的变量项组件
 */
const VariableItem: FC<VariableItemProps> = ({
  itemData,
  itemWidth,
  nodeId,
  objPath,
  onChange,
  onHovering,
  title,
}) => {
  // 判断是否为对象类型且有子项
  const isObject = itemData.type === VariableType.object && itemData.children && itemData.children.length > 0
  // 判断是否为系统变量
  // 系统变量已删除，项目不使用系统变量
  const isSystem = false
  // 环境变量已删除，项目不使用环境变量
  const isEnvironment = false

  const itemRef = useRef(null)
  const [isItemHovering, setIsItemHovering] = useState(false)

  // 使用ahooks的useHover监听悬停状态
  const _ = useHover(itemRef, {
    onChange: (hovering) => {
      if (hovering) {
        setIsItemHovering(true)
      }
      else {
        if (isObject) {
          // 对象类型延迟关闭，避免子项闪烁
          setTimeout(() => {
            setIsItemHovering(false)
          }, 100)
        }
        else {
          setIsItemHovering(false)
        }
      }
    },
  })

  const [isChildrenHovering, setIsChildrenHovering] = useState(false)
  const isHovering = isItemHovering || isChildrenHovering
  const open = isObject && isHovering

  // 通知父组件悬停状态变化
  useEffect(() => {
    onHovering && onHovering(isHovering)
  }, [isHovering, onHovering])

  /**
   * 处理变量选择
   * 根据变量类型构建不同的值选择器
   */
  const handleSelection = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isSystem || isEnvironment) {
      // 系统变量和环境变量使用特殊路径格式
      onChange([...objPath, ...itemData.variable.split('.')], itemData)
    }
    else {
      // 普通变量使用节点ID路径格式
      onChange([nodeId, ...objPath, itemData.variable], itemData)
    }
  }

  return (
    <AnchorPortal
      open={open}
      onOpenChange={() => { }}
      placement='left-start'
    >
      <AnchorPortalLauncher className='w-full'>
        <div
          ref={itemRef}
          className={cn(
            isObject ? ' pr-1' : 'pr-[18px]',
            isHovering && (isObject ? 'bg-primary-50' : 'bg-gray-50'),
            'relative w-full flex items-center h-6 pl-3  rounded-md cursor-pointer')
          }
          onClick={handleSelection}
        >
          <div className='flex items-center w-0 grow'>
            {/* 根据变量类型显示不同图标 */}
            {!isEnvironment && <Iconfont type='icon-x' className='shrink-0 w-3.5 h-3.5 text-primary-500' />}
            {isEnvironment && <Iconfont type='icon-env' className='shrink-0 w-3.5 h-3.5 text-util-colors-violet-violet-600' />}
            <div title={itemData.variable} className='ml-1 w-0 grow truncate text-[13px] font-normal text-gray-900'>
              {itemData.variable}
            </div>
          </div>
          {/* 显示变量类型 */}
          <div className='ml-1 shrink-0 text-xs font-normal text-gray-500 capitalize'>{itemData.type}</div>
          {/* 对象类型显示展开箭头 */}
          {isObject && (
            <Iconfont type='icon-youjiantou'/>
          )}
        </div>
      </AnchorPortalLauncher>
      {/* 悬停时显示子项弹窗 */}
      <BindPortalContent style={{
        zIndex: 100,
      }}>
        {isObject && (
          <ObjectChildren
            data={itemData.children as Variable[]}
            itemWidth={itemWidth}
            nodeId={nodeId}
            objPath={[...objPath, itemData.variable]}
            onChange={onChange}
            onHovering={setIsChildrenHovering}
            title={title}
          />
        )}
      </BindPortalContent>
    </AnchorPortal>
  )
}

/**
 * 主组件属性接口
 */
type WorkflowNodeVariableReferenceVarsProps = {
  /** 是否隐藏搜索框 */
  hideSearch?: boolean
  /** 项目宽度 */
  itemWidth?: number
  /** 变量选择变化时的回调函数 */
  onChange: (value: ValueRetriever, item: Variable) => void
  /** 搜索框CSS类名 */
  searchBoxCls?: string
  /** 变量列表 */
  vars: ExecutionNodeOutPutVar[]
}

/**
 * 工作流节点变量引用变量列表组件
 *
 * 该组件用于显示变量引用的完整列表，支持：
 * - 变量搜索过滤
 * - 变量分类展示
 * - 悬停展开子项
 * - 响应式布局
 *
 * @param props 组件属性
 * @returns 渲染的变量引用变量列表组件
 */
const WorkflowNodeVariableReferenceVars: FC<WorkflowNodeVariableReferenceVarsProps> = ({
  hideSearch,
  itemWidth,
  onChange,
  searchBoxCls,
  vars,
}) => {
  // 搜索文本状态
  const [searchText, setSearchText] = useState('')
  // 搜索框焦点状态
  const [isFocus, { setFalse: setBlur, setTrue: setFocus }] = useBoolean(false)

  /**
   * 过滤和搜索变量
   * 支持按节点标题和变量名搜索
   */
  const selectedVars = vars.filter((v) => {
    const children = (v.vars || []).filter(v => checkKeys([v.variable], false).isValid)
    return children.length > 0
  }).filter((node) => {
    if (!searchText)
      return node
    const children = node.vars.filter((v) => {
      const searchTextLower = searchText.toLowerCase()
      return v.variable.toLowerCase().includes(searchTextLower) || node.title.toLowerCase().includes(searchTextLower)
    })
    return children.length > 0
  }).map((node) => {
    let variables = node.vars.filter(v => checkKeys([v.variable], false).isValid)
    if (searchText) {
      const searchTextLower = searchText.toLowerCase()
      if (!node.title.toLowerCase().includes(searchTextLower))
        variables = variables.filter(v => v.variable.toLowerCase().includes(searchText.toLowerCase()))
    }

    return {
      ...node,
      vars: variables,
    }
  })

  /**
   * 渲染搜索框
   */
  const renderSearchBox = () => {
    if (hideSearch)
      return null

    return (
      <>
        <div
          className={cn(searchBoxCls, isFocus && 'shadow-sm bg-white', 'mb-2 mx-1 flex items-center px-2 rounded-lg bg-gray-100 h-8')}
          onClick={e => e.stopPropagation()}
        >
          <SearchOutlined className='shrink-0 ml-[1px] mr-[5px] w-3.5 h-3.5 text-gray-400' />
          <input
            autoFocus
            className='grow px-0.5 py-[7px] text-[13px] text-gray-700 bg-transparent appearance-none outline-none caret-primary-600 placeholder:text-gray-400'
            onChange={e => setSearchText(e.target.value)}
            onBlur={setBlur}
            onFocus={setFocus}
            placeholder='搜索变量'
            value={searchText}
          />
          {/* 清除搜索文本按钮 */}
          {
            searchText && (
              <div
                className='flex items-center justify-center ml-[5px] w-[18px] h-[18px] cursor-pointer'
                onClick={() => setSearchText('')}
              >
                <Iconfont type='icon-shanchu2' className='w-[14px] h-[14px] text-gray-400' />
              </div>
            )
          }
        </div>
        {/* 分隔线 */}
        <div className='h-[0.5px] bg-black/5 relative left-[-4px]' style={{
          width: 'calc(100% + 8px)',
        }}></div>
      </>
    )
  }

  /**
   * 渲染变量列表
   */
  const renderVariableList = () => {
    if (selectedVars.length > 0) {
      return (
        <div className='max-h-[85vh] overflow-y-auto'>
          {selectedVars.map((item, i) => (
            <div key={i}>
              {/* 节点标题 */}
              <div
                className='leading-[22px] px-3 text-xs font-medium text-gray-500 uppercase truncate'
                title={item.title}
              >{item.title}</div>
              {/* 节点下的变量列表 */}
              {item.vars.map((v, j) => (
                <VariableItem
                  key={j}
                  itemData={v}
                  itemWidth={itemWidth}
                  nodeId={item.nodeId}
                  objPath={[]}
                  onChange={onChange}
                  title={item.title}
                />
              ))}
            </div>
          ))}
        </div>
      )
    }

    return <div className='pl-3 leading-[18px] text-xs font-medium text-gray-500 uppercase'>{'没有变量'}</div>
  }

  return (
    <>
      {renderSearchBox()}
      {renderVariableList()}
    </>
  )
}

// 使用React.memo优化组件性能，避免不必要的重渲染
export default React.memo(WorkflowNodeVariableReferenceVars)
