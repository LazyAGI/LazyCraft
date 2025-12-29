'use client'

import React from 'react'
import { Button, Col, Divider, Popconfirm, Row, Switch, Tag, Tooltip, Typography } from 'antd'
import { DownloadOutlined, PlusOutlined } from '@ant-design/icons'
import NextImage from 'next/image'
import { debounce } from 'lodash'

import DefaultLogo from '../app-list/app-default-logo.png'
import styles from './index.module.scss'
import Iconfont from '@/app/components/base/iconFont'
import type { AppItem } from '@/core/data/common'

const { Paragraph } = Typography

// 通用的卡片数据项类型
export type CardItem = {
  id: string
  name: string
  description?: string
  icon?: string
  tags?: string[]
  ref_status?: boolean
  [key: string]: any
}

export type AppCardProps = {
  item: CardItem | AppItem
  urlPrefix?: string
  // 自定义图标（用于知识库等场景）
  customIcon?: React.ReactNode
  // 自定义图标样式类名
  iconClassName?: string
  // 事件回调
  onClick?: (item: CardItem | AppItem) => void
  onEdit?: (item: CardItem | AppItem, e?: React.MouseEvent) => void
  onDelete?: (id: string) => void
  onEnableApi?: (enabled: boolean, item: CardItem | AppItem) => void
  onCopyLink?: (item: CardItem | AppItem) => void
  onApiPublish?: (item: CardItem | AppItem) => void
  onToTemplate?: (item: CardItem | AppItem) => void
  onDownload?: (item: CardItem | AppItem) => void
  onRefClick?: (id: string) => void
  onCopy?: (item: CardItem | AppItem, e?: React.MouseEvent) => void
  // 权限相关
  canEdit?: (creatorId: string) => boolean
  canDelete?: (creatorId: string) => boolean
  // 工具函数
  formatTime?: (timestamp: number | string, format?: string) => string
  // 其他配置
  showRefButton?: boolean
  showPublishStatus?: boolean // 是否显示发布状态（应用特有）
  showApiActions?: boolean // 是否显示API相关操作（应用特有）
  showBottomActions?: boolean // 是否显示底部操作栏
  // 自定义创建人字段名（知识库使用 user_name，应用使用 created_by_account.name）
  creatorField?: 'user_name' | 'created_by_account'
  className?: string
}

