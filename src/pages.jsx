import React from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { sql as sqlLang, SQLite } from '@codemirror/lang-sql'
import { LEVELS } from './levels.js'
import { CM_SCHEMA, TABLES } from './schema.js'
import { runQuery } from './db.js'
import { translateError, noResultHint } from './errors.js'
import { ObjectTree, ResultTable, Stars } from './ui.jsx'
import { TERMS } from './glossary.js'
import { ADVANCED_COST, completedCount, pendingItems, rankOf, RANKS } from './progress.js'
import { IconPlay, IconSpark } from './icons.jsx'

const extensions = [sqlLang({ dialect: SQLite, schema: CM_SCHEMA, upperCaseKeywords: true })]
const TABLE_NAMES = TABLES.map((t) => t.name)

/* ---------------- 入职页 ---------------- */

export function Intro({ onPick, onTutorial, onLessons, hasProgress, tutorialDone, lessonsCount = 0 }) {
  return (
    <div className="page narrow">
      <div className="hero">
        <h1>
          你是一名新入职的<em>数据分析实习生</em>
        </h1>
        <p>
          这里没有题库，只有需求单。你写真实可运行的 SQL，查询一家电商公司的真实数据库，
          拿到绩效评价和每一次涨薪。从零开始也没关系——先花两分钟看懂这个界面。
        </p>
      </div>

      <div className="course-card" data-testid="course-card">
        <div className="cc-main">
          <div className="cc-tag">零基础从这里开始</div>
          <h3>基础课 · 14 节短课</h3>
          <p>
            从「数据库是什么」讲到 JOIN。每节 1 分钟：先说清楚概念，给一个最小示例，然后你自己写一句——写错会告诉你哪里错、为什么错、怎么改。
          </p>
          <div className="chips">
            <span className="chip">SELECT</span>
            <span className="chip">FROM / WHERE</span>
            <span className="chip">ORDER BY / LIMIT</span>
            <span className="chip">DISTINCT / AS</span>
            <span className="chip">COUNT / SUM</span>
            <span className="chip">GROUP BY / HAVING</span>
            <span className="chip">JOIN</span>
            <span className="chip">NULL</span>
          </div>
        </div>
        <div className="cc-side">
          <button className="btn primary lg" onClick={onLessons}>
            {lessonsCount > 0 ? `继续学习（${lessonsCount}/14）` : '开始第 1 课'}
          </button>
          {!tutorialDone && (
            <button className="btn ghost sm" onClick={onTutorial}>
              先看 1 分钟界面导览
            </button>
          )}
        </div>
      </div>

      <div className="facts">
        <div className="fact">
          <b>9 张</b>
          <span>真实结构的业务表</span>
        </div>
        <div className="fact">
          <b>2500</b>
          <span>条订单数据，可自由查询</span>
        </div>
        <div className="fact">
          <b>19 关</b>
          <span>从看表到退款排查</span>
        </div>
        <div className="fact">
          <b>6 级</b>
          <span>职级与薪资成长</span>
        </div>
      </div>

      <div className="paths">
        <div className="path">
          <div className="who">适合：完全没碰过 SQL</div>
          <h3>我要从零学起</h3>
          <p>先搞懂每条语句是什么意思、跑出来长什么样，再拿去解决业务问题。按 1 → 19 关顺序推进。</p>
          <div className="flow">
            <span className="n">先看懂界面</span>
            <span className="d">→</span>
            <span className="n">知道在写什么</span>
            <span className="d">→</span>
            <span className="n">解决真实需求</span>
          </div>
          <button className="btn primary" onClick={() => onPick('basic')}>
            {hasProgress ? '回到关卡地图' : '从第 1 关开始'}
          </button>
        </div>
        <div className="path">
          <div className="who">适合：需要用 SQL 干活的人</div>
          <h3>我要直接上手干活</h3>
          <p>直接从业务需求单开始。写不出来的时候，每一关右侧都有大白话讲解和三层提示，随时补基础。</p>
          <div className="flow">
            <span className="n">渠道 GMV 看板</span>
            <span className="d">·</span>
            <span className="n">复购率</span>
            <span className="d">·</span>
            <span className="n">退款率排查</span>
          </div>
          <button className="btn" onClick={() => onPick('work')}>
            跳到业务线（第 14 关）
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---------------- 关卡地图 ---------------- */

const GROUPS = [
  { name: '基础线 · 入职适应', from: 1, to: 4, rank: 0, sub: '认识表、选列、按条件筛行' },
  { name: '基础线 · 独立取数', from: 5, to: 8, rank: 1, sub: '模糊匹配、空值陷阱、排序、去重' },
  { name: '基础线 · 会算指标', from: 9, to: 13, rank: 2, sub: '聚合、分组、多表关联，最后用 JOIN 做一次分组统计' },
  { name: '业务线 · 承接需求', from: 14, to: 17, rank: 3, sub: '渠道看板、爆款、复购、新老客' },
  { name: '业务线 · 主管视角', from: 18, to: 19, rank: 4, sub: '趋势分析、退款率排查' }
]

function Ring({ pct, label }) {
  const r = 19
  const c = 2 * Math.PI * r
  return (
    <div className="ring">
      <svg width="46" height="46">
        <circle cx="23" cy="23" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="4" />
        <circle
          cx="23"
          cy="23"
          r={r}
          fill="none"
          stroke="var(--brand)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * c} ${c}`}
        />
      </svg>
      <b>{label}</b>
    </div>
  )
}

export function LevelMap({ progress, unlocked, onOpen, onUnlockAdvanced, onReview, toast }) {
  const rankInfo = rankOf(progress)
  const due = pendingItems(progress).filter((w) => w.dueAt <= Date.now())
  const waiting = pendingItems(progress).length - due.length
  const [code, setCode] = React.useState('')
  const advReady = progress.bonus >= ADVANCED_COST
  const done = completedCount(progress)
  const nextLevel = LEVELS.find((l) => !progress.stars[l.id])
  const pct = Math.round((done / LEVELS.length) * 100)

  return (
    <div className="page">
      {due.length > 0 && (
        <div className="banner" style={{ marginBottom: 14 }} data-testid="due-banner">
          <IconSpark width={18} height={18} style={{ color: 'var(--brand)' }} />
          <div className="grow">
            <div className="t">
              今天有 {due.length} 道复盘题
              {waiting > 0 ? `（另有 ${waiting} 道还没到期）` : ''}
            </div>
            <div className="d">
              这些是你之前做错的知识点，隔了几天换个业务场景再问一遍。每题大概 1 分钟，过了还能拿奖金。
            </div>
          </div>
          <button className="btn primary" onClick={onReview}>
            开始复盘
          </button>
        </div>
      )}
      {due.length === 0 && waiting > 0 && (
        <div className="banner" style={{ marginBottom: 14, background: 'var(--surface-2)', borderColor: 'var(--line)' }}>
          <div className="grow">
            <div className="t" style={{ color: 'var(--text-2)' }}>
              还有 {waiting} 道待改进
            </div>
            <div className="d" style={{ color: 'var(--text-3)' }}>
              它们会在 1 / 3 / 7 天后自动到期。想提前练也可以——换个场景做对，才算真的会了。
            </div>
          </div>
          <button className="btn sm" onClick={onReview}>
            提前复盘
          </button>
        </div>
      )}
      <div className="goal">
        <Ring pct={pct} label={`${pct}%`} />
        <div className="grow">
          <div style={{ fontSize: 17, fontWeight: 700 }}>
            {rankInfo.rank.title}
            <span className="muted" style={{ marginLeft: 10, fontWeight: 400, fontSize: 14 }}>
              月薪 ¥{rankInfo.rank.salary.toLocaleString()}
            </span>
          </div>
          <div className="muted" style={{ fontSize: 13 }}>
            已完成 {done} / {LEVELS.length} 关
            {rankInfo.next
              ? ` · 再完成 ${rankInfo.next.need - rankInfo.done} 关晋升 ${rankInfo.next.title}（¥${rankInfo.next.salary.toLocaleString()}）`
              : ' · 已达最高职级'}
          </div>
        </div>
        {nextLevel && (
          <button className="btn primary" onClick={() => onOpen(nextLevel.id)}>
            继续第 {nextLevel.id} 关：{nextLevel.title}
          </button>
        )}
      </div>

      {GROUPS.map((g) => {
        const levels = LEVELS.filter((l) => l.id >= g.from && l.id <= g.to)
        const doneHere = levels.filter((l) => progress.stars[l.id]).length
        return (
          <div className="group" key={g.name}>
            <div className="group-head">
              <span className="rank">
                L{g.rank + 1} {RANKS[g.rank].title}
              </span>
              <h2>{g.name}</h2>
              <span className="sub">{g.sub}</span>
              <div className="grow" />
              <span className="dim" style={{ fontSize: 12.5 }}>
                {doneHere}/{levels.length}
              </span>
            </div>
            <div className="levels">
              {levels.map((l) => {
                const stars = progress.stars[l.id]
                const locked = !unlocked.has(l.id)
                return (
                  <button
                    key={l.id}
                    className={`lv ${locked ? 'locked' : ''} ${stars ? 'done' : ''}`}
                    onClick={() => (locked ? toast('先完成前一关，或者回首页选「直接上手干活」从业务线开始') : onOpen(l.id))}
                  >
                    <div className="no">关卡 {String(l.id).padStart(2, '0')}</div>
                    <div className="ttl">{l.title}</div>
                    <span className="pt">{l.point}</span>
                    <div className="corner">
                      {stars ? (
                        <Stars n={stars} size={12} />
                      ) : locked ? (
                        <span className="dim" style={{ fontSize: 11 }}>
                          未解锁
                        </span>
                      ) : (
                        <span className="tag brand" style={{ fontSize: 10.5, padding: '3px 7px' }}>
                          待办
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      <div className="group">
        <div className="group-head">
          <span className="rank">进阶线</span>
          <h2>窗口函数 · 性能与索引 · 综合实战</h2>
          <div className="grow" />
          <span className="dim" style={{ fontSize: 12.5 }}>
            制作中
          </span>
        </div>
        <div className="panel">
          <div className="panel-body">
            {progress.advancedUnlocked ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span className="tag ok">内测资格已解锁</span>
                <code className="mono" style={{ color: 'var(--gold)' }}>
                  {progress.advancedCode}
                </code>
                <span className="muted" style={{ fontSize: 13 }}>
                  进阶章节上线后凭此码优先体验。
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div className="muted" style={{ fontSize: 13 }}>
                    用绩效奖金解锁（不用花钱）：{progress.bonus} / {ADVANCED_COST}
                  </div>
                  <div className="bar-mini" style={{ background: 'var(--surface-3)' }}>
                    <i style={{ width: `${Math.min(100, (progress.bonus / ADVANCED_COST) * 100)}%`, background: 'var(--brand)' }} />
                  </div>
                </div>
                <button className="btn sm" disabled={!advReady} onClick={() => onUnlockAdvanced('bonus')}>
                  用奖金兑换
                </button>
                <span className="dim">或</span>
                <input className="input" placeholder="输入兑换码" value={code} onChange={(e) => setCode(e.target.value)} style={{ width: 150 }} />
                <button className="btn sm" disabled={!code.trim()} onClick={() => onUnlockAdvanced('code', code.trim())}>
                  解锁
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------------- 自由练习 ---------------- */

const PRESETS = [
  { label: '看看订单长什么样', sql: 'SELECT * FROM orders LIMIT 20;' },
  { label: '各渠道的用户数', sql: 'SELECT channel, COUNT(*) FROM users GROUP BY channel;' },
  { label: '8 月每天的订单量', sql: "SELECT substr(order_time, 1, 10) AS d, COUNT(*) FROM orders WHERE order_time >= '2026-08-01' GROUP BY d ORDER BY d;" },
  {
    label: '退款最多的商品',
    sql: "SELECT p.name, COUNT(*) FROM refunds r JOIN order_items oi ON r.order_id = oi.order_id JOIN products p ON oi.product_id = p.product_id GROUP BY p.name ORDER BY COUNT(*) DESC LIMIT 10;"
  }
]

export function Sandbox({ db }) {
  const [text, setText] = React.useState(PRESETS[0].sql)
  const [result, setResult] = React.useState(null)
  const [err, setErr] = React.useState(null)
  const [ms, setMs] = React.useState(null)
  const [openTable, setOpenTable] = React.useState(null)

  const run = () => {
    const t0 = performance.now()
    try {
      setResult(runQuery(db, text))
      setErr(null)
    } catch (e) {
      setResult(null)
      setErr(e.code === 'NO_RESULT' ? noResultHint(text) : translateError(e.message, text))
    }
    setMs(Math.round(performance.now() - t0))
  }

  return (
    <div className="page">
      <div className="crumb">
        <span>
          <b>自由练习</b>
        </span>
        <span className="dim">· 没有任何判定和奖励，随便查</span>
      </div>

      <div className="client" style={{ height: 'calc(100vh - 150px)' }}>
        <div className="col">
          <div className="col-head">数据表</div>
          <div className="col-scroll">
            <ObjectTree
              only={TABLE_NAMES}
              openTable={openTable}
              onToggle={(n) => setOpenTable(openTable === n ? null : n)}
              onPick={(c) => setText((t) => t.replace(/\s*;?\s*$/, '') + ' ' + c)}
            />
          </div>
        </div>

        <div className="col">
          <div className="tabbar">
            <span className="qtab">查询 1</span>
            <div className="grow" />
            <button className="btn ghost sm" onClick={() => setText('')}>
              清空
            </button>
            <button className="btn primary sm" onClick={run}>
              <IconPlay width={12} height={12} />
              执行
            </button>
          </div>
          <div className="editor-wrap" style={{ borderRadius: 0 }}>
            <div
              onKeyDownCapture={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault()
                  run()
                }
              }}
            >
              <CodeMirror value={text} height="150px" theme="dark" extensions={extensions} onChange={setText} basicSetup={{ foldGutter: false }} />
            </div>
          </div>
          <div className="bottom">
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
              {!err && <ResultTable result={result} maxRows={200} />}
            </div>
          </div>
          <div className="statusbar">
            <span>SQLite</span>
            <span>ecommerce.db</span>
            <span style={{ color: result ? 'var(--ok)' : undefined }}>{result ? `查询成功 · ${result.rows.length} 行 · ${ms} ms` : '就绪'}</span>
          </div>
        </div>

        <div className="col rail-col">
          <div className="col-head">试试这些</div>
          <div className="rail">
            <div className="teach" style={{ marginTop: 0 }}>
              <h4>现成的例子</h4>
              {PRESETS.map((p) => (
                <button key={p.label} className="btn sm" style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 6 }} onClick={() => setText(p.sql)}>
                  {p.label}
                </button>
              ))}
            </div>
            <div className="teach">
              <h4>一些能玩的</h4>
              <p className="muted">
                先点左边把表展开，看看有哪些字段，然后自己拼一句话试试。写错了也没关系，界面会把报错翻译成人话。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------------- 数据字典 ---------------- */

export function Dictionary({ db }) {
  const [openTable, setOpenTable] = React.useState(TABLES[0].name)
  const [tab, setTab] = React.useState('tables')
  const t = TABLES.find((x) => x.name === openTable)
  const sample = React.useMemo(() => {
    if (!db) return null
    try {
      return runQuery(db, `SELECT * FROM ${openTable} LIMIT 3`)
    } catch {
      return null
    }
  }, [db, openTable])

  return (
    <div className="page">
      <div className="crumb">
        <span>
          <b>数据字典</b>
        </span>
        <span className="dim">· 你手上唯一的数据库：一家电商公司 2026 年 3–8 月的经营数据</span>
      </div>

      <div className="client" style={{ height: 'calc(100vh - 150px)' }}>
        <div className="col">
          <div className="col-head">数据表</div>
          <div className="col-scroll">
            {TABLES.map((tb) => (
              <button
                key={tb.name}
                className={`tree-node ${openTable === tb.name ? 'open active' : ''}`}
                onClick={() => setOpenTable(tb.name)}
              >
                <span className="caret" style={{ opacity: openTable === tb.name ? 1 : 0.35 }}>•</span>
                <span className="mono">{tb.name}</span>
                <span className="cn">{tb.cn}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="col">
          <div className="col-head">{t.name} 的字段说明</div>
          <div className="bottom-body">
            <div className="muted" style={{ marginBottom: 12, fontSize: 13 }}>
              {t.desc}
            </div>
            <table className="res">
              <thead>
                <tr>
                  <th>字段</th>
                  <th>类型</th>
                  <th>说明</th>
                </tr>
              </thead>
              <tbody>
                {t.columns.map(([n, ty, d]) => (
                  <tr key={n}>
                    <td style={{ color: 'var(--brand-2)' }}>{n}</td>
                    <td className="null">{ty}</td>
                    <td style={{ fontFamily: 'var(--sans)', whiteSpace: 'normal' }}>{d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="statusbar">
            <span>共 {t.columns.length} 个字段</span>
          </div>
        </div>
        <div className="col rail-col">
          <div className="col-head">示例数据（前 3 行）</div>
          <div className="rail">
            <ResultTable result={sample} maxRows={3} />
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 16 }} data-testid="glossary">
        <div className="panel-head">
          名词解释
          <span className="sub">第一次遇到某个词，可以来这里查——每条都配了一个最小示例</span>
        </div>
        <div className="panel-body">
          <div className="term-grid">
            {TERMS.map((term) => (
              <div className="term-card" key={term.key}>
                <div className="term-name">
                  {term.name}
                  {term.aka?.length ? <span className="dim">（也叫{term.aka.join('、')}）</span> : null}
                </div>
                <div className="term-what">{term.what}</div>
                <code className="term-demo">{term.demo}</code>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
