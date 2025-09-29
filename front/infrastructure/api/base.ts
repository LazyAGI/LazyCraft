// ==================== 导入和常量定义 ====================
import { API_PREFIX, PUBLIC_API_PREFIX } from '@/app-specs'
import Toast, { ToastTypeEnum } from '@/app/components/base/flash-notice'
import { clearAuthToken } from '@/app/components/share/utils'
import { isAgentPage } from '@/shared/utils'

// 配置常量
const TIME_OUT = 100000 * 2
const ContentType = {
  json: 'application/json',
  stream: 'text/event-stream',
  audio: 'audio/mpeg',
  form: 'application/x-www-form-urlencoded; charset=UTF-8',
  download: 'application/octet-stream',
  upload: 'multipart/form-data',
}

// 基础配置
const baseOptions = {
  method: 'GET',
  mode: 'cors' as const,
  credentials: 'include' as const,
  headers: new Headers({ 'Content-Type': ContentType.json }),
  redirect: 'follow' as const,
}

// 类型定义
type IOnDataMoreInfo = {
  errorCode?: string
  errorMessage?: string
  discussionId?: string
  messageId: string
  taskId?: string
}

export type IOnData = (message: string, isFirstMessage: boolean, moreInfo: IOnDataMoreInfo) => void
export type IOnError = (msg: string, code?: string) => void
export type IOnFinish = (finish: any) => void
export type IOnChunk = (chunk: any) => void
export type IOnStart = (start: any) => void

export type IOtherOptions = {
  isPublicAPI?: boolean
  bodyStringify?: boolean
  needAllResponseContent?: boolean
  deleteContentType?: boolean
  silent?: boolean
  onData?: IOnData
  onError?: IOnError
  getAbortController?: (abortController: AbortController) => void
  onChunk?: IOnChunk
  onStart?: IOnStart
  onFinish?: IOnFinish
  isAgent?: boolean
  customTimeout?: number
}

type ResponseError = {
  code: string
  message: string
  status: number
}

type FetchOptionType = Omit<RequestInit, 'body'> & {
  params?: Record<string, any>
  body?: BodyInit | Record<string, any> | null
}

// 工具函数
const unicodeToChar = (text: string): string => {
  if (!text)
    return ''
  return text.replace(/\\u[0-9a-f]{4}/g, (_match, p1) =>
    String.fromCharCode(parseInt(p1, 16)),
  )
}

const redirectToSignin = (pathname: string) => {
  globalThis.location.href = `/signin?redirect_url=${pathname}`
}

const redirectToLogin = () => {
  globalThis.location.href = `${globalThis.location.origin}/signin`
}

// 认证管理
class AuthManager {
  static getToken(isPublicAPI: boolean): string {
    if (isPublicAPI) {
      const sharedToken = globalThis.location.pathname.split('/').slice(-1)[0]
      const accessToken = localStorage.getItem('token') || JSON.stringify({ [sharedToken]: '' })
      try {
        const accessTokenJson = JSON.parse(accessToken)
        return accessTokenJson[sharedToken] || ''
      }
      catch {
        return ''
      }
    }
    return localStorage.getItem('console_token') || ''
  }

  static getAgentToken(): string | null {
    return localStorage?.getItem('agent_token') || null
  }

  static setAuthHeaders(headers: Headers, isPublicAPI: boolean, isAgent?: boolean): void {
    const token = this.getToken(isPublicAPI)
    if (token)
      headers.set('Authorization', `Bearer ${token}`)

    const agentToken = this.getAgentToken()
    if (isAgent && agentToken)
      headers.set('TempToken', agentToken)
  }
}

// URL构建器
class URLBuilder {
  static buildUrl(url: string, isPublicAPI: boolean, params?: Record<string, any>): string {
    const urlPrefix = isPublicAPI ? PUBLIC_API_PREFIX : API_PREFIX
    let fullUrl = `${urlPrefix}${url.startsWith('/') ? url : `/${url}`}`

    if (params && Object.keys(params).length > 0) {
      const queryStr = Object.entries(params)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&')

      fullUrl += fullUrl.includes('?') ? `&${queryStr}` : `?${queryStr}`
    }

    return fullUrl
  }
}

