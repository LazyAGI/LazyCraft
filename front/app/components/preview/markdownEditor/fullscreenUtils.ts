declare const document: any

const isFullScreenEnabled = () => {
  return (
    document.fullscreenEnabled
    || document.webkitFullscreenEnabled
    || document.mozFullScreenEnabled
    || document.msFullscreenEnabled
  )
}

// 判断是否有已全屏的元素
const hasFullScreenElement = () => {
  return (
    document.fullscreenElement
    || document.webkitFullscreenElement
    || document.mozFullScreenElement
    || document.msFullscreenElement
  )
}

// 文档退出全屏
const exitFullScreen = () => {
  if (document.exitFullscreen)
    document.exitFullscreen()

  if (document.webkitExitFullscreen)
    document.webkitExitFullscreen()

  if (document.mozCancelFullScreen)
    document.mozCancelFullScreen()

  if (document.msExitFullscreen)
    document.msExitFullscreen()
}

// 将目标元素设置为全屏展示
const setFullScreen = (target) => {
  if (target.requestFullscreen)
    target.requestFullscreen()

  if (target.webkitRequestFullscreen)
    target.webkitRequestFullscreen()

  if (target.mozRequestFullScreen)
    target.mozRequestFullScreen()

  if (target.msRequestFullscreen)
    target.msRequestFullscreen()
}

export const handleFullScreen = (dom) => {
  let mapMainContent
  // 判断是否有dom传入，没有则是整个页面全屏展示
  dom ? (mapMainContent = dom) : (mapMainContent = document.documentElement)
  if (isFullScreenEnabled()) {
    if (hasFullScreenElement())
      exitFullScreen()
    else
      setFullScreen(mapMainContent)
  }
  else {
  }
}
