import { FieldType } from '../../../_foundation/components/form/fixed-vals'
import ResourceSelector from '../../../_foundation/components/form/field-item/assetPicker'
import type { FieldItemProps } from '../../../_foundation/components/form/types'
import type { ModelConfiguration } from '../../types'

const ModelSelector = (props: Partial<FieldItemProps> & {
  onChange?: (model: ModelConfiguration) => void
}) => {
  return <ResourceSelector
    label='模型'
    name='payload__base_model'
    type={FieldType.local_and_online_llm_resource_selector}
    options_fetch_method='post'
    options_fetch_params={{ page: '1', page_size: '9999', model_type: 'local', model_kind: 'STT' }}
    options_fetch_api='/mh/list'
    options_keys={['id', 'model_name']}
    filterOptions={[{ key: 'model_kind', value: 'STT' }, { key: 'download_message', value: 'Download successful' }]}
    required={true}
    allowClear={true}
    {...props}
  />
}

export default ModelSelector
