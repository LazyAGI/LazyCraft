export enum COLUMN_DICT {
  SAVED_KEY = 'name',
  MAIN_KEY = 'is_primary_key',
  UNION_KEY = 'foreign_key_info',
  IS_ONLY_ONE = 'is_unique',
  DESCRIPTION = 'comment',
  TYPE = 'type',
  IS_REQUIRED = 'nullable',
  DEFAULT_VALUE = 'default',
}

export const defaultAddVal = {
  [COLUMN_DICT.SAVED_KEY]: '',
  [COLUMN_DICT.MAIN_KEY]: false,
  [COLUMN_DICT.UNION_KEY]: '',
  [COLUMN_DICT.IS_ONLY_ONE]: false,
  [COLUMN_DICT.DESCRIPTION]: '',
  [COLUMN_DICT.TYPE]: 'TEXT',
  [COLUMN_DICT.IS_REQUIRED]: true,
  [COLUMN_DICT.DEFAULT_VALUE]: null,
}

export const booleanTypeOptions = [{ label: '是', value: true }, { label: '否', value: false }]
export const dataTypeOptions = [
  { label: 'TIMESTAMP', value: 'TIMESTAMP' },
  { label: 'BOOLEAN', value: 'BOOLEAN' },
  { label: 'VARCHAR', value: 'VARCHAR' },
  { label: 'TEXT', value: 'TEXT' },
  { label: 'NUMERIC', value: 'NUMERIC' },
  { label: 'BIGINT', value: 'BIGINT' },
  { label: 'INT', value: 'INT' },
]
export enum DATA_TYPE_DICT {
  BOOLEAN = 'BOOLEAN',
  VARCHAR = 'VARCHAR',
  TEXT = 'TEXT',
  NUMERIC = 'NUMERIC',
  BIGINT = 'BIGINT',
  INT = 'INT',
}

export const isNumberType = type => type === DATA_TYPE_DICT.BIGINT || type === DATA_TYPE_DICT.NUMERIC || type === DATA_TYPE_DICT.INT

export const handleTableData = (data, currentPage = 1) => data.map((el: any, i) => ({ __order: (currentPage - 1) * 10 + i, ...el }))

export const handleTableCellValue = (obj) => {
  const output = {}
  for (const key in obj) {
    if (obj[key] === '')
      output[key] = null
    else
      output[key] = obj[key]
  }
  return output
}
