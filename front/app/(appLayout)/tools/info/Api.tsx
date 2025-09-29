import React, { useCallback, useEffect, useState } from 'react'
import {
  useRouter,
  useSearchParams,
} from 'next/navigation'
import { Button, Cascader, Form, Input, InputNumber, Popconfirm, Radio, Select, Table, Timeline, Tooltip, TreeSelect, Upload } from 'antd'
import { ExclamationCircleOutlined, UploadOutlined } from '@ant-design/icons'
import type { UploadProps } from 'antd'
import styles from './page.module.scss'
import IconFont from '@/app/components/base/iconFont'
import Toast from '@/app/components/base/flash-notice'
import { getToolApiInfo, testTool, toolsFields, upsertField, upsertToolsApi } from '@/infrastructure/api/tool'

type Props = {
  id: string
  data: any
  onNext?: (data?: any) => void
  onBack?: () => void
  onTestSuccess?: () => void
}

const isNumber = (type: string) => {
  return ['number', 'integer'].includes(type)
}

const { Option } = Select
const ToggleIcon = ({ value = true, disabled = false, onChange }: { value?: boolean; disabled?: boolean; onChange?: (value: boolean) => void }) => {
  const [clicked, setClicked] = useState(value)

  useEffect(() => {
    setClicked(value)
  }, [value])

  const handleClick = () => {
    if (disabled)
      return
    const newValue = !clicked // 每次点击切换状态
    setClicked(newValue)
    onChange?.(newValue)
  }

  return (
    <div onClick={handleClick} style={{ cursor: 'pointer', width: '100%' }}>
      {clicked
        ? disabled
          ? (
            <Tooltip title='若要设置为不可见，请先输入默认值'>
              <IconFont type='icon-yanjing-kai' style={{ fontSize: 24, color: '#C1C3C9', cursor: 'not-allowed' }} />
            </Tooltip>
          )
          : (
            <IconFont type='icon-yanjing-kai' style={{ fontSize: 24, color: disabled ? '#C1C3C9' : '#0E5DD8' }} />
          )
        : (
          <IconFont type='icon-yanjing-bi' style={{ fontSize: 24, color: '#C1C3C9' }} />
        )}
    </div>
  )
}

