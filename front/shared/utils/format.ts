import { categoryDict } from './index'

export const formatDatasetTag = (val) => {
  return categoryDict[val] || val
}
