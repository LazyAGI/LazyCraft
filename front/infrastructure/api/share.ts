import type { IOnChunk, IOnFinish, IOnStart } from './base'
import {
  del as adminDelete, get as adminGet, patch as adminPatch, post as adminPost,
  delPublic as publicDelete, getPublic as publicGet, patchPublic as publicPatch, postPublic as publicPost, ssePost,
} from './base'

export const fetchSavedMessage = async (isInstalledApp: boolean, installedApplicationId = '') => {
  return (getAction('get', isInstalledApp))(getUrl('/saved-messages', isInstalledApp, installedApplicationId))
}

export const saveMessage = (messageId: string, isInstalledApp: boolean, installedApplicationId = '') => {
  return (getAction('post', isInstalledApp))(getUrl('/saved-messages', isInstalledApp, installedApplicationId), { body: { message_id: messageId } })
}

export const sendWorkflowSingleNodeMessage = async (
  body: Record<string, any>,
  {
    onStart,
    onChunk,
    onFinish,
  }: {
    onStart: IOnStart
    onChunk: IOnChunk
    onFinish: IOnFinish
  },
) => {
  return ssePost(`apps/${body.app_id}/workflows/draft/nodes/${(body.subModuleId ? `${body.subModuleId}_` : '') + body.node_id}/run/stream`, {
    body: {
      ...body,
      response_mode: 'streaming',
    },
  }, { onStart, onChunk, onFinish, isPublicAPI: false })
}

export const sendWorkflowMessage = async (
  body: Record<string, any>,
  {
    onstart,
    onChunk,
    onFinish,
  }: {
    onstart: IOnStart
    onChunk: IOnChunk
    onFinish: IOnFinish
  },
) => {
  return ssePost(`apps/${body.app_id}/workflows/draft/run`, {
    body: {
      ...body,
      response_mode: 'streaming',
    },
  }, { onStart: onstart, onChunk, onFinish, isPublicAPI: false })
}

function getUrl(url: string, isInstalledApp: boolean, installedApplicationId: string) {
  return isInstalledApp ? `installed-apps/${installedApplicationId}/${url.startsWith('/') ? url.slice(1) : url}` : url
}

function getAction(action: 'get' | 'post' | 'del' | 'patch', isInstalledApp: boolean) {
  switch (action) {
    case 'get':
      return isInstalledApp ? adminGet : publicGet
    case 'post':
      return isInstalledApp ? adminPost : publicPost
    case 'patch':
      return isInstalledApp ? adminPatch : publicPatch
    case 'del':
      return isInstalledApp ? adminDelete : publicDelete
  }
}