const Step1 = (props: Props) => {
  const { id, data = {}, onNext } = props
  const [form] = Form.useForm()
  const [dataSource, setDataSource] = useState([{ key: '', value: '' }])
  const [authType, setAuthType] = useState('')
  const authOptions = [{
    value: 'null',
    title: '不需要授权',
  },
  {
    value: 'Service',
    title: 'Service',
    selectable: false,
    children: [
      {
        value: 'service_api',
        title: 'Service token / API key',
      },

    ],
  },
  {
    value: 'OAuth',
    title: 'OAuth',
    selectable: false,
    children: [
      {
        value: 'oauth',
        title: 'standard',
      },
    ],
  },
  ]
  const handleDelete = (index: number) => {
    const headers = form.getFieldValue('header')
    const filterArr = headers.filter((_, i) => i !== index)
    const data = dataSource.filter((_, i) => i !== index)
    form.setFieldValue('header', filterArr)
    setDataSource(data)
  }

  const getData = useCallback(async () => {
    try {
      const res: any = await getToolApiInfo({ url: '/tool/tool_api_info', options: { params: { api_id: data.tool_api_id } } })
      setAuthType(res.auth_method)
      const header = Object.entries(res.header).map((item) => {
        return {
          key: item[0],
          value: item[1],
        }
      })
      setDataSource(header)
      const updatedRes = { ...res, header }
      form.setFieldsValue(updatedRes)
    }
    catch (error) {
    }
  }, [data.tool_api_id, form])

  useEffect(() => {
    if (data && data.tool_api_id && data.tool_mode === 'API')
      getData()
  }, [data, getData])

  const handleAdd = () => {
    const newData = {
      key: '',
      value: '',
    }
    setDataSource([...dataSource, newData])
  }

  const handleNext = async () => {
    form.validateFields().then((values) => {
      const header = {}
      values.header.forEach((item) => {
        header[item.key] = item.value
      })
      values.header = header
      upsertToolsApi({ url: '/tool/upsert_tool_api', body: (values.auth_method === 'null' ? { ...values, auth_method: null } : values) }).then((res: any) => {
        upsertField({ url: '/tool/create_update_tool', body: { id, name: data?.name, tool_api_id: res.id, tool_mode: 'API' } }).then(() => {
          onNext && onNext(res)
        })
      })
    })
  }
  const columns = [
    {
      title: 'Key',
      dataIndex: 'Key',
      render: (_, record, index) => (
        <Form.Item
          style={{ marginBottom: 0 }}
          name={['header', index, 'key']}
          rules={[{ required: true, message: '请输入Key' }, { pattern: /^\S*$/, message: '不能输入空格' }]}
        >
          <Input placeholder="请输入Key" />
        </Form.Item>
      ),
    },
    {
      title: 'Value',
      dataIndex: 'Value',
      render: (_, record, index) => (
        <Form.Item style={{ marginBottom: 0 }} name={['header', index, 'value']} rules={[{ required: true, message: '请输入value' }, { pattern: /^\S*$/, message: '不能输入空格' }]}>
          <Input placeholder="请输入Value" />
        </Form.Item>
      ),
    },
    {
      title: '操作',
      dataIndex: 'operation',
      align: 'right',
      render: (_, record, index) =>
        dataSource.length >= 1
          ? (
            <Popconfirm title="确定要删除吗?" onConfirm={() => handleDelete(index)} okText='是' cancelText="否">
              <Button type='link' size='small' danger disabled={dataSource.length === 1} >删除</Button>
            </Popconfirm>
          )
          : null,
    },
  ]
  const onValuesChange = (changedValues) => {
    if (changedValues.auth_method) {
      setAuthType(changedValues.auth_method)
      form.setFieldValue('api_key', '')
    }
  }
  return (
    <div className={styles.right}>
      <div className={styles.formWrap}>
        <Form
          form={form}
          layout="vertical"
          labelCol={{ span: 8 }}
          wrapperCol={{ span: 24 }}
          onValuesChange={onValuesChange}
        >
          <Form.Item
            name="url"
            label={<div>工具路径URL<Tooltip className='ml-1' title="插件的访问地址或相关资源的链接">
              <ExclamationCircleOutlined />
            </Tooltip></div>}
            rules={[
              { required: true, message: '请输入工具路径URL' },
              { pattern: /^\S*$/, message: '不能输入空格' },
            ]}
          >
            <Input maxLength={200} style={{ width: '40%' }} placeholder='请输入工具路径URL' />
          </Form.Item>
          <Form.Item
            label={''}
            style={{ width: '80%' }}
          >
            <div className={styles.tHead}>
              <span><span style={{ color: '#FF5E5E' }}>* </span>Header列表<Tooltip className='ml-1' title="HTTP请求头列表是客户端程序和服务器在每个HTTP请求和响应中发送和接收的字符串列表。这些标头通常对最终用户不可见，仅由服务器和客户端应用程序处理或记录">
                <ExclamationCircleOutlined />
              </Tooltip></span>
              <Button type='link' size='small' className='mb-[4px]' style={{ float: 'right' }} onClick={handleAdd}>添 加</Button>
            </div>
            <Table
              // size='small'
              dataSource={dataSource}
              columns={columns}
              pagination={false}
            />
          </Form.Item>
          {/* 请求方式选择框 */}
          <Form.Item
            label="请求方式"
            name="request_type"
            // 必填但是可以为null
            rules={[{ required: true, message: '请选择请求方式' }]}
          >
            <Select placeholder='请选择请求方式' style={{ width: '40%' }}>
              <Option value="post">Post方式</Option>
              <Option value="get">Get方式</Option>
            </Select>
          </Form.Item>
          {/* 授权方式选择框 */}
          <Form.Item
            label={<span>授权方式<Tooltip className='ml-1' title={<div>
              <div>选择插件使用的授权或验证方式。目前支持如下3种类型：</div>
              <div>None：不需要授权。</div>
              <div>OAuth：一个开放标准，常用于用户代理认证。允许第三方应用在不共享用户密码的情况下访问用户账户的特定资源。例如，开发者希望利用API发布应用，又不希望透露密码，则可以使用OAuth方式</div>
              <div>Service：指一种简化的认证方式，其中 API 调用需要某种秘钥或令牌来验证其合法性。这种秘钥可能会通过查询参数或请求头传递。它是为了确保只有拥有此秘钥的用户或系统能够访问 API。例如，你可能已经看到过有些公开 API 会要求你注册以获得一个 API 秘钥。</div>
            </div>}>
              <ExclamationCircleOutlined />
            </Tooltip></span>}
            name="auth_method"
          >
            <TreeSelect treeData={authOptions} placeholder="请选择授权方式" style={{ width: '40%' }} defaultValue='null' />
          </Form.Item>

          {authType === 'service_api' && <>
            <Form.Item
              label={<span>位置<Tooltip className='ml-1' title={<div>image.png
                <div>决定了秘钥应该放在哪里传给服务器</div>
                <div>Query：意味着秘钥作为URL的一部分。</div>
                <div>Header：意味着秘钥在HTTP请求的头部。</div>
              </div>}>
                <ExclamationCircleOutlined />
              </Tooltip></span>}
              name="location"
              rules={[{ required: true, message: '请选择位置' }]}
            >
              <Select placeholder='请选择位置' style={{ width: '40%' }}>
                <Option value="header">Header</Option>
                <Option value="query">Query</Option>
              </Select>
            </Form.Item>
            <Form.Item
              label={<span>参数名称<Tooltip className='ml-1' title="Parameter name:这是您需要传递Service Token的参数名。您可以将其视为“键（Key）”，而Service Token则是与之对应的'值'。其作用是告诉API服务，您将在哪个参数中提供授权信息">
                <ExclamationCircleOutlined />
              </Tooltip></span>}
              name="param_name"
              rules={[{ required: true, message: '请输入参数名称' }]}
            >
              <Input placeholder="请输入参数名称" style={{ width: '40%' }} />
            </Form.Item>
            <Form.Item
              label={<span>API 密钥<Tooltip className='ml-1' title="授权秘钥">
                <ExclamationCircleOutlined />
              </Tooltip></span>}
              name="api_key"
              rules={[{ required: true, message: '请输入API 密钥' }]}
            >
              <Input placeholder="请输入API 密钥" style={{ width: '40%' }} />
            </Form.Item>
          </>
          }
          {authType === 'oauth' && <>
            <Form.Item
              label={<span>客户端标识<Tooltip className='ml-1' title="Client_id:应用在OAuth提供者注册时获取的唯一标识。">
                <ExclamationCircleOutlined />
              </Tooltip></span>}
              name="client_id"
              rules={[{ required: true, message: '请输入客户端标识' }, { pattern: /^\S*$/, message: '不能输入空格' }]}
            >
              <Input placeholder="请输入客户端标识" style={{ width: '40%' }} />
            </Form.Item>
            <Form.Item
              label={<span>客户端密钥<Tooltip className='ml-1' title="Client_secret: 与client_id配对的秘密，用于认证应用并获取令牌。">
                <ExclamationCircleOutlined />
              </Tooltip></span>}
              name="client_secret"
              rules={[{ required: true, message: '请输入客户端密钥' }, { pattern: /^\S*$/, message: '不能输入空格' }]}
            >
              <Input placeholder="请输入客户端密钥" style={{ width: '40%' }} />
            </Form.Item>
            <Form.Item
              label={<span>客户端网址<Tooltip className='ml-1' title="Client_url: 应用的回调URL，授权码将发送到此URL。这个URL需要是合法的。">
                <ExclamationCircleOutlined />
              </Tooltip></span>}
              name="client_url"
              rules={[
                { required: true, message: '请输入客户端网址' },
                { pattern: /^\S*$/, message: '不能输入空格' },
                { pattern: /^https?:\/\/.+/, message: '客户端网址必须以http://或https://开头' },
              ]}
            >
              <Input placeholder="请输入以http://或https://开头的客户端网址" style={{ width: '40%' }} />
            </Form.Item>
            <Form.Item
              label={<span>授权网址<Tooltip className='ml-1' title="Authorization_url: 用户被重定向以授权应用的OAuth提供者的URL。需要进行URL验证。">
                <ExclamationCircleOutlined />
              </Tooltip></span>}
              name="authorization_url"
              rules={[{ required: true, message: '请输入授权网址' }, { pattern: /^\S*$/, message: '不能输入空格' }]}
            >
              <Input placeholder="请输入授权网址" style={{ width: '40%' }} />
            </Form.Item>
            <Form.Item
              label={<span>授权内容类型<Tooltip className='ml-1' title="Authorization_content_type:用于向OAuth提供者发送数据的内容类型。默认值是最常见的内容类型。">
                <ExclamationCircleOutlined />
              </Tooltip></span>}
              initialValue='application/json'
              name="authorization_content_type"
              rules={[{ required: true, message: '请输入授权内容类型' }, { pattern: /^\S*$/, message: '不能输入空格' }]}
            >
              <Input placeholder="请输入授权内容类型" style={{ width: '40%' }} />
            </Form.Item>
            <Form.Item
              label={<span>权限范围<Tooltip className='ml-1' title="Scope:你的应用希望访问的资源的范围或级别。">
                <ExclamationCircleOutlined />
              </Tooltip></span>}
              name="scope"
              rules={[{ required: true, message: '请输入权限范围' }, { pattern: /^\S*$/, message: '不能输入空格' }]}
            >
              <Input placeholder="请输入权限范围" style={{ width: '40%' }} />
            </Form.Item>
          </>}
          {authType === 'oidc' && <>
            <Form.Item
              label={<span>grant_type<Tooltip className='ml-1' title="根据 GrantType 来选择使用的 OAuth Flow。支持的 Flow 包括：TokenExchange、ClientCredential">
                <ExclamationCircleOutlined />
              </Tooltip></span>}
              name="grant_type"
              initialValue={'TokenExchange'}
              rules={[{ required: true, message: '请输入grant_type' }, { pattern: /^\S*$/, message: '不能输入空格' }]}
            >
              <Select placeholder='请选择grant_type' style={{ width: '40%' }}>
                <Option value="TokenExchange">TokenExchange</Option>
                <Option value="ClientCredential">ClientCredential</Option>
              </Select>
            </Form.Item>
            <Form.Item
              label='endpoint_url'
              name="endpoint_url"
              rules={[{ required: true, message: '请输入endpoint_url' }, { pattern: /^\S*$/, message: '不能输入空格' }]}
            >
              <Input placeholder="请输入endpoint_url" style={{ width: '40%' }} />
            </Form.Item>
            <Form.Item
              label='subiect_token'
              name="subiect_token"
              rules={[{ required: true, message: '请输入subiect_token' }, { pattern: /^\S*$/, message: '不能输入空格' }]}
            >
              <Input placeholder="请输入subiect_token" style={{ width: '40%' }} />
            </Form.Item>
            <Form.Item
              label='subject. token_type'
              name="subject. token_type"
              rules={[{ required: true, message: '请输入subject. token_type' }, { pattern: /^\S*$/, message: '不能输入空格' }]}
            >
              <Input placeholder="请输入subject. token_type" style={{ width: '40%' }} />
            </Form.Item>
            <Form.Item
              label='audience'
              name="audience"
            >
              <Input placeholder="请输入audience" style={{ width: '40%' }} />
            </Form.Item>
            <Form.Item
              label={<span>scope<Tooltip className='ml-1' title="你的应用希望访问的资源的范围或级别。">
                <ExclamationCircleOutlined />
              </Tooltip></span>}
              name="scope"
            >
              <Input placeholder="请输入scope" style={{ width: '40%' }} />
            </Form.Item>
          </>
          }
        </Form>
      </div>
      <div className={styles.footer}>
        <Button type='primary' onClick={handleNext}>
          下一步
        </Button>
      </div>
    </div>

  )
}

