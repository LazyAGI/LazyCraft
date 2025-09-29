'use client'
import type { FC } from 'react'
import React from 'react'
import produce from 'immer'
import { Checkbox } from 'antd'
import { INJECTABLE_FIELD_TYPE_WHITELIST } from './constant'
import { useReadonlyNodes } from '@/app/components/taskStream/logicHandlers'
import useNodeDataOperations from '@/app/components/taskStream/elements/_foundation/hooks/fetch-item-feed-data'
import { useStore } from '@/app/components/taskStream/store'

/** check or uncheck to update injected prop of current parameter */
const InjectableCheckbox: FC<any> = ({
  type,
  name,
  nodeId,
  nodeData,
}) => {
  const patentState = useStore(s => s.patentState)
  const { historyStacks } = patentState
  const { inputs, setInputs } = useNodeDataOperations<any>(nodeId, nodeData)
  const { config__parameters } = inputs || {}
  const { injected, injectable } = config__parameters?.find((item: any) => item.name === name) || {}
  const { nodesReadOnly } = useReadonlyNodes()

  // update injected prop of current node parameter
  const handleFieldChange = (e: any) => {
    const currentValue = e.target.checked

    const newInputs = produce(inputs, (draft: any) => {
      draft.config__parameters = draft.config__parameters?.map((item: any) => {
        if (item.name === name)
          item.injected = currentValue

        return item
      })
    })
    setInputs(newInputs)
  }

  return ((injectable || INJECTABLE_FIELD_TYPE_WHITELIST.includes(type)) && historyStacks?.length >= 2 && !nodesReadOnly)
    ? (
      <span className='mx-2'>
        <Checkbox checked={!!injected} onChange={handleFieldChange} />
      </span>
    )
    : null
}

const Main: FC<any> = ({
  type,
  name,
  nodeId,
  nodeData,
}) => {
  const isNodeEnv = !!nodeId
  return isNodeEnv ? <InjectableCheckbox type={type} name={name} nodeId={nodeId} nodeData={nodeData} /> : null
}
export default React.memo(Main)
