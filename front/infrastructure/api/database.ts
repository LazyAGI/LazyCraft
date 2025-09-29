import { del, get, post, put } from './base'
const prefixUrl = 'database'

export const deleteDatabase = (database_id) => {
  return del(`${prefixUrl}/${database_id}`)
}

export const deleteDatabaseTable = ({ database_id, table_id }) => {
  return del(`${prefixUrl}/${database_id}/table/${table_id}`)
}

export const downloadTemplate = ({ database_id, table_id }) => {
  return get(`${prefixUrl}/import/${database_id}/${table_id}`, {
    headers:
      new Headers({
        'Content-Type': 'application/octet-stream',
      }),
  })
}

export const getDataBaseList = (url, body) =>
  post(url, { body })

export const getDataBaseTable = ({ database_id, ...rest }) =>
  get(`${prefixUrl}/${database_id}/table/list`, { params: rest })

export const getDataBaseSubTableList = ({ database_id, table_id, ...rest }) =>
  get(`${prefixUrl}/${database_id}/table_data/${table_id}`, { params: rest })

export const getDataBaseTableStructureByName = ({ database_id, table_name, ...rest }) =>
  get(`${prefixUrl}/${database_id}/table_name/${table_name}`, { params: rest })

export const createDatabase = body =>
  post(prefixUrl, { body })

export const createDatabaseTable = body =>
  post(`${prefixUrl}/${body.database_id}/table`, { body })

export const updateDatabaseTable = ({ database_id, table_id, ...rest }) =>
  put(`${prefixUrl}/${database_id}/table_data/${table_id}`, { body: rest })

export const editTableStructure = ({ database_id, table_id, ...rest }) =>
  put(`${prefixUrl}/${database_id}/table/${table_id}`, { body: rest })
