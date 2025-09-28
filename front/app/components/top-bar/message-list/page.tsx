'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Iconfont from '@/app/components/base/iconFont'
import FloatingCustomPanel from '@/app/components/base/float-tip'
import { getMessageList, getMessageRead } from '@/infrastructure/api//messageList'
import { useApplicationContext } from '@/shared/hooks/app-context'

type MessageApiResponse = {
  items: MessageApiItem[]
  total: number
  page: number
  page_size: number
  pages: number
}

type MessageApiItem = {
  id: string
  module: string
  source_id: string
  user_id: string
  user_body: string
  user_read: boolean
  user_read_time: string | null
  notify_user1_id: string | null
  notify_user1_body: string | null
  notify_user1_read: boolean
  notify_user1_read_time: string | null
  notify_user2_id: string | null
  notify_user2_body: string | null
  notify_user2_read: boolean
  notify_user2_read_time: string | null
  created_at: string
}

type MessageItem = {
  id: string
  module: string
  avatar: string
  teamName: string
  timeAgo: string
  content: string
  isRead: boolean
}

const processTimeAgo = (dateString: string): string => {
  const messageDate = new Date(dateString)
  const currentTime = new Date()
  const timeDifference = currentTime.getTime() - messageDate.getTime()

  const daysCount = Math.floor(timeDifference / (1000 * 60 * 60 * 24))
  const hoursCount = Math.floor(timeDifference / (1000 * 60 * 60))
  const minutesCount = Math.floor(timeDifference / (1000 * 60))

  if (daysCount > 0)
    return `${daysCount}天前`
  if (hoursCount > 0)
    return `${hoursCount}小时前`
  if (minutesCount > 0)
    return `${minutesCount}分钟前`
  return '刚刚'
}

const resolveModuleDisplayName = (module: string): string => {
  const moduleNameMapping: Record<string, string> = {
    quota_request: 'LazyLLM团队',
  }

  return moduleNameMapping[module] || '系统消息'
}

const convertApiDataToComponentData = (apiData: MessageApiItem[]): MessageItem[] => {
  return apiData.map(item => ({
    id: item.id,
    module: item.module,
    avatar: 'logo',
    teamName: resolveModuleDisplayName(item.module),
    timeAgo: processTimeAgo(item.created_at),
    content: item.user_body,
    isRead: item.user_read,
  }))
}

const MessageListContent = ({ onClose }: { onClose?: () => void }) => {
  const navigationRouter = useRouter()
  const { userSpecified } = useApplicationContext()
  const [messageItems, setMessageItems] = useState<MessageItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentTab, setCurrentTab] = useState<'read' | 'unread'>('unread')

  const retrieveMessageList = async () => {
    setIsLoading(true)
    try {
      const response = await getMessageList({ page: 1, pageSize: 100, user_read: currentTab === 'read' }) as MessageApiResponse
      const transformedMessages = convertApiDataToComponentData(response.items)
      setMessageItems(transformedMessages)
    }
    catch (error) {
      console.error('获取消息列表失败:', error)
    }
    finally {
      setIsLoading(false)
    }
  }

  const verifyAdminStatus = (): boolean => {
    if (['administrator', 'admin'].includes(userSpecified?.name || ''))
      return true
    return false
  }

  const getCurrentUserId = (): string => {
    return userSpecified?.id || ''
  }

  const processMessageClick = async (message: MessageItem) => {
    try {
      if (!message.isRead) {
        await getMessageRead({ id: message.id })

        setMessageItems(prevMessages =>
          prevMessages.map(msg =>
            msg.id === message.id ? { ...msg, isRead: true } : msg,
          ),
        )
      }
      if (message.module === 'quota_request' && verifyAdminStatus()) {
        setTimeout(() => {
          navigationRouter.push('/user/quota')
        }, 300)
      }
    }
    catch (error) {
      console.error('处理消息点击失败:', error)
    }
  }

  useEffect(() => {
    retrieveMessageList()
  }, [currentTab])

  const renderTabButtons = () => (
    <div className="flex space-x-4">
      <button
        onClick={() => setCurrentTab('unread')}
        className={`text-sm font-medium ${currentTab === 'unread'
          ? 'text-gray-900 border-b-2 border-blue-500'
          : 'text-gray-500 hover:text-gray-700'}`}
      >
        未读
      </button>
      <button
        onClick={() => setCurrentTab('read')}
        className={`text-sm font-medium ${currentTab === 'read'
          ? 'text-gray-900 border-b-2 border-blue-500'
          : 'text-gray-500 hover:text-gray-700'}`}
      >
        已读
      </button>
    </div>
  )

  const renderLoadingState = () => (
    <div className="px-4 py-8 text-center text-gray-500">
      <div className="flex items-center justify-center space-x-2">
        <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
        <span>加载中...</span>
      </div>
    </div>
  )

  const renderEmptyState = () => (
    <div className="px-4 py-8 text-center text-gray-500">
      暂无{currentTab === 'unread' ? '未读' : '已读'}消息
    </div>
  )

  const renderMessageItem = (message: MessageItem, index: number) => (
    <div key={message.id}>
      <div className="px-4 py-3 hover:bg-gray-50 cursor-pointer" onClick={() => processMessageClick(message)}>
        <div className="flex items-start space-x-3">
          <Iconfont type="icon-a-xiaoxitixing1" style={{ fontSize: '25px' }} className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0"/>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900 truncate">
                {message.teamName}
              </p>
              <p className="text-xs text-gray-500">
                {message.timeAgo}
              </p>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {message.content}
            </p>
          </div>

          {!message.isRead && (
            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
          )}
        </div>
      </div>

      {index < messageItems.length - 1 && (
        <div className="mx-4 border-b border-gray-100"></div>
      )}
    </div>
  )

  return (
    <div className="w-80 bg-white absolute top-0 left-[-280px] z-10">
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          {renderTabButtons()}
        </div>
      </div>

      <div className="max-h-[500px] overflow-y-auto">
        {isLoading
          ? renderLoadingState()
          : messageItems.length === 0
            ? renderEmptyState()
            : messageItems.map((message, index) => renderMessageItem(message, index))
        }
      </div>
    </div>
  )
}

const MessageList = () => {
  return (
    <FloatingCustomPanel
      trigger="click"
      position="br"
      buttonElement={
        <div className='w-6 h-6 font-size-16 cursor-pointer flex items-center justify-center'>
          <Iconfont type="icon-xiaoxi" />
        </div>
      }
      btnClassName="!p-1 !border-0 !bg-transparent hover:!bg-gray-100 !rounded-md"
      popupCls="!mt-2"
      htmlContent={<MessageListContent />}
      closeManually={true}
    />
  )
}

export default MessageList