const AppCard: React.FC<AppCardProps> = ({
  item,
  urlPrefix = '',
  customIcon,
  iconClassName = '',
  onClick,
  onEdit,
  onDelete,
  onEnableApi,
  onCopyLink,
  onApiPublish,
  onToTemplate,
  onDownload,
  onRefClick,
  onCopy,
  canEdit,
  canDelete,
  formatTime,
  showRefButton = true,
  showPublishStatus = true,
  showApiActions = true,
  showBottomActions = true,
  creatorField = 'created_by_account',
  className = '',
}) => {
  const handleCardClick = () => {
    onClick?.(item)
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    onEdit?.(item, e)
  }

  const handleDelete = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    onDelete?.(item.id)
  }

  const handleEnableApi = (enabled: boolean) => {
    onEnableApi?.(enabled, item)
  }

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation()
    onCopyLink?.(item)
  }

  const handleApiPublish = (e: React.MouseEvent) => {
    e.stopPropagation()
    onApiPublish?.(item)
  }

  const handleToTemplate = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToTemplate?.(item)
  }

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDownload?.(item)
  }

  const handleRefClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onRefClick?.(item.id)
  }

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    onCopy?.(item, e)
  }

  // 获取图标URL或使用自定义图标
  const iconUrl = item.icon
    ? urlPrefix + item.icon.replace('app', 'static')
    : null

  // 获取创建人信息
  const getCreatorInfo = () => {
    if (creatorField === 'user_name') {
      return {
        id: (item as any).user_id || '',
        name: (item as any).user_name || '',
      }
    }
    const account = (item as AppItem).created_by_account
    return {
      id: account?.id || '',
      name: account?.name || '',
    }
  }

  const creatorInfo = getCreatorInfo()
  const canEditItem = canEdit ? canEdit(creatorInfo.id) : false
  const canDeleteItem = canDelete ? canDelete(creatorInfo.id) : false

  // 判断是否为应用类型（有 enable_api 字段）
  const isAppType = 'enable_api' in item

  return (
    <div
      onClick={handleCardClick}
      className={`${styles.cardItem} ${className}`}
    >
      <Row gutter={14} wrap={false}>
        <Col flex="56px">
          {customIcon
            ? (
              <div className={`${styles.avataWrap} ${iconClassName}`}>
                {customIcon}
              </div>
            )
            : iconUrl
              ? (
                <div className={styles.avataWrap}>
                  <NextImage src={iconUrl} alt="icon" className="rounded-lg" width={42} height={42} />
                </div>
              )
              : (
                <div className={styles.avataWrap}>
                  <NextImage src={DefaultLogo} alt="icon" className="rounded-lg" width={42} height={42} />
                </div>
              )}
        </Col>
        <Col flex="auto">
          <Row gutter={7}>
            <Col span={18}>
              <Paragraph
                style={{ lineHeight: '42px', marginBottom: 0 }}
                ellipsis
                title={item.name}
              >
                {item.name}
              </Paragraph>
            </Col>
            {showApiActions && isAppType && (
              <Col span={6} className="text-right" onClick={e => e.stopPropagation()}>
                {canEditItem && onEnableApi && (item as AppItem).enable_api !== undefined && (
                  <Tooltip title={`${(item as AppItem).enable_api ? '关闭' : '启动'}服务`}>
                    <Switch
                      className="mr-4"
                      onChange={debounce(handleEnableApi, 500)}
                      checked={(item as AppItem).enable_api}
                    />
                  </Tooltip>
                )}
              </Col>
            )}
          </Row>
        </Col>
      </Row>

      <div className="text-[#5E6472] text-sm">
        <div className="mt-4 flex justify-between">
          <Paragraph
            ellipsis={{ rows: 1, tooltip: creatorInfo.name }}
            style={{ marginBottom: 8 }}
          >
            <span className="text-[#5E6472]">
              创建人：{creatorInfo.name}
            </span>
            {canEditItem && onEdit && (
              <Button type="link" onClick={handleEdit}>
                编辑
              </Button>
            )}
            {showRefButton && item?.ref_status && onRefClick && (
              <Button type="link" onClick={handleRefClick}>
                引用中
              </Button>
            )}
          </Paragraph>
          {item?.engine_status === '服务异常' && (
            <span className="text-[red] text-[12px]">{item?.engine_status}</span>
          )}
        </div>
        <Paragraph
          ellipsis={{ rows: 2, tooltip: item.description }}
          style={{ marginBottom: 8 }}
          className="h-[44px]"
        >
          <span className="text-[#5E6472] text-sm">{item.description}</span>
        </Paragraph>
      </div>

      <div className={styles.tagWrap}>
        {item.tags?.map((el: any) => (
          <Tag key={el}>{el}</Tag>
        ))}
      </div>

      {showBottomActions && (
        <div className={styles.lastLine}>
          {(showPublishStatus && isAppType && (item as AppItem).status)
            ? (
              <div className="text-[#5E6472] text-sm, text-[0.7292vw]">
                {(item as AppItem).status === 'draft'
                  ? (
                    '未发布'
                  )
                  : (
                    <span>
                      <Iconfont type="icon-fabu" style={{ color: '#0E5DD8' }} />
                      <span className="text-[#0E5DD8] ml-1">已发布</span>
                      {formatTime && (item as AppItem).workflow_updated_at && (
                        <>
                          <Divider type="vertical" />
                          更新于
                          {formatTime(
                            typeof (item as AppItem).workflow_updated_at === 'string'
                              ? parseInt((item as AppItem).workflow_updated_at || '0', 10)
                              : ((item as AppItem).workflow_updated_at || 0),
                            'YYYY-MM-DD HH:mm',
                          )}
                        </>
                      )}
                    </span>
                  )}
              </div>
            )
            : (
              <div></div>
            )}
          <div className="flex">
            {showApiActions && isAppType && (item as AppItem).enable_api && onCopyLink && (
              <div className={`${styles.iconWrap} mr-2`} onClick={handleCopyLink}>
                <Tooltip title="复制应用链接">
                  <Iconfont type="icon-fuzhilianjie" />
                </Tooltip>
              </div>
            )}
            {showApiActions && isAppType && (item as AppItem).enable_api && onApiPublish && (
              <div
                className={`${styles.iconWrap} mr-2`}
                style={{
                  color: (item as AppItem).enable_api_call === '1' ? '#2ea121' : '',
                }}
                onClick={handleApiPublish}
              >
                <Tooltip title="API发布">
                  <Iconfont type="icon-api" />
                </Tooltip>
              </div>
            )}
            {onCopy && (
              <div className={`${styles.iconWrap} mr-2`} onClick={handleCopy}>
                <Tooltip title="复制">
                  <Iconfont type="icon-fuzhi" />
                </Tooltip>
              </div>
            )}
            {canEditItem && (
              <>
                {onDownload && (
                  <div className={`${styles.iconWrap} mr-2`} onClick={handleDownload}>
                    <Tooltip title="导出应用">
                      <DownloadOutlined />
                    </Tooltip>
                  </div>
                )}
                {onToTemplate && (
                  <div className={`${styles.iconWrap} mr-2`} onClick={handleToTemplate}>
                    <Tooltip title="添加为应用模版">
                      <PlusOutlined />
                    </Tooltip>
                  </div>
                )}
              </>
            )}
            {canDeleteItem && onDelete && (
              <div onClick={e => e.stopPropagation()}>
                <Popconfirm
                  title="删除"
                  description={item?.ref_status ? '该资源正在被引用，是否确认删除' : '删除不可逆，请确认'}
                  onConfirm={handleDelete}
                  onCancel={e => e?.stopPropagation()}
                  okText="确认"
                  cancelText="取消"
                >
                  <div className={styles.iconWrap} onClick={e => e.stopPropagation()}>
                    <Iconfont type="icon-shanchu1" />
                  </div>
                </Popconfirm>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default React.memo(AppCard)