const Step2 = (props: Props) => {
  const { id, onNext, onBack, data = {} } = props
  const [form] = Form.useForm()
  const [dataSource, setDataSource] = useState([{}])

  const getData = useCallback(async () => {
    try {
      const res: any = await toolsFields({ url: '/tool/tool_fields', body: { fields: data.tool_field_input_ids } })
      res.data = res.data.map((item: any) => {
        item.field_format = item.field_format.split(',')
        return item
      })
      setDataSource(res.data)
      form.setFieldsValue({ parameter: res.data })
    }
    catch (error) {
    }
  }, [data, form])

  useEffect(() => {
    if (data && data.tool_field_input_ids?.length && data.tool_mode === 'API')
      getData()
  }, [data, getData])

  const handleDelete = (index: number) => {
    const newData = dataSource.filter((_, i) => i !== index)
    setDataSource(newData)
    const formValues = form.getFieldsValue()
    formValues.parameter = formValues.parameter.filter((_, i) => i !== index)
    form.setFieldsValue(formValues)
  }

  const handleAdd = () => {
    const newData = {
      name: '',
      description: '',
      field_format: [],
      field_use_model: undefined,
      required: undefined,
      default_value: '',
      visible: true,
    }
    setDataSource([...dataSource, newData])
    const formValues = form.getFieldsValue()
    formValues.parameter = [...(formValues.parameter || []), newData]
    form.setFieldsValue(formValues)
  }
  const handleBack = () => {
    onBack && onBack()
  }
  const handleNext = () => {
    form.validateFields().then((res) => {
      const values = res.parameter.map((item: any) => ({
        ...item,
        field_type: 'input',
        field_format: item.field_format.join(','),
      }))

      upsertField({
        url: '/tool/create_update_field',
        body: values,
      }).then((res: any) => {
        const values = res.save_success_field || res.update_success_field
        upsertField({ url: '/tool/create_update_tool', body: { id, name: data?.name, tool_field_input_ids: values.map((item: any) => item.id) } }).then(() => {
          onNext(res)
        })
      })
    })
  }
  const options = [
    { value: 'str', label: 'str' },
    { value: 'int', label: 'int' },
    { value: 'float', label: 'float' },
    { value: 'bool', label: 'bool' },
    { value: 'dict', label: 'dict' },
    { value: 'list', label: 'list' },
    { value: 'file', label: 'file' },
  ]
  const columns = [
    {
      title: <div>参数名称<Tooltip className='ml-1' title="仅支持字母、数字、_、-">
        <ExclamationCircleOutlined />
      </Tooltip></div>,
      dataIndex: 'name',
      render: (_, record, index) => (
        <Form.Item
          style={{ marginBottom: 0 }}
          name={['parameter', index, 'name']}
          rules={[{ required: true, message: '请输入名称' }, { pattern: /^[a-zA-Z0-9_-]+$/, message: '请输入字母、数字、_、-' }]}
        >
          <Input placeholder="请输入参数名称" />
        </Form.Item>
      ),
    },
    {
      title: <div>参数描述<Tooltip className='ml-1' title="帮助用户/大模型更好的理解">
        <ExclamationCircleOutlined />
      </Tooltip></div>,
      dataIndex: 'description',
      render: (_, record, index) => (
        <Form.Item style={{ marginBottom: 0 }} name={['parameter', index, 'description']} rules={[{ required: true, message: '请输入参数描述' }, { whitespace: true, message: '不能输入空格' }]}>
          <Input placeholder="请输入参数描述" />
        </Form.Item>
      ),
    },
    {
      title: '参数类型',
      dataIndex: 'field_format',
      width: 100,
      render: (_, record, index) => (
        <Form.Item style={{ marginBottom: 0 }} name={['parameter', index, 'field_format']} rules={[{ required: true, message: '请选择参数类型' }]}>
          <Cascader placeholder="请选择" options={options} />
        </Form.Item>
      ),
    },
    {
      title: '传入方法',
      dataIndex: 'field_use_model',
      width: 100,
      render: (_, record, index) => (
        <Form.Item style={{ marginBottom: 0 }} name={['parameter', index, 'field_use_model']} rules={[{ required: true, message: '请选择传入方法' }]}>
          <Select placeholder="请选择">
            <Option value="body">Body</Option>
            {/* <Option value="path">Path</Option> */}
            <Option value="query">Query</Option>
            <Option value="header">Header</Option>
          </Select>
        </Form.Item>
      ),
    },
    {
      title: '是否必填',
      dataIndex: 'required',
      width: 100,
      render: (_, record, index) => (
        <Form.Item style={{ marginBottom: 0 }} name={['parameter', index, 'required']} rules={[{ required: true, message: '请选择是否必填' }]}>
          <Select placeholder="请选择">
            <Option value={true}>是</Option>
            <Option value={false}>否</Option>
          </Select>
        </Form.Item>
      ),
    },
    {
      title: '默认值',
      dataIndex: 'default_value',
      render: (_, record, index) => {
        return (
          <Form.Item style={{ marginBottom: 0 }} name={['parameter', index, 'default_value']}>
            {(record.field_format && isNumber(record.field_format[0]))
              ? <InputNumber placeholder="请输入默认值" style={{ width: '100%' }} />
              : <Input placeholder="请输入默认值" />
            }
          </Form.Item>
        )
      },
    },
    {
      title: <div>可见性 <Tooltip className='ml-1' title="当参数设为可见时，在编排时为连线模式需要输入参数；当参数设置为不可见时，则在调用插件时，智能体会默认只使用这个设定值。">
        <ExclamationCircleOutlined />
      </Tooltip></div>,
      dataIndex: 'visible',
      width: 100,
      render: (_, record, index) => {
        const isDisable = record?.default_value === 'undefined' || record?.default_value === ''
        return (
          <Form.Item style={{ marginBottom: 0 }} name={['parameter', index, 'visible']}>
            <ToggleIcon
              disabled={isDisable}
            />
          </Form.Item>)
      },

    },
    {
      title: '操作',
      dataIndex: 'operation',
      align: 'right',
      render: (_, record, index) =>
        dataSource.length >= 1
          ? (
            <Popconfirm title="确定要删除吗?" okText='是' cancelText="否" onConfirm={() => handleDelete(index)}>
              <Button size='small' type='link' danger disabled={dataSource.length === 1} >删除</Button>
            </Popconfirm>
          )
          : null,
    },
  ]
  const onFieldsChange = (changeValue) => {
    const changeIndex = changeValue[0].name[1]
    const changeName = changeValue[0].name[2]
    const formData = form.getFieldsValue()
    let isExtraValueChanged = false
    const extraChangedData: any = {}

    // 如果参数类型改变，清空默认值
    if (changeName === 'field_format') {
      extraChangedData.default_value = ''
      isExtraValueChanged = true
    }
    // 若default_value为空且不可见，则自动修改为可见（因为不可见时默认值不能为空）
    if (!formData.parameter[changeIndex].default_value && !formData.parameter[changeIndex].visible) {
      extraChangedData.visible = true
      isExtraValueChanged = true
    }
    if (isExtraValueChanged) {
      Object.keys(extraChangedData).forEach((key) => {
        formData.parameter[changeIndex][key] = extraChangedData[key]
      })
      form.setFieldsValue(formData)
    }

    // 如果参数类型改变，改变组件
    setDataSource((oldValue) => {
      const rowData = oldValue[changeIndex]
      const arr = [...oldValue]
      arr[changeIndex] = { ...rowData, [changeName]: changeValue[0].value, ...extraChangedData }
      return arr
    })
  }
  return (
    <div className={styles.right}>
      <div className={styles.formWrap}>

        <Form
          form={form}
          layout="vertical"
          onFieldsChange={onFieldsChange}
          wrapperCol={{ span: 24 }}
        >
          <div className={styles.tableHeader}>
            <p>输入参数</p>
            <Button type='link' size='small' onClick={handleAdd}>添加参数</Button>
          </div>

          <Table
            // size='small'
            dataSource={dataSource}
            columns={columns}
            pagination={false}
          />
        </Form>
      </div>
      <div className={styles.footer}>
        <Button onClick={handleBack}>
          上一步
        </Button>
        <Button type='primary' className='ml-4' onClick={handleNext}>
          下一步
        </Button>
      </div>
    </div>

  )
}

