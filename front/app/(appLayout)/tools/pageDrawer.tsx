import React, { useEffect, useRef, useState } from 'react'
import { Button, Drawer, Form, Image, Input, Popconfirm, Select, Space, Upload, message } from 'antd'
import { CloudSyncOutlined, LoadingOutlined, PlusOutlined } from '@ant-design/icons'
import type { UploadProps } from 'antd'
import KeyValueList from './keyValueList'
import ToolMcpList from './toolMcplist'
import McpToolTesting from './Mcp/mcptoolTesting'
import styles from './pageDrawer.module.scss'
import type { TagSelectRef } from '@/app/components/tagSelect'
import TagSelect from '@/app/components/tagSelect'
import IconModal from '@/app/components/iconModal'
import { addMcp, getMcp, publishMcp } from '@/infrastructure/api/toolmcp'
import { ssePost } from '@/infrastructure/api/base'
import type { CreateUpdateMcpParams, CreateUpdateMcpResponse, GetMcpParams, GetMcpResponse, McpTool, SyncMcpParams, TestMcpResponse } from '@/shared/types/toolsMcp'
import { bindTags } from '@/infrastructure/api/tagManage'

// 通用的键值对数据格式转换函数
const convertObjectToKeyValueArray = (data: any, fieldName: string) => {
  if (data[fieldName] && typeof data[fieldName] === 'object' && !Array.isArray(data[fieldName])) {
    // 将对象格式转换为数组格式
    return Object.entries(data[fieldName]).map(([key, value]) => ({
      key,
      value,
    }))
  }
  // 如果没有数据或数据长度为0，设置默认值
  if (!data[fieldName] || data[fieldName].length === 0)
    return [{ key: '', value: '' }]

  return data[fieldName]
}

// 将键值对数组转换回对象格式
const convertKeyValueArrayToObject = (keyValueArray: any[]) => {
  if (!keyValueArray || !Array.isArray(keyValueArray))
    return {}

  const result: any = {}
  keyValueArray.forEach((item) => {
    if (item && item.key && item.value)
      result[item.key] = item.value
  })

  return Object.keys(result).length > 0 ? result : null
}

