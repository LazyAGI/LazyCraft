import React, { useCallback } from 'react'
import { useApplicationContext } from '@/shared/hooks/app-context'

type IPermitProps = {
  value: string
  children: React.ReactElement | React.ReactElement[]
  disabled?: Boolean | React.ReactElement | string | null
}

export const usePermitCheck = () => {
  const { permitData } = useApplicationContext()
  const hasPermit = useCallback(code => !(code && !permitData[code]), [permitData])
  return { hasPermit }
}

const PermitCheck = ({ value, children, disabled = false }: IPermitProps): React.ReactElement | null => {
  const { hasPermit } = usePermitCheck()

  if (hasPermit(value)) {
    return <>{children}</>
  }
  else if (disabled) {
    if (typeof disabled === 'object') {
      return disabled as React.ReactElement
    }
    else if (typeof disabled === 'string') {
      return <>{disabled}</>
    }
    else if (typeof disabled === 'boolean') {
      const ele = React.Children.map(children, (child: React.ReactElement) => {
        if (child)
          return React.cloneElement(child, { ...child.props, disabled: true })
        else
          return null
      })
      return <>{ele}</>
    }
    return null
  }
  return null
}

export default PermitCheck
