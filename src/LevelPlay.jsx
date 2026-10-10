import React from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { sql as sqlLang, SQLite } from '@codemirror/lang-sql'
import { runQuery } from './db.js'
import { judge, diagnose } from './judge.js'
import { translateError, noResultHint } from './errors.js'
import { CM_SCHEMA } from './schema.js'
import { PLAIN } from './explanations.js'
import { STORY } from './story.js'
import { BASIC_BLOCKS, lintSql, literalsOf } from './sqlMeta.js'
import { thinkingSteps } from './why.js'
import { analyzeSyntax, syntaxTips } from './syntax.js'
import { symbolsForLevel, primarySymbol } from './symbols.js'
import { ALTERNATIVES } from './alternatives.js'
import { ObjectTree, ResultTable, SchemaCard, SqlText, Stars, SyntaxNotes, ValueChips } from './ui.jsx'
import { rankOf, starsFor, rewardFor } from './progress.js'
import { IconArrowLeft, IconBulb, IconCheck, IconChevron, IconPlay, IconSpark, IconWarn } from './icons.jsx'

const extensions = [sqlLang({ dialect: SQLite, schema: CM_SCHEMA, upperCaseKeywords: true })]

function useCountUp(target, run, ms = 700) {
  const [v, setV] = React.useState(target)
  React.useEffect(() => {
    if (!run) {
      setV(target)
      return
    }
    let raf
    const t0 = performance.now()
    const from = Math.round(target * 0.72)
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / ms)
      const e = 1 - Math.pow(1 - k, 3)
      setV(Math.round(from + (target - from) * e))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, run, ms])
  return v
}

/** 右栏的分区：默认只展开一两个，其余收起成一行，避免密密麻麻 */
function Section({ title, icon, right, defaultOpen = false, children, testid, accent }) {
  const [open, setOpen] = React.useState(defaultOpen)
  return (
    <div className={'acc' + (open ? ' open' : '') + (accent ? ' accent' : '')} data-testid={testid}>
      <button className="acc-head" onClick={() => setOpen(!open)}>
        {icon}
        <span className="acc-title">{title}</span>
        <div className="grow" />
        {right}
        <IconChevron width={13} height={13} className={'acc-caret' + (open ? ' open' : '')} />
      </button>
      {open && <div className="acc-body">{children}</div>}
    </div>
  )
}

