'use client'

import React, { useEffect, useState } from 'react'
import { Breadcrumb, Button, Col, Divider, Form, Input, InputNumber, Modal, Radio, Row, Select, TreeSelect } from 'antd'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import InfoTitle from '../components/InfoTitle'
import DatasetTreeSelect from '../components/datasetTreeSelect'
import styles from './index.module.scss'
import { EMode, EType } from './config'
import { createModel, deleteParam, getBaseModelList, getModelListFromFinetune } from '@/infrastructure/api/modelAdjust'
import Toast, { ToastTypeEnum } from '@/app/components/base/flash-notice'
import { useApplicationContext } from '@/shared/hooks/app-context'

type ModelItemType = {
  model: string
  source: string
  available: boolean
}

const { Option } = Select
const datasetmap = {
  Alpaca_fine_tuning: 'DATASET_FORMAT_ALPACA',
  Sharegpt_fine_tuning: 'DATASET_FORMAT_SHARE_GPT',
  Openai_fine_tuning: 'DATASET_FORMAT_OPENAI',
}
const CreateModelAdjust = () => {
  const router = useRouter()
  const { userSpecified } = useApplicationContext()
  const [baseForm] = Form.useForm()
  const [configForm] = Form.useForm()
  const [modalForm] = Form.useForm()
  const [configType, setConfigType] = useState(1)
  const [selectKey, setSelectKey] = useState(null)
  const [modelList, setModelList] = useState<ModelItemType[]>([])
  const [temValue, setTempValue] = useState({})
  const [datasetList, setDatasetList] = useState([])
  const [defineList, setDefineList] = useState([])
  const [visible, setVisible] = useState(false)
  const [trainingType, setTrainingType] = useState('SFT')
  const [finetuningType, setFinetuningType] = useState('LoRA')
  const isMine = userSpecified?.tenant?.status === 'private'
  const getModelList = async () => {
    const modelList = await getModelListFromFinetune({ url: '/finetune/ft/models' })
    if (modelList?.data)
      setModelList(modelList.data as unknown as ModelItemType[])
  }
  const getDataset = async () => {
    const res: any = await getBaseModelList({ url: `/finetune/datasets?qtype=${isMine ? 'mine' : 'already'}`, options: {} })
    if (res)
      setDatasetList(res)
  }
  const getDefineList = async () => {
    const res: any = await getBaseModelList({ url: '/finetune_param', options: {} })
    if (res)
      setDefineList(res)
  }
  useEffect(() => {
    getModelList()
    getDataset()
    getDefineList()
  }, [])
  const handleOk = () => {
    baseForm.validateFields().then((data) => {
      configForm.validateFields().then((values) => {
        const { base_model, val_size, training_type } = data
        // 移除删除num_gpus的逻辑，所有微调任务都需要GPU卡数
        // 如果没有设置，后端会使用默认值1
        values.val_size = val_size / 100
        values.training_type = training_type
        delete data.val_size
        delete data.training_type
        const selectedModel = modelList.find(model => `${model.model}:${model.source.split('/').pop()}` === base_model)
        const base_model_key = selectedModel ? `${selectedModel.model}:${selectedModel.source.split('/').pop()}` : base_model
        const datasetListChild: any = datasetList.map((item: any) => item.child).flat()
        const datasets_type: any = []
        data.datasets.forEach((item: any) => {
          const datasetChild = datasetListChild.find(child => child.val_key === item)
          if (datasetChild)
            datasets_type.push(datasetmap[datasetChild.type] || 'ATASET_FORMAT_UNSPECIFIED')
        })
        const para = {
          base: {
            ...data,
            datasets_type,
            base_model: 0,
            base_model_key,
            created_from: 1,
            created_from_info: '模型微调',
          },
          finetune_config: {
            ...values,
          },
        }
        createModel({ url: '/finetune', body: { ...para } }).then(() => {
          Toast.notify({
            type: ToastTypeEnum.Success, message: '创建成功',
          })
          router.push('/modelAdjust')
        })
      })
    })
  }

  const onValuesChange = (changeValue) => {
    if (changeValue.finetuning_type)
      setFinetuningType(changeValue.finetuning_type)
    if (changeValue.training_type)
      setTrainingType(changeValue.training_type)
  }
  const onRadioChange = (e: any) => {
    setSelectKey(null)
    setConfigType(e.target.value)
    configForm.resetFields()
  }
  const onSelectChange = (value, item) => {
    setSelectKey(value)
    const { option } = item
    configForm.setFieldsValue({
      batch_size: option?.batch_size,
      cutoff_len: option?.cutoff_len,
      learning_rate: option?.learning_rate,
      lora_r: option?.lora_r,
      // lora_rate: option?.lora_rate,
      lr_scheduler_type: option?.lr_scheduler_type,
      num_epochs: option?.num_epochs,
      lora_alpha: option?.lora_alpha,
      num_gpus: option?.num_gpus,
      save_steps: option?.save_steps,
    })
  }
  const saveConfig = () => {
    modalForm.validateFields().then((values: any) => {
      const training_type = baseForm.getFieldValue('training_type')
      const val_size = baseForm?.getFieldValue('val_size') / 100 || 0.1
      const para = {
        ...values,
        finetune_config: { ...temValue, training_type, val_size },
      }
      createModel({ url: '/finetune_param', body: { ...para } }).then((res) => {
        if (res) {
          Toast.notify({
            type: ToastTypeEnum.Success, message: '保存成功',
          })
          modalForm.resetFields()
          getDefineList()
          setVisible(false)
          setTempValue({})
        }
      })
    })
  }
  const openConfigModal = () => {
    configForm.validateFields().then((values) => {
      setVisible(true)
      setTempValue(values)
    })
  }
  const handleDelete = async (id: any, e) => {
    e.stopPropagation()
    const res = await deleteParam({ url: `/finetune_param?record_id=${id}`, options: { params: { record_id: id } } })
    if (res) {
      Toast.notify({
        type: ToastTypeEnum.Success, message: '删除成功',
      })
      getDefineList()
    }
  }
  const onBlur = (e) => {
    baseForm.setFieldValue('target_model_name', e?.target?.value)
  }
  return (
    <div className={styles.adjustCreate}>
      <div className={styles.createWrap}>
        <div className={styles.breadcrumb}>
          <Breadcrumb
            items={[
              {
                title: <Link href='/modelAdjust'>模型微调</Link>,
              },
              {
                title: '创建微调',
              },
            ]}
          />
        </div>
        <Form
          form={baseForm}
          layout="vertical"
          autoComplete="off"
          onValuesChange={onValuesChange}
        >
          <InfoTitle text="基础信息" />
          <Divider style={{ margin: '8px 0 ' }} />
          <Row gutter={48}>
            <Col xl={8} lg={24}>
              <Form.Item
                name="name"
                label="任务名称"
                validateTrigger='onBlur'
                rules={[{ required: true, message: '请输入任务名称' }, {
                  pattern: /^(?!.*[\u4E00-\u9FA5]).*$/,
                  message: '仅允许英文字母、数字及符号',
                }, { whitespace: true, message: '输入不能为空或仅包含空格' }]}
              >
                <Input onBlur={onBlur} maxLength={30} placeholder='请输入30字以内的英文字母、数字或符号' />
              </Form.Item>
            </Col>
            <Col xl={8} lg={24}>
              <Form.Item
                name="base_model"
                label="选择模型"
                rules={[{ required: true, message: '请选择模型' }]}
              >
                <TreeSelect
                  style={{ width: '100%' }}
                  dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
                  placeholder='请选择模型'
                >
                  {modelList.map((item: any) => (
                    <TreeSelect.TreeNode
                      key={item.model}
                      title={item.model}
                      value={`${item.model}:${item.source.split('/').pop()}`}
                      selectable={item.available}
                      disabled={!item.available}
                    />
                  ))}
                </TreeSelect>
              </Form.Item>
            </Col>
            <Col xl={17} lg={24}>
              <Form.Item
                name="target_model_name"
                label="微调模型名称"
                rules={[{ required: true, message: '请输入微调模型名称' }, { whitespace: true, message: '输入不能为空或仅包含空格' }]}
              >
                <Input style={{ width: '94%' }} maxLength={60} placeholder='请输入60字以内的任意字符' />
              </Form.Item>
            </Col>
            <Col xl={8} lg={24}>
              <DatasetTreeSelect treeData={datasetList} />
            </Col>
            <Col xl={8} lg={24}>
              <Form.Item
                name="val_size"
                label="验证集占比(%)"
                validateTrigger='onBlur'
                rules={[
                  { required: true },
                  {
                    validator: (_, value) => {
                      if (!value && value !== 0)
                        return Promise.resolve()

                      const numValue = Number(value)
                      if (numValue <= 0)
                        return Promise.reject(new Error('验证集占比必须大于0'))

                      if (numValue >= 100)
                        return Promise.reject(new Error('验证集占比必须小于100'))

                      return Promise.resolve()
                    },
                  },
                ]}
              >
                <InputNumber precision={0} style={{ width: '100%' }} max={100} min={0} placeholder='请输入1~100之间的整数' />
              </Form.Item>
            </Col>
            <Col xl={8} lg={24}>
            </Col>
            <Col xl={8} lg={24}>
              <Form.Item
                name="training_type"
                initialValue={'SFT'}
                extra={EMode[trainingType]}
                label="训练模式"
                rules={[{ required: true, message: '请选择训练模式' }]}
              >
                <Select
                  placeholder='请选择训练模式'
                  options={[
                    { value: 'PT', label: 'PT' },
                    { value: 'SFT', label: 'SFT' },
                    { value: 'RM', label: 'RM' },
                    { value: 'PPO', label: 'PPO' },
                    { value: 'DPO', label: 'DPO' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xl={8} lg={24}>
              <Form.Item
                name="finetuning_type"
                initialValue={'LoRA'}
                label="微调类型"
                extra={EType[finetuningType]}
                rules={[{ required: true, message: '请选择微调类型' }]}
              >
                <Select
                  placeholder='请选择微调类型'
                  options={[
                    { value: 'LoRA', label: 'LoRA' },
                    { value: 'QLoRA', label: 'QLoRA' },
                    { value: 'Full', label: 'Full' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
        <Form
          form={configForm}
          layout="vertical"
          autoComplete="off"
        >
          <InfoTitle text="超参数配置" />
          <Divider style={{ margin: '8px 0 ' }} />
          <Row gutter={48}>
            <Col xl={17} lg={24}>
              <div className='mb-[12px]'>
                <Radio.Group onChange={onRadioChange} value={configType}>
                  <Radio value={1}>选择偏好设置</Radio>
                  <Radio value={2}>自定义</Radio>
                </Radio.Group>
              </div>
              {
                configType === 1 && <Select
                  onChange={onSelectChange}
                  style={{ width: 460, marginBottom: 12 }}
                  placeholder="请选择"
                  value={selectKey}
                  optionLabelProp="label"
                >
                  {defineList.map((item: any) => <Option option={item?.finetune_config} value={item?.id} key={item?.id} label={item?.name}>
                    {item?.name} {!item?.is_default
                      && <Button onClick={e => handleDelete(item?.id, e)} type='link' danger>删除</Button>
                    }
                  </Option>)}
                </Select>
              }
            </Col>
            <Col xl={16} lg={24}>
              <Row gutter={48} style={{ margin: 0, background: '#FAFAFB' }}>
                <Col xl={24} lg={24} style={{ textAlign: 'right', marginTop: 12, marginBottom: 20 }}><Button onClick={openConfigModal} type='primary' ghost>保存为偏好设置</Button></Col>
                <Col xl={12} lg={24}>
                  <Form.Item
                    name="num_epochs"
                    label="epoch（训练次数）"
                    rules={[{ required: true, message: '请输入重复次数' }]}
                  >
                    <InputNumber precision={0} style={{ width: '100%' }} max={2147483647} min={1} placeholder='请输入1~2147483647的整数' />
                  </Form.Item>
                </Col>
                <Col xl={12} lg={24}>
                  <Form.Item
                    name="learning_rate"
                    label="学习率"
                    rules={[
                      { required: true },
                      {
                        validator: (_, value) => {
                          if (!value && value !== 0)
                            return Promise.resolve()
                          const numValue = Number(value)

                          if (numValue <= 0)
                            return Promise.reject(new Error('学习率必须大于0'))

                          if (numValue >= 1)
                            return Promise.reject(new Error('学习率必须小于1'))

                          return Promise.resolve()
                        },
                      },
                    ]}
                  >
                    <InputNumber style={{ width: '100%' }} max={1} min={0} placeholder='请输入0~1的值' stringMode={true} controls={false} />
                  </Form.Item>
                </Col>
                <Col xl={12} lg={24}>
                  <Form.Item
                    name="lr_scheduler_type"
                    label="学习率调整策略"
                    initialValue={'cosine'}
                    validateTrigger='onBlur'
                    rules={[{ required: true, message: '请选择学习率调整策略' }]}
                  >
                    <Select
                      placeholder='请选择学习率调整策略'
                      options={[
                        { value: 'cosine', label: 'cosine' },
                        { value: 'linear', label: 'linear' },
                        { value: 'cosine_with_restarts', label: 'cosine_with_restarts' },
                        { value: 'polynomial', label: 'polynomial' },
                        { value: 'constant', label: 'constant' },
                      ]}
                    />
                  </Form.Item>
                </Col>
                <Col xl={12} lg={24}>
                  <Form.Item
                    name="num_gpus"
                    label="GPU卡数"
                    initialValue={1}
                    rules={[{ required: true, message: '请选择GPU卡数' }]}
                  >
                    <Select
                      placeholder='请选择GPU卡数'
                      options={[
                        { value: 1, label: 1 },
                        { value: 2, label: 2 },
                        { value: 4, label: 4 },
                        { value: 8, label: 8 },
                      ]}
                    />
                  </Form.Item>
                </Col>
                <Col xl={12} lg={24}>
                  <Form.Item
                    name="save_steps"
                    label="断点保存间隔(步)"
                    initialValue={500}
                    validateTrigger='onBlur'
                    rules={[
                      { required: true, message: '请输入断点保存间隔' },
                      {
                        validator: (_, value) => {
                          if (!value && value !== 0)
                            return Promise.reject(new Error('断点保存间隔不能为空'))
                          const numValue = Number(value)
                          if (!Number.isInteger(numValue) || numValue < 1)
                            return Promise.reject(new Error('必须为≥1的整数'))
                          return Promise.resolve()
                        },
                      },
                    ]}
                  >
                    <InputNumber precision={0} style={{ width: '100%' }} max={2147483647} min={1} placeholder='保存间隔步数，默认500' />
                  </Form.Item>
                </Col>
                <Col xl={12} lg={24}>
                  <Form.Item
                    name="batch_size"
                    label="batch-size（训练批次）"
                    initialValue={32}
                    rules={[{ required: true, message: '请选择批次大小' }]}
                  >
                    <Select
                      placeholder='请选择批次大小'
                      options={[
                        { value: 2, label: 2 },
                        { value: 4, label: 4 },
                        { value: 8, label: 8 },
                        { value: 16, label: 16 },
                        { value: 32, label: 32 },
                        { value: 64, label: 64 },
                        { value: 128, label: 128 },
                        { value: 256, label: 256 },
                      ]}
                    />
                  </Form.Item>
                </Col>
                <Col xl={12} lg={24}>
                  <Form.Item
                    name="cutoff_len"
                    label="序列最大长度"
                    initialValue={1024}
                    rules={[{ required: true, message: '请输入序列最大长度' }]}
                  >
                    <InputNumber precision={0} style={{ width: '100%' }} max={2147483647} min={32} placeholder='请输入32~2147483647的整数' />
                  </Form.Item>
                </Col>
                {finetuningType !== 'Full' && <><Col xl={12} lg={24}>
                  <Form.Item
                    name="lora_r"
                    label="LoRA秩值"
                    initialValue={8}
                    rules={[{ required: true, message: '请选择LoRA秩值' }]}
                  >
                    <Select
                      placeholder='请选择LoRA秩值'
                      options={[
                        { value: 2, label: 2 },
                        { value: 4, label: 4 },
                        { value: 8, label: 8 },
                        { value: 16, label: 16 },
                        { value: 32, label: 32 },
                        { value: 64, label: 64 },
                      ]}
                    />
                  </Form.Item>
                </Col>
                <Col xl={12} lg={24}>
                  <Form.Item
                    name="lora_alpha"
                    label="LoRA阿尔法"
                    initialValue={32}
                    rules={[{ required: true, message: '请选择LoRA阿尔法' }]}
                  >
                    <Select
                      placeholder='请选择LoRA阿尔法'
                      options={[
                        { value: 8, label: 8 },
                        { value: 16, label: 16 },
                        { value: 32, label: 32 },
                        { value: 64, label: 64 },
                      ]}
                    />
                  </Form.Item>
                </Col>
                </>}
              </Row>
            </Col>
          </Row>
        </Form>
        <Modal title="偏好设置" open={visible} onCancel={() => setVisible(false)} onOk={saveConfig} okText="确定" cancelText="取消" >
          <Form
            form={modalForm}
            layout="vertical"
            autoComplete="off"
          >
            <Form.Item
              name="name"
              label="偏好名称"
              validateTrigger='onBlur'
              rules={[{ required: true, message: '请输入偏好名称' }, { whitespace: true, message: '输入不能为空或仅包含空格' }]}
            >
              <Input placeholder='请输入偏好名称' />
            </Form.Item>
          </Form>
        </Modal>
      </div>
      <div style={{ textAlign: 'right' }}>
        <Divider style={{ marginBottom: 10 }} />
        <Button onClick={handleOk} type='primary' style={{ marginRight: 20 }}>发布微调任务</Button>
        <Divider style={{ marginTop: 10 }} />
      </div>
    </div>

  )
}

export default CreateModelAdjust
