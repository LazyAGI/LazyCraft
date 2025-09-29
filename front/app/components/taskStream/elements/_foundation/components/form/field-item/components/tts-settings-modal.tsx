'use client'
import type { FC } from 'react'
import React, { useState } from 'react'
import { InputNumber, Slider, Switch } from 'antd'

type TTSSettings = {
  speed: number
  temperature: number
  oral: boolean
  laugh: boolean
  pause: number
  tone: string
  randomTone: boolean
}

type TTSSettingsContentProps = {
  initialSettings?: Partial<TTSSettings>
  onChange?: (settings: TTSSettings) => void
  readOnly?: boolean
}

const TTSSettingsContent: FC<TTSSettingsContentProps> = ({
  initialSettings = {},
  onChange,
  readOnly = false,
}) => {
  const [settings, setSettings] = useState<TTSSettings>({
    speed: initialSettings.speed || 50,
    temperature: initialSettings.temperature || 50,
    oral: initialSettings.oral || false,
    laugh: initialSettings.laugh || false,
    pause: initialSettings.pause || 50,
    tone: initialSettings.tone || '666',
    randomTone: initialSettings.randomTone || false,
  })

  const updateSettings = (newSettings: Partial<TTSSettings>) => {
    const updated = { ...settings, ...newSettings }
    setSettings(updated)
    onChange?.(updated)
  }

  return (
    <div className="space-y-6">
      {/* 情感控制 */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-4">情感控制</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-4">
              <label className="text-sm text-gray-700 w-20">speed</label>
              <div className="flex-1">
                <Slider
                  min={0}
                  max={100}
                  value={settings.speed}
                  onChange={value => updateSettings({ speed: value })}
                  disabled={readOnly}
                />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center space-x-4">
              <label className="text-sm text-gray-700 w-20">temperature</label>
              <div className="flex-1">
                <Slider
                  min={0}
                  max={100}
                  value={settings.temperature}
                  onChange={value => updateSettings({ temperature: value })}
                  disabled={readOnly}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 文本控制 */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-4">文本控制</h3>
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <label className="text-sm text-gray-700 w-20">口语化 oral</label>
            <div className="flex-1">
              <Slider
                min={0}
                max={100}
                value={settings.oral ? 50 : 0}
                onChange={value => updateSettings({ oral: value > 25 })}
                disabled={readOnly}
              />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <label className="text-sm text-gray-700 w-20">笑声 laugh</label>
            <div className="flex-1">
              <Switch
                checked={settings.laugh}
                onChange={value => updateSettings({ laugh: value })}
                disabled={readOnly}
              />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <label className="text-sm text-gray-700 w-20">停顿 pause</label>
            <div className="flex-1">
              <Slider
                min={0}
                max={100}
                value={settings.pause}
                onChange={value => updateSettings({ pause: value })}
                disabled={readOnly}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 音色控制 */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-4">音色控制</h3>
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <label className="text-sm text-gray-700 w-20">音色种子</label>
            <div className="flex items-center space-x-2">
              <InputNumber
                value={settings.tone}
                onChange={value => updateSettings({ tone: value?.toString() || '666' })}
                className="w-20"
                disabled={readOnly}
              />
              <Switch
                checked={settings.randomTone}
                onChange={value => updateSettings({ randomTone: value })}
                disabled={readOnly}
              />
              <span className="text-sm text-gray-500">随机音色</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TTSSettingsContent
