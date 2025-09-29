import { post } from '@/infrastructure/api//base'

export const getMessageList = ({ page, pageSize, user_read }: { page: number; pageSize: number; user_read: boolean }) => {
  return post('/notifications/list', {
    body: {
      page,
      pageSize,
      user_read,
    },
  })
}

export const getMessageRead = ({ id }: { id: string }) => {
  return post('/notifications/read', {
    body: {
      notification_id: id,
    },
  })
}