// 错误处理器
class ErrorHandler {
  static async handleResponseError(
    response: Response,
    isPublicAPI: boolean,
    silent = false,
  ): Promise<never> {
    const resClone = response.clone()

    try {
      const data: ResponseError = await response.json()

      if (!silent)
        Toast.notify({ type: ToastTypeEnum.Error, message: data.message })

      switch (response.status) {
        case 401:
          this.handleUnauthorized(data, isPublicAPI, silent)
          break
        case 403:
          this.handleForbidden(data, silent)
          break
        default:
          // 其他错误状态码
          break
      }
    }
    catch {
      // 如果响应不是有效的JSON，显示通用错误
      if (!silent)
        Toast.notify({ type: ToastTypeEnum.Error, message: `HTTP ${response.status}: ${response.statusText}` })
    }

    return Promise.reject(resClone)
  }

  private static handleUnauthorized(data: ResponseError, isPublicAPI: boolean, silent: boolean): void {
    if (isPublicAPI) {
      if (data.code === 'web_sso_auth_required') {
        redirectToSignin(globalThis.location.pathname)
      }
      else if (data.code === 'unauthorized') {
        clearAuthToken()
        globalThis.location.reload()
      }
    }
    else {
      if (data.code === 'init_validate_failed' && !silent)
        Toast.notify({ type: ToastTypeEnum.Error, message: data.message, duration: 4000 })
      else if (location.pathname !== '/signin' && !isAgentPage())
        redirectToLogin()
    }
  }

  private static handleForbidden(data: ResponseError, silent: boolean): void {
    if (data.code === 'already_setup')
      redirectToLogin()
    else if (data.code === 'no_perm' && !silent)
      Toast.notify({ type: ToastTypeEnum.Error, message: data.message })
  }
}

// 流事件处理器
class StreamEventHandler {
  static handleEvent(
    event: string,
    data: any,
    callbacks: {
      onData?: IOnData
      onChunk?: IOnChunk
      onStart?: IOnStart
      onFinish?: IOnFinish
      onError?: IOnError
    },
    isFirstMessage: boolean,
    moreInfo: IOnDataMoreInfo,
  ): void {
    switch (event) {
      case 'data':
        callbacks.onData?.(
          unicodeToChar(data.data || data.answer || data.message),
          isFirstMessage,
          moreInfo,
        )
        break
      case 'chunk':
        callbacks.onChunk?.(data)
        break
      case 'start':
        callbacks.onStart?.(data)
        break
      case 'finish':
        callbacks.onFinish?.(data)
        break
      case 'error':
        callbacks.onError?.(data.data || data.message)
        break
      case 'debug':
      case 'stop':
        // 暂时不做特殊处理
        break
    }
  }
}

// 流数据处理器
const handleStream = (
  response: Response,
  callbacks: {
    onData: IOnData
    onStart?: IOnStart
    onError?: IOnError
    onFinish?: IOnFinish
    onChunk?: IOnChunk
  },
  _isAgent?: boolean,
): void => {
  if (!response.ok)
    throw new Error('请检查网络')

  const reader = response.body?.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let bufferObj: Record<string, any>
  let isFirstMessage = true

  const processMessage = (message: string): boolean => {
    if (!message.startsWith('data: '))
      return false

    try {
      bufferObj = JSON.parse(message.substring(6))
    }
    catch {
      // 处理消息截断
      callbacks.onData('', isFirstMessage, {
        discussionId: bufferObj?.conversation_id,
        messageId: bufferObj?.message_id,
      })
      return false
    }

    if (bufferObj.status === 400 || !bufferObj.event) {
      callbacks.onData('', false, {
        discussionId: undefined,
        messageId: '',
        errorMessage: bufferObj?.message,
        errorCode: bufferObj?.code,
      })
      return true // 有错误
    }

    const moreInfo = {
      discussionId: bufferObj.conversation_id,
      taskId: bufferObj.task_id,
      messageId: bufferObj.id || bufferObj.message_id,
    }

    StreamEventHandler.handleEvent(
      bufferObj.event,
      bufferObj,
      callbacks,
      isFirstMessage,
      moreInfo,
    )

    if (bufferObj.event === 'data')
      isFirstMessage = false

    return false // 无错误
  }

  const read = (): void => {
    reader?.read().then((result: any) => {
      if (result.done)
        return

      buffer += decoder.decode(result.value, { stream: true })
      const lines = buffer.split('\n')

      try {
        let hasError = false
        for (const line of lines) {
          if (processMessage(line)) {
            hasError = true
            break
          }
        }

        buffer = lines[lines.length - 1]

        if (!hasError)
          read()
      }
      catch (e) {
        callbacks.onData('', false, {
          discussionId: undefined,
          messageId: '',
          errorMessage: `${e}`,
        })
      }
    })
  }

  read()
}