export default function LevelPlay({ db, level, progress, onFinish, onWrong, onBack, onTutorial, toast }) {
  // 编辑器永远是空的：自己写出来的才算学会，不给可以照着改的模板
  const [text, setText] = React.useState('')
  const [attempts, setAttempts] = React.useState(0)
  const [hintsUsed, setHintsUsed] = React.useState(0)
  const [status, setStatus] = React.useState(null)
  const [reasons, setReasons] = React.useState([])
  const [actual, setActual] = React.useState(null)
  const [expected, setExpected] = React.useState(null)
  const [diffs, setDiffs] = React.useState(null)
  const [tab, setTab] = React.useState('mine')
  const [receipt, setReceipt] = React.useState(null)
  const [ms, setMs] = React.useState(null)
  const [openTable, setOpenTable] = React.useState(level.tables[0])
  const [lint, setLint] = React.useState([])
  const [passed, setPassed] = React.useState(!!progress.stars[level.id])
  const [openWhy, setOpenWhy] = React.useState(0)
  const [sample, setSample] = React.useState(null)
  const [sampleTable, setSampleTable] = React.useState(null)

  const expRef = React.useRef(null)
  const wrongLogged = React.useRef(false)
  const story = STORY[level.id]
  const steps = React.useMemo(() => thinkingSteps(level.referenceSql), [level.id])
  const values = React.useMemo(() => literalsOf(level.referenceSql), [level.id])
  const alts = ALTERNATIVES[level.id] || []
  const tips = React.useMemo(() => syntaxTips(level.referenceSql), [level.id])
  const syms = React.useMemo(() => symbolsForLevel(level.referenceSql), [level.id])
  const mainSym = React.useMemo(() => primarySymbol(level.referenceSql), [level.id])

  React.useEffect(() => {
    setText('')
    setAttempts(0)
    setHintsUsed(0)
    setStatus(null)
    setReasons([])
    setActual(null)
    setExpected(null)
    setDiffs(null)
    setReceipt(null)
    setTab('mine')
    setMs(null)
    setOpenTable(level.tables[0])
    setLint([])
    setPassed(!!progress.stars[level.id])
    setOpenWhy(0)
    setSample(null)
    setSampleTable(null)
    expRef.current = null
    wrongLogged.current = false
  }, [level.id])

  // 答错就进错题盒（一次会话只记一次，避免重试把次数刷高）
  const logWrongOnce = () => {
    if (wrongLogged.current) return
    wrongLogged.current = true
    onWrong?.(level.id)
  }

  const run = () => {
    if (!db) return
    const n = attempts + 1
    setAttempts(n)
    const t0 = performance.now()
    let mine
    try {
      mine = runQuery(db, text)
    } catch (e) {
      setMs(Math.round(performance.now() - t0))
      setActual(null)
      const findings = analyzeSyntax(text)
      const info =
        e.code === 'EMPTY'
          ? { title: '还没有写 SQL', detail: '在编辑器里写一条查询语句，再点「执行」或按 Ctrl + Enter。' }
          : e.code === 'NO_RESULT'
            ? noResultHint(text)
            : findings.length
              ? { title: '这句话有几个地方要改', detail: '', findings }
              : translateError(e.message, text)
      setStatus({ type: 'bad', ...info })
      setReasons(diagnose(text, level))
      setTab('mine')
      logWrongOnce()
      return
    }
    setMs(Math.round(performance.now() - t0))
    if (!expRef.current) expRef.current = runQuery(db, level.referenceSql)
    const exp = expRef.current
    setActual(mine)
    setExpected(exp)
    const v = judge(exp, mine, level, text)

    if (v.pass) {
      const stars = starsFor(n, hintsUsed)
      const bonus = rewardFor(stars)
      setPassed(true)
      setStatus({ type: 'ok', title: '通过', detail: '结果和参考答案完全一致，任务完成。' })
      setReasons([])
      const before = rankOf(progress)
      const first = !progress.stars[level.id]
      const nextProgress = {
        ...progress,
        stars: { ...progress.stars, [level.id]: Math.max(progress.stars[level.id] || 0, stars) },
        bonus: progress.bonus + (first ? bonus : 0)
      }
      const after = rankOf(nextProgress)
      setReceipt({
        stars,
        bonus: first ? bonus : 0,
        promoted: after.index > before.index,
        from: before.rank,
        to: after.rank,
        done: after.done,
        next: after.next,
        impact: story?.impact
      })
      onFinish(level, stars, first ? bonus : 0)
    } else {
      setStatus({ type: 'bad', title: '结果还不对', detail: v.reason, tip: v.tip })
      setReasons(diagnose(text, level))
      setDiffs({ missing: v.missingRows, extra: v.extraRows, expected: exp, actual: mine })
      setTab(v.missingRows || v.extraRows ? 'diff' : 'mine')
      logWrongOnce()
    }
  }

  // Ctrl / Cmd + Enter 无论光标在哪都能执行
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

  // 一边写一边体检：先说他自己写错的地方，再补充还缺什么
  React.useEffect(() => {
    const t = setTimeout(() => {
      const syn = analyzeSyntax(text).map((f) => ({ kind: 'warn', msg: `${f.title}｜${f.detail.split('\n')[0]}` }))
      setLint([...syn, ...lintSql(text, level)].slice(0, 3))
    }, 320)
    return () => clearTimeout(t)
  }, [text, level.id])

  const preview = (tableName) => {
    try {
      setSample(runQuery(db, `SELECT * FROM ${tableName} LIMIT 3`))
      setSampleTable(tableName)
    } catch {
      setSample(null)
    }
    setTab('schema')
  }

  const insert = (s) => setText((t) => (t ? t.replace(/\s*;?\s*$/, '') + ' ' : '') + s)

  const feedback = status && (
    <div className={`feedback ${status.type === 'ok' ? 'ok' : 'bad'}`}>
      <span className="ic">{status.type === 'ok' ? <IconCheck /> : <IconWarn />}</span>
      <div style={{ minWidth: 0 }}>
        <div className="h">{status.title}</div>
        <div className="b">{status.detail}</div>
        {status.tip && <div className="tp">{status.tip}</div>}
        {status.findings?.length > 0 && (
          <div className="findings">
            {status.findings.map((f, i) => (
              <div className="finding" key={i}>
                <div className="ft">
                  {i + 1}. {f.title}
                </div>
                <div className="fd">
                  <SqlText text={f.detail} />
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
  )

  const hintRows = [
    { label: '方向提示', text: level.hints[0] },
    { label: '结构提示', text: level.hints[1] },
    { label: '参考写法', text: level.hints[2] }
  ]

  return (
    <div className="page">
      <div className="crumb">
        <button className="btn ghost sm" onClick={() => onBack()}>
          <IconArrowLeft width={14} height={14} />
          返回地图
        </button>
        <span>
          第 <b>{level.id}</b> 关 · {level.title}
        </span>
        <span className="dim">·</span>
        <span className="dim">{level.track === 'work' ? '业务线' : '基础线'}</span>
        <div className="grow" />
        {onTutorial && (
          <button className="btn ghost sm" onClick={onTutorial} title="重看一遍新手引导">
            新手引导
          </button>
        )}
      </div>

      <div className="client">
        {/* 左：对象树 */}
        <div className="col">
          <div className="col-head">数据表</div>
          <div className="col-scroll">
            <ObjectTree
              only={level.tables}
              openTable={openTable}
              onToggle={(n) => setOpenTable(openTable === n ? null : n)}
              onPick={insert}
            />
          </div>
        </div>

        {/* 中：编辑器 + 结果 */}
        <div className="col">
          <div className="tabbar">
            <span className="qtab">查询 1</span>
            <div className="grow" />
            <span className="dim" style={{ fontSize: 12 }}>
              {attempts > 0 ? `已尝试 ${attempts} 次` : ''} {hintsUsed > 0 ? `· 用了 ${hintsUsed} 条提示` : ''}
            </span>
            <button className="btn ghost sm" onClick={() => setText('')}>
              清空
            </button>
            <button className="btn primary sm" onClick={run} data-testid="run">
              <IconPlay width={12} height={12} />
              执行
            </button>
          </div>
          {level.id <= 6 && (
            <div className="blocks" title="只给你最基础的几个关键字。写完 SELECT 之后要填什么，仍然得自己想。">
              {BASIC_BLOCKS.map((b) => (
                <button key={b.label} className="blk" onClick={() => insert(b.insert)} title={b.why}>
                  {b.label}
                </button>
              ))}
              <span className="dim" style={{ fontSize: 11.5, flex: 'none', alignSelf: 'center' }}>
                只给关键字，不给整句话 —— 从第 7 关起这排按钮会消失
              </span>
            </div>
          )}
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

          {!text.trim() && (
            <div className="empty-note">
              <b>编辑器是空的，这是故意的，三步就能开始：</b>
              <div style={{ marginTop: 4 }}>
                ① 用鼠标在中间这块深色区域点一下（点完会有一根闪的竖线，那就是光标）
              </div>
              <div>② 照右边「怎么想出来」的问题一个一个写，想到什么写什么</div>
              <div>③ 写完点右上角蓝色的「执行」，或按 Ctrl + Enter</div>
              {values.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <span className="muted">这一关要用到的值（点一下就插进去，连英文单引号一起给）：</span>
                  <ValueChips values={values} onPick={insert} />
                </div>
              )}
              {mainSym && (
                <div className="sym-callout" data-testid="symbol-callout">
                  <span className="sym-char" onClick={() => insert(mainSym.char)} title="点一下插进编辑器">
                    {mainSym.char}
                  </span>
                  <div className="sym-text">
                    <b>{mainSym.name}</b>：{mainSym.what}
                    {mainSym.char === '*' && (
                      <div className="sym-warn">
                        ⚠️ 只有「全部列都要」才写它。只要其中几列，就把列名写出来、中间用英文逗号隔开——写了星号会把整张表的列全要回来，判定会说你列数不对。
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          {lint.length > 0 && (
            <div className="lintbar" data-testid="lint">
              {lint.map((l, i) => (
                <div key={i} className={`lint ${l.kind}`}>
                  <span>{l.kind === 'warn' ? '⚠️' : '🔎'}</span>
                  <span>{l.msg}</span>
                </div>
              ))}
            </div>
          )}
          {attempts === 0 && !status && lint.length === 0 && !!text.trim() && (
            <div className="reassure">随便试。写错不扣钱、不会锁关，星星只看你有没有用提示、试了几次。</div>
          )}

          <div className="bottom">
            <div className="subtabs">
              <button className={tab === 'mine' ? 'on' : ''} onClick={() => setTab('mine')}>
                我的结果
              </button>
              <button className={tab === 'expect' ? 'on' : ''} onClick={() => setTab('expect')} disabled={!expected}>
                参考答案
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
              {tab !== 'diff' && tab !== 'schema' && feedback}
              {tab === 'mine' && <ResultTable result={actual} />}
              {tab === 'expect' && <ResultTable result={expected} />}
              {tab === 'schema' && (
                <div>
                  <SchemaCard names={level.tables} onPick={insert} onPreview={preview} />
                  {sample && (
                    <div style={{ marginTop: 12 }}>
                      <div className="muted" style={{ fontSize: 12.5, marginBottom: 6 }}>
                        {sampleTable} 的前 3 行数据
                      </div>
                      <ResultTable result={sample} maxRows={3} />
                    </div>
                  )}
                </div>
              )}
              {tab === 'diff' && diffs && (
                <div>
                  {feedback}
                  {diffs.missing?.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <div className="muted" style={{ fontSize: 12.5, marginBottom: 6 }}>
                        少了这些行（参考答案里有，你没有）
                      </div>
                      <ResultTable result={{ columns: diffs.expected.columns, rows: diffs.missing }} maxRows={40} />
                    </div>
                  )}
                  {diffs.extra?.length > 0 && (
                    <div>
                      <div className="muted" style={{ fontSize: 12.5, marginBottom: 6 }}>
                        多了这些行（你有，参考答案里没有）
                      </div>
                      <ResultTable result={{ columns: diffs.actual.columns, rows: diffs.extra }} maxRows={40} />
                    </div>
                  )}
                  {!diffs.missing?.length && !diffs.extra?.length && <div className="muted">差异在列或顺序上，点开「参考答案」对一下。</div>}
                </div>
              )}
            </div>
          </div>

          <div className="statusbar">
            <span>SQLite</span>
            <span>ecommerce.db</span>
            <span style={{ color: status?.type === 'ok' ? 'var(--ok)' : undefined }}>
              {actual ? `查询成功 · ${actual.rows.length} 行 · ${ms} ms` : '就绪'}
            </span>
            <div className="grow" />
            <span>Ctrl + Enter 执行</span>
          </div>
        </div>

        {/* 右：任务与教学 */}
        <div className="col rail-col">
          <div className="col-head">
            今日需求
            <div className="grow" />
            <span className="tag brand">{level.point}</span>
          </div>
          <div className="rail">
            <h3>{level.title}</h3>

            <Section title="任务要求" icon={<IconBulb width={14} height={14} />} defaultOpen>
              {story && (
                <div className="chat">
                  <span className="av">{story.avatar}</span>
                  <div className="bubble">
                    <div className="who">{story.who}</div>
                    {story.ask}
                  </div>
                </div>
              )}
              <div className="story">{level.story}</div>
              <div className="req">
                <b>要求：</b>
                {level.task}
              </div>
              {tips.length > 0 && (
                <div className="tips" data-testid="syntax-tips">
                  <div className="tips-h">这一关的语法要点（先说规则，再自己写）</div>
                  {tips.map((t) => (
                    <div className="tip-row" key={t}>
                      · <SqlText text={t} />
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section
              title={`怎么想出来 · ${steps.length} 个问题`}
              icon={<IconSpark width={14} height={14} />}
              defaultOpen={level.id <= 4}
              testid="why"
            >
              <div className="muted" style={{ fontSize: 12.5, marginBottom: 8 }}>
                先别管格式。写 SQL 就是回答几个问题，答完一句，SQL 自己就长出来了。
              </div>
              {steps.map((s, i) => (
                <div className={`why-step ${openWhy === i ? 'open' : ''}`} key={s.clause}>
                  <button className="why-head" onClick={() => setOpenWhy(openWhy === i ? -1 : i)}>
                    <span className="why-num">{i + 1}</span>
                    <span>{s.q}</span>
                    <div className="grow" />
                    <code className="inline-kw">{s.clause}</code>
                  </button>
                  {openWhy === i && (
                    <div className="why-body">
                      <span className="lbl">这一步在做什么</span>
                      <SqlText text={s.what} />
                      <span className="lbl">为什么必须有它</span>
                      <SqlText text={s.why} />
                      {s.branches && (
                        <div className="why-branches">
                          {s.branches.map((b) => (
                            <div
                              className="branch"
                              key={b.cond}
                              onClick={() => insert(b.code)}
                              title="点一下放进编辑器（记得把中文说明换成真实内容）"
                            >
                              <span className="bcond">{b.cond}</span>
                              <code>{b.code}</code>
                            </div>
                          ))}
                        </div>
                      )}
                      {s.choiceNote && (
                        <div className={'choice-note ' + s.choiceNote.kind}>
                          <b>这一关呢？</b>
                          <SqlText text={s.choiceNote.text} />
                        </div>
                      )}
                      {s.trap && <div className="trap">⚠️ {s.trap}</div>}
                    </div>
                  )}
                </div>
              ))}
              <div className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>
                想清楚每一步该写什么之后，直接在左边编辑器里写。真想不出来，就打开下面「卡住了？点这里给提示」，从方向提示开始给。
              </div>
            </Section>

            <Section
              title="这关要用到的表和值"
              icon={<IconBulb width={14} height={14} />}
              right={<span className="dim" style={{ fontSize: 11.5 }}>{level.tables.join(' / ')}</span>}
              testid="schema"
            >
              <div className="muted" style={{ fontSize: 12.5, marginBottom: 8 }}>
                字段名可以直接点，会插进编辑器。
              </div>
              <SchemaCard names={level.tables} onPick={insert} onPreview={preview} />
              {values.length > 0 && (
                <>
                  <div className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>
                    这一关要用到的值（点一下就插进去，连英文单引号一起给）：
                  </div>
                  <ValueChips values={values} onPick={insert} />
                </>
              )}
            </Section>

            <Section
              title="这关在教什么"
              icon={<IconBulb width={14} height={14} />}
              right={<span className="tag">{level.point}</span>}
              testid="teach"
            >
              <p style={{ margin: 0 }}>
                <SqlText text={PLAIN[level.id]} />
              </p>
              {level.sample && (
                <>
                  <div className="muted" style={{ fontSize: 12.5, margin: '12px 0 4px' }}>
                    把示例拆开看：
                  </div>
                  <SyntaxNotes sql={level.sample.replace(/;$/, '')} />
                </>
              )}
            </Section>

            <Section
              title="这些符号是什么意思"
              icon={<IconBulb width={14} height={14} />}
              right={<span className="dim" style={{ fontSize: 11.5 }}>{syms.length} 个</span>}
              testid="symbols"
              defaultOpen={level.id <= 2}
            >
              <div className="muted" style={{ fontSize: 12.5, marginBottom: 8 }}>
                SQL 里这些特殊字符都是固定的意思，点一下可以直接插进编辑器。
              </div>
              {syms.map((s) => (
                <div className="sym-row" key={s.char}>
                  <span className="sym-char" onClick={() => insert(s.char)} title="点一下插进编辑器">
                    {s.char}
                  </span>
                  <div className="sym-body">
                    <div className="sym-name">{s.name}</div>
                    <div className="sym-line">{s.what}</div>
                    <div className="sym-line ok">
                      <b>什么时候写：</b>
                      <SqlText text={s.when} />
                    </div>
                    <div className="sym-line no">
                      <b>什么时候不写：</b>
                      <SqlText text={s.whenNot} />
                    </div>
                    <div className="sym-code" onClick={() => setText(s.ex.code)} title="点一下放进编辑器">
                      {s.ex.code}
                    </div>
                    <div className="sym-note">{s.ex.note}</div>
                  </div>
                </div>
              ))}
              <div className="sym-foot">
                另外两个新手常担心的点：<b>大小写不重要</b>，SELECT 和 select 是一个意思；<b>句子末尾的分号 ; 可写可不写</b>，写了更规范，不写也能跑。
              </div>
            </Section>

            <Section
              title="卡住了？点这里给提示"
              icon={<IconBulb width={14} height={14} />}
              right={
                <span className={'tag ' + (hintsUsed === 0 ? 'gold' : '')}>{3 - hintsUsed} 条未看</span>
              }
              defaultOpen={false}
              testid="hints"
              accent
            >
              <div className="muted" style={{ fontSize: 12.5, marginBottom: 8 }}>
                从浅到深：先给方向，再给结构，最后才是写法。点哪一条就开哪一条——看得越多，星星越少。
              </div>
              {hintRows.map((h, i) => {
                const open = hintsUsed > i
                return (
                  <div className={'hint-row' + (open ? ' open' : '')} key={h.label}>
                    <button className="hint-head" onClick={() => !open && setHintsUsed(i + 1)}>
                      <span className="n">{i + 1}</span>
                      <span>{open ? h.label : `点开看：${h.label}`}</span>
                      <div className="grow" />
                      <span className="dim" style={{ fontSize: 11.5 }}>
                        {open ? '已展开' : '点这里'}
                      </span>
                    </button>
                    {open &&
                      (i === 2 ? (
                        <code className="hint-code" onClick={() => setText(h.text)} title="点一下放进编辑器">
                          {h.text}
                        </code>
                      ) : (
                        <div className="hint-text">
                          <SqlText text={h.text} />
                        </div>
                      ))}
                  </div>
                )
              })}
            </Section>

            <Section title={`其他写法（${alts.length} 种）`} icon={<IconSpark width={14} height={14} />} testid="alts">
              {!passed ? (
                <div className="locked-note">
                  🔒 先自己写出来。通过这一关之后再看别人的写法，你才看得懂「为什么」。
                </div>
              ) : (
                <>
                  <div className="muted" style={{ fontSize: 12.5, marginBottom: 8 }}>
                    同一件事可以有好几种写法。点代码框可以放进编辑器自己跑一遍。
                  </div>
                  {alts.map((a) => (
                    <div className="alt-card" key={a.title}>
                      <div className="hd">
                        <span className="tag brand">{a.title}</span>
                      </div>
                      <div className="code" onClick={() => setText(a.sql)} title="点一下放进编辑器">
                        {a.sql}
                      </div>
                      <div className="why">
                        <b>为什么这么写：</b>
                        {a.why}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </Section>
          </div>
        </div>
      </div>

      {receipt && (
        <ReceiptModal receipt={receipt} level={level} progress={progress} onClose={() => setReceipt(null)} onNext={() => onBack('next')} toast={toast} />
      )}
    </div>
  )
}

function ReceiptModal({ receipt, level, progress, onClose, onNext, toast }) {
  const rank = rankOf(progress).rank
  const stars = receipt.stars
  const grade = stars === 3 ? '优秀' : stars === 2 ? '合格' : '通过'
  const shown = useCountUp(receipt.promoted ? receipt.to.salary : rank.salary, receipt.promoted)
  const nextNeed = receipt.next ? receipt.next.need : null
  const pct = nextNeed ? Math.min(100, Math.round((receipt.done / nextNeed) * 100)) : 100
  const shortBy = nextNeed ? Math.max(0, nextNeed - receipt.done) : 0

  return (
    <div className="mask" onClick={onClose}>
      <div className="receipt" onClick={(e) => e.stopPropagation()} data-testid="receipt">
        <div className="rhead">
          <h3>{receipt.promoted ? '晋 升 通 知' : '绩 效 单'}</h3>
          <div className="co">数据部 · 第 {level.id} 关 · {level.title}</div>
        </div>
        {receipt.promoted && (
          <div className="stamp-holder">
            <span className="stamp">已生效</span>
          </div>
        )}
        <div className="rule" />
        <div className="rline">
          <span className="lb">绩效</span>
          <span className="lead" />
          <span className="vl" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Stars n={stars} size={12} />
            {grade}
          </span>
        </div>
        <div className="rline">
          <span className="lb">奖金</span>
          <span className="lead" />
          <span className="vl">+ ¥{receipt.bonus}</span>
        </div>
        <div className="rline">
          <span className="lb">职级</span>
          <span className="lead" />
          <span className="vl">
            {rank.title} · ¥{rank.salary.toLocaleString()}/月
          </span>
        </div>

        {receipt.promoted ? (
          <>
            <div className="rule" />
            <div className="rline">
              <span className="lb">晋升</span>
              <span className="lead" />
              <span className="vl">
                {receipt.from.title} → {receipt.to.title}
              </span>
            </div>
            <div className="big-salary">
              ¥{shown.toLocaleString()}
              <small> / 月</small>
            </div>
            <div className="sub-cap">
              调薪前 ¥{receipt.from.salary.toLocaleString()} · 涨幅 +
              {Math.round(((receipt.to.salary - receipt.from.salary) / receipt.from.salary) * 100)}%
            </div>
            {nextNeed && (
              <div className="rline">
                <span className="lb">
                  下一站 {receipt.next.title} ¥{receipt.next.salary.toLocaleString()}
                </span>
                <span className="lead" />
                <span className="vl">再 {shortBy} 关</span>
              </div>
            )}
          </>
        ) : (
          nextNeed && (
            <>
              <div className="rule" />
              <div className="rline">
                <span className="lb">
                  距 {receipt.next.title} ¥{receipt.next.salary.toLocaleString()}
                </span>
                <span className="lead" />
                <span className="vl">再 {shortBy} 关</span>
              </div>
              <div className="bar-mini">
                <i style={{ width: `${pct}%` }} />
              </div>
            </>
          )
        )}

        {receipt.impact && (
          <>
            <div className="rule" />
            <div className="impact">
              <div className="ih">这件事的结果</div>
              {receipt.impact}
            </div>
          </>
        )}

        <div className="rule" />
        <div className="quote">
          主管评语：
          {stars === 3
            ? '「一次就给对了，思路很干净，可以带新人了。」'
            : stars === 2
              ? '「能做出来，但细节还要再稳一点。」'
              : '「先跑通最重要，回头把这一关再打一遍。」'}
        </div>
        <div className="acts">
          <button
            className="btn"
            onClick={() => {
              const txt = `【数据部新人】第 ${level.id} 关 · ${level.title}\n绩效 ${'★'.repeat(stars)}  奖金 +¥${receipt.bonus}${
                receipt.promoted ? `\n晋升：${receipt.from.title} → ${receipt.to.title}，月薪 ¥${receipt.to.salary.toLocaleString()}` : ''
              }`
              navigator.clipboard?.writeText(txt)
              toast('工资条已复制，可以发出去炫耀')
            }}
          >
            复制工资条
          </button>
          <button
            className="btn primary"
            onClick={() => {
              onClose()
              onNext()
            }}
          >
            继续下一关
          </button>
        </div>
      </div>
    </div>
  )
}
