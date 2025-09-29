'use client'
import type { FC } from 'react'
import React, { useEffect, useRef, useState } from 'react'
import { Cascader, Form, Input, Modal, Select } from 'antd'
import './index.scss'
import { traveTree } from '../../field-item/utils'
import { useApplicationContext } from '@/shared/hooks/app-context'
import { useStore } from '@/app/components/taskStream/store'
import { useStore as useAppStore } from '@/app/components/app/store'
import { createModel, getBaseModelList } from '@/infrastructure/api/modelAdjust'
import Toast, { ToastTypeEnum } from '@/app/components/base/flash-notice'

type ModelAdjustCreateBtnProps = {
  nodeName: string
  modelName: string
  modelId: string
  canFinetune: boolean // 是否支持微调
  style?: React.CSSProperties
  className?: string
}

/** 画布模型微调任务创建按钮 */
const ModelAdjustCreateBtn: FC<any> = (props: ModelAdjustCreateBtnProps) => {
  const { modelName, modelId, nodeName } = props
  const appStore = useAppStore()
  const patentState = useStore(s => s.patentState)
  const { userSpecified } = useApplicationContext()
  const [form] = Form.useForm()
  const [modalVisible, setModalVisible] = useState<boolean>(false)
  const [definedSettingList, setDefinedSettingList] = useState<any[]>([])
  const [dataSetTreeData, setDataSetTreeData] = useState<any[]>([])
  const [loadingSubmit, setLoadingSubmit] = useState<boolean>(false) // 提交按钮loading状态
  const fetchApiCalled = useRef<boolean>(false)

  useEffect(() => {
    if (!fetchApiCalled.current) {
      fetchApiCalled.current = true

      Promise.all([
        getBaseModelList({ url: '/finetune/datasets?qtype=already', options: {} }),
        getBaseModelList({ url: '/finetune_param', options: {} }),
      ]).then(([res1, res2]: any[]) => {
        setDataSetTreeData(traveTree(res1 || [], (item: any) => {
          item.children = item?.child?.length ? item.child : undefined

          return {
            label: item?.label,
            value: item?.val_key,
            children: item.children,
          }
        }))
        setDefinedSettingList(res2 || [])
      })
    }
  }, [form])

  useEffect(() => {
    if (modalVisible) {
      form.resetFields()
      form.setFieldsValue({
        modelName,
        modelId,
        finetune_config_id: definedSettingList?.filter(child => !!child?.is_default)?.[0]?.id || undefined,
      })
    }
  }, [modalVisible, form, modelName, modelId, definedSettingList])

  const handleOk = () => {
    form.validateFields().then((data) => {
      const currentFinetuneConfig = definedSettingList.find((item: any) =>
        item.id === data.finetune_config_id,
      )?.finetune_config || {}
      const workflowData = appStore.appDetail
      const _historyStacks = Array.isArray(patentState?.historyStacks) ? [...patentState.historyStacks] : patentState?.historyStacks
      const operatedSubModuleName
        = _historyStacks
          ?.reverse()
          ?.map((item: any) => item?.subModuleTitle || '')
          ?.filter((item: any) => Boolean(item))
          ?.join(' > ') || ''
      // 被操作的节点/资源名称（若在子模块中则带上子模块名称）
      const operatedItemName = operatedSubModuleName ? `${operatedSubModuleName} > ${nodeName || ''}` : (nodeName || '')
      const datasets_type: any = []
      data.datasets.forEach((item: any) => {
        const datasetChild = dataSetTreeData.find(child => child.value === item[0])
        if (datasetChild)
          datasets_type.push(datasetChild.label)
      })
      const params = {
        base: {
          name: data?.name,
          base_model: modelId,
          base_model_key: modelName,
          datasets_type,
          target_model_name: data?.target_model_name,
          created_from_info: `${workflowData?.name},${operatedItemName},${userSpecified?.name}`,
          created_from: 2, // 创建来源 1 模型微调 2 应用编排
          datasets: data?.datasets?.map((child: any) => child?.[child?.length - 1])?.filter(child => !!child) || [],
          finetuning_type: 'LoRA', // 微调类型 (LoRA, QLoRA, Full) 默认LoRA
        },
        finetune_config: {
          ...currentFinetuneConfig,
          // val_size: 0.1, // 验证集占比默认0.1
        },
      }
      setLoadingSubmit(true)

      createModel({ url: '/finetune/create', body: { ...params } }).then(() => {
        Toast.notify({
          type: ToastTypeEnum.Success, message: '创建成功',
        })
        setModalVisible(false)
      }).finally(() => {
        setLoadingSubmit(false)
      })
    })
  }

  const handleCancel = () => {
    setModalVisible(false)
  }

  return (
    <>
      {/* <Button
        type='primary'
        size="small"
        className={className}
        style={{ ...style, fontSize: 13 }}
        disabled={!canFinetune || !modelName || !modelId}
        onClick={() => {
          setModalVisible(true)
        }}
      >
        创建微调任务
      </Button> */}

      <Modal
        title="创建微调任务"
        open={modalVisible}
        onOk={handleOk}
        okButtonProps={{
          loading: loadingSubmit,
        }}
        onCancel={handleCancel}
        cancelText='取消'
        okText='提交'
        className='model-adjust-create-btn-modal'
      >
        <Form
          form={form}
          autoComplete="off"
          labelAlign='left'
          labelCol={{ span: 7 }}
          wrapperCol={{ span: 17 }}
        >
          <Form.Item
            name="modelName"
            label="基础模型名称"
            rules={[{ required: true, message: '请输入基础模型名称' }]}
          >
            <Input variant="borderless" readOnly />
          </Form.Item>
          <Form.Item
            name="name"
            label="微调任务名称"
            validateTrigger='onBlur'
            rules={[{ required: true, message: '请输入微调任务名称' }, { whitespace: true, message: '输入不能为空或仅包含空格' }]}
          >
            <Input maxLength={30} placeholder='请输入30字以内的任意字符' />
          </Form.Item>
          <Form.Item
            name="target_model_name"
            label="微调模型名称"
            validateTrigger='onBlur'
            rules={[{ required: true, message: '请输入微调模型名称' }, { whitespace: true, message: '输入不能为空或仅包含空格' }]}
          >
            <Input maxLength={60} placeholder='请输入60字以内的任意字符' />
          </Form.Item>
          <Form.Item
            name="datasets"
            label="选择数据集"
            rules={[{ required: true, message: '请选择数据集' }]}
          >
            <Cascader
              multiple
              placeholder="请选择训练数据集"
              allowClear
              showSearch
              showCheckedStrategy={Cascader.SHOW_CHILD}
              options={dataSetTreeData || []}
              expandTrigger="click"
            />
          </Form.Item>
          <Form.Item
            name="finetune_config_id"
            label="微调设置"
            rules={[{ required: true, message: '请选择微调设置' }]}
          >
            <Select
              placeholder='请选择微调设置'
              options={definedSettingList?.map((item: any) => ({
                value: item.id,
                label: item.name,
              })) || []}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export default React.memo(ModelAdjustCreateBtn)
