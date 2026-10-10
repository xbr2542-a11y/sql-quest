import React from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { sql as sqlLang, SQLite } from '@codemirror/lang-sql'
import { runQuery } from './db.js'
import { judge, diagnose } from './judge.js'
import { translateError, noResultHint } from './errors.js'
import { CM_SCHEMA } from './schema.js'
import { analyzeSyntax } from './syntax.js'
import { symbolsForLevel } from './symbols.js'
import { literalsOf, lintSql } from './sqlMeta.js'
import { lessonsDone } from './progress.js'
import { sqlPainter, rangesFromFindings } from './cmExtras.js'
import {
  ColorLegend,
  HintList,
  ObjectTree,
  ResultTable,
  RichText,
  SchemaCard,
  ValueChips
} from './ui.jsx'
import { IconArrowLeft, IconCheck, IconPlay, IconWarn } from './icons.jsx'

const extensions = [sqlLang({ dialect: SQLite, schema: CM_SCHEMA, upperCaseKeywords: true })]

/**
 * 零基础第一课：一节课一个概念，走完整流程
 * 是什么 → 有什么作用 → 最小示例 → 玩家动手 → 即时反馈 → 简短总结
 */
export default function Lessons({ db, lessons, startId, progress, onDoneLesson, onExit, onAllDone }) {
  const startIndex = Math.max(0, lessons.findIndex((l) => l.id === startId))
  const [i, setI] = React.useState(startIndex)
  const [text, setText] = React.useState('')
  const [status, setStatus] = React.useState(null)
  const [actual, setActual] = React.useState(null)
  const [diffs, setDiffs] = React.useState(null)
  const [hintsUsed, setHintsUsed] = React.useState(0)
  const [lint, setLint] = React.useState([])
  const [errRanges, setErrRanges] = React.useState([])
  const [tab, setTab] = React.useState('mine')
  const [openTable, setOpenTable] = React.useState(null)
  const [sample, setSample] = React.useState(null)
  const [ms, setMs] = React.useState(null)
  const [passed, setPassed] = React.useState(false)

  const lesson = lessons[i]
  const last = i >= lessons.length - 1
  const values = React.useMemo(() => literalsOf(lesson.referenceSql), [lesson.id])
  const syms = React.useMemo(() => symbolsForLevel(lesson.referenceSql), [lesson.id])
  const cmExt = React.useMemo(() => [...extensions, sqlPainter(errRanges)], [errRanges])

  React.useEffect(() => {
    setText('')
    setStatus(null)
    setActual(null)
    setDiffs(null)
    setHintsUsed(0)
    setLint([])
    setErrRanges([])
    setTab('mine')
    setSample(null)
    setPassed(false)
    setOpenTable(lesson.tables?.[0] || null)
  }, [i])

  React.useEffect(() => {
    const t = setTimeout(() => {
      const syn = analyzeSyntax(text).map((f) => ({ kind: 'warn', msg: `${f.title}｜${f.where || ''}` }))
      setLint([...syn, ...lintSql(text, lesson)].slice(0, 3))
    }, 320)
    return () => clearTimeout(t)
  }, [text, i])

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

  const run = () => {
    if (!db) return
    const t0 = performance.now()
    let mine
    try {
      mine = runQuery(db, text)
    } catch (e) {
      setMs(Math.round(performance.now() - t0))
      setActual(null)
      const findings = analyzeSyntax(text)
      setErrRanges(rangesFromFindings(text, findings))
      setStatus({
        type: 'bad',
        ...(e.code === 'EMPTY'
          ? { title: '还没写 SQL', detail: '在中间那块深色区域里写一句，再点执行。' }
          : e.code === 'NO_RESULT'
            ? noResultHint(text)
            : findings.length
              ? { title: '这句话有几个地方要改', detail: '', findings }
              : translateError(e.message, text))
      })
      setTab('mine')
      return
    }
    setMs(Math.round(performance.now() - t0))
    const exp = runQuery(db, lesson.referenceSql)
    setActual(mine)
    const v = judge(exp, mine, lesson, text)
    if (v.pass) {
      setErrRanges([])
      setPassed(true)
      setStatus({ type: 'ok', title: '这一课过了', detail: '自己写出来了，继续下一课。' })
      onDoneLesson(lesson)
    } else {
      setErrRanges([])
      setStatus({ type: 'bad', title: '还不对', detail: v.reason, tip: v.tip })
      setDiffs({ missing: v.missingRows, extra: v.extraRows, expected: exp, actual: mine })
      setTab(v.missingRows || v.extraRows ? 'diff' : 'mine')
    }
  }

  const insert = (s) => setText((t) => (t ? t.replace(/\s*;?\s*$/, '') + ' ' : '') + s)
  const preview = (name) => {
    try {
      setSample(runQuery(db, `SELECT * FROM ${name} LIMIT 3`))
    } catch {
      setSample(null)
    }
    setTab('schema')
  }

  return (
    <div className="page">
      <div className="crumb">
        <button className="btn ghost sm" onClick={onExit}>
          <IconArrowLeft width={14} height={14} />
          退出第一课
        </button>
        <span>
          零基础第一课 · 第 <b>{i + 1}</b> / {lessons.length} 节
        </span>
        <span className="dim">· {lesson.concept}</span>
        <div className="grow" />
        <span className="tag brand">已完成 {lessonsDone(progress)} / {lessons.length}</span>
      </div>

      <div className="client" style={{ height: 'calc(100vh - 150px)' }}>
        {/* 左：本课用到的表与值 */}
        <div className="col">
          <div className="col-head">这一课用到的表</div>
          <div className="col-scroll" style={{ padding: 12 }}>
            <ObjectTree
              only={lesson.tables}
              openTable={openTable}
              onToggle={(n) => setOpenTable(openTable === n ? null : n)}
              onPick={insert}
            />
            {values.length > 0 && (
              <>
                <div className="muted" style={{ fontSize: 12.5, marginTop: 12 }}>
                  可以直接点的值（连引号一起给）：
                </div>
                <ValueChips values={values} onPick={insert} />
              </>
            )}
            {syms.length > 0 && (
              <>
                <div className="muted" style={{ fontSize: 12.5, marginTop: 12 }}>
                  这一课出现的符号：
                </div>
                {syms.map((s) => (
                  <div className="sym-line" key={s.char} style={{ marginTop: 4 }}>
                    <span className="sym-char" style={{ minWidth: 26, height: 26, fontSize: 13 }} onClick={() => insert(s.char)}>
                      {s.char}
                    </span>
                    <span style={{ marginLeft: 8 }}>
                      <b>{s.name}</b>：{s.what}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* 中：编辑器 + 结果 */}
        <div className="col">
          <div className="tabbar">
            <span className="qtab">第 {lesson.id} 课</span>
            <div className="grow" />
            <button className="btn ghost sm" onClick={() => setText('')}>
              清空
            </button>
            <button className="btn primary sm" onClick={run} data-testid="lesson-run">
              <IconPlay width={12} height={12} />
              执行
            </button>
          </div>
          <div className="editor-wrap">
            <CodeMirror value={text} height="150px" theme="dark" extensions={cmExt} onChange={setText} basicSetup={{ foldGutter: false }} />
          </div>
          <ColorLegend />

          {!text.trim() && (
            <div className="empty-note">
              <b>自己写一句话试试。</b>照着右边「最小示例」的样子写，写完点执行——写错不会有惩罚，会告诉你错在哪、怎么改。
            </div>
          )}
          {lint.length > 0 && (
            <div className="lintbar">
              {lint.map((l, k) => (
                <div key={k} className={`lint ${l.kind}`}>
                  <span>{l.kind === 'warn' ? '⚠️' : '🔎'}</span>
                  <span>{l.msg}</span>
                </div>
              ))}
            </div>
          )}

          <div className="bottom">
            <div className="subtabs">
              <button className={tab === 'mine' ? 'on' : ''} onClick={() => setTab('mine')}>
                我的结果
              </button>
              {diffs?.missing?.length > 0 || diffs?.extra?.length > 0 ? (
                <button className={tab === 'diff' ? 'on' : ''} onClick={() => setTab('diff')}>
                  差异分析
                </button>
              ) : null}
              <button className={tab === 'schema' ? 'on' : ''} onClick={() => setTab('schema')}>
                表结构
              </button>
            </div>
            <div className="bottom-body">
              {tab === 'mine' && status && (
                <div className={`feedback ${status.type}`}>
                  <span className="ic">{status.type === 'ok' ? <IconCheck /> : <IconWarn />}</span>
                  <div style={{ minWidth: 0 }}>
                    <div className="h">{status.title}</div>
                    {status.detail && <div className="b">{status.detail}</div>}
                    {status.tip && <div className="tp">{status.tip}</div>}
                    {status.findings?.length > 0 && (
                      <div className="findings">
                        {status.findings.map((f, k) => (
                          <div className="finding" key={k}>
                            <div className="ft">
                              {k + 1}. {f.title}
                            </div>
                            <div className="fd">
                              {f.where && (
                                <div className="frow">
                                  <span className="flbl">哪里错</span>
                                  <span>
                                    <RichText text={f.where} />
                                  </span>
                                </div>
                              )}
                              {f.why && (
                                <div className="frow">
                                  <span className="flbl">为什么</span>
                                  <span>
                                    <RichText text={f.why} />
                                  </span>
                                </div>
                              )}
                              {f.how && (
                                <div className="frow">
                                  <span className="flbl">怎么改</span>
                                  <span>
                                    <RichText text={f.how} />
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {diagnose(text, lesson).length > 0 && status.type === 'bad' && (
                      <div className="reasons">
                        <div className="rt">可能的原因：</div>
                        {diagnose(text, lesson).map((r) => (
                          <div className="ri" key={r}>
                            <span className="rb">→</span>
                            {r}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {tab === 'mine' && <ResultTable result={actual} />}
              {tab === 'schema' && (
                <div>
                  <SchemaCard names={lesson.tables} onPick={insert} onPreview={preview} />
                  {sample && <ResultTable result={sample} maxRows={3} />}
                </div>
              )}
              {tab === 'diff' && diffs && (
                <div>
                  {diffs.missing?.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div className="muted" style={{ fontSize: 12.5, marginBottom: 6 }}>
                        少了这些行
                      </div>
                      <ResultTable result={{ columns: diffs.expected.columns, rows: diffs.missing }} maxRows={20} />
                    </div>
                  )}
                  {diffs.extra?.length > 0 && (
                    <div>
                      <div className="muted" style={{ fontSize: 12.5, marginBottom: 6 }}>
                        多了这些行
                      </div>
                      <ResultTable result={{ columns: diffs.actual.columns, rows: diffs.extra }} maxRows={20} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="statusbar">
            <span>SQLite</span>
            <span>零基础第一课</span>
            <span style={{ color: status?.type === 'ok' ? 'var(--ok)' : undefined }}>
              {actual ? `查询成功 · ${actual.rows.length} 行 · ${ms} ms` : '就绪'}
            </span>
            <div className="grow" />
            <span>Ctrl + Enter 执行</span>
          </div>
        </div>

        {/* 右：教学 + 任务 + 提示 */}
        <div className="col rail-col">
          <div className="col-head">
            第 {lesson.id} 课
            <div className="grow" />
            <span className="tag brand">{lesson.concept}</span>
          </div>
          <div className="rail">
            <h3>{lesson.title}</h3>

            <div className="teach" style={{ marginTop: 0 }}>
              <h4>是什么</h4>
              <p>
                <RichText text={lesson.what} />
              </p>
              <h4 style={{ marginTop: 10 }}>有什么用</h4>
              <p>
                <RichText text={lesson.role} />
              </p>
              <h4 style={{ marginTop: 10 }}>最小示例</h4>
              <div className="muted" style={{ fontSize: 12.5, marginBottom: 4 }}>
                {lesson.demoNote}（点代码可放进编辑器）
              </div>
              <code className="hint-code" onClick={() => setText(lesson.demo)} title="点一下放进编辑器">
                {lesson.demo}
              </code>
            </div>

            <div className="teach">
              <h4>现在轮到你</h4>
              <div className="req">
                <b>任务：</b>
                <RichText text={lesson.task} />
              </div>
            </div>

            <div className="teach">
              <h4>卡住了？点这里给提示</h4>
              <HintList hints={lesson.hints} used={hintsUsed} onUse={setHintsUsed} onInsert={setText} />
            </div>

            {passed && (
              <div className="teach" data-testid="lesson-summary">
                <h4>这一课记住一句话</h4>
                <div className="summary-box">
                  <RichText text={lesson.summary} />
                </div>
                <button
                  className="btn primary"
                  style={{ width: '100%', marginTop: 8 }}
                  data-testid="lesson-next"
                  onClick={() => (last ? onAllDone() : setI(i + 1))}
                >
                  {last ? '第一课全部完成' : '下一课 →'}
                </button>
              </div>
            )}

            <div className="teach">
              <h4>课程进度</h4>
              <div className="checklist">
                {lessons.map((l, k) => {
                  const done = !!progress.lessons?.[l.id]
                  const now = k === i
                  return (
                    <button
                      className={'check-row' + (done ? ' ok' : '')}
                      key={l.id}
                      style={{ background: 'none', border: 0, padding: 0, textAlign: 'left', cursor: 'pointer', width: '100%' }}
                      onClick={() => setI(k)}
                    >
                      <span className="box">{done ? <IconCheck width={11} height={11} /> : null}</span>
                      <span style={{ color: now ? 'var(--text)' : undefined, fontWeight: now ? 600 : 400 }}>
                        {l.title}
                        {now ? '（正在学）' : ''}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
