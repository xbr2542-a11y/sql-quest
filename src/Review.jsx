import React from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { sql as sqlLang, SQLite } from '@codemirror/lang-sql'
import { runQuery } from './db.js'
import { judge, diagnose } from './judge.js'
import { translateError, noResultHint } from './errors.js'
import { CM_SCHEMA } from './schema.js'
import { BASIC_BLOCKS, lintSql, literalsOf } from './sqlMeta.js'
import { analyzeSyntax } from './syntax.js'
import { hintsOf } from './hints.js'
import { sqlPainter, rangesFromFindings } from './cmExtras.js'
import { ColorLegend, HintList, ObjectTree, ResultTable, RichText, SchemaCard, ValueChips } from './ui.jsx'
import { IconArrowLeft, IconCheck, IconPlay, IconWarn } from './icons.jsx'

const extensions = [sqlLang({ dialect: SQLite, schema: CM_SCHEMA, upperCaseKeywords: true })]

/**
 * 周会复盘：把之前做错的关卡换个场景再问一遍。
 * 提示直接沿用原关卡的三段提示——知识点是同一个，只是场景变了。
 */
export default function Review({ db, queue, onPass, onFinish, onExit }) {
  const [i, setI] = React.useState(0)
  const [text, setText] = React.useState('')
  const [status, setStatus] = React.useState(null)
  const [reasons, setReasons] = React.useState([])
  const [actual, setActual] = React.useState(null)
  const [expected, setExpected] = React.useState(null)
  const [diffs, setDiffs] = React.useState(null)
  const [tab, setTab] = React.useState('mine')
  const [attempts, setAttempts] = React.useState(0)
  const [hintsUsed, setHintsUsed] = React.useState(0)
  const [lint, setLint] = React.useState([])
  const [errRanges, setErrRanges] = React.useState([])
  const [done, setDone] = React.useState([]) // 已通过的题号
  const [openTable, setOpenTable] = React.useState(null)
  const [sample, setSample] = React.useState(null)
  const [ms, setMs] = React.useState(null)

  const item = queue[i]
  const level = item?.level
  const variant = item?.variant
  const last = i >= queue.length - 1
  const values = React.useMemo(() => (variant ? literalsOf(variant.referenceSql) : []), [variant])
  const cmExt = React.useMemo(() => [...extensions, sqlPainter(errRanges)], [errRanges])

  React.useEffect(() => {
    setText('')
    setStatus(null)
    setReasons([])
    setActual(null)
    setExpected(null)
    setDiffs(null)
    setTab('mine')
    setAttempts(0)
    setHintsUsed(0)
    setLint([])
    setErrRanges([])
    setSample(null)
    setOpenTable(variant?.tables?.[0] || null)
  }, [i])

  React.useEffect(() => {
    const t = setTimeout(() => {
      const syn = analyzeSyntax(text).map((f) => ({ kind: 'warn', msg: `${f.title}｜${f.detail.split('\n')[0]}` }))
      setLint([...syn, ...lintSql(text, variant)].slice(0, 3))
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
    if (!db || !variant) return
    setAttempts((n) => n + 1)
    const t0 = performance.now()
    let mine
    try {
      mine = runQuery(db, text)
    } catch (e) {
      setMs(Math.round(performance.now() - t0))
      setActual(null)
      const findings = analyzeSyntax(text)
      setErrRanges(rangesFromFindings(text, findings))
      const info =
        e.code === 'EMPTY'
          ? { title: '还没有写 SQL', detail: '在编辑器里写一条查询语句，再点「执行」或按 Ctrl + Enter。' }
          : e.code === 'NO_RESULT'
            ? noResultHint(text)
            : findings.length
              ? { title: '这句话有几个地方要改', detail: '', findings }
              : translateError(e.message, text)
      setStatus({ type: 'bad', ...info })
      setReasons(diagnose(text, variant))
      return
    }
    setMs(Math.round(performance.now() - t0))
    const exp = runQuery(db, variant.referenceSql)
    setActual(mine)
    setExpected(exp)
    const v = judge(exp, mine, variant, text)
    if (v.pass) {
      setErrRanges([])
      setStatus({ type: 'ok', title: '这道过了', detail: '同一类问题换个场景也能做对，说明是真的会了。' })
      setReasons([])
      setDone((d) => [...new Set([...d, i])])
      onPass(item)
    } else {
      setErrRanges([])
      setStatus({ type: 'bad', title: '还不对', detail: v.reason, tip: v.tip })
      setReasons(diagnose(text, variant))
      setDiffs({ missing: v.missingRows, extra: v.extraRows, expected: exp, actual: mine })
      setTab(v.missingRows || v.extraRows ? 'diff' : 'mine')
    }
  }

  const insert = (s) => setText((t) => (t ? t.replace(/\s*;?\s*$/, '') + ' ' : '') + s)

  if (!item) return null

  return (
    <div className="page">
      <div className="crumb">
        <button className="btn ghost sm" onClick={onExit}>
          <IconArrowLeft width={14} height={14} />
          退出复盘
        </button>
        <span>
          周会复盘 · 第 <b>{i + 1}</b> / {queue.length} 道
        </span>
        <span className="dim">· 这些是你之前做错的知识点，换了个业务场景再问一遍</span>
        <div className="grow" />
        <span className="tag brand">来自第 {item.levelId} 关</span>
      </div>

      <div className="client" style={{ height: 'calc(100vh - 150px)' }}>
        <div className="col">
          <div className="col-head">这道题要用到的表</div>
          <div className="col-scroll" style={{ padding: 12 }}>
            <ObjectTree
              only={variant.tables}
              openTable={openTable}
              onToggle={(n) => setOpenTable(openTable === n ? null : n)}
              onPick={insert}
            />
            {values.length > 0 && (
              <>
                <div className="muted" style={{ fontSize: 12.5, marginTop: 12 }}>
                  可能用到的值（点一下插入，连引号一起给）：
                </div>
                <ValueChips values={values} onPick={insert} />
              </>
            )}
          </div>
        </div>

        <div className="col">
          <div className="tabbar">
            <span className="qtab">复盘 {i + 1}</span>
            <div className="grow" />
            <span className="dim" style={{ fontSize: 12 }}>
              {attempts > 0 ? `已尝试 ${attempts} 次` : ''}
            </span>
            <button className="btn ghost sm" onClick={() => setText('')}>
              清空
            </button>
            <button className="btn primary sm" onClick={run} data-testid="review-run">
              <IconPlay width={12} height={12} />
              执行
            </button>
          </div>
          {level.id <= 6 && (
            <div className="blocks">
              {BASIC_BLOCKS.map((b) => (
                <button key={b.label} className="blk" onClick={() => insert(b.insert)} title={b.why}>
                  {b.label}
                </button>
              ))}
            </div>
          )}
          <div className="editor-wrap">
            <CodeMirror
              value={text}
              height="160px"
              theme="dark"
              extensions={cmExt}
              onChange={setText}
              basicSetup={{ foldGutter: false }}
            />
          </div>
          <ColorLegend />

          {!text.trim() && (
            <div className="empty-note">
              <b>还是自己写，没有模板。</b>
              这题和第 {item.levelId} 关考的是同一个知识点，只是换了场景——左边那栏能看到表和值。
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
              {(diffs?.missing?.length > 0 || diffs?.extra?.length > 0) && (
                <button className={tab === 'diff' ? 'on' : ''} onClick={() => setTab('diff')}>
                  差异分析
                </button>
              )}
              <button className={tab === 'schema' ? 'on' : ''} onClick={() => setTab('schema')}>
                表结构
              </button>
            </div>
            <div className="bottom-body">
              {tab !== 'diff' && tab !== 'schema' && status && (
                <div className={`feedback ${status.type}`}>
                  <span className="ic">{status.type === 'ok' ? <IconCheck /> : <IconWarn />}</span>
                  <div style={{ minWidth: 0 }}>
                    <div className="h">{status.title}</div>
                    <div className="b">{status.detail}</div>
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
                              {!f.where && !f.why && !f.how && <RichText text={f.detail} />}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {reasons.length > 0 && (
                      <div className="reasons">
                        <div className="rt">可能的原因，挨个检查一下：</div>
                        {reasons.map((r) => (
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
                  <SchemaCard
                    names={variant.tables}
                    onPick={insert}
                    onPreview={(t) => {
                      try {
                        setSample(runQuery(db, `SELECT * FROM ${t} LIMIT 3`))
                      } catch {
                        setSample(null)
                      }
                    }}
                  />
                  {sample && <ResultTable result={sample} maxRows={3} />}
                </div>
              )}
              {tab === 'diff' && diffs && (
                <div>
                  {diffs.missing?.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <div className="muted" style={{ fontSize: 12.5, marginBottom: 6 }}>
                        少了这些行
                      </div>
                      <ResultTable result={{ columns: diffs.expected.columns, rows: diffs.missing }} maxRows={30} />
                    </div>
                  )}
                  {diffs.extra?.length > 0 && (
                    <div>
                      <div className="muted" style={{ fontSize: 12.5, marginBottom: 6 }}>
                        多了这些行
                      </div>
                      <ResultTable result={{ columns: diffs.actual.columns, rows: diffs.extra }} maxRows={30} />
                    </div>
                  )}
                  {!diffs.missing?.length && !diffs.extra?.length && <div className="muted">差异在列或顺序上，再对一遍要求。</div>}
                </div>
              )}
            </div>
          </div>
          <div className="statusbar">
            <span>SQLite</span>
            <span>复盘模式</span>
            <span style={{ color: status?.type === 'ok' ? 'var(--ok)' : undefined }}>
              {actual ? `查询成功 · ${actual.rows.length} 行 · ${ms} ms` : '就绪'}
            </span>
            <div className="grow" />
            <span>Ctrl + Enter 执行</span>
          </div>
        </div>

        <div className="col rail-col">
          <div className="col-head">本次复盘</div>
          <div className="rail">
            <h3>{variant.title}</h3>
            <div className="story">{variant.story}</div>
            <div className="req">
              <b>要求：</b>
              {variant.task}
            </div>

            <div className="teach">
              <h4>进度</h4>
              {queue.map((q, k) => {
                const ok = done.includes(k)
                const now = k === i
                return (
                  <div className={'check-row' + (ok ? ' ok' : '')} key={q.levelId}>
                    <span className="box">{ok ? <IconCheck width={11} height={11} /> : null}</span>
                    <span style={{ color: now ? 'var(--text)' : undefined }}>
                      第 {q.levelId} 关的变体{now && !ok ? '（正在做）' : ''}
                    </span>
                  </div>
                )
              })}
            </div>

            <div className="teach">
              <h4>想不起来？看第 {item.levelId} 关的提示</h4>
              <div className="muted" style={{ fontSize: 12.5, marginBottom: 8 }}>
                考的是同一个知识点，所以原来的提示照样管用。
              </div>
              <HintList hints={hintsOf(item.levelId)} used={hintsUsed} onUse={setHintsUsed} onInsert={setText} />
            </div>

            {status?.type === 'ok' && (
              <button
                className="btn primary"
                style={{ width: '100%', marginTop: 6 }}
                data-testid="review-next"
                onClick={() => (last ? onFinish() : setI(i + 1))}
              >
                {last ? '完成本次复盘' : '下一道 →'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
