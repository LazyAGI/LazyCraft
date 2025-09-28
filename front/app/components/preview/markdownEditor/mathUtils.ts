declare const document: any
declare const window: any

const toLatexTag = (latex: string) => {
  if (!latex)
    return ''
  let outputStr = latex
  if (latex.includes('\\$'))
    outputStr = outputStr.replace('\\$', '\\ $')
  if (latex.includes('\\begin') && latex.includes('\\'))
    outputStr = outputStr.replace(/\s\\\s/g, ' \\\\ ')

  if (/\\left(\s{0,2}){/.test(latex))
    outputStr = outputStr.replace(/\\left(\s{0,2}){/g, '\\left \\{')
  if (/\\right(\s{0,2})}/.test(latex))
    outputStr = outputStr.replace(/\\right(\s{0,2}){/g, '\\right \\}')
  if (/\\left(\s{0,2})\{/.test(latex))
    outputStr = outputStr.replace(/\\left(\s{0,2})\{/g, '\\left \\{')
  if (/\\right(\s{0,2})\}/.test(latex))
    outputStr = outputStr.replace(/\\right(\s{0,2})\}/g, '\\right \\}')

  return `<span class="math-tex">${outputStr}</span>`
}

const matchLatexReg
  = /\${1,2}([\s\S]*?)\${1,2}|\\\([\s\S]*?\\\)|\\\\\([\s\S]*?\\\\\)|\\\[[\s\S]*?\\\]|\\\\\[[\s\S]*?\\\\\]/g
// /\${1,2}([\s\S]*?)\${1,2}/g;

export const isLatexPatt = (latex: string) =>
  /\$([\s\S]*)\$|\\\([\s\S]*\\\)|\\\\\([\s\S]*\\\\\)|\$\$[\s\S]*\$\$|\\\[[\s\S]*\\\]|\\\\\[[\s\S]*\\\\\]/g.test(latex)

const transformcustomHTMLRendererText = (latex: string) => {
  let latexStr = latex

  if (isLatexPatt(latex)) {
    const dollarArr = latex.match(matchLatexReg)

    if (dollarArr && dollarArr.length) {
      dollarArr.forEach((el) => {
        latexStr = latexStr.replaceAll(el, toLatexTag(el))
      })
    }
  }

  return latexStr
}

const handleNextBlank = (origin, next) => {
  const temp = origin?.substr(-1)

  return `${origin}${(/&|\\/.test(temp) && /&|\\|[^a-z\d]/.test(next[0])) ? ' ' : ''}${next}`
}

const handleAdditionalLatex = (latex: string, node) => {
  delete node.parent.additionalStr

  return {
    type: 'html',
    content: toLatexTag(latex),
  }
}

const drillForTypeParagraphAddKey = (node: any, val, key = 'additionalStr') => {
  if (/emph|customInline|link/.test(node.type))
    node[key] = val

  if (node.parent.type !== 'paragraph')
    drillForTypeParagraphAddKey(node.parent, val, key)
  else
    node.parent[key] = val
}

const judgeEmphSymbol = (latex: string) => {
  if (latex.substr(-1) === '{' || /equation/.test(latex) || latex[0] === '}')
    return '*'

  return '_'
}

export const customHTMLRenderer = {
  text(node, context) {
    const { parent: { additionalStr, type: parentNodeType }, literal: val } = node

    // 开始双$$源头或者$源头
    if (node.next?.type === 'softbreak') {
      if (val === '$$')
        return drillForTypeParagraphAddKey(node, '$$')
      else if (val === '$')
        return drillForTypeParagraphAddKey(node, '$')
    }

    // 针对于下一个节点是_截断的情景
    // 此为开始第一步
    if (node.next?.type === 'emph') {
      if (additionalStr) {
        const temp = handleNextBlank(additionalStr, val)
        drillForTypeParagraphAddKey(node.next, temp + judgeEmphSymbol(temp))
      }
      return
    }

    if (parentNodeType === 'emph')
      return drillForTypeParagraphAddKey(node, handleNextBlank(additionalStr, val))

    if (node.prev?.type === 'emph') {
      if (parentNodeType === 'customInline')
        return handleAdditionalLatex(`${additionalStr}${judgeEmphSymbol(additionalStr)}${val} $$`, node)

      return drillForTypeParagraphAddKey(node, additionalStr + judgeEmphSymbol(additionalStr) + val)
    }

    // $$存在两种情况  一种直接接数学字符串无空格  此情况为customInline   第二种为后面直接接换行
    if (additionalStr) {
      if (val === '$$' && node.prev?.type === 'softbreak')
        return handleAdditionalLatex(`${additionalStr}$$`, node)
      else if (val === '$' && node.prev?.type === 'softbreak')
        return handleAdditionalLatex(`${additionalStr}$`, node)
      else
        drillForTypeParagraphAddKey(node, handleNextBlank(additionalStr, val))
    }
    else {
      return {
        type: 'html',
        content: transformcustomHTMLRendererText(val),
      }
    }
  },
  softbreak(node) {
    if (node.parent.additionalStr)
      return

    return {
      type: 'html',
      content: '<br />',
    }
  },
  link(node, { entering }) {
    const { additionalStr } = node.parent
    if (additionalStr) {
      if (entering)
        drillForTypeParagraphAddKey(node, `${additionalStr}\[`)
      else
        drillForTypeParagraphAddKey(node, `${additionalStr}\]\(${node.destination}\)`)
    }
  },
  linebreak(node) {
    if (node.parent.additionalStr) {
      node.parent.additionalStr += ' \\\\ '
      return
    }
    return node
  },
  customInline(node, { entering }) {
    if (entering) {
      drillForTypeParagraphAddKey(node, `$$ ${node.info}`)
    }
    else {
      if (node.additionalStr)
        return handleAdditionalLatex(`${node.additionalStr} $$`, node)
    }
  },
}

export function createMathFormulaButtonUtil(cb) {
  const button = document.createElement('button')
  button.className = 'toastui-editor-toolbar-icons last'

  button.innerHTML = 'M'
  button.style.backgroundImage = 'none'
  button.style.margin = '0'

  button.addEventListener('click', cb)
  return button
}

const loadScript = (url: string, cb?: any) => {
  const script = document.createElement('script') as any
  script.type = 'text/javascript'
  if (typeof cb !== 'undefined') {
    if (script.readyState) {
      script.onreadystatechange = function () {
        if (script.readyState === 'loaded' || script.readyState === 'complete') {
          script.onreadystatechange = null
          cb && cb()
        }
      }
    }
    else {
      script.onload = function () {
        cb && cb()
      }
    }
  }
  script.src = url
  document.body.appendChild(script)
}
export const loadMathjaxResource = () => {
  if (window.MathJax && window.MathJax.typesetPromise)
    return
  window.MathJax = {
    loader: { load: ['input/tex', 'output/svg'] },
    options: {
      processHtmlClass: 'math-tex',
      ignoreHtmlClass: '.*',
    },
    tex: {
      inlineMath: [
        ['$', '$'],
        ['\\\\(', '\\\\)'],
        ['\\(', '\\)'],
      ],
      displayMath: [
        ['$$', '$$'],
        ['\\\\[', '\\\\]'],
        ['\\[', '\\]'],
      ],
    },
  }
  loadScript('https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js')
}
