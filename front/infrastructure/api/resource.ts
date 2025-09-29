export const fetchAllCustomResourceTypes = () => {
  return Promise.resolve([
    {
      name: 'file',
      categorization: 'custom',
      title: '文件资源',
      title_en: 'File',
      type: 'custom',
      payload__kind: 'File',
      desc: '文件资源',
      status: true,
      config__parameters: [
        {
          type: 'select',
          name: 'payload__file_type',
          label: '文件类型',
          options: [
            {
              label: '图片',
              value: 'image',
            },
            {
              label: '音频',
              value: 'audio',
            },
            {
              label: '任意类型文件',
              value: 'file',
            },
          ],
          allowClear: true,
          required: true,
        },
      ],
    },
  ])
}
