'use client'
import type { FC } from 'react'
import React, { useState } from 'react'
import { Button } from 'antd'
import { PaperClipOutlined } from '@ant-design/icons'
import { v4 as uuid4 } from 'uuid'
import { useUpdateEffect } from 'ahooks'
import type { FieldItemProps } from '../../../types'
import { ValueType, formatValueByType } from '../../utils'
import OuterDbSourceEditModal from './external_db_panel'
import PlatformDbSourceEditModal from './internal_db_panel'
import IconFont from '@/app/components/base/iconFont'
import './index.scss'

/** sqlManager资源 表信息编辑 */
const FieldItem: FC<Partial<FieldItemProps>> = ({
  name,
  formatName,
  value: _value,
  readOnly,
  disabled,
  onChange,
  nodeData,
  resourceData,
}) => {
  const inputs = nodeData || resourceData || {}
  const value = formatValueByType(_value, ValueType.Array)
  const [editModalVisible, setEditModalVisible] = useState<boolean>(false)
  const [modalType, setModalType] = useState<'add' | 'edit'>('add')
  const [modalRecord, setModalRecord] = useState<any>({})

  const platformDataSourceId = inputs?.payload__database_id

  useUpdateEffect(() => {
    onChange && onChange({
      [name]: [],
      ref_id: platformDataSourceId,
    })
  }, [platformDataSourceId])

  return (
    <div className='relative min-h-[32px]'>
      {(!readOnly && !disabled) && <Button
        type='text'
        className="tables-info-dict-column-add-btn"
        style={{
          position: 'absolute',
          right: 0,
          top: -40,
          color: '#0E5DD8',
          padding: '4px 0',
          backgroundColor: '#fff',
        }}
        onClick={() => {
          setModalType('add')
          setModalRecord(undefined)
          setEditModalVisible(true)
        }}
      >
        添加表
        <IconFont type="icon-tianjia1" className="ml-0.5" style={{ color: '#0E5DD8' }} />
      </Button>}

      {value?.map((item: any) => (
        <div
          key={item?.key}
          className="tables-info-dict-column-item"
        >
          <div className='flex items-center'>
            <PaperClipOutlined className="mr-2" style={{ color: '#5E6472' }} />
            <span>{item?.name}</span>
          </div>

          {(!readOnly && !disabled) && <div className="tables-info-dict-column-item-actions flex items-center">
            <IconFont
              type="icon-bianji1"
              className="ml-2 tables-info-dict-column-edit-btn"
              onClick={() => {
                setModalType('edit')
                setModalRecord({ ...item })
                setEditModalVisible(true)
              }}
            />
            <IconFont
              type="icon-shanchu1"
              className="ml-2 tables-info-dict-column-delete-btn"
              onClick={() => {
                const newValue = value.filter((child: any) => child.key !== item.key)
                onChange && onChange({
                  [name]: newValue,
                  [formatName]: {
                    tables: newValue.map((item: any) => {
                      const currentItem = { ...item }
                      delete currentItem.key
                      currentItem.columns = currentItem.columns.map((col: any) => {
                        const currentCol = { ...col }
                        delete currentCol.key
                        return currentCol
                      })
                      return currentItem
                    }),
                  },
                })
              }}
            />
          </div>}
        </div>
      ))}

      {
        inputs?.payload__source === 'platform'
          ? <PlatformDbSourceEditModal
            visible={editModalVisible}
            setVisible={setEditModalVisible}
            database_id={platformDataSourceId}
            record={modalRecord}
            type={modalType}
            onOk={(data: any, _type: 'add' | 'edit') => {
              let newValue: any
              if (_type === 'add') {
                newValue = value.concat({ ...data, key: uuid4() })
              }
              else {
                newValue = value.map((item: any) => {
                  if (item.key === data.key)
                    return data

                  return item
                })
              }
              onChange && onChange({
                [name]: newValue,
                [formatName]: {
                  tables: newValue.map((item: any) => {
                    const currentItem = { ...item }
                    delete currentItem.key
                    currentItem.columns = currentItem.columns.map((col: any) => {
                      const currentCol = { ...col }
                      delete currentCol.key
                      delete currentCol.type
                      delete currentCol.default
                      delete currentCol.is_unique
                      delete currentCol.unique_group
                      delete currentCol.is_foreign_key
                      delete currentCol.foreign_key_info
                      return currentCol
                    })
                    return currentItem
                  }),
                },
              })
            }}
          />
          : <OuterDbSourceEditModal
            visible={editModalVisible}
            setVisible={setEditModalVisible}
            record={modalRecord}
            type={modalType}
            dbType={inputs?.payload__db_type}
            onOk={(data: any, _type: 'add' | 'edit') => {
              let newValue: any
              if (_type === 'add') {
                newValue = value.concat({ ...data, key: uuid4() })
              }
              else {
                newValue = value.map((item: any) => {
                  if (item.key === data.key)
                    return data

                  return item
                })
              }
              onChange && onChange({
                [name]: newValue,
                [formatName]: {
                  tables: newValue.map((item: any) => {
                    const currentItem = { ...item }
                    delete currentItem.key
                    currentItem.columns = currentItem.columns.map((col: any) => {
                      const currentCol = { ...col }
                      delete currentCol.key
                      return currentCol
                    })
                    return currentItem
                  }),
                },
              })
            }}
          />
      }

    </div>
  )
}
export default React.memo(FieldItem)