const Step3 = (props: Props) => {
  const { id, data = {}, onNext, onBack } = props
  const [form] = Form.useForm()
  const [dataSource, setDataSource] = useState([{}])

  const getData = useCallback(async () => {
    try {
      const res: any = await toolsFields({ url: '/tool/tool_fields', body: { fields: data.tool_field_output_ids } })
      res.data = res.data.map((item: any) => {
        item.field_format = item.field_format.split(',')
        return item
      })
      setDataSource(res.data)
      form.setFieldsValue({ parameter: res.data })
    }
    catch (error) {
    }
  }, [data, form])

  useEffect(() => {
    if (data && data.tool_field_output_ids?.length && data.tool_mode === 'API')
      getData()
  }, [data, getData])

  const handleDelete = (index: number) => {
    setDataSource(dataSource.filter((_, i) => i !== index))
  }

  const handleAdd = () => {
    const newData = {
      key: '',
      value: '',
    }
    setDataSource([...dataSource, newData])
  }
  const handleBack = () => {
    onBack && onBack()
  }
  const handleNext = () => {
    form.validateFields().then((res) => {
      const values = res.parameter.map((item: any) => ({
        ...item,
        field_format: item.field_format.join(','),
        field_type: 'output',
      }))
      upsertField({
        url: '/tool/create_update_field',
        body: values,
      }).then((res: any) => {
        const values = res.save_success_field || res.update_success_field
        upsertField({ url: '/tool/create_update_tool', body: { id, name: data?.name, tool_field_output_ids: values.map((item: any) => item.id) } }).then(() => {
          onNext && onNext(values)
        })
      })
    })
  }
  const options = [
    { value: 'str', label: 'str' },
    { value: 'int', label: 'int' },
    { value: 'float', label: 'float' },
    { value: 'bool', label: 'bool' },
    { value: 'dict', label: 'dict' },
    { value: 'list', label: 'list' },
    { value: 'file', label: 'file' },
  ]
  const columns = [
    {
      title: <div>参数名称<Tooltip className='ml-1' title="仅支持字母、数字、_、-">
        <ExclamationCircleOutlined />
      </Tooltip></div>,
      dataIndex: 'name',
      render: (_, record, index) => (
        <Form.Item
          style={{ marginBottom: 0 }}
          name={['parameter', index, 'name']}
          rules={[{ required: true, message: '请输入参数名称' }, { pattern: /^[a-zA-Z0-9_-]+$/, message: '请输入字母、数字、_、-' }]}
        >
          <Input placeholder="请输入参数名称" />
        </Form.Item>
      ),
    },
    {
      title: <div>参数描述<Tooltip className='ml-1' title="帮助用户/大模型更好的理解">
        <ExclamationCircleOutlined />
      </Tooltip></div>,
      dataIndex: 'description',
      render: (_, record, index) => (
        <Form.Item style={{ marginBottom: 0 }} name={['parameter', index, 'description']} rules={[{ required: true, message: '请输入参数描述' }, { whitespace: true, message: '不能输入空格' }]}>
          <Input placeholder="请输入参数描述" />
        </Form.Item>
      ),
    },
    {
      title: '参数类型',
      dataIndex: 'field_format',
      render: (_, record, index) => (
        <Form.Item style={{ marginBottom: 0 }} name={['parameter', index, 'field_format']} rules={[{ required: true, message: '请选择参数描述' }]}>
          <Cascader placeholder="请选择参数类型" options={options} />
        </Form.Item>
      ),
    },
    {
      title: '操作',
      dataIndex: 'operation',
      align: 'right',
      render: (_, record, index) =>
        dataSource.length >= 1
          ? (
            <Popconfirm title="确定要删除吗?" okText='是' cancelText="否" onConfirm={() => handleDelete(index)}>
              <Button size='small' type='link' danger disabled={dataSource.length === 1} >删除</Button>
            </Popconfirm>
          )
          : null,
    },
  ]
  return (
    <div className={styles.right}>
      <div className={styles.formWrap}>
        <Form
          form={form}
          layout="vertical"
          wrapperCol={{ span: 24 }}
        >
          <div className={styles.tableHeader}>
            <p>输出参数</p>
            <Button type='link' size='small' onClick={handleAdd}>添加</Button>
          </div>
          <Table
            // size='small'
            dataSource={dataSource}
            columns={columns}
            pagination={false}

          />
        </Form>
      </div>
      <div className={styles.footer}>
        <Button onClick={handleBack}>
          上一步
        </Button>
        <Button type='primary' className='ml-4' onClick={handleNext}>
          下一步
        </Button>
      </div>
    </div>

  )
}

