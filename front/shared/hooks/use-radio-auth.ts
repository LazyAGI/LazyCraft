import { usePermitCheck } from '@/app/components/app/permit-check'
import { useApplicationContext } from '@/shared/hooks/app-context'

export default function useRadioAuth() {
  const { hasPermit } = usePermitCheck()
  const { userSpecified } = useApplicationContext()
  const is_self_space = userSpecified?.tenant?.status === 'private'
  const isAdministrator = hasPermit('AUTH_ADMINISTRATOR')
  const isSuper = hasPermit('AUTH_0000')
  const editPermit = hasPermit('AUTH_EDIT')
  const addDeletePermit = hasPermit('AUTH_ADD_DELETE')

  return {
    isAdministrator,
    isSuper,
    editPermit,
    addDeletePermit,
    is_self_space,
  }
}
