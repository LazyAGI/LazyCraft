import { useEffect, useRef } from 'react'
import * as TWEEN from '@tweenjs/tween.js'
import { useStore } from '../../../../store'

type CarrierControlState = {
  carrierEle: HTMLElement | null
  stepType: '01' | '07'
  processId: number | null
}

export const useCarrierControl = () => {
  const selfRef = useRef<CarrierControlState>({
    carrierEle: null,
    stepType: '01',
    processId: null,
  })

  const instanceState = useStore(s => s.instanceState)
  const setInstanceState = useStore(s => s.setInstanceState)
  const patentState = useStore(s => s.patentState)
  const setPatentState = useStore(s => s.setPatentState)

  const STAGE_ELE_ID = 'workflowStage'
  const TRIGGER_TIME = 200 // 毫秒

  const transferEvent = (targetEle: HTMLElement) => {
    const coords = { inset: 50 }
    const tween = new TWEEN.Tween(coords)
      .to({ inset: 0 }, TRIGGER_TIME)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .onUpdate(() => {
        targetEle.style.setProperty('inset', `${coords.inset}%`)
      })
      .start()

    const animate = (time: number) => {
      const { stepType } = selfRef.current
      tween.update(time)

      if (stepType === '07') {
        if (selfRef.current.processId)
          cancelAnimationFrame(selfRef.current.processId)
      }
      else {
        selfRef.current.processId = requestAnimationFrame(animate)
      }
    }

    selfRef.current.processId = requestAnimationFrame(animate)

    tween.onComplete(() => {
      selfRef.current.stepType = '07'
    })
  }

  const startUp = () => {
    const stageEle = document.getElementById(STAGE_ELE_ID)

    if (stageEle) {
      stageEle.style.display = 'block'
      transferEvent(stageEle)
    }
    else {
      const stageDivEle = document.createElement('div')
      stageDivEle.id = STAGE_ELE_ID
      stageDivEle.style.cssText = `
        position: absolute;
        inset: 50%;
        background-color: #155aef;
        opacity: 0.2;
        z-index: 9999;
      `

      if (selfRef.current.carrierEle) {
        selfRef.current.carrierEle.appendChild(stageDivEle)
        transferEvent(stageDivEle)
      }
    }

    setInstanceState({ ...instanceState, isLoosen: false })
  }

  const stopIt = () => {
    const stageEle = document.getElementById(STAGE_ELE_ID)
    if (stageEle) {
      stageEle.style.inset = '50%'
      stageEle.style.display = 'none'
    }
    setInstanceState({ ...instanceState, isLoosen: false })
  }

  // 初始化 carrier 元素
  useEffect(() => {
    selfRef.current.carrierEle = document.getElementById('workflowCarrier')
  }, [])

  // 监听 patent 状态变化
  useEffect(() => {
    const { isTriggering } = patentState

    if (isTriggering === false)
      stopIt()

    if (isTriggering) {
      const timer = setTimeout(() => {
        setPatentState({ ...patentState, isTriggering: false })
      }, TRIGGER_TIME)

      return () => clearTimeout(timer)
    }
  }, [patentState, setPatentState])

  return {
    enterFlow: startUp,
    exitFlow: stopIt,
    isTriggering: patentState.isTriggering,
  }
}
