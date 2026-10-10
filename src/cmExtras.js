/**
 * 编辑器里的两件事：
 *  1. 给表名和列名分别上色（配合主题里的关键字/字符串/数字颜色，让玩家看懂「这几种颜色各代表什么」）
 *  2. 把出错的片段标红，让「哪里错」一眼可见
 *
 * 用正则扫描而不是语法树：位置稳定、不依赖 lang-sql 的内部节点名，也不会因为方言差异失效。
 */

import { Decoration, ViewPlugin } from '@codemirror/view'
import { RangeSetBuilder } from '@codemirror/state'
import { TABLES } from './schema.js'

const TABLE_NAMES = new Set(TABLES.map((t) => t.name))
const COLUMN_NAMES = new Set(TABLES.flatMap((t) => t.columns.map((c) => c[0])))

const markTable = Decoration.mark({ class: 'cm-tableName' })
const markColumn = Decoration.mark({ class: 'cm-columnName' })
const markError = Decoration.mark({ class: 'cm-errToken' })

/** 扫出所有「不在字符串和注释里」的单词及其位置 */
function scanWords(text) {
  const out = []
  let i = 0
  while (i < text.length) {
    const ch = text[i]
    if (ch === "'") {
      i++
      while (i < text.length && text[i] !== "'") i++
      i++
      continue
    }
    if (ch === '-' && text[i + 1] === '-') {
      while (i < text.length && text[i] !== '\n') i++
      continue
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i
      while (j < text.length && /[A-Za-z0-9_]/.test(text[j])) j++
      out.push({ word: text.slice(i, j), from: i, to: j })
      i = j
      continue
    }
    i++
  }
  return out
}

/** 表名/列名着色 + 错误片段标红 */
export function sqlPainter(errorRanges = []) {
  return ViewPlugin.fromClass(
    class {
      constructor(view) {
        this.decorations = this.build(view)
      }
      update(update) {
        if (update.docChanged || update.viewportChanged || update.transactions.some((t) => t.docChanged)) {
          this.decorations = this.build(update.view)
        }
      }
      build(view) {
        const text = view.state.doc.toString()
        const items = []
        for (const { word, from, to } of scanWords(text)) {
          const lower = word.toLowerCase()
          if (TABLE_NAMES.has(lower)) items.push({ from, to, deco: markTable })
          else if (COLUMN_NAMES.has(lower)) items.push({ from, to, deco: markColumn })
        }
        for (const [from, to] of errorRanges) {
          if (from < to && to <= text.length) items.push({ from, to, deco: markError })
        }
        items.sort((a, b) => a.from - b.from || a.to - b.to)
        const builder = new RangeSetBuilder()
        let last = -1
        for (const it of items) {
          if (it.from < last) continue // 重叠的跳过，避免 RangeSet 报错
          builder.add(it.from, it.to, it.deco)
          last = it.to
        }
        return builder.finish()
      }
    },
    { decorations: (v) => v.decorations }
  )
}

/** 从语法体检结果里找出「出错片段」在原文中的位置，用于在编辑器里标红 */
export function rangesFromFindings(sql, findings = []) {
  const text = String(sql || '')
  const out = []
  for (const f of findings) {
    const snippet = String(f.snippet || '')
    if (!snippet) continue
    const i = text.indexOf(snippet)
    if (i >= 0) out.push([i, i + snippet.length])
  }
  return out
}

/** 编辑器里颜色的含义，用于界面上的说明条 */
export const COLOR_LEGEND = [
  { cls: 'lg-keyword', label: '关键字', note: 'SQL 规定的词，比如 SELECT、FROM、WHERE' },
  { cls: 'lg-table', label: '表名', note: 'FROM 后面的名字，表示数据从哪张表来' },
  { cls: 'lg-column', label: '列名', note: '表里的字段名，比如 name、price' },
  { cls: 'lg-string', label: '字符串', note: '英文单引号包起来的文字，比如 \'paid\'' },
  { cls: 'lg-number', label: '数字', note: '直接写数字，不用引号' },
  { cls: 'lg-error', label: '错误位置', note: '出问题的地方会被标红' }
]
