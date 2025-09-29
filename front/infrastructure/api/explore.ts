import { del, get } from './base'

export const fetchAppLogs = (id: string) => {
  return get(`/apps/${id}`)
}

export const fetchAppTemplateList = (params = {}) => {
  return get<any>('apptemplate', { params })
}

export const deleteAppTemplateList = (id) => {
  return del<any>(`apptemplate/${id}`)
}
