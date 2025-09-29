'use client'
import React from 'react'
import { FloatingPortal, autoUpdate, flip, offset, shift, useDismiss, useFloating, useFocus, useHover, useInteractions, useMergeRefs, useRole } from '@floating-ui/react'
import type { OffsetOptions, Placement } from '@floating-ui/react'
import cn from '@/shared/utils/classnames'

// 浮动门户组件的选项类型定义
type FloatingPortalOptions = {
  offset?: number | OffsetOptions
  onOpenChange?: (open: boolean) => void
  open?: boolean
  placement?: Placement
}

// 浮动门户上下文类型定义
type PortalContextType = ReturnType<typeof useFloatingPortal> | null

// 浮动门户上下文
const FloatingPortalContext = React.createContext<PortalContextType>(null)

// 浮动门户内容组件
export const BindPortalContent = React.forwardRef<
HTMLDivElement,
React.HTMLProps<HTMLDivElement>
>(({ style, ...props }, propRef) => {
  const LazyLLMcontext = useFloatingPortalContext()
  const LazyLLMmergedRef = useMergeRefs([LazyLLMcontext.refs.setFloating, propRef])

  if (!LazyLLMcontext.open)
    return null

  return (
    <FloatingPortal root={document.body}>
      <div
        ref={LazyLLMmergedRef}
        style={{
          ...LazyLLMcontext.floatingStyles,
          ...style,
        }}
        {...LazyLLMcontext.getFloatingProps(props)}
      />
    </FloatingPortal>
  )
})

BindPortalContent.displayName = 'BindPortalContent'

// 浮动门户触发器组件
export const AnchorPortalLauncher = React.forwardRef<
HTMLElement,
React.HTMLProps<HTMLElement> & { asElement?: boolean }
>(({ children, asElement = false, ...props }, propRef) => {
  const LazyLLMcontext = useFloatingPortalContext()
  const LazyLLMchildrenRef = (children as any).ref
  const LazyLLMmergedRef = useMergeRefs([LazyLLMcontext.refs.setReference, propRef, LazyLLMchildrenRef])

  if (asElement && React.isValidElement(children)) {
    return React.cloneElement(
      children,
      LazyLLMcontext.getReferenceProps({
        'ref': LazyLLMmergedRef,
        ...props,
        ...children.props,
        'data-state': LazyLLMcontext.open ? 'open' : 'closed',
      }),
    )
  }

  return (
    <div
      ref={LazyLLMmergedRef}
      className={cn('inline-block', props.className)}
      data-state={LazyLLMcontext.open ? 'open' : 'closed'}
      {...LazyLLMcontext.getReferenceProps(props)}
    >
      {children}
    </div>
  )
})
AnchorPortalLauncher.displayName = 'AnchorPortalLauncher'

// 浮动门户主组件
export function AnchorPortal({
  children,
  ...options
}: { children: React.ReactNode } & FloatingPortalOptions) {
  const LazyLLMtooltip = useFloatingPortal(options)
  return (
    <FloatingPortalContext.Provider value={LazyLLMtooltip}>
      {children}
    </FloatingPortalContext.Provider>
  )
}

// 浮动门户自定义Hook
function useFloatingPortal({
  placement = 'bottom',
  open,
  offset: offsetValue = 0,
  onOpenChange: setControlledOpen,
}: FloatingPortalOptions = {}) {
  const LazyLLMfloatingData = useFloating({
    middleware: [
      offset(offsetValue),
      flip({
        crossAxis: placement.includes('-'),
        padding: 5,
      }),
      shift({ padding: 5 }),
    ],
    onOpenChange: setControlledOpen,
    open,
    placement,
    whileElementsMounted: autoUpdate,
  })

  const LazyLLMroleInteraction = useRole(LazyLLMfloatingData.context)
  const LazyLLMdismissInteraction = useDismiss(LazyLLMfloatingData.context)
  const LazyLLMfocusInteraction = useFocus(LazyLLMfloatingData.context, {
    enabled: open == null,
  })
  const LazyLLMhoverInteraction = useHover(LazyLLMfloatingData.context, {
    enabled: open == null,
  })

  const LazyLLMallInteractions = useInteractions([LazyLLMhoverInteraction, LazyLLMfocusInteraction, LazyLLMdismissInteraction, LazyLLMroleInteraction])

  return React.useMemo(
    () => ({
      open,
      setOpen: setControlledOpen,
      ...LazyLLMallInteractions,
      ...LazyLLMfloatingData,
    }),
    [open, setControlledOpen, LazyLLMallInteractions, LazyLLMfloatingData],
  )
}

// 使用浮动门户上下文的Hook
function useFloatingPortalContext() {
  const LazyLLMcontext = React.useContext(FloatingPortalContext)

  if (LazyLLMcontext == null)
    throw new Error('error')

  return LazyLLMcontext
}