const Step4 = (props: Props) => {
  const router = useRouter()
  const { data = {}, onBack, onTestSuccess } = props
  const [form] = Form.useForm()
  const [dataSource, setDataSource] = useState([])
  const token = localStorage.getItem('console_token')
  const [result, setResult] = useState('')
  const [status, setState] = useState(0)
  const map = ['未测试', '测试中', '测试通过', '测试未通过']

  const uploadProps: UploadProps = {
    name: 'file',
    action: '',
    headers: { Authorization: `Bearer ${token}` },
    beforeUpload: () => {
      return false
    },
  }

  const getData = useCallback(async () => {
    try {
      const res: any = await toolsFields({ url: '/tool/tool_fields', body: { fields: data.tool_field_input_ids } })
      res.data = res.data.filter((item: any) => {
        // 不可见且没有默认值，不展示在输入参数中
        return item.visible || item.default_value
      })
      setDataSource(res.data)
      form.setFieldsValue({ parameter: res.data })
    }
    catch (error) {
    }
  }, [data, form])

  useEffect(() => {
    if (data)
      getData()
  }, [data, getData])

  const handleBack = () => {
    onBack && onBack()
  }
  const handleConfirm = () => {
    router.replace('/tools')
  }
  const handleVerify = async (e) => {
    e.stopPropagation()
    const res: any = await toolsFields({ url: '/tool/return_auth_url ', body: { tool_id: data.id } })
    if (res)
      window.open(res)
  }
  const handleRun = () => {
    form.validateFields().then((res) => {
      setState(1)
      const _data = {}
      res.parameter.forEach((item) => {
        _data[item.name] = item.default_value
      })
      testTool({
        url: '/tool/test_tool',
        body: {
          id: data.id,
          input: _data,
          vars_for_code: { extract_from_result: !!res.extract_from_result },
        },
      }).then((res: any) => {
        if (res.message && res.message === 'Error calling tool' && res.error) {
          Toast.notify({ type: 'warning', message: res.error })
          setState(3)
        }
        else {
          setResult(JSON.stringify(res, null, 4))
          setState(2)
          onTestSuccess && onTestSuccess()
        }
      }).catch(() => {
        setState(3)
      })
    })
  }
  const columns = [
    {
      title: <div>参数名称</div>,
      dataIndex: 'name',
      render: (_, record, index) => (
        <Form.Item
          style={{ marginBottom: 0 }}
          name={['parameter', index, 'name']}
          rules={[{ required: true, message: '请输入参数名称' }]}
        >
          <span>{record.name}</span>
        </Form.Item>
      ),
    },
    {
      title: <div>参数值</div>,
      dataIndex: 'default_value',
      render: (_, record, index) => (
        <Form.Item style={{ marginBottom: 0 }} name={['parameter', index, 'default_value']} rules={[{ required: record.required, message: `${record.name}为必填项` }, { whitespace: true, message: '不能输入空格' }]}>
          {record.field_format.includes('file')
            ? <Upload {...uploadProps}>
              <Button icon={<UploadOutlined />}>点击上传</Button>
            </Upload>
            : <Input placeholder="请输入参数值" disabled={!record.visible} />}
        </Form.Item>
      ),
    },
  ]

  return (
    <div className={styles.right}>
      <div className={styles.step4}>
        <div className={styles.testFormWrap}>
          <Form
            form={form}
            layout="vertical"
            wrapperCol={{ span: 24 }}
          >
            <div className={styles.tableHeader}>
              <p>输入参数</p>
              <div>
                {(data?.auth === -1 || data?.auth === 2 || data?.auth === 3)
                  && <Popconfirm
                    title="该插件需要授权才可运行"
                    description={<div className='w-[300px]'>若要跳转第三方授权页面完成授权，请确保已正确输入客户端地址，否则可能会跳转到无用界面哦～是否继续跳转授权？</div>}
                    onConfirm={e => handleVerify(e)}
                    onCancel={e => e?.stopPropagation()}
                    okText="是"
                    cancelText="否"
                  >
                    <Button className='mr-[10px]' type='primary'>去授权</Button>
                  </Popconfirm>
                }
                <Button type='primary' onClick={handleRun}>运 行</Button>
              </div>
            </div>
            {data?.tool_field_output_ids?.length === 1 && <div className={styles.horizontalItem}>
              <div className={styles.horizontalLabel}>提取字段：</div>
              <div className={styles.horizontalElement}>
                <Form.Item name={'extract_from_result'}>
                  <Radio.Group
                    optionType="button"
                    options={[
                      { label: '开启', value: true },
                      { label: '关闭', value: false },
                    ]}
                    defaultValue={false} />
                </Form.Item>
              </div>
            </div>}
            <Table
              // size='small'
              dataSource={dataSource}
              columns={columns}
              pagination={false}

            />
          </Form>
        </div>
        <div className={styles.testWrap}>
          <div className={styles.testHeader}>
            <p className={styles.testTitle}>测试代码</p>
            <div className={styles.testState}>
              {map[status]}
            </div>
          </div>
          <div className={styles.resultWrap}>
            <div className={styles.resultContent}>
              {result}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <Button onClick={handleBack}>
          上一步
        </Button>
        <Button type='primary' className='ml-4' onClick={handleConfirm}>
          {'保存'}
        </Button>
      </div>
    </div>

  )
}

