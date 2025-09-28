'use client'
import React, { type FC, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CloseOutlined } from '@ant-design/icons'
import produce from 'immer'
import { useStoreApi } from 'reactflow'
import VarReferencePopup from './flow-node-var-ref-pop'
import ConstantField from './fixed-field'
import { getNodeInfoById, isENV, isSystemVar } from './utils'
import { ExecutionBlockEnum } from '@/app/components/taskStream/types'
import { ToolVariableType as VarKindType } from '@/app/components/taskStream/elements/utility/types'
import IconFont from '@/app/components/base/iconFont'
import { AnchorPortal, AnchorPortalLauncher, BindPortalContent } from '@/app/components/base/promelement'
import { useIsChatMode, useWorkflow, useWorkflowVariableManager } from '@/app/components/taskStream/logicHandlers'
import AddButton from '@/app/components/base/click-unit/add-button'
import TypeSelector from '@/app/components/taskStream/elements/_foundation/components/picker'
import cn from '@/shared/utils/classnames'
import type { ExecutionNode, ExecutionNodeOutPutVar, ValueRetriever, Variable } from '@/app/components/taskStream/types'
import type { EmberLoom } from '@/app/components/top-bar/account-setting/model-provider-page/declarations'

/** 默认触发器宽度 */
const DEFAULT_TRIGGER_WIDTH = 227

/**
 * 工作流节点变量引用选择器组件的属性接口
 */
type WorkflowNodeVariableReferencePickerProps = {
  /** 可用的节点列表 */
  enabledNodes?: ExecutionNode[]
  /** 可用的变量列表 */
  availableVars?: ExecutionNodeOutPutVar[]
  /** 自定义CSS类名 */
  className?: string
  /** 默认变量类型 */
  defaultVarKindType?: VarKindType
  /** 变量过滤函数 */
  filterVar?: (payload: Variable, ValueRetriever: ValueRetriever) => boolean
  /** 是否使用添加按钮作为触发器 */
  isAddBtnTrigger?: boolean
  /** 是否显示节点名称 */
  isShowNodeName?: boolean
  /** 是否支持常量值 */
  isSupportConstantValue?: boolean
  /** 当前节点ID */
  nodeId: string
  /** 值变化时的回调函数 */
  onChange: (value: ValueRetriever | string, varKindType: VarKindType, varInfo?: Variable) => void
  /** 打开时的回调函数 */
  onOpen?: () => void
  /** 是否只显示叶子节点变量 */
  restrictLeafNodeVar?: boolean
  /** 是否为只读模式 */
  readonly: boolean
  /** 凭证表单模式 */
  schema?: EmberLoom
  /** 当前选中的值 */
  value: ValueRetriever | string
}

/**
 * 工作流节点变量引用选择器组件
 *
 * 该组件用于工作流节点中选择变量引用，支持：
 * - 变量类型选择（变量/常量）
 * - 变量引用选择
 * - 常量值输入
 * - 环境变量支持
 * - 迭代变量支持
 * - 系统变量支持
 * - 动态宽度计算
 * - 变量过滤
 *
 * @param props 组件属性
 * @returns 渲染的变量引用选择器组件
 */
