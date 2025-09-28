import { CHAT_SESSION_ID_KEY } from '../base/chat/constants'

export const clearAuthToken = () => {
  const pathToken = globalThis.location.pathname.split('/').slice(-1)[0]

  const storedTokenData = localStorage.getItem('token') || JSON.stringify({ [pathToken]: '' })
  let parsedTokenData = { [pathToken]: '' }

  try {
    parsedTokenData = JSON.parse(storedTokenData)
  }
  catch (error) {
    // 解析失败时使用默认值
  }

  localStorage.removeItem(CHAT_SESSION_ID_KEY)

  delete parsedTokenData[pathToken]
  localStorage.setItem('token', JSON.stringify(parsedTokenData))
}
