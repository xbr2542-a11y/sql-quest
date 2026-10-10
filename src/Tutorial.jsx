import React from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { sql as sqlLang, SQLite } from '@codemirror/lang-sql'
import { runQuery } from './db.js'
import { CM_SCHEMA, TABLES } from './schema.js'
import { translateError } from './errors.js'
import { ObjectTree, ResultTable } from './ui.jsx'
import { IconCheck, IconPlay } from './icons.jsx'
import Tour from './Tour.jsx'

const extensions = [sqlLang({ dialect: SQLite, schema: CM_SCHEMA, upperCaseKeywords: true })]
const TABLE_NAMES = TABLES.map((t) => t.name)

const firstWordOf = (s) => (s.trim().match(/^[\w*]+/) || [''])[0]

export default function Tutorial({ db, onDone, onSkip }) {
  const [openTable, setOpenTable] = React.useState(null)
  const [text, setText] = React.useState('') // 从空白开始：这一课要他亲手写
  const [result, setResult] = React.useState(null)
  const [err, setErr] = React.useState(null)
  const [ranOnce, setRanOnce] = React.useState(false)
  const [ms, setMs] = React.useState(null)

  const run = () => {
    if (!db) return
    const t0 = performance.now()
    try {
      const r = runQuery(db, text)
      setResult(r)
      setErr(null)
      setMs(Math.round(performance.now() - t0))
      setRanOnce(true)
    } catch (e) {
      setResult(null)
      setErr(
        e.code === 'NO_RESULT' || e.code === 'EMPTY'
          ? { title: '这条语句还没有结果', detail: '先按步骤把 SQL 写完，再点执行。' }
          : translateError(e.message, text)
      )
    }
  }

  // Ctrl / Cmd + Enter 在任何位置都能执行（之前只有光标在编辑器里才有效）
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        run()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const wroteSelect = /^\s*select\b/i.test(text)
  const wroteFrom = /\bfrom\b/i.test(text)
  const wroteProducts = /\bfrom\s+products\b/i.test(text)
  const otherTable = wroteFrom && !wroteProducts ? (text.match(/\bfrom\s+([\w\u4e00-\u9fa5]+)/i) || [])[1] : null

  const steps = [
    {
      target: '[data-tour="tree"]',
      title: '先认识左边：这是你公司的数据库',
      body: '里面装着 9 张数据表，每张表就像一张 Excel 表。先从最常用的 products（商品表）开始——注意，它现在是收起来的，你要先点开它，才会看到里面的字段。',
      action: true,
      actionText: '点左边 products 这一行，把它展开',
      done: openTable === 'products',
      doneHint: '展开成功，这就是表里的字段'
    },
    {
      target: '[data-tour="editorzone"]',
      title: '中间这块是写 SQL 的地方',
      body: '它现在是空的——因为接下来要你自己写，我不给你答案。写 SQL 就像回答一连串问题，每回答一个，就多写一个词。两个问题最重要：我要看什么？从哪张表拿？',
      done: true
    },
    {
      target: '[data-tour="editorzone"]',
      title: '第一个词：SELECT',
      body: "请在中间那块深色区域里，亲手打第一个词：SELECT（大小写都行）。\n\n为什么是它？因为写 SQL 的第一个问题永远是「我要看什么」。SELECT 就是「我要看」的意思。它不是 FROM，也不是 COUNT。",
      action: true,
      canClear: true,
      actionText: '在编辑器里输入 SELECT',
      helpText: '帮我把 SELECT 写上',
      done: wroteSelect,
      hold: 1400,
      doneHint: 'SELECT 写对了',
      note: !text.trim()
        ? { kind: 'info', text: '编辑器还是空的——把光标点进那块深色区域，直接敲键盘就行。' }
        : wroteSelect
          ? { kind: 'ok', text: '对，SELECT 的意思就是「我要看什么」，后面要跟着你要看的列。' }
          : { kind: 'warn', text: `第一个词应该是 SELECT，你现在写的是「${firstWordOf(text)}」。想想它回答的是哪个问题——是「看什么」，还是「从哪拿」？` }
    },
    {
      target: '[data-tour="editorzone"]',
      title: '第二个词：FROM products',
      body: 'SELECT 后面要先说「看哪些列」。这一课看全部列，所以先打一个星号 *。\n\n接着打第二个词 FROM——它回答第二个问题：「从哪张表拿」。这一课要看商品，表名就是左边列表里的 products（点左边的字段名可以插进来）。',
      action: true,
      canClear: true,
      actionText: '把 FROM products 补上，整句是 SELECT * FROM products',
      helpText: '帮我把这句补完',
      done: wroteProducts,
      hold: 1400,
      doneHint: '一句话写完了',
      note: !wroteFrom
        ? { kind: 'info', text: '还差 FROM —— 它回答「从哪张表拿」。表名在左边列表里。' }
        : wroteProducts
          ? { kind: 'ok', text: '完整了：SELECT * FROM products。读成白话就是「把 products 表的所有列给我」。' }
          : { kind: 'warn', text: `你写的是 FROM ${otherTable || '…'}。这一课要看商品，表名是 products，别写成订单表 orders。` }
    },
    {
      target: '[data-tour="run"]',
      title: '写完了，点这里执行',
      body: '点这个蓝色按钮，SQL 才会真的跑起来。键盘上的 Ctrl + Enter 也能执行——而且现在不管光标在哪儿都好使。',
      action: true,
      actionText: '点「执行」按钮，或按 Ctrl + Enter',
      helpText: '帮我执行',
      done: ranOnce,
      doneHint: '跑起来了'
    },
    {
      target: '[data-tour="result"]',
      title: '下面是数据库给你的回答',
      body: '结果永远是一张表：第一行是表头（字段名），从第二行开始每行是一条真实数据。这次返回了 50 行商品。滚一滚看看——你刚刚亲手写的第一条 SQL，把库里的数据取出来了。',
      done: true
    },
    {
      target: '[data-tour="rail"]',
      title: '右边这一栏会告诉你「为什么」',
      body: '以后每一关，右边都会用大白话解释这一关在教什么、为什么要这么写、新手常错在哪。卡住的时候还有分步提示（方向 → 结构 → 参考写法），从浅到深。',
      done: true
    },
    {
      title: '记住这三件事，剩下的都是变体',
      body:
        '① 要什么（SELECT）② 从哪张表拿（FROM）③ 有什么条件（WHERE）。\n\n19 关里所有的题，都是在这三句话上不断加东西：加条件、加分组、加排序、把两张表接起来。你现在会写第一句了。',
      finishText: '开始第 1 关',
      done: true
    }
  ]

  const onAction = (step) => {
    if (step.title.includes('SELECT')) return setText('SELECT ')
    if (step.title.includes('FROM')) return setText('SELECT * FROM products')
    if (step.title.includes('执行')) return run()
    if (step.actionText?.includes('products')) return setOpenTable('products')
  }

  return (
    <div className="page">
      <div className="crumb">
        <span>
          <b>入职第一课</b>
        </span>
        <span className="dim">
          · 左边亮起来的地方就是要操作的地方；没做完这一步，下一步不会放你过去
        </span>
      </div>

      <div className="client" style={{ height: 'calc(100vh - 150px)' }}>
        <div className="col" data-tour="tree">
          <div className="col-head">数据表</div>
          <div className="col-scroll">
            <ObjectTree
              only={TABLE_NAMES}
              openTable={openTable}
              onToggle={(n) => setOpenTable(openTable === n ? null : n)}
              onPick={(c) => setText((t) => (t ? t.replace(/\s*;?\s*$/, '') + ' ' : '') + c)}
            />
          </div>
        </div>

        <div className="col">
          <div data-tour="editorzone">
            <div className="tabbar">
              <span className="qtab">查询 1</span>
              <div className="grow" />
              <span className="dim" style={{ fontSize: 12 }}>
                Ctrl + Enter 也能执行
              </span>
              <button className="btn primary sm" onClick={run} data-tour="run">
                <IconPlay width={12} height={12} />
                执行
              </button>
            </div>
            <div className="editor-wrap">
              <CodeMirror
                value={text}
                height="170px"
                theme="dark"
                extensions={extensions}
                onChange={setText}
                basicSetup={{ foldGutter: false }}
              />
            </div>
          </div>

          <div className="bottom" data-tour="result">
            <div className="subtabs">
              <button className="on">结果</button>
            </div>
            <div className="bottom-body">
              {err && (
                <div className="feedback bad">
                  <div>
                    <div className="h">{err.title}</div>
                    <div className="b">{err.detail}</div>
                  </div>
                </div>
              )}
              {!err && <ResultTable result={result} maxRows={60} />}
            </div>
          </div>
          <div className="statusbar">
            <span>SQLite</span>
            <span>ecommerce.db</span>
            <span style={{ color: result ? 'var(--ok)' : undefined }}>
              {result ? `查询成功 · ${result.rows.length} 行 · ${ms} ms` : '就绪'}
            </span>
          </div>
        </div>

        <div className="col rail-col" data-tour="rail">
          <div className="col-head">你正在掌握</div>
          <div className="rail">
            <div className="teach" style={{ marginTop: 0 }}>
              <h4>为什么要用 SQL</h4>
              <p>
                公司的数据都在数据库里，你没办法用眼睛一行行翻。SQL 就是你跟数据库说话的方式：一句 SQL
                问一个问题，它就还你一张表。
              </p>
            </div>
            <div className="teach">
              <h4>这一课的四个动作</h4>
              <div className="checklist">
                {[
                  ['展开左边的表，知道数据在哪', openTable === 'products'],
                  ['亲手写第一个词 SELECT', wroteSelect],
                  ['补上 FROM products', wroteProducts],
                  ['点执行，看到结果', ranOnce]
                ].map(([label, ok]) => (
                  <div className={'check-row' + (ok ? ' ok' : '')} key={label}>
                    <span className="box">{ok ? <IconCheck width={11} height={11} /> : null}</span>
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Tour steps={steps} onAction={onAction} onClear={() => setText('')} onFinish={onDone} onSkip={onSkip} />
    </div>
  )
}
