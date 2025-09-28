'use client'
import type { FC } from 'react'
import React from 'react'
import {PlusOutlined} from '@ant-design/icons'
import { ReactSortable } from 'react-sortablejs'
import { Input } from 'antd'
import type { FieldItemProps } from '../../types'
import IconFont from '@/app/components/base/iconFont'
import cn from '@/shared/utils/classnames'
import Button from '@/app/components/base/click-unit'
import './index.scss'

/** switch-case 节点的条件分支编辑组件 */
const SwtichCaseComponent: FC<Partial<FieldItemProps>> = ({
  disabled,
  readOnly,
  nodeData,
  willDeleteCaseId,
  handleCodeChange,
  handleSortingCase,
  handleDeleteCase,
  handleCreateCase,
  setWillDeleteCaseId,
}) => {
  const { config__output_ports } = nodeData
  const cases = config__output_ports.filter(({ id }) => id !== 'false')
  const casesLength = cases.length

  return (
    <div>
      <div className='leading-[18px] text-xs font-normal text-text-tertiary'>用于定义 switch-case 满足的逻辑条件</div>
      <div>
        <ReactSortable
          list={cases}
          setList={handleSortingCase}
          handle='.handle'
          ghostClass='bg-components-panel-bg'
          animation={100}
        >
          {
            cases.map((item, index) => (
              <div key={item.id}>
                <div
                  className={cn(
                    'group relative py-1 px-0 min-h-[40px] rounded-[10px] bg-components-panel-bg',
                    willDeleteCaseId === item.id && 'bg-state-Terminate-hover',
                  )}
                >
                  <div className={cn(
                    'relative flex ml-1 leading-4 text-[13px] font-semibold text-text-secondary',
                  )}>
                    <div className={cn(
                      'flex items-center justify-between pl-[10px] pr-[16px]',
                      'mt-1',
                    )}>{item.label}</div>
                    <div className={cn(
                      'flex flex-1 items-center justify-between pl-[10px] pr-[30px]',
                      'mt-1',
                    )}>
                      <div className='flex-1'>
                        <Input
                          style={{ width: 100 }}
                          className={!item?.cond ? 'switch-case-error-input' : 'switch-case-normal-input'}
                          value={item.cond}
                          onChange={(e) => { handleCodeChange(e.target.value, item) }}
                        />
                      </div>
                      {
                        ((index === 0 && casesLength > 1) || (index > 0)) && (
                          <Button
                            className='hover:text-components-button-Terminate-ghost-text'
                            size='small'
                            variant='ghost'
                            disabled={readOnly || disabled}
                            onClick={() => handleDeleteCase(item.id)}
                            onMouseEnter={() => setWillDeleteCaseId(item.id)}
                            onMouseLeave={() => setWillDeleteCaseId('')}
                          >
                            <IconFont type='icon-shanchu1' className='mr-1 w-3.5 h-3.5' />
                            {'移除'}
                          </Button>
                        )
                      }
                    </div>
                  </div>
                </div>
              </div>
            ))
          }
        </ReactSortable>
        <div className='px-4 py-2'>
          <Button
            className='w-full'
            variant='tertiary'
            onClick={handleCreateCase}
            disabled={readOnly || disabled}
          >
            <PlusOutlined className='mr-1 w-4 h-4' />
            CASE
          </Button>
        </div>
      </div>
    </div>
  )
}
export default React.memo(SwtichCaseComponent)
