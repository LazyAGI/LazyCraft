'use client'

import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import { useWebSocket } from 'ahooks'
import { Terminal } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import './index.scss'

type IProps = {
  visible: boolean
  id: number
}
const DEFAULT_TERMINAL_OPTS = {
  scrollback: 100000, // 终端中的回滚量
  lineHeight: 1.2,
  rightClickSelectsWord: true,
  screenReaderMode: false,
  allowProposedApi: false,
  LogLevel: 'debug',
  tabStopWidth: 4,
  wrapPreference: true,
  wrap: true,
  convertEol: true,
  rows: 50,
  cols: 30,
  // 光标闪烁
  cursorBlink: false,
  fontSize: 12,
  theme: {
    foreground: '#071127', // 字体
    background: '#FFFFFF', // 背景色
    pddding: 20,
    cursor: 'help', // 设置光标
  },
}
const DrawLogs = (props: IProps, ref: any) => {
  const { visible, id } = props
  const WSURL = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws/${id}`
  const wrapperRef: any = useRef<any>(null)

  // 日志开关
  const terminal = useMemo(() => {
    return new Terminal(DEFAULT_TERMINAL_OPTS)
  }, [])
  const { connect, disconnect }: any = useWebSocket(WSURL, {
    onMessage: (message: any) => {
      const { data } = message
      const res = JSON.parse(data)
      if (res?.level === 'INFO')
        terminal.write(`${res?.msg}\n`)
      if (res?.level === 'WARNING' && res?.msg === 'end')
        disconnect()
    },
    onOpen: () => {
      terminal.open(wrapperRef.current)
    },
    manual: true,
  })

  useEffect(() => {
    if (wrapperRef.current && visible) {
      // terminal.clear();
      connect()
    }
    return () => {
      disconnect()
      terminal.clear()
    }
  }, [visible, wrapperRef, terminal])
  useImperativeHandle(ref, () => ({
    terminal,
    connect,
  }))
  return (
    <div className="draw-log-wrap" ref={wrapperRef} />
  )
}
export default forwardRef(DrawLogs)