const WorkflowNodeVariableReferencePicker: FC<WorkflowNodeVariableReferencePickerProps> = ({
  enabledNodes: passedInAvailableNodes,
  availableVars,
  className,
  defaultVarKindType = VarKindType.constant,
  filterVar = () => true,
  isAddBtnTrigger,
  isShowNodeName: _isShowNodeName,
  isSupportConstantValue,
  nodeId,
  onChange,
  onOpen = () => { },
  restrictLeafNodeVar,
  readonly,
  schema,
  value,
}) => {
  // 获取ReactFlow存储API
  const store = useStoreApi()
  const { getNodes } = store.getState()

  // 获取工作流相关hooks
  const isChatMode = useIsChatMode()
  const { getTreeLeafNodes, getPreviousNodesInSameBranch } = useWorkflow()
  const { getCurrentVariableType, getNodeAvailableVars } = useWorkflowVariableManager()

  /**
   * 计算可用的节点列表
   * 根据配置决定是获取叶子节点还是同分支前置节点
   */
  const enabledNodes = useMemo(() => {
    return passedInAvailableNodes || (restrictLeafNodeVar ? getTreeLeafNodes(nodeId) : getPreviousNodesInSameBranch(nodeId))
  }, [getPreviousNodesInSameBranch, getTreeLeafNodes, nodeId, restrictLeafNodeVar, passedInAvailableNodes])

  // 查找开始节点
  const EntryNode = enabledNodes.find((node: ExecutionNode) => {
    return node.data.type === ExecutionBlockEnum.EntryNode
  })

  // 获取当前节点信息
  const node = getNodes().find(n => n.id === nodeId)
  const isInIteration = !!node?.data.isInIteration
  const iterationNode = isInIteration ? getNodes().find(n => n.id === node.parentId) : null

  // 触发器引用和宽度管理
  const triggerRef = useRef<HTMLDivElement>(null)
  const [triggerWidth, setTriggerWidth] = useState(DEFAULT_TRIGGER_WIDTH)

  // 监听触发器宽度变化
  useEffect(() => {
    if (triggerRef.current)
      setTriggerWidth(triggerRef.current.clientWidth)
  }, [])

  // 变量类型状态管理
  const [varKindType, setVarKindType] = useState<VarKindType>(defaultVarKindType)
  const isConstant = isSupportConstantValue && varKindType === VarKindType.constant

  /**
   * 计算输出变量列表
   * 支持传入的变量列表或动态计算
   */
  const outputVars = useMemo(() => {
    if (availableVars) {
      const isVariableArray = (arr: any[]): boolean => {
        const first = arr[0]
        return first && typeof first === 'object' && 'variable' in first && 'type' in first
      }

      if (availableVars.length > 0 && isVariableArray(availableVars as any[]))
        return [{ nodeId, title: '当前节点输入', vars: availableVars as any } as any]

      return availableVars
    }

    const vars = getNodeAvailableVars({
      parentNode: iterationNode,
      beforeNodes: enabledNodes,
      isChatMode,
      filterVar,
    })
    return vars
  }, [iterationNode, enabledNodes, isChatMode, filterVar, availableVars, getNodeAvailableVars, nodeId])

  // 弹窗状态管理
  const [open, setOpen] = useState(false)

  // 触发打开回调
  useEffect(() => {
    if (open)
      onOpen()
  }, [open, onOpen])

  // 判断是否有值
  const hasValue = !isConstant && value.length > 0

  /**
   * 判断是否为迭代变量
   * 检查变量是否来自迭代节点的item或index
   */
  const isIterationVar = useMemo(() => {
    if (!isInIteration)
      return false
    if (value[0] === node?.parentId && ['item', 'index'].includes(value[1]))
      return true
    return false
  }, [isInIteration, value, node])

  // 获取输出变量节点信息
  const outputVarNodeId = hasValue ? value[0] : ''
  const outputVarNode = useMemo(() => {
    if (!hasValue || isConstant)
      return null

    if (isIterationVar)
      return iterationNode?.data

    if (isSystemVar(value as ValueRetriever))
      return EntryNode?.data

    return getNodeInfoById(enabledNodes, outputVarNodeId)?.data
  }, [value, hasValue, isConstant, isIterationVar, iterationNode, enabledNodes, outputVarNodeId, EntryNode])

  /**
   * 计算变量名称
   * 处理系统变量和普通变量的显示格式
   */
  const varName = useMemo(() => {
    if (hasValue) {
      const isSystem = isSystemVar(value as ValueRetriever)
      let variableName = ''
      if (Array.isArray(value))
        variableName = value.length >= 3 ? (value as ValueRetriever).slice(-2).join('.') : value[value.length - 1]

      // 系统变量已删除，项目不使用系统变量
      return variableName
    }
    return ''
  }, [hasValue, value])

  // 变量类型选项
  const varKindTypes = [
    {
      label: 'Variable',
      value: VarKindType.variable,
    },
    {
      label: 'Constant',
      value: VarKindType.constant,
    },
  ]

  /**
   * 处理变量类型变化
   * 切换变量类型时重置值
   */
  const handleVarKindTypeChange = useCallback((selectedValue: VarKindType) => {
    setVarKindType(selectedValue)
    onChange(selectedValue === VarKindType.constant ? '' : [], selectedValue)
  }, [onChange])

  // 输入框引用和焦点管理
  const inputRef = useRef<HTMLInputElement>(null)
  const [isFocus, setIsFocus] = useState(false)
  const [controlFocus, setControlFocus] = useState(0)

  // 控制输入框焦点
  useEffect(() => {
    if (controlFocus && inputRef.current) {
      inputRef.current.focus()
      setIsFocus(true)
      setControlFocus(0) // 重置控制状态
    }
  }, [controlFocus])

  /**
   * 处理变量引用变化
   * 处理系统变量的特殊格式
   */
  const handleVarReferenceChange = useCallback((selectedValue: ValueRetriever, varInfo: Variable) => {
    const newValue = produce(selectedValue, (draft) => {
      if (draft[1] && draft[1].startsWith('sys')) {
        draft.shift()
        const paths = draft[0].split('.')
        paths.forEach((p, i) => {
          draft[i] = p
        })
      }
    })
    onChange(newValue, varKindType, varInfo)
    setOpen(false)
  }, [onChange, varKindType])

  /**
   * 清除变量值
   * 根据变量类型重置为相应的默认值
   */
  const handleClearVar = useCallback(() => {
    onChange(varKindType === VarKindType.constant ? '' : [], varKindType)
  }, [onChange, varKindType])

  // 获取变量类型
  const type = getCurrentVariableType({
    ValueRetriever: value as ValueRetriever,
    enabledNodes,
    isChatMode,
    isConstant: !!isConstant,
  })

  // 判断是否为环境变量
  const isEnv = isENV(value as ValueRetriever)

  // 计算可用宽度和文本宽度分配
  const availableWidth = triggerWidth - 56
  const [maxVarNameWidth, maxTypeWidth] = useMemo(() => {
    const totalTextLength = ((outputVarNode?.title || '') + (varName || '') + (type || '')).length
    const PRIORITY_WIDTH = 15
    const maxVarNameWidth = -PRIORITY_WIDTH + Math.floor((varName?.length || 0) / totalTextLength * availableWidth)
    const maxTypeWidth = Math.floor((type?.length || 0) / totalTextLength * availableWidth)
    return [maxVarNameWidth, maxTypeWidth]
  }, [outputVarNode?.title, varName, type, availableWidth])

  /**
   * 渲染添加按钮触发器
   */
  const renderAddButtonTrigger = () => {
    if (!isAddBtnTrigger)
      return null

    return (
      <div>
        <AddButton onClick={() => {}} />
      </div>
    )
  }

  /**
   * 渲染类型选择器
   */
  const renderTypeSelector = () => {
    if (!isSupportConstantValue)
      return null

    return (
      <div onClick={(e) => {
        e.stopPropagation()
        setOpen(false)
        setControlFocus(Date.now())
      }} className='mr-1 flex items-center space-x-1'>
        <TypeSelector
          noLeft
          activatorClassName='!text-xs'
          readonly={readonly}
          value={varKindType}
          options={varKindTypes}
          onChange={handleVarKindTypeChange}
        />
        <div className='h-4 w-px bg-black/5'></div>
      </div>
    )
  }

  /**
   * 渲染变量图标
   */
  const renderVariableIcon = () => {
    if (isSupportConstantValue || hasValue)
      return null

    return (
      <div className='ml-1.5 mr-1'>
        <IconFont type='icon-x' className='w-3.5 h-3.5 text-gray-400' />
      </div>
    )
  }

  /**
   * 渲染常量输入框
   */
  const renderConstantField = () => {
    if (!isConstant)
      return null

    return (
      <ConstantField
        value={value as string}
        onChange={onChange as ((value: string | number, varKindType: VarKindType, varInfo?: Variable) => void)}
        schema={schema as EmberLoom}
        readonly={readonly}
      />
    )
  }

  /**
   * 渲染变量显示区域
   */
  const renderVariableDisplay = () => {
    if (isConstant)
      return null

    return (
      <div className={cn('inline-flex h-full items-center px-1.5 rounded-[5px]', hasValue && 'bg-white')}>
        {hasValue
          ? (
            <>
              <div className='flex items-center text-primary-600'>
                {isEnv && <IconFont type='icon-env' className='w-3.5 h-3.5 text-util-colors-violet-violet-600' />}
                <div className={cn('ml-0.5 text-xs font-medium truncate', isEnv && '!text-gray-900')} title={varName} style={{
                  maxWidth: maxVarNameWidth,
                }}>{varName}</div>
              </div>
              <div className='ml-0.5 text-xs font-normal text-gray-500 capitalize truncate' title={type} style={{
                maxWidth: maxTypeWidth,
              }}>{type}</div>
            </>
          )
          : (
            <div className='text-[13px] font-normal text-gray-400'>{'设置变量'}</div>
          )}
      </div>
    )
  }

  /**
   * 渲染清除按钮
   */
  const renderClearButton = () => {
    if (!hasValue || readonly)
      return null

    return (
      <div
        className='invisible group-hover/wrap:visible absolute h-5 right-1 top-[50%] translate-y-[-50%] group p-1 rounded-md hover:bg-black/5 cursor-pointer'
        onClick={handleClearVar}
      >
        <CloseOutlined className='w-3.5 h-3.5 text-gray-500 group-hover:text-gray-800' />
      </div>
    )
  }

  /**
   * 渲染主要触发器
   */
  const renderMainTrigger = () => {
    if (isAddBtnTrigger)
      return renderAddButtonTrigger()

    return (
      <div ref={triggerRef} className={cn(
        (open || isFocus) ? 'border-gray-300' : 'border-gray-100',
        'relative group/wrap flex items-center w-full h-8 p-1 rounded-lg bg-gray-100 border',
      )}>
        {renderTypeSelector()}
        {renderVariableIcon()}
        {renderConstantField()}
        {renderVariableDisplay()}
        {renderClearButton()}
      </div>
    )
  }

  return (
    <div className={cn(className, !readonly && 'cursor-pointer')}>
      <AnchorPortal
        open={open}
        onOpenChange={setOpen}
        placement={isAddBtnTrigger ? 'bottom-end' : 'bottom-start'}
      >
        <AnchorPortalLauncher onClick={() => {
          if (readonly)
            return
          !isConstant ? setOpen(!open) : setControlFocus(Date.now())
        }} className='!flex'>
          {renderMainTrigger()}
        </AnchorPortalLauncher>
        <BindPortalContent style={{
          zIndex: 100,
        }}>
          {!isConstant && (
            <VarReferencePopup
              vars={outputVars}
              onChange={handleVarReferenceChange}
              itemWidth={isAddBtnTrigger ? 260 : triggerWidth}
            />
          )}
        </BindPortalContent>
      </AnchorPortal>
    </div>
  )
}

// 使用React.memo优化组件性能，避免不必要的重渲染
export default React.memo(WorkflowNodeVariableReferencePicker)
