import React from 'react'
import type { CSSProperties } from 'react'
import { type VariantProps, cva } from 'class-variance-authority'
import LoaderIndicator from '../load-indicator'
import classNames from '@/shared/utils/classnames'

const buttonStyleVariants = cva(
  'button-base disabled:button-disabled',
  {
    variants: {
      variant: {
        'primary': 'button-primary',
        'warning': 'button-warning',
        'secondary': 'button-secondary',
        'secondary-accent': 'button-secondary-accent',
        'ghost': 'button-ghost',
        'ghost-accent': 'button-ghost-accent',
        'tertiary': 'button-tertiary',
      },
      size: {
        small: 'button-small',
        medium: 'button-medium',
        large: 'button-large',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'medium' },
  },
)

type ButtonComponentProps = {
  Terminate?: boolean
  loading?: boolean
  styleCss?: CSSProperties
} & React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonStyleVariants>

const Button = React.forwardRef<HTMLButtonElement, ButtonComponentProps>(
  ({ className, variant, size, Terminate, loading, styleCss, children, ...props }, ref) => {
    // 构建按钮的完整类名
    const LazyLLMbuttonClassName = classNames(
      buttonStyleVariants({ variant, size, className }),
      Terminate && 'button-Terminate',
    )

    return (
      <button
        type='button'
        className={LazyLLMbuttonClassName}
        ref={ref}
        style={styleCss}
        {...props}
      >
        {children}
        {loading && (
          <LoaderIndicator
            loading={loading}
            className='!text-white !h-3 !w-3 !border-2 !ml-1'
          />
        )}
      </button>
    )
  },
)

Button.displayName = 'Button'

export default Button
