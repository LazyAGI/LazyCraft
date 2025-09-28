import React, { useEffect, useRef } from 'react'
import * as Excel from 'exceljs/dist/exceljs'
import Papa from 'papaparse'
import tinycolor from 'tinycolor2'

type PreviewDocProps = {
  url: string
}

const PreviewExcel: React.FC<PreviewDocProps> = ({ url }) => {
  const excelContainer = useRef<HTMLDivElement>(null)
  const excelInst = useRef<any>(null)

  const renderExcel = async (buffer: ArrayBuffer, isCSV: boolean) => {
    try {
      const workbookData: any[] = []

      if (isCSV) {
        const csvString = new TextDecoder().decode(buffer)
        const parsedData = Papa.parse(csvString, { header: false })

        const sheetData: any = {
          name: 'Sheet1',
          styles: [],
          rows: {},
          merges: [],
        }

        parsedData.data.forEach((row: any, rowIndex: number) => {
          sheetData.rows[rowIndex.toString()] = { cells: {} }
          row.forEach((cell: any, colIndex: number) => {
            const styleIndex = sheetData.styles.push({ border: {} }) - 1

            sheetData.rows[rowIndex.toString()].cells[colIndex.toString()] = {
              text: cell ?? '',
              style: styleIndex,
            }
          })
        })

        workbookData.push(sheetData)
      }
      else {
        const wb = new Excel.Workbook()
        await wb.xlsx.load(buffer)
        wb.eachSheet((sheet) => {
          const sheetData: any = {
            name: sheet.name,
            styles: [],
            rows: {},
            merges: [],
          }

          const mergeAddressData = [] // 存储合并单元格信息
          for (const mergeRange in sheet._merges) {
            const merge = sheet._merges[mergeRange]
            sheetData.merges.push(merge.shortRange)
            mergeAddressData.push({
              startAddress: merge.tl,
              endAddress: merge.br,
              YRange: merge.model.bottom - merge.model.top,
              XRange: merge.model.right - merge.model.left,
            })
          }

          sheetData.cols = {}
          const columnsLength = (sheet.columns || []).length
          for (let i = 0; i < columnsLength; i++) {
            sheetData.cols[i.toString()] = {
              width: sheet.columns[i].width ? sheet.columns[i].width * 8 : 100,
            }
          }

          sheet.eachRow((row, rowIndex) => {
            sheetData.rows[(rowIndex - 1).toString()] = { cells: {}, height: row.height || undefined }
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
              const cellText = cell.value?.result || cell.value?.richText?.map(rt => rt.text).join('') || cell.value || ''

              let backGroundColor = null
              if (cell.style.fill && cell.style.fill.fgColor && cell.style.fill.fgColor.argb)
                backGroundColor = convertColor(cell.style.fill.fgColor.argb)

              if (backGroundColor)
                cell.style.bgcolor = backGroundColor

              let fontColor = null
              if (cell.style.font && cell.style.font.color && cell.style.font.color.argb)
                fontColor = convertColor(cell.style.font.color.argb)

              if (fontColor)
                cell.style.color = fontColor

              if (cell.style.alignment) {
                cell.style.align = cell.style.alignment.horizontal
                cell.style.valign = cell.style.alignment.vertical
              }
              cell.style.border = {}

              const styleIndex = sheetData.styles.push(cell.style) - 1

              const mergeAddress = mergeAddressData.find(o => o.startAddress === cell.address)
              if (mergeAddress) {
                if (cell.address !== mergeAddress.startAddress)
                  return // 非合并单元格的起始单元格，跳过处理

                sheetData.rows[(rowIndex - 1).toString()].cells[(colNumber - 1).toString()] = {
                  text: cellText,
                  style: styleIndex,
                  merge: [mergeAddress.YRange, mergeAddress.XRange],
                }
              }
              else {
                sheetData.rows[(rowIndex - 1).toString()].cells[(colNumber - 1).toString()] = {
                  text: cellText,
                  style: styleIndex,
                }
              }
            })
          })

          workbookData.push(sheetData)
        })
      }

      excelInst.current?.loadData(workbookData)
    }
    catch (e) {
      console.error('Error rendering Excel:', e)
      excelInst.current?.loadData({})
    }
  }

  const convertColor = (argb: string) => {
    const val = argb.trim().toLowerCase()
    try {
      const argbMatch = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(val)
      if (argbMatch) {
        const r = parseInt(argbMatch[2], 16)
        const g = parseInt(argbMatch[3], 16)
        const b = parseInt(argbMatch[4], 16)
        const a = parseInt(argbMatch[1], 16) / 255
        return tinycolor(`rgba(${r}, ${g}, ${b}, ${a})`).toHexString()
      }
    }
    catch (e) {
      console.error('Error converting color:', e)
    }
    return null
  }

  const loadExcel = (url: string) => {
    fetch(url)
      .then((res) => {
        if (res.status !== 200)
          return Promise.reject(res)

        return res.arrayBuffer()
      })
      .then((buffer) => {
        const isCSV = url.endsWith('.csv')
        renderExcel(buffer, isCSV)
      })
      .catch((e) => {
        console.error('Error loading Excel file:', e)
        excelInst.current?.loadData({})
      })
  }

  useEffect(() => {
    const node = excelContainer.current
    if (node) {
      if (!excelInst.current) {
        excelInst.current = window.x_spreadsheet(node, {
          mode: 'read',
          showToolbar: false,
          view: {
            width: () => node.offsetWidth,
            height: () => node.offsetHeight,
          },
        })
      }
      loadExcel(url)
    }
  }, [url])

  return <div style={{ height: '100%' }} ref={excelContainer} />
}

PreviewExcel.defaultProps = {
  url: '',
}

export default PreviewExcel