const PageDrawer = (props: any) => {
  const { visible, onClose, data, gettaglist, getmcpList } = props
  const [loading, setLoading] = useState(false)
  const [iconModal, setIconModal] = useState(false)
  const [open, setOpen] = useState(visible)
  const [form] = Form.useForm()
  const token = localStorage.getItem('console_token')
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [transportType, setTransportType] = useState<string>('')
  const [descriptionValue, setDescriptionValue] = useState<string>('')
  const [connectionDrawer, setConnectionDrawer] = useState(false)
  const [mcpData, setMcpData] = useState<McpTool[] | null>(null)
  const [connectionLoading, setConnectionLoading] = useState(false)
  const [selectedTool, setSelectedTool] = useState<McpTool | null>(null)
  const [testParams, setTestParams] = useState<Record<string, any>>({})
  const [testForm] = Form.useForm()
  const [testResult, setTestResult] = useState<TestMcpResponse | null>(null)
  const [testLoading, setTestLoading] = useState(false)
  const [testStatus, setTestStatus] = useState<'untested' | 'success' | 'failed'>('untested')
  const [testPassed, setTestPassed] = useState(false)
  const [mcpServerId, setMcpServerId] = useState<string | null>(null)
  const [syncLogs, setSyncLogs] = useState<Array<{ event: string; data: string }>>([])
  const [canProceed, setCanProceed] = useState<boolean>(false)
  const [syncStatus, setSyncStatus] = useState<'running' | 'success' | 'error'>('running')
  const logsContainerRef = useRef<HTMLDivElement | null>(null)
  const tagSelectRef = useRef<TagSelectRef>(null)
  const [tagSelectVersion, setTagSelectVersion] = useState(0)

  const resetForms = () => {
    form?.resetFields()
    testForm?.resetFields()
  }

  const resetUiState = () => {
    setTransportType('')
    setDescriptionValue('')
    setIconModal(false)
    setLoading(false)
    setConfirmLoading(false)
  }

  const resetTestState = () => {
    setSelectedTool(null)
    setTestParams({})
    setTestResult(null)
    setTestStatus('untested')
    setTestPassed(false)
  }

  const resetConnectionState = () => {
    setMcpData(null)
    setConnectionLoading(false)
    setConnectionDrawer(false)
    setMcpServerId(null)
    setSyncLogs([])
    setCanProceed(false)
    setSyncStatus('running')
  }

  const clearAllStates = () => {
    resetForms()
    resetUiState()
    resetTestState()
    resetConnectionState()
  }

  const handlePublishAction = async (publishType: string) => {
    try {
      const mcpServerId = (mcpData && mcpData.length > 0) ? mcpData[0].mcp_server_id : null
      if (!mcpServerId) {
        message.error('无法获取MCP服务ID')
        return
      }

      const params = {
        body: {
          id: String(mcpServerId),
          publish_type: publishType,
        },
      }

      const res = await publishMcp(params)

      if (res) {
        message.success('发布成功')
        setConnectionDrawer(false)
        onClose()
        clearAllStates()
        getmcpList()
        if (typeof gettaglist === 'function') {
          try {
            await gettaglist()
          }
          catch { }
        }
      }
      else {
        message.error('发布失败')
      }
    }
    catch (error) {
      console.error(`${publishType}失败:`, error)
    }
  }

  const handleCancelConfirm = () => {
    setConnectionDrawer(false)
    clearAllStates()
    onClose()
    message.success('已取消并清空')
  }

  const handleCancel = () => {
    clearAllStates()
    onClose()
  }

  const handleOk = async () => {
    try {
      setConfirmLoading(true)
      const values = await form.validateFields()
      const tagsValue = values.tags
      delete values.tags
      if (values.stdio_env)
        values.stdio_env = convertKeyValueArrayToObject(values.stdio_env)
      if (values.headers)
        values.headers = convertKeyValueArrayToObject(values.headers)
      if (values.timeout !== undefined && values.timeout !== null) {
        const parsedTimeout = Number(values.timeout)
        values.timeout = Number.isNaN(parsedTimeout) ? undefined : parsedTimeout
      }
      const existingId: string | null = mcpServerId
        || (data?.id ? String(data.id) : (data?.mcp_server_id ? String(data.mcp_server_id) : null))
      const addMcpParams: CreateUpdateMcpParams = existingId ? { ...values, id: existingId } : values
      const mcpResult: CreateUpdateMcpResponse | null = await addMcp({ body: addMcpParams })
      const latestId = (mcpResult?.id ? String(mcpResult.id) : existingId) || null
      if (latestId)
        setMcpServerId(latestId)
      if (latestId && tagsValue) {
        await bindTags({
          url: 'tags/bindings/update',
          body: { type: 'mcp', tag_names: tagsValue, target_id: latestId },
        })
        if (typeof gettaglist === 'function') {
          try {
            await gettaglist()
          }
          catch { }
        }
      }

      if (latestId) {
        message.success('新增成功')
        getmcpList()
        setConnectionDrawer(true)
        setConnectionLoading(true)
        setSyncLogs([])
        setCanProceed(false)
        setSyncStatus('running')
        const syncMcpParams: SyncMcpParams = { id: String(latestId) }
        ssePost('/mcp/servers/sync-tools', { body: syncMcpParams }, {
          onStart: () => {
            setSyncLogs(prev => [...prev, { event: 'start', data: '开始' }])
          },
          onChunk: (chunk: any) => {
            try {
              let payload = chunk
              if (typeof chunk === 'string') {
                try {
                  payload = JSON.parse(chunk)
                }
                catch { }
              }

              const event = (payload && (payload.event || payload.type)) ? (payload.event || payload.type) : 'message'
              const data = (payload && typeof payload.data === 'string')
                ? payload.data
                : ((payload && payload.data != null) ? JSON.stringify(payload.data) : ((typeof chunk === 'string') ? chunk : JSON.stringify(payload)))
              setSyncLogs(prev => [...prev, { event, data }])
            }
            catch (e) {
              setSyncLogs(prev => [...prev, { event: 'message', data: typeof chunk === 'string' ? chunk : JSON.stringify(chunk) }])
            }
          },
          onFinish: async (payload: any) => {
            if (payload && payload.flow_type === 'mcp') {
              message.success('同步成功')
              try {
                const finishData = (payload && typeof payload.data === 'string')
                  ? payload.data
                  : JSON.stringify(payload?.data ?? payload)
                setSyncLogs(prev => [...prev, { event: 'finish', data: finishData }])
              }
              catch {
                // 忽略错误
              }
              try {
                const getMcpParams: GetMcpParams = { mcp_server_id: String(latestId) }
                const mcpResponse: GetMcpResponse = await getMcp({ body: getMcpParams })
                setMcpData(mcpResponse.data || [])
              }
              catch (error) {
                message.error('获取工具列表失败')
              }
            }
          },
          onError: (errMsg: any) => {
            const data = typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg)
            setSyncLogs(prev => [...prev, { event: 'error', data }])
            setSyncStatus('error')
            setCanProceed(true)
          },
        })
      }
      else {
        message.error('创建失败')
      }
    }
    catch (error) {
      // 操作失败
      // message.error('操作失败')
    }
    finally {
      setConfirmLoading(false)
    }
  }

  const handleToolSelect = (tool: McpTool) => {
    setSelectedTool(tool)
    setTestParams({})
    setTestResult(null)
    setTestStatus('untested')
  }
  useEffect(() => {
    setOpen(visible)
    if (data) {
      const processedData = { ...data }
      processedData.stdio_env = convertObjectToKeyValueArray(data, 'stdio_env')
      processedData.headers = convertObjectToKeyValueArray(data, 'headers')
      if (processedData.timeout !== undefined && processedData.timeout !== null)
        processedData.timeout = String(processedData.timeout)
      form.setFieldsValue(processedData)
      setTransportType(data.transport_type || '')
      setDescriptionValue(data.description || '')
      const incomingId = data?.id ? String(data.id) : (data?.mcp_server_id ? String(data.mcp_server_id) : null)
      if (incomingId)
        setMcpServerId(incomingId)
      tagSelectRef.current?.refresh?.()
    }
  }, [visible, data, form])

  useEffect(() => {
    if (connectionLoading && logsContainerRef.current)
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight
  }, [syncLogs, connectionLoading])

  const uploadButton = (
    <button style={{ border: 0, background: 'none' }} type="button">
      {loading ? <LoadingOutlined /> : <PlusOutlined />}
      <div style={{ marginTop: 8 }}>Upload</div>
    </button>
  )

  const handleIconChange: UploadProps['onChange'] = (info) => {
    if (info.file.status === 'uploading') {
      setLoading(true)
    }
    else if (info.file.status === 'done') {
      setLoading(false)
      form.setFieldValue('icon', info.file.response.file_path)
    }
    else { setLoading(false) }
  }
  const categoryItems = [
    { label: 'STDIO', value: 'STDIO' },
    { label: 'SSE', value: 'SSE' },
  ]
  const stdioItems = [
    { label: 'npx', value: 'npx' },
    { label: 'uvx', value: 'uvx' },
  ]

  return (
    <div className={styles.pageDrawer}>
      <Drawer

        title="自定义MCP服务"
        open={open}
        onClose={handleCancel}
        width={600}
        maskClosable={false}
        closable={false}
        extra={
          <Space>
            <Button onClick={handleCancel}>取消</Button>
            <Button type="primary" loading={confirmLoading} onClick={handleOk}>
              确定
            </Button>
          </Space>
        }
        className={`${styles.mainDrawer} ${connectionDrawer ? styles.connectionOpen : ''}`}
      >
        <div className={styles.formContainer}>
          <Form
            form={form}
            layout="vertical"
            autoComplete="off"
          >
            <Form.Item
              name="icon"
              label="图标"
            >
              <div className={styles.iconUpload}>
                <Upload
                  name="file"
                  accept='.jpg,.png,.jpeg'
                  listType="picture-card"
                  className={`avatar-uploader ${styles.avatarUploader}`}
                  maxCount={1}
                  showUploadList={false}
                  headers={
                    { Authorization: `Bearer ${token}` }
                  }
                  action="/console/api/mh/upload/icon"
                  onChange={handleIconChange}
                >
                  {form.getFieldValue('icon')
                    ? (
                      <div className={styles.iconContainer}>
                        <Image src={form.getFieldValue('icon').replace('app', 'static')} alt="avatar" preview={false} />
                      </div>
                    )
                    : uploadButton}
                </Upload>
                <p style={{ color: '#C1C3C9' }}>注：建议尺寸 128px * 128px，支持.jpg、.png，大小不超过1MB。</p>
                <Button className={styles.moreIconButton} type='link' onClick={() => { setIconModal(true) }}>查看更多图标</Button>
              </div>
            </Form.Item>

            <Form.Item
              name="name"
              label="服务名称"
              validateTrigger='onBlur'
              rules={[
                { required: true, message: '请输入服务名称' },
                { whitespace: true, message: '内容不能为空或仅包含空格' },
              ]}
            >
              <Input maxLength={50} placeholder='请输入服务名称' showCount />
            </Form.Item>
            {/* 服务标签 */}
            <Form.Item
              name="tags"
            >
              <TagSelect
                key={tagSelectVersion}
                ref={tagSelectRef}
                fieldName='tags'
                type='mcp'
                label={'服务标签'}
                onRefresh={async () => {
                  if (typeof gettaglist === 'function') {
                    try {
                      await gettaglist()
                    }
                    catch { }
                  }

                  setTagSelectVersion(v => v + 1)
                }}
              />
            </Form.Item>
            <Form.Item
              name="description"
              label="服务简介"
              rules={[
                { whitespace: true, message: '内容不能为空或仅包含空格' },
              ]}
            >
              <div style={{ position: 'relative' }}>
                <Input.TextArea
                  maxLength={100}
                  rows={4}
                  placeholder="请输入服务简介"
                  value={descriptionValue}
                  onChange={(e) => {
                    const value = e.target.value
                    setDescriptionValue(value)
                    form.setFieldValue('description', value)
                  }}
                />
                <div style={{
                  position: 'absolute',
                  bottom: '8px',
                  right: '12px',
                  fontSize: '12px',
                  color: '#999',
                  pointerEvents: 'none',
                  backgroundColor: 'white',
                  padding: '0 4px',
                }}>
                  {descriptionValue.length}/100
                </div>
              </div>
            </Form.Item>
            {/* 传输类型 */}
            <Form.Item
              name="transport_type"
              label="传输类型"
              rules={[
                { required: true, message: '请选择传输类型' },
              ]}
            >
              <Select
                placeholder='请选择传输类型'
                options={categoryItems}
                onChange={value => setTransportType(value)}
              />
            </Form.Item>

            {/* STDIO 类型字段 */}
            {transportType === 'STDIO' && (
              <>
                <Form.Item
                  name="stdio_command"
                  label="启动命令"
                  rules={[
                    { required: true, message: '请选择启动命令' },
                  ]}
                >
                  <Select placeholder='请选择启动命令' options={stdioItems} />
                </Form.Item>
                <Form.Item
                  name="stdio_arguments"
                  label="启动参数"
                  rules={[
                    { required: true, message: '请输入启动参数' },
                    { whitespace: true, message: '内容不能为空或仅包含空格' },
                  ]}
                >
                  <Input placeholder='请输入启动参数' />
                </Form.Item>

                {/* 环境变量 */}
                <KeyValueList
                  name="stdio_env"
                  label="环境变量"
                  keyPlaceholder="Key"
                  valuePlaceholder="Value"
                  addButtonText="添加环境变量"
                  keyValidationMessage="请输入Key"
                  valueValidationMessage="请输入Value"
                />

              </>
            )}

            {/* SSE 和 Streamable HTTP 类型字段 */}
            {(transportType === 'SSE' || transportType === 'Streamable HTTP') && (
              <>
                <Form.Item
                  name="http_url"
                  label="服务端URL"
                  rules={[
                    { required: true, message: '请输入服务端URL' },
                    {
                      pattern: /^https?:\/\/.+/,
                      message: '请输入以http://或https://开头的URL',
                    },
                    {
                      max: 150,
                      message: 'URL长度不能超过150个字符',
                    },
                  ]}
                >
                  <Input placeholder='请输入服务端URL' />
                </Form.Item>
                <KeyValueList
                  name="headers"
                  label="请求头"
                  keyPlaceholder="Header名称"
                  valuePlaceholder="Header值"
                  addButtonText="添加请求头"
                  keyLabel="Header名称"
                  valueLabel="Header值"
                  keyValidationMessage="请输入Header名称"
                  valueValidationMessage="请输入Header值"
                />
              </>
            )}

            <Form.Item
              name="timeout"
              label="超时（秒）"
              rules={[
                { required: true, message: '请输入超时时间' },
                { pattern: /^[1-9]\d*$/, message: '请输入整数秒' },
                {
                  validator: (_, value) => {
                    if (!value)
                      return Promise.resolve()
                    const num = parseInt(value, 10)
                    if (Number.isNaN(num))
                      return Promise.reject(new Error('请输入数字'))
                    if (num < 10 || num > 600)
                      return Promise.reject(new Error('超时时间范围为10-600秒'))
                    return Promise.resolve()
                  },
                },
              ]}
            >
              <Input placeholder='请输入超时时间（秒）' />
            </Form.Item>
          </Form>

          <IconModal
            visible={iconModal}
            onClose={() => setIconModal(false)}
            onSuccess={(iconUrl: string) => {
              form.setFieldValue('icon', iconUrl)
              setIconModal(false)
            }}
          />
        </div>
        <Drawer
          maskClosable={false}
          title="连接插件工具"
          width={600}
          closable={false}
          onClose={() => {
            setConnectionDrawer(false)
          }}
          open={connectionDrawer}
          className={styles.connectionDrawer}
          extra={
            <Space>
              {connectionLoading
                ? (
                  <Button onClick={() => setConnectionDrawer(false)}>取消</Button>
                )
                : (
                  <Popconfirm
                    placement="bottom"
                    title="确认取消"
                    description="还没有发布，是否确认取消？"
                    okText="确认"
                    cancelText="继续"
                    onConfirm={handleCancelConfirm}
                  >
                    <Button>取消</Button>
                  </Popconfirm>
                )}
              {connectionLoading
                ? (
                  <Button
                    type="primary"
                    disabled={!canProceed}
                    onClick={() => {
                      if (!canProceed) {
                        message.info('同步进行中，请稍后…')
                        return
                      }
                      if (syncStatus === 'error') {
                        message.warning('同步失败，请根据上方日志提示修改配置后重试')
                        return
                      }
                      setConnectionLoading(false)
                    }}
                  >
                    下一步
                  </Button>
                )
                : (
                  <Button
                    type="primary"
                    onClick={() => handlePublishAction('正式发布')}
                  >
                    发布
                  </Button>
                )}
            </Space>
          }
        >
          {connectionLoading
            ? (
              <div className={styles.loadingContainer}>
                <div className={styles.logBanner}>
                  <CloudSyncOutlined className={styles.bannerIcon} />
                  <div className={styles.bannerTitle}>插件服务同步日志</div>
                  <div className={`${styles.bannerStatus} ${styles[`status-${syncStatus}`]}`}>
                    {syncStatus === 'running' && <LoadingOutlined spin style={{ marginRight: 6 }} />}
                    {syncStatus === 'error' ? '已失败' : (syncStatus === 'success' ? '已完成' : '进行中')}
                  </div>
                </div>

                <div ref={logsContainerRef} className={styles.logsWrapper}>
                  {syncLogs.length === 0
                    ? (
                      <div className={styles.logsEmpty}>初始化中...</div>
                    )
                    : (
                      <div className={styles.logsList}>
                        {syncLogs.map((log, idx) => {
                          const event = (log.event || '').toLowerCase()
                          const label = log.event || 'message'
                          return (
                            <div key={idx} className={`${styles.logRow} ${styles[`event-${event}`] || ''}`}>
                              <div className={styles.labelCol}><span className={styles.logLabel}>{label}</span></div>
                              <div className={styles.textCol}><pre className={styles.logText}>{log.data}</pre></div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                </div>
              </div>
            )
            : (
              <div className={styles.contentContainer} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* 工具列表区域 - 上半部分 - 自适应高度 */}
                <div style={{ flex: '1', minHeight: 0 }}>
                  <ToolMcpList
                    mcpData={mcpData}
                    connectionLoading={connectionLoading}
                    onToolSelect={handleToolSelect}
                    selectedTool={selectedTool}
                  />
                </div>

                {/* 测试区域 - 下半部分 - 自适应高度 */}
                <div style={{ flex: '1', minHeight: 0, marginTop: '10px' }}>
                  <McpToolTesting
                    selectedTool={selectedTool}
                    onTestResultChange={setTestResult}
                    onTestStatusChange={setTestStatus}
                    onTestPassedChange={setTestPassed}
                  />
                </div>
              </div>
            )}
        </Drawer>
      </Drawer>
    </div>
  )
}

export default PageDrawer
