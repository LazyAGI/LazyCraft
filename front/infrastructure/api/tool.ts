import { get, post } from './base'

export const cancelPublish = ({ url, body }: { url: string; body: any }) => post(url, { body })

export const testTool = ({ url, body }: { url: string; body: any }) => post(url, { body })

export const getPara = ({ url, body }: { url: string; body: any }) => post(url, { body })

export const downloadTool = ({ url, options }: { url: string; options: { params: { id: string; format?: string } } }) => get(url, options)

export const getToolApiInfo = ({ url, options }: { url: string; options: { params: { api_id: string } } }) => get(url, options)

export const getToolDetail = ({ url, options }: { url: string; options: { params: { tool_id: string } } }) => get(url, options)

export const checkName = ({ url, body }: { url: string; body: any }) => post(url, { body })

export const saveTools = ({ url, body }: { url: string; body: any }) => post(url, { body })

export const toolsFields = ({ url, body }: { url: string; body: any }) => post(url, { body })

export const upsertField = ({ url, body }: { url: string; body: any }) => post(url, { body })

export const enableTools = ({ url, body }: { url: string; body: any }) => post(url, { body })

export const publishTools = ({ url, body }: { url: string; body: any }) => post(url, { body })

export const deleteTools = ({ url, body }: { url: string; body: any }) => post(url, { body })

export const upsertToolsApi = ({ url, body }: { url: string; body: any }) => post(url, { body })

export const upsertTools = ({ url, body }: { url: string; body: any }) => post(url, { body })

export const getToolsList = ({ url, body }: { url: string; body: any }) => post(url, { body })
