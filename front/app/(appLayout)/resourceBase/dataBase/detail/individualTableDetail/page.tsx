'use client'
// 数据库表详情
import React, { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Breadcrumb, Card, Col, Row, Table } from 'antd'
import Link from 'next/link'
import Image from 'next/image'
import { useAntdTable } from 'ahooks'
import style from '../index.module.scss'
import DatabaseIcon from '@/public/images/resource-base/database.png'
import { Service } from '@/infrastructure/api/generated'

const { Column } = Table

type TableColumn = {
  name: string
  comment: string
}

const DatabaseDetailContent = () => {
  const searchParams = useSearchParams()
  const [databaseTableInfo, setDatabaseTableInfo] = useState<any>({})
  const [tableColumns, setTableColumns] = useState<TableColumn[]>([])
  const { back } = useRouter()

  const getTableData = ({ current, pageSize }): Promise<any> => {
    const databaseId = Number(searchParams.get('database_id'))
    const tableId = Number(searchParams.get('table_id'))
    return Promise.all([
      Service.getDatabaseTable(databaseId, tableId),
      Service.getDatabaseTableData(databaseId, tableId, current, pageSize),
    ]).then(([tableRes, dataRes]) => {
      const tableInfo = tableRes?.data
      if (tableInfo) {
        setDatabaseTableInfo({
          table_name: tableInfo.table_name,
          comment: tableInfo.comment,
        })

        const columnsArray = tableInfo.columns || []
        const columns = columnsArray.map((col: any) => ({
          name: col.name || (col as any).column_name,
          comment: col.comment || (col as any).column_comment || col.name || (col as any).column_name,
        }))
        setTableColumns(columns)
      }

      return {
        total: dataRes?.total ?? 0,
        list: dataRes?.data ?? [],
      }
    })
  }
  const { tableProps } = useAntdTable(getTableData)

  return (
    <div className='px-[30px] pt-5'>
      <Breadcrumb
        items={[
          { title: <Link href='/resourceBase/dataBase'>数据库</Link> },
          { title: <span className={style.middleRouter} onClick={back}>数据库详情</span> },
          { title: '数据库表详情' },
        ]}
      />
      <div className='mt-2'>
        <Card title="数据库表" >
          <Row gutter={10}>
            <Col flex="80px">
              <Image src={DatabaseIcon} alt="" width={80} />
            </Col>
            <Col flex="auto">
              <div className='c-[#071127] font-bold text-lg'>{databaseTableInfo.table_name}</div>
              <div className='c-[#5E6472]'>{databaseTableInfo.comment}</div>
            </Col>
          </Row>
        </Card>
      </div>

      <div className='mt-5'>
        <Card title="表数据">
          <Table
            rowKey='id'
            rowSelection={undefined}
            {...tableProps}
          >
            {
              tableColumns.map((col, index) => (
                <Column
                  key={col.name || index}
                  title={col.comment || col.name}
                  dataIndex={col.name}
                  render={(text) => {
                    if (text === null || text === undefined)
                      return '-'
                    if (typeof text === 'boolean')
                      return text ? '是' : '否'
                    return text
                  }}
                />
              ))
            }
          </Table>
        </Card>
      </div>
    </div>
  )
}
const DatabaseDetail = () => {
  return (
    <Suspense>
      <DatabaseDetailContent />
    </Suspense>
  )
}

export default DatabaseDetail
