'use client'
import React, { useState } from 'react'
import { Button, DatePicker, Flex, Form, Input, Space, Table } from 'antd'
import { useAntdTable, useRequest } from 'ahooks'
import dayjs from 'dayjs'
import styles from './page.module.scss'
import { useApplicationContext } from '@/shared/hooks/app-context'
import { queryOperationLogs } from '@/infrastructure/api/log'
import { getCurrentGroupList } from '@/infrastructure/api/user'

const { RangePicker } = DatePicker

type FilterOption = {
  text: string
  value: string
}

const Logs = () => {
  const [form] = Form.useForm()
  const { userSpecified } = useApplicationContext()
  const [resetKey, setResetKey] = useState(0)
  const [filterParams, setFilterParams] = useState({})
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [allFilterOptions, setAllFilterOptions] = useState<{
    username: FilterOption[]
    module: FilterOption[]
    action: FilterOption[]
  }>({
    username: [],
    module: [],
    action: [],
  })

  // 查询用户组下拉列表
  const { data: userGroupList = [] as any[], loading: loadingUserGroupList } = useRequest(
    () => getCurrentGroupList().then((res: any) => res?.tenants || []),
  )

  // 获取所有筛选选项
  const updateFilterOptions = (data: any[]) => {
    if (!data?.length)
      return
    setAllFilterOptions((prev) => {
      const newOptions = {
        username: [...new Set([...prev.username.map(item => item.value), ...data.map(item => item?.username)])].filter(Boolean),
        module: [...new Set([...prev.module.map(item => item.value), ...data.map(item => item?.module)])].filter(Boolean),
        action: [...new Set([...prev.action.map(item => item.value), ...data.map(item => item?.action)])].filter(Boolean),
      }
      return {
        username: newOptions.username.map(item => ({ text: item, value: item })),
        module: newOptions.module.map(item => ({ text: item, value: item })),
        action: newOptions.action.map(item => ({ text: item, value: item })),
      }
    })
  }

  const handleTableChange = (pagination: any, filters: any) => {
    // 处理筛选参数
    const newParams: any = {}
    if (filters?.username?.[0])
      newParams.user_name = filters.username[0]

    if (filters?.module?.[0])
      newParams.module = filters.module[0]

    if (filters?.action?.[0])
      newParams.action = filters.action[0]

    setFilterParams(newParams)
    setCurrentPage(pagination.current)
    setPageSize(pagination.pageSize)
    // 使用 search.submit 触发新的请求
    search.submit()
  }

  const getTableData = ({ current, pageSize: defaultPageSize }): any => {
    const formData = form.getFieldsValue()
    const params: any = {
      page: currentPage || current,
      per_page: pageSize || defaultPageSize,
      ...filterParams,
    }
    Object.entries(formData || {}).forEach(([key, value]) => {
      if (key === 'dates') {
        params.start_date = value?.[0]?.format('YYYY-MM-DD')
        params.end_date = value?.[1]?.format('YYYY-MM-DD')
      }
      else if (value !== 'all' && typeof value !== 'undefined' && value !== null && value !== '') {
        params[key] = value
      }
    })

    return queryOperationLogs({ params: { ...params } }).then((res) => {
      // 更新筛选选项
      updateFilterOptions(res?.result?.data)
      return {
        list: [...res?.result?.data],
        total: res?.result?.total,
      }
    })
  }
  const { tableProps, pagination, search } = useAntdTable(getTableData, {
    form,
    defaultPageSize: 10,
  })

  const handleReset = () => {
    search.reset()
    setResetKey(prev => prev + 1)
    setFilterParams({})
    setCurrentPage(1)
    setPageSize(10)
    search.submit()
  }

  const columns: any = [
    {
      title: '序号',
      dataIndex: 'id',
    },
    {
      title: '用户名',
      dataIndex: 'username',
      filters: userSpecified?.id === '00000000-0000-0000-0000-000000000001' || userSpecified?.id === '00000000-0000-0000-0000-000000000000' ? allFilterOptions.username : undefined,
      filterSearch: userSpecified?.id === '00000000-0000-0000-0000-000000000001' || userSpecified?.id === '00000000-0000-0000-0000-000000000000',
      filterOnClose: false,
      filterMultiple: false,
    },
    {
      title: '所属模块',
      dataIndex: 'module',
      filters: allFilterOptions.module,
      filterSearch: true,
      filterOnClose: false,
      filterMultiple: false,
    },
    {
      title: '操作类型',
      dataIndex: 'action',
      filters: allFilterOptions.action,
      filterSearch: true,
      filterOnClose: false,
      filterMultiple: false,
    },
    {
      title: '操作内容',
      dataIndex: 'details',
    },
    {
      title: '操作时间',
      dataIndex: 'created_at',
    },
  ]

  return (
    <div className={styles.outerWrap}>
      <div className={styles.logsWrap}>
        <div className={styles.topWrap}>
          <Form layout='inline' form={form} style={{ width: '100%' }}>
            <Flex justify='space-between' style={{ width: '100%' }}>
              {/* <Space>
                {<PermitCheck value='AUTH_0000'><Form.Item
                  name="organization_id"
                  initialValue={'all'}
                >
                  <Select
                    allowClear
                    style={{ width: 226 }}
                    loading={loadingUserGroupList}
                    options={userGroupList?.length
                      ? [{ label: '全部', value: 'all' }].concat(userGroupList?.map((item: any) => ({
                        label: item?.name,
                        value: item?.id,
                      })) || [])
                      : []}
                    placeholder='请选择组织'
                    onChange={() => {
                      search.submit()
                    }}
                  />
                </Form.Item></PermitCheck>}
              </Space> */}
              <div></div>
              <Space>
                <Form.Item name="dates" initialValue={[dayjs(), dayjs()]}>
                  <RangePicker
                    allowClear={false}
                    placeholder={['开始时间', '结束时间']}
                    onChange={() => {
                      search.submit()
                    }}
                  />
                </Form.Item>
                <Form.Item name="details">
                  <Input.Search
                    allowClear
                    style={{ width: 270 }}
                    placeholder='请输入操作内容'
                    onSearch={() => {
                      search.submit()
                    }}
                  />
                </Form.Item>
                <Form.Item style={{ flex: 'auto', marginInlineEnd: 0 }}>
                  <Button type="primary" ghost onClick={handleReset}>
                    重置
                  </Button>
                </Form.Item>
              </Space>
            </Flex>
          </Form>
        </div>
        <div className='mt-[20px]'>
          <Table
            key={resetKey}
            rowKey='id'
            columns={columns}
            {...tableProps}
            onChange={handleTableChange}
            pagination={{
              ...tableProps.pagination,
              current: currentPage,
              pageSize,
              pageSizeOptions: ['10', '20', '50', '100'],
              showQuickJumper: true,
              showSizeChanger: true,
              total: pagination?.total || 0,
              showTotal: (total, range) => <span style={{ position: 'absolute', left: 0 }}>共 {total} 条</span>,
            }}
            scroll={{ x: 'max-content' }}
          />
        </div>
      </div>
    </div>
  )
}

export default Logs
