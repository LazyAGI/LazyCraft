import React, { useEffect, useMemo, useState } from 'react'
import { Button, Empty, List, Modal, Segmented, Spin, Table, Typography } from 'antd'
import { get } from '@/infrastructure/api/base'

type ReferenceType = 'tool' | 'app' | 'kb' | 'mcp'

type ReferenceResultModalProps = {
  visible: boolean
  type: ReferenceType
  id: string | number
  onClose: () => void
}

const { Paragraph, Text } = Typography

const pickValue = (item: any, keys: string[], fallback?: any) => {
  for (const k of keys) {
    const v = item?.[k]
    if (v !== undefined && v !== null && v !== '')
      return v
  }
  return fallback
}

const ReferenceResultModal: React.FC<ReferenceResultModalProps> = ({ visible, type, id, onClose }) => {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [viewMode, setViewMode] = useState<'json' | 'form'>('form')

  const title = useMemo(() => {
    if (type === 'tool')
      return '工具引用详情'
    if (type === 'app')
      return '应用引用详情'
    if (type === 'mcp')
      return 'MCP引用详情'
    return '知识库引用详情'
  }, [type])

  const fetchData = async () => {
    if (!visible || !id)
      return
    setLoading(true)
    setErrorMsg('')
    try {
      let res: any
      if (type === 'app') {
        res = await get(`apps/${id}/reference-result`)
      }
      else if (type === 'tool') {
        res = await get('/tool/reference-result', { params: { id } })
      }
      else if (type === 'mcp') {
        res = await get('/mcp/reference-result', { params: { id } })
      }
      else { // kb
        res = await get('/kb/reference-result', { params: { id } })
      }

      setData(res)
    }
    catch (e: any) {
      setErrorMsg(e?.message || '获取引用结果失败')
      setData(null)
    }
    finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, type, id])

  const normalizeList = (payload: any): any[] => {
    if (!payload)
      return []
    if (Array.isArray(payload))
      return payload
    if (Array.isArray(payload?.data))
      return payload.data
    if (payload?.data && typeof payload.data === 'object')
      return [payload.data]
    return [payload]
  }

  const list = useMemo(() => normalizeList(data), [data])

  // 生成表格数据与列（每条数据一行）
  const tableData = useMemo(() => {
    return (list || []).map((item: any, idx: number) => {
      const name = pickValue(item, ['name', 'title', 'app_name', 'kb_name'], `引用项 ${idx + 1}`)
      const idVal = pickValue(item, ['id', 'app_id', 'tool_id', 'kb_id'], '')
      const source = pickValue(item, ['source', 'ref_from', 'origin'], '')
      const path = pickValue(item, ['path', 'location', 'node_path'], '')
      const updatedAt = pickValue(item, ['updated_at', 'update_time', 'modified_at', 'publish_at', 'created_at'], '')
      const description = pickValue(item, ['description', 'remark'], '')
      const refType = pickValue(item, ['type'], type)
      return {
        key: item?.id || `${idx}`,
        __raw: item,
        name,
        id: idVal,
        type: refType,
        source,
        path,
        updatedAt,
        description,
      }
    })
  }, [list, type])

  const columns = useMemo(() => {
    return [
      { title: '名称', dataIndex: 'name', key: 'name', width: 200, ellipsis: true },
      { title: 'ID', dataIndex: 'id', key: 'id', width: 220, ellipsis: true },
      { title: '类型', dataIndex: 'type', key: 'type', width: 100, ellipsis: true },
    ]
  }, [])

  return (
    <Modal
      title={title}
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>关闭</Button>,
      ]}
      width={1000}
      destroyOnClose
    >
      <Spin spinning={loading}>
        {errorMsg
          ? (
            <Paragraph type="danger">{errorMsg}</Paragraph>
          )
          : (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <Segmented
                  size="small"
                  value={viewMode}
                  onChange={val => setViewMode(val as 'json' | 'form')}
                  options={[
                    { label: '行表单', value: 'form' },
                    { label: 'JSON', value: 'json' },
                  ]}
                />
              </div>
              {(!list || list.length === 0) && <Empty description="暂无引用" />}
              {list && list.length > 0 && (
                viewMode === 'json'
                  ? (
                    <List
                      bordered
                      dataSource={list}
                      renderItem={(item: any, idx) => (
                        <List.Item>
                          <div style={{ width: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                              <Text strong>{item?.name || item?.title || item?.app_name || item?.kb_name || `引用项 ${idx + 1}`}</Text>
                              {item?.id && <Text type="secondary">ID：{item.id}</Text>}
                            </div>
                            <Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>
                              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{JSON.stringify(item, null, 2)}</pre>
                            </Paragraph>
                          </div>
                        </List.Item>
                      )}
                    />
                  )
                  : (
                    <Table
                      columns={columns as any}
                      dataSource={tableData as any}
                      pagination={false}
                      scroll={{ x: 900, y: 480 }}
                      expandable={{
                        expandedRowRender: (record: any) => (
                          <Paragraph style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{JSON.stringify(record.__raw, null, 2)}</pre>
                          </Paragraph>
                        ),
                        rowExpandable: () => true,
                      }}
                    />
                  )
              )}
            </>
          )}
      </Spin>
    </Modal>
  )
}

export default ReferenceResultModal
