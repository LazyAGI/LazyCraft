import React, { useEffect, useState } from 'react'
import { Card, List, Spin, message } from 'antd'
import styles from './pageDrawer.module.scss'
import { getMcp } from '@/infrastructure/api/toolmcp'
import type { McpTool } from '@/shared/types/toolsMcp'

// 公共工具列表组件
type ToolMcpListProps = {
  mcpData: McpTool[] | null
  connectionLoading?: boolean
  onToolSelect?: (tool: McpTool) => void
  selectedTool?: McpTool | null
  title?: string
}

const ToolMcpList: React.FC<ToolMcpListProps> = ({
  mcpData,
  connectionLoading = false,
  onToolSelect,
  selectedTool,
  title = '可用工具列表',
}) => {
  const handleToolSelect = (tool: McpTool) => {
    if (onToolSelect)
      onToolSelect(tool)
  }

  if (connectionLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" />
        <h3 className={styles.loadingTitle}>正在连接到插件服务...</h3>
        <p>请稍候，正在建立连接</p>
      </div>
    )
  }

  return (
    <div className={styles.toolListSection}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>
          {title} {(mcpData && mcpData.length > 0) && `(${mcpData.length})`}
        </h3>
      </div>
      <div className={styles.sectionContent}>
        {(mcpData && mcpData.length > 0)
          ? (
            <List
              dataSource={mcpData}
              renderItem={(item: McpTool, index) => (
                <List.Item
                  key={index}
                  className={`${styles.toolListItem} ${selectedTool?.id === item.id ? styles.selected : ''}`}
                  onClick={() => handleToolSelect(item)}
                >
                  <List.Item.Meta
                    title={<span className={styles.toolTitle}>{item.name}</span>}
                    description={
                      <div>
                        <p className={styles.toolDescription}>
                          <strong>描述:</strong> {item.description}
                        </p>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          )
          : (
            <div className={styles.emptyState}>
              <p>暂无可用工具</p>
            </div>
          )}
      </div>
    </div>
  )
}

// 工具列表页面组件
type ToolMcpListPageProps = {
  mcpServerId?: string
}

const ToolMcpListPage: React.FC<ToolMcpListPageProps> = ({ mcpServerId }) => {
  const [mcpData, setMcpData] = useState<McpTool[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedTool, setSelectedTool] = useState<McpTool | null>(null)

  const fetchMcpData = async () => {
    if (!mcpServerId)
      return

    try {
      setLoading(true)
      const getMcpParams = { mcp_server_id: mcpServerId }
      const res = await getMcp({ body: getMcpParams })
      setMcpData(res.data || [])
    }
    catch (error) {
      console.error('获取MCP数据失败:', error)
      message.error('获取工具列表失败')
    }
    finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMcpData()
  }, [mcpServerId])

  const handleToolSelect = (tool: McpTool) => {
    setSelectedTool(tool)
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" />
        <h3 className={styles.loadingTitle}>正在加载工具列表...</h3>
      </div>
    )
  }

  return (
    <div className={styles.contentContainer}>
      <Card title="MCP工具列表" className={styles.mainCard}>
        <ToolMcpList
          mcpData={mcpData}
          onToolSelect={handleToolSelect}
          selectedTool={selectedTool}
          title="可用工具列表"
        />
      </Card>
    </div>
  )
}

export default ToolMcpList
