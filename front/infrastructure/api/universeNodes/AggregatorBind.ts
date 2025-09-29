import { EffectType, generateShapeConfig } from './universe_default_config'
import { Aggregator } from './Aggregator'
export const AggregatorBind = {
  ...Aggregator,
  config__input_ports: [{}],
  config__parameters: [
    {
      ...generateShapeConfig('input_shape'),
      effects: [EffectType.InputShape_OutputShape_ModeSame],
      readOnly: true,
    },
    {
      ...generateShapeConfig('output_shape'),
      readOnly: true,
    },
    {
      ...generateShapeConfig('input_ports'),
      max: 9999,
    },
    {
      label: '模式',
      name: 'payload__setmode',
      type: 'select',
      required: true,
      tooltip: '提供两种聚合模式，独立模式可将多个输入聚合为一个输出，同一模式将多个输入分别输出',
      options: [
        {
          label: '同一模式',
          value: 'mode-same',
        },
        {
          label: '独立模式',
          value: 'mode-independent',
        },
      ],
      defaultValue: 'mode-same',
      watch: [{
        conditions: [
          { value: 'mode-independent' },
        ],
        actions: [
          {
            key: 'config__parameters',
            extend: true,
            value: [{ effects: [EffectType.InputShape_OutputShape_ModeIndependent] }, {}, {}, {}],
          },
          {
            key: 'config__input_shape',
            value: [{ id: 'input' }],
          },
          {
            key: 'config__output_shape',
            value: [{ id: 'output' }],
          },
        ],
      },
      {
        conditions: [
          { value: 'mode-same' },
        ],
        actions: [
          {
            key: 'config__parameters',
            extend: true,
            value: [{ effects: [EffectType.InputShape_OutputShape_ModeSame] }, {}, {}, {}],
          },
          {
            key: 'config__input_shape',
            value: [{ id: 'input' }],
          },
          {
            key: 'config__output_shape',
            value: [{ id: 'output' }],
          },
        ],
      }],
    },
  ],
}

export const SwitchCaseAggregatorBind = {
  ...Aggregator,
  config__input_ports: [{}],
  config__parameters: [
    {
      ...generateShapeConfig('input_shape'),
      effects: [EffectType.InputShape_OutputShape_ModeSame],
      readOnly: true,
    },
    {
      ...generateShapeConfig('output_shape'),
      readOnly: true,
    },
    {
      ...generateShapeConfig('input_ports'),
      max: 9999,
    },
  ],
  payload__setmode: 'mode-same',
  _forceMode: true,
}