// 核心请求函数
const baseFetch = <T>(
  url: string,
  fetchOptions: FetchOptionType,
  options: IOtherOptions = {},
): Promise<T> => {
  const {
    isPublicAPI = false,
    bodyStringify = true,
    needAllResponseContent,
    deleteContentType,
    getAbortController,
    silent,
    customTimeout,
  } = options

  const requestOptions = { ...baseOptions, ...fetchOptions }

  // 确保headers是Headers实例
  if (!(requestOptions.headers instanceof Headers))
    requestOptions.headers = new Headers(requestOptions.headers)

  // 设置中止控制器
  let abortController: AbortController | undefined
  if (getAbortController || customTimeout) {
    abortController = new AbortController()
    getAbortController?.(abortController)
    requestOptions.signal = abortController.signal
  }

  // 设置认证头
  AuthManager.setAuthHeaders(requestOptions.headers, isPublicAPI, options.isAgent)

  // 处理Content-Type
  if (deleteContentType)
    requestOptions.headers.delete('Content-Type')
  else if (!requestOptions.headers.get('Content-Type'))
    requestOptions.headers.set('Content-Type', ContentType.json)

  // 构建URL
  const fullUrl = URLBuilder.buildUrl(url, isPublicAPI, requestOptions.params)
  delete requestOptions.params

  // 处理请求体
  if (requestOptions.body && bodyStringify)
    requestOptions.body = JSON.stringify(requestOptions.body)

  // 发起请求
  return Promise.race([
    new Promise<never>((_resolve, _reject) => {
      setTimeout(() => {
        abortController?.abort()
        _reject(new Error('request timeout'))
      }, customTimeout || TIME_OUT)
    }),
    globalThis.fetch(fullUrl, requestOptions as RequestInit)
      .then(async (res) => {
        // 处理错误状态码
        if (!/^(2|3)\d{2}$/.test(String(res.status)))
          return ErrorHandler.handleResponseError(res, isPublicAPI, silent)

        // 处理204状态码
        if (res.status === 204)
          return { result: 'success' } as T

        // 返回数据
        const contentType = (requestOptions.headers as Headers).get('Content-type')
        if (contentType === ContentType.download || contentType === ContentType.audio)
          return needAllResponseContent ? res.clone() : res.blob()

        return needAllResponseContent ? res.clone() : res.json()
      })
      .catch((err) => {
        if (!silent)
          Toast.notify({ type: ToastTypeEnum.Error, message: err })

        throw err
      }),
  ])
}

// 文件上传
export const upload = (
  options: any,
  isPublicAPI = false,
  url?: string,
  searchParams?: string,
): Promise<any> => {
  const token = AuthManager.getToken(isPublicAPI)
  const urlPrefix = isPublicAPI ? PUBLIC_API_PREFIX : API_PREFIX

  const defaultOptions = {
    method: 'POST',
    url: (url ? `${urlPrefix}${url}` : `${urlPrefix}/files/upload`) + (searchParams || ''),
    headers: { Authorization: `Bearer ${token}` },
    data: {},
  }

  const finalOptions = {
    ...defaultOptions,
    ...options,
    headers: { ...defaultOptions.headers, ...options.headers },
  }

  return new Promise((resolve, reject) => {
    const xhr = finalOptions.xhr || new XMLHttpRequest()
    xhr.open(finalOptions.method, finalOptions.url)

    Object.entries(finalOptions.headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value)
    })

    xhr.withCredentials = true
    xhr.responseType = 'json'
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200 || xhr.status === 201) {
          resolve(xhr.response)
        }
        else {
          // 处理错误状态码，与 baseFetch 保持一致
          try {
            const errorData = xhr.response
            if (errorData && errorData.message) {
              // 处理特定的错误状态码
              if (xhr.status === 403 && errorData.code === 'no_perm') {
                Toast.notify({ type: ToastTypeEnum.Error, message: errorData.message })
              }
              else if (xhr.status === 400) {
                // 400 状态码时显示服务器返回的具体错误信息
                Toast.notify({ type: ToastTypeEnum.Error, message: '上传文件格式有误，请检查上传文件' })
              }
              else {
                // 其他错误状态码也显示服务器返回的错误信息
                Toast.notify({ type: ToastTypeEnum.Error, message: errorData.message })
              }
            }
            else {
              // 如果响应不是有效的JSON，显示通用错误
              Toast.notify({ type: ToastTypeEnum.Error, message: `HTTP ${xhr.status}: ${xhr.statusText}` })
            }
          }
          catch (e) {
            // 如果解析响应失败，显示通用错误
            Toast.notify({ type: ToastTypeEnum.Error, message: `HTTP ${xhr.status}: ${xhr.statusText}` })
          }
          reject(xhr)
        }
      }
    }

    xhr.upload.onprogress = finalOptions.onprogress
    xhr.send(finalOptions.data)
  })
}

