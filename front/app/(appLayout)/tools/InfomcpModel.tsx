'use client'
import React, { useEffect, useRef, useState } from 'react'
import { Button, Card, Form, Image, Input, Modal, Select, Upload, message } from 'antd'
import { LoadingOutlined, PlusOutlined } from '@ant-design/icons'
import type { UploadProps } from 'antd'
import { useRouter } from 'next/navigation'
import KeyValueList from './keyValueList'
import styles from './page.module.scss'
import type { TagSelectRef } from '@/app/components/tagSelect'
import TagSelect from '@/app/components/tagSelect'
import IconModal from '@/app/components/iconModal'
import { editMcp, getMcp } from '@/infrastructure/api/toolmcp'
import Toast, { ToastTypeEnum } from '@/app/components/base/flash-notice'
import { bindTags } from '@/infrastructure/api/tagManage'
import type { CreateUpdateMcpParams, CreateUpdateMcpResponse, McpTool, SyncMcpParams } from '@/shared/types/toolsMcp'

import { ssePost } from '@/infrastructure/api/base'

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

const InfoMcpModel = (props: any) => {
  const router = useRouter()
  const { visible, onClose, data, getmcpList, onSuccess, gettaglist } = props
  const [loading, setLoading] = useState(false)
  const [iconModal, setIconModal] = useState(false)
  const [open, setOpen] = useState(visible)
  const [form] = Form.useForm()
  const token = localStorage.getItem('console_token')
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [transportType, setTransportType] = useState<string>('')
  const [descriptionValue, setDescriptionValue] = useState<string>('')
  const [mcpData, setMcpData] = useState<McpTool[] | null>(null)
  const [selectedTool, setSelectedTool] = useState<McpTool | null>(null)
  const tagSelectRef = useRef<TagSelectRef>(null)
  const [tagSelectVersion, setTagSelectVersion] = useState(0)
  const [updateLoading, setUpdateLoading] = useState(false)

  const handleCancel = () => {
    form.resetFields()
    onClose()
  }
  const handleSync = async () => {
    if (data && data.id) {
      const syncMcpParams = { mcp_server_id: data.id }
      const res: any = await getMcp({ body: syncMcpParams })
      setMcpData(res.data)
      getmcpList()
    }
  }
  // 更新
  const handleUpdate = async () => {
    if (!data || !data.id || updateLoading)
      return

    const syncMcpParams: SyncMcpParams = { id: String(data.id) }
    setUpdateLoading(true)
    try {
      await ssePost('/mcp/servers/sync-tools', { body: syncMcpParams }, {
        onStart: () => {
          setUpdateLoading(true)
        },
        onFinish: async (payload: any) => {
          try {
            const isSuccess = payload && payload.flow_type === 'mcp' && (payload.event === 'finish' || payload.event === 'stop')
            if (isSuccess) {
              message.success('同步成功')
              // 刷新工具列表
              await handleSync()
            }
            else {
              const info = typeof payload === 'string'
                ? payload
                : (payload?.data ? (typeof payload.data === 'string' ? payload.data : JSON.stringify(payload.data)) : JSON.stringify(payload))
              message.error(info || '同步失败')
            }
          }
          catch { }
        },
        onError: (err: any) => {
          const msg = typeof err === 'string' ? err : JSON.stringify(err)
          message.error(msg || '同步失败')
          setUpdateLoading(false)
        },
      })
    }
    catch {
      setUpdateLoading(false)
    }
  }
  const handleToolSelect = (tool: McpTool) => {
    setSelectedTool(tool)
  }

  // 编辑按钮
  const handleOk = async () => {
    try {
      setConfirmLoading(true)
      const values = await form.validateFields()
      let submitData: CreateUpdateMcpParams
      if (mcpData && mcpData.length > 0) {
        submitData = {
          id: data?.id,
          name: values.name,
          description: values.description,
          icon: values.icon,
          tags: values.tags,
          transport_type: data.transport_type,
          timeout: data.timeout,
        }
        if (data.transport_type === 'STDIO') {
          submitData.stdio_command = data.stdio_command
          submitData.stdio_arguments = data.stdio_arguments
          submitData.stdio_env = data.stdio_env
        }
        else if (data.transport_type === 'SSE' || data.transport_type === 'Streamable HTTP') {
          submitData.http_url = data.http_url
          submitData.headers = data.headers
        }
      }
      else {
        submitData = { ...values, id: data?.id }
        if (values.transport_type === 'STDIO') {
          if (values.stdio_env && Array.isArray(values.stdio_env)) {
            const envObject: Record<string, string> = {}
            values.stdio_env.forEach((item: { key: string; value: string }) => {
              if (item.key && item.value)
                envObject[item.key] = item.value
            })
            submitData.stdio_env = envObject
          }
          delete submitData.http_url
          delete submitData.headers
        }
        else if (values.transport_type === 'SSE' || values.transport_type === 'Streamable HTTP') {
          if (values.headers && Array.isArray(values.headers)) {
            const headersObject: Record<string, string> = {}
            values.headers.forEach((item: { key: string; value: string }) => {
              if (item.key && item.value)
                headersObject[item.key] = item.value
            })
            submitData.headers = headersObject
          }
          delete submitData.stdio_command
          delete submitData.stdio_arguments
          delete submitData.stdio_env
        }
      }

      delete submitData.tags
      const res: CreateUpdateMcpResponse | null = await editMcp({ body: submitData })
      if (res) {
        Toast.notify({ type: ToastTypeEnum.Success, message: '更新成功' })
        if (values.tags && data?.id) {
          const res = await bindTags({
            url: 'tags/bindings/update',
            body: { type: 'mcp', tag_names: values.tags, target_id: data.id },
          })
          onSuccess(res)
          await gettaglist?.()
        }
        router.push(`/tools/Mcp?id=${data.id}`)
        getmcpList()
        form.resetFields()
        setTransportType('')
        setDescriptionValue('')
        onClose()
      }
    }
    catch (error) {
      console.error('更新失败:', error)
    }
    finally {
      setConfirmLoading(false)
    }
  }

  useEffect(() => {
    setOpen(visible)
    if (visible && data && data.id)
      handleSync()
    if (visible)
      tagSelectRef.current?.refresh?.()

    if (!visible) {
      form.resetFields()
      setTransportType('')
      setDescriptionValue('')
    }
    else if (data) {
      const processedData = { ...data }
      processedData.stdio_env = convertObjectToKeyValueArray(data, 'stdio_env')
      processedData.headers = convertObjectToKeyValueArray(data, 'headers')
      form.setFieldsValue(processedData)
      setTransportType(data.transport_type || '')
      setDescriptionValue(data.description || '')
    }
  }, [visible, data, form])

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
    <>
      <Modal
        title="编辑插件工具"
        open={visible}
        confirmLoading={confirmLoading}
        onCancel={handleCancel}
        okText='下一步'
        onOk={handleOk}
      >
        <div className={styles.createModule}>
          <Form
            form={form}
            layout="vertical"
            autoComplete="off"
          >
            <Form.Item
              name="icon"
              label="图标"
            >
              <Upload
                name="file"
                accept='.jpg,.png,.jpeg'
                listType="picture-card"
                className="avatar-uploader"
                maxCount={1}
                showUploadList={false}
                headers={
                  { Authorization: `Bearer ${token}` }
                }
                action="/console/api/mh/upload/icon"
                onChange={handleIconChange}
              >

                {form.getFieldValue('icon') ? <Image src={form.getFieldValue('icon').replace('app', 'static')} alt="avatar" preview={false} width={100} height={100} /> : uploadButton}
              </Upload>
              <p className={'text-[#C1C3C9] text-xs mt-2'}>注：建议尺寸 128px * 128px，支持.jpg、.png，大小不超过1MB。</p>
              <Button style={{ position: 'absolute', top: 75, left: 95 }} type='link' onClick={() => { setIconModal(true) }}>查看更多图标</Button>
            </Form.Item>

            <Form.Item
              name="name"
              label="服务名称"
              validateTrigger='onBlur'
              rules={[{ required: true, message: '请输入服务名称' }]}
            >
              <Input maxLength={50} placeholder='请输入服务名称' showCount />
            </Form.Item>
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
                  await gettaglist?.()
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
                  placeholder='请输入服务简介'
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

            {/* 只有当工具列表为空时才显示传输类型相关字段 */}
            {(!mcpData || mcpData.length === 0) && (
              <>
                {/* 传输类型 */}
                <Form.Item
                  name="transport_type"
                  label="传输类型"
                  rules={[
                    { required: true, message: '请输入传输类型' },
                    { whitespace: true, message: '内容不能为空或仅包含空格' },
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
                        { required: true, message: '请输入启动命令' },
                        { whitespace: true, message: '内容不能为空或仅包含空格' },
                      ]}
                    >
                      <Select placeholder='请输入启动命令' options={stdioItems} />
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
              </>
            )}
          </Form>

          <IconModal onSuccess={data => form.setFieldValue('icon', data)} visible={iconModal} onClose={() => setIconModal(false)} />
        </div>
        {/* 工具列表展示区域 */}
        {mcpData && mcpData.length > 0 && (
          <>
            <Card
              title={'工具列表'}
              extra={<Button type='link' onClick={handleUpdate} loading={updateLoading} disabled={updateLoading}>更新</Button>}
              className={styles.toolListCard}
              bodyStyle={{
                height: '300px',
                overflow: 'auto',
                padding: '0',
              }}
            >
              <div className={styles.toolListContainer}>
                {mcpData.map((tool, index) => (
                  <div
                    key={index}
                    className={`${styles.toolItem} ${selectedTool?.id === tool.id ? styles.selectedTool : ''}`}
                    onClick={() => handleToolSelect(tool)}
                  >
                    <div className={styles.toolName}>{tool.name}</div>
                    <div className={styles.toolDescription}>
                      描述: {tool.description}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </>

        )}

      </Modal>

    </>
  )
}

export default InfoMcpModel
