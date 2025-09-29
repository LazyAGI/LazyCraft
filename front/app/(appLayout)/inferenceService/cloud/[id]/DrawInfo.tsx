import React from 'react'
import { Drawer, Tag } from 'antd'
import InfoItem from '../../../modelAdjust/components/InfoItem'

const DrawInfo = (props: any) => {
  const { visible, onClose, baseInfo } = props

  const handleCancel = () => {
    onClose()
  }
  const moduleMap = {
    online: '本地模型',
    local: '在线模型',
  }
  return (
    <Drawer title="模型基础信息" width={520} open={visible} onClose={handleCancel} maskdismissible closable>
      {/* <InfoTitle text="基本信息" /> */}
      {baseInfo?.model_name && <InfoItem labelSpan={4} label="模型名称：" content={baseInfo?.model_name} />}
      <InfoItem labelSpan={4} label="模型类型：" content={moduleMap[baseInfo?.model_type]} />
      {baseInfo?.description && <InfoItem labelSpan={4} label="模型简介：" content={baseInfo?.description} />}
      <InfoItem labelSpan={4} label="模型类别：" content={baseInfo?.model_kind} />
      {baseInfo?.model_from && <InfoItem labelSpan={4} label="模型来源：" content={baseInfo?.model_from} />}
      {baseInfo?.model_key && <InfoItem labelSpan={4} label="模型Key：" content={baseInfo?.model_key} />}
      {baseInfo?.prompt_keys && <InfoItem labelSpan={5} label="特殊Token：" content={baseInfo?.prompt_keys} />}
      {baseInfo?.model_brand && <InfoItem labelSpan={4} label="厂商名字：" content={baseInfo?.model_brand} />}
      {baseInfo?.model_url && <InfoItem labelSpan={4} label="代理服务地址：" content={baseInfo?.model_url} />}
      {baseInfo?.url && <InfoItem labelSpan={4} label="URL：" content={baseInfo?.url} />}
      {baseInfo?.model_list?.length > 0 && <InfoItem labelSpan={4} label="模型清单：" content={baseInfo?.model_list?.map((item: any) => <Tag key={item?.model_key}>{item?.model_key}</Tag>)} />}
    </Drawer>
  )
}

export default DrawInfo