const APIMethod = (props) => {
  const { data, onTestSuccess, getDetail } = props
  const searchParams = useSearchParams()
  const id = searchParams.get('id') || ''
  const _step = searchParams.get('step') || 1
  const [step, setStep] = useState(+_step)
  const router = useRouter()
  const items = [
    {
      dot: <div className={styles.stepNumber}>1</div>,
      children: '填写基本信息',
    },
    {
      color: step < 2 ? 'gray' : 'white',
      dot: <div className={`${styles.stepNumber} ${step < 2 && styles.bgGray}`}>2</div>,
      children: '配置输入参数',
    },
    {
      color: 'gray',
      dot: <div className={`${styles.stepNumber} ${step < 3 && styles.bgGray}`}>3</div>,
      children: '配置输出参数',
    },
    {
      color: 'gray',
      dot: <div className={`${styles.stepNumber} ${step < 4 && styles.bgGray}`}>4</div>,
      children: '调试与校验',
    },
  ]
  const onNext = (value) => {
    if (step == 1 && value) {
      data.tool_mode = 'API'
      data.tool_api_id = value.id
    }
    if (step == 2 && value) {
      const success_field = value.save_success_field.map(item => item.id)

      data.tool_field_input_ids = success_field
    }
    if (step == 3 && value) {
      data.tool_field_output_ids = value?.map((item: any) => item.id)
      getDetail()
    }

    setStep(step + 1)
    router.replace(`/tools/info?id=${id}&step=${step + 1}`, { shallow: true })
  }

  const onBack = () => {
    setStep(step - 1)
    router.replace(`/tools/info?id=${id}&step=${step - 1}`, { shallow: true })
  }

  const renderStep = (data) => {
    const steps: any = {
      1: <Step1 id={id} data={data} onNext={onNext} ></Step1>,
      2: <Step2 id={id} data={data} onNext={onNext} onBack={onBack}></Step2>,
      3: <Step3 id={id} data={data} onNext={onNext} onBack={onBack}></Step3>,
      4: <Step4 id={id} data={data} onTestSuccess={onTestSuccess} onBack={onBack}></Step4>,
    }
    if (steps[step])
      return steps[step]
  }

  return <div className={styles.apiWrap}>
    <div className={styles.step}>
      <Timeline items={items} />
    </div>
    <div className={styles.info}>
      {renderStep(data)}
    </div>
  </div>
}

export default APIMethod