// SSE流式请求
export const ssePost = (
  url: string,
  fetchOptions: FetchOptionType,
  options: IOtherOptions = {},
): void => {
  const {
    isPublicAPI = false,
    onData,
    onError,
    getAbortController,
    onStart,
    onChunk,
    isAgent,
    onFinish,
  } = options

  const abortController = new AbortController()
  const requestOptions = {
    ...baseOptions,
    method: 'POST',
    signal: abortController.signal,
    ...fetchOptions,
  }

  // 确保headers是Headers实例
  if (!(requestOptions.headers instanceof Headers))
    requestOptions.headers = new Headers(requestOptions.headers)

  if (!requestOptions.headers.get('Content-Type'))
    requestOptions.headers.set('Content-Type', ContentType.json)

  AuthManager.setAuthHeaders(requestOptions.headers, isPublicAPI, isAgent)
  getAbortController?.(abortController)

  const fullUrl = URLBuilder.buildUrl(url, isPublicAPI)

  if (requestOptions.body)
    requestOptions.body = JSON.stringify(requestOptions.body)

  globalThis.fetch(fullUrl, requestOptions as RequestInit)
    .then((res) => {
      if (!/^(2|3)\d{2}$/.test(String(res.status))) {
        res.json().then((data: any) => {
          const errorMessage = data.message || `HTTP ${res.status}: ${res.statusText}`
          Toast.notify({ type: ToastTypeEnum.Error, message: errorMessage })

          if (isPublicAPI) {
            if (data.code === 'web_sso_auth_required') {
              redirectToSignin(globalThis.location.pathname)
            }
            else if (data.code === 'unauthorized') {
              clearAuthToken()
              globalThis.location.reload()
            }
          }
          onError?.(errorMessage)
        }).catch(() => {
          const errorMessage = `HTTP ${res.status}: ${res.statusText}`
          Toast.notify({ type: ToastTypeEnum.Error, message: errorMessage })
          onError?.(errorMessage)
        })
        return
      }

      return handleStream(res, {
        onData: (str: string, isFirstMessage: boolean, moreInfo: IOnDataMoreInfo) => {
          if (moreInfo.errorMessage) {
            onError?.(moreInfo.errorMessage, moreInfo.errorCode)
            if (moreInfo.errorMessage !== 'AbortError: The user aborted a request.')
              Toast.notify({ type: ToastTypeEnum.Error, message: moreInfo.errorMessage })

            return
          }
          onData?.(str, isFirstMessage, moreInfo)
        },
        onStart,
        onError,
        onFinish,
        onChunk,
      }, isAgent)
    }).catch((e) => {
      if (e.toString() !== 'AbortError: The user aborted a request.')
        Toast.notify({ type: ToastTypeEnum.Error, message: e })

      onError?.(e)
    })
}

// 基础请求函数
const request = <T>(url: string, options = {}, otherOptions?: IOtherOptions) => {
  return baseFetch<T>(url, options, otherOptions || {})
}

// HTTP方法导出
export const get = <T>(url: string, options = {}, otherOptions?: IOtherOptions) => {
  return request<T>(url, { ...options, method: 'GET' }, otherOptions)
}

export const getPublic = <T>(url: string, options = {}, otherOptions?: IOtherOptions) => {
  return get<T>(url, options, { ...otherOptions, isPublicAPI: true })
}

export const post = <T>(url: string, options = {}, otherOptions?: IOtherOptions) => {
  return request<T>(url, { ...options, method: 'POST' }, otherOptions)
}

export const postPublic = <T>(url: string, options = {}, otherOptions?: IOtherOptions) => {
  return post<T>(url, options, { ...otherOptions, isPublicAPI: true })
}

export const put = <T>(url: string, options = {}, otherOptions?: IOtherOptions) => {
  return request<T>(url, { ...options, method: 'PUT' }, otherOptions)
}

export const del = <T>(url: string, options = {}, otherOptions?: IOtherOptions) => {
  return request<T>(url, { ...options, method: 'DELETE' }, otherOptions)
}

export const delPublic = <T>(url: string, options = {}, otherOptions?: IOtherOptions) => {
  return del<T>(url, options, { ...otherOptions, isPublicAPI: true })
}

export const patch = <T>(url: string, options = {}, otherOptions?: IOtherOptions) => {
  return request<T>(url, { ...options, method: 'PATCH' }, otherOptions)
}

export const patchPublic = <T>(url: string, options = {}, otherOptions?: IOtherOptions) => {
  return patch<T>(url, options, { ...otherOptions, isPublicAPI: true })
}
