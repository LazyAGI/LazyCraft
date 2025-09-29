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
import { getDataBaseSubTableList } from '@/infrastructure/api/database'

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
    return getDataBaseSubTableList({
      database_id: searchParams.get('database_id'),
      table_id: searchParams.get('table_id'),
      page: current,
      limit: pageSize,
    }).then((res: any) => {
      // 设置表格的列信息
      if (res.columns) {
        // 设置数据库表信息
        setDatabaseTableInfo({
          table_name: res.columns.table_name,
          comment: res.columns.comment,
        })

        // 处理列信息
        const columnsArray = res.columns.columns || []
        const columns = columnsArray.map((col: any) => ({
          name: col.name || col.column_name,
          comment: col.comment || col.column_comment || col.name || col.column_name,
        }))
        setTableColumns(columns)
      }

      return {
        total: res.total,
        list: res.data,
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
