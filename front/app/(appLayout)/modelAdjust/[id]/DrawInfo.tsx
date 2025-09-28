import React from 'react'
import { Divider, Drawer } from 'antd'
import InfoTitle from '../components/InfoTitle'
import InfoItem from '../components/InfoItem'

const AddModal = (props: any) => {
  const { visible, onClose, baseInfo } = props

  const handleCancel = () => {
    onClose()
  }

  return (
    <Drawer title="微调任务信息" width={520} open={visible} onClose={handleCancel} maskdismissible closable>
      <InfoTitle text="基本信息" />
      <InfoItem labelSpan={4} label="模型名称：" content={baseInfo?.name} />
      <InfoItem labelSpan={4} label="基础模型：" content={baseInfo?.base_model_name} />
      <InfoItem labelSpan={5} label="训练数据集：" content={
        baseInfo?.dataset_list?.map((item, index) => {
          return (
            <span key={item.id}>{item?.name} &gt; {item?.version} {index + 1 < baseInfo?.dataset_list.length && '、'}</span>
          )
        })
      } />
      <InfoItem labelSpan={5} label="验证集占比：" content={baseInfo?.finetune_config?.val_size} />
      <InfoItem labelSpan={4} label="微调类型：" content={baseInfo?.finetuning_type} />
      <InfoItem labelSpan={4} label="训练模式：" content={baseInfo?.finetune_config?.training_type} />
      <Divider style={{ width: 'calc(100% + 30px)' }} />
      <InfoTitle text="超参配置" />
      <InfoItem labelSpan={4} label="训练次数：" content={baseInfo?.finetune_config?.num_epochs} />
      <InfoItem labelSpan={4} label="学习率：" content={baseInfo?.finetune_config?.learning_rate} />
      <InfoItem labelSpan={6} label="学习率调整策略：" content={baseInfo?.finetune_config?.lr_scheduler_type} />
      {baseInfo?.finetune_config?.num_gpus && <InfoItem labelSpan={4} label="gpu卡数：" content={baseInfo?.finetune_config?.num_gpus} />}
      <InfoItem labelSpan={4} label="批次大小：" content={baseInfo?.finetune_config?.batch_size} />
      <InfoItem labelSpan={5} label="序列最大长度：" content={baseInfo?.finetune_config?.cutoff_len} />
      <InfoItem labelSpan={4} label="LoRa秩值：" content={baseInfo?.finetune_config?.lora_r} />
      <InfoItem labelSpan={5} label="LoRa阿尔法：" content={baseInfo?.finetune_config?.lora_alpha} />
    </Drawer>
  )
}

export default AddModal
