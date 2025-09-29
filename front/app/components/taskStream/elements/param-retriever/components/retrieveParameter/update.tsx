'use client'
import type { FC } from 'react'
import React, { useCallback, useState } from 'react'
import { useBoolean } from 'ahooks'
import type { ParameterDefinition } from '../../types'
import { ParameterDataType } from '../../types'
import Textarea from '../../../_foundation/components/form/base/textarea'
import AddButton from '@/app/components/base/click-unit/add-button'
import Modal from '@/app/components/base/pop-modal'
import Button from '@/app/components/base/click-unit'
import Field from '@/app/components/taskStream/elements/_foundation/components/form/field-unit'
import Input from '@/app/components/base/text-entry'
import Select from '@/app/components/base/pick-list'
import Toast, { ToastTypeEnum } from '@/app/components/base/flash-notice'
import { ChangeType, type ExtraInfo } from '@/app/components/taskStream/types'
import { checkKeys } from '@/shared/utils/var'

const DEFAULT_PARAMETER: ParameterDefinition = {
  name: '',
  type: ParameterDataType.string,
  description: '',
  require: false,
}

type ParameterEditorProps = {
  type: 'add' | 'edit'
  payload?: ParameterDefinition
  onSave: (payload: ParameterDefinition, moreInfo?: ExtraInfo) => void
  onCancel?: () => void
}

const PARAMETER_TYPES = Object.values(ParameterDataType)

const ParameterEditor: FC<ParameterEditorProps> = ({
  type,
  payload,
  onSave,
  onCancel,
}) => {
  const isAddMode = type === 'add'
  const [parameter, setParameter] = useState<ParameterDefinition>(isAddMode ? DEFAULT_PARAMETER : payload as ParameterDefinition)
  const [renameInfo, setRenameInfo] = useState<ExtraInfo | undefined>(undefined)

  const [isModalVisible, {
    setTrue: showModal,
    setFalse: hideModal,
  }] = useBoolean(!isAddMode)

  const updateParameter = useCallback((key: string) => {
    return (value: any) => {
      const isNameChange = key === 'name'
      if (isNameChange) {
        setRenameInfo({
          type: ChangeType.changeVarName,
          payload: {
            beforeKey: parameter.name,
            afterKey: value,
          },
        })
      }
      else {
        setRenameInfo(undefined)
      }

      setParameter(prev => ({
        ...prev,
        [key]: value,
      }))
    }
  }, [parameter.name])

  const closeModal = useCallback(() => {
    hideModal()
    onCancel?.()
  }, [onCancel, hideModal])

  const openAddModal = useCallback(() => {
    if (isAddMode)
      setParameter(DEFAULT_PARAMETER)

    showModal()
  }, [isAddMode, showModal])

  const validateParameter = useCallback(() => {
    let errorMessage = ''

    if (!parameter.name) {
      errorMessage = '名称 字段必填'
    }
    else {
      const { isValid, errorKey } = checkKeys([parameter.name], true)
      if (!isValid)
        errorMessage = `变量名称不合法: ${errorKey}`
    }

    if (!errorMessage && !parameter.description)
      errorMessage = '描述 字段必填'

    if (errorMessage) {
      Toast.notify({
        type: ToastTypeEnum.Error,
        message: errorMessage,
        duration: 1000,
      })
      return false
    }
    return true
  }, [parameter])

  const saveParameter = useCallback(() => {
    if (!validateParameter())
      return

    onSave(parameter, renameInfo)
    closeModal()
  }, [validateParameter, onSave, parameter, closeModal, renameInfo])

  return (
    <div>
      {isAddMode && (
        <AddButton className='mx-1' onClick={openAddModal} />
      )}
      {isModalVisible && (
        <Modal
          title={isAddMode ? '添加提取参数' : '更新提取参数'}
          isShow
          onClose={closeModal}
          className='!w-[400px] !max-w-[400px] !p-4'
        >
          <div>
            <div className='space-y-2'>
              <Field label="名称">
                <Input
                  value={parameter.name}
                  onChange={e => updateParameter('name')(e)}
                  placeholder="请输入参数名称"
                />
              </Field>
              <Field label="类型">
                <Select
                  defaultValue={parameter.type}
                  enableSearch={false}
                  onSelect={v => updateParameter('type')(v.value)}
                  optionClass='capitalize'
                  items={
                    PARAMETER_TYPES.map(type => ({
                      value: type,
                      name: type,
                    }))
                  }
                />
              </Field>
              <Field label="描述">
                <Textarea
                  value={parameter.description}
                  onChange={e => updateParameter('description')(e.target.value)}
                  placeholder="请输入参数描述"
                />
              </Field>
            </div>
            <div className='mt-4 flex justify-end space-x-2'>
              <Button className='!w-[95px]' onClick={closeModal}>取消</Button>
              <Button className='!w-[95px]' variant='primary' onClick={saveParameter}>
                {isAddMode ? '添加' : '保存'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default React.memo(ParameterEditor)
