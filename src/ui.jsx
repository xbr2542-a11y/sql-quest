import React from 'react'
import { TABLES } from './schema.js'
import { annotate } from './annotate.js'
import { markTerms } from './glossary.js'
import { COLOR_LEGEND } from './cmExtras.js'
import { IconChevron, IconDatabase, IconTable, IconStar } from './icons.jsx'

export function Stars({ n, size = 14 }) {
  return (
    <span style={{ display: 'inline-flex', gap: 1, color: 'var(--gold)' }}>
      {[1, 2, 3].map((i) => (
        <IconStar key={i} filled={i <= n} size={size} />
      ))}
    </span>
  )
}

export function TopBar({
  rankInfo,
  progress,
  route,
  onNav,
  onReset,
  dueCount = 0,
  wrongCount = 0,
  lessonsCount = 0,
  onReview,
  onLessons,
  onProfile
}) {
  return (
    <header className="topbar">
      <div className="brand" onClick={() => onNav({ page: 'intro' })} title="回到首页">
        <span className="mark">
          <IconDatabase width={17} height={17} />
        </span>
        <span className="name">数据部新人</span>
      </div>
      <nav className="nav">
        <button
          className={'lessons-btn' + (route.page === 'lessons' ? ' on' : '')}
          onClick={onLessons}
          title="14 节短课，从最基础的 SQL 概念讲起"
        >
          基础课
          {lessonsCount > 0 && <span className="done-badge">{lessonsCount}/14</span>}
        </button>
        <button
          className={route.page === 'profile' ? 'on' : ''}
          onClick={onProfile}
          title="职级薪资、能力分布、待改进项"
        >
          我的数据
        </button>
        <button
          className={'review-btn' + (route.page === 'review' ? ' on' : '') + (dueCount > 0 ? ' alert' : '')}
          onClick={onReview}
          title="把之前做错的题换个业务场景再问一遍"
        >
          周会复盘
          {dueCount > 0 && <span className="badge">{dueCount}</span>}
        </button>
        <button className={route.page === 'map' ? 'on' : ''} onClick={() => onNav({ page: 'map' })}>
          关卡地图
        </button>
        <button className={route.page === 'sandbox' ? 'on' : ''} onClick={() => onNav({ page: 'sandbox' })}>
          自由练习
        </button>
        <button className={route.page === 'dict' ? 'on' : ''} onClick={() => onNav({ page: 'dict' })}>
          数据字典
        </button>
      </nav>
      <div className="grow" />
      <div className="stat-row">
        <div className="stat">
          <span className="k">职级</span>
          <span className="v">{rankInfo.rank.title}</span>
        </div>
        <div className="stat salary">
          <span className="k">月薪</span>
          <span className="v">¥{rankInfo.rank.salary.toLocaleString()}</span>
        </div>
        <div className="stat bonus">
          <span className="k">奖金</span>
          <span className="v">{progress.bonus}</span>
        </div>
        <div className="stat star">
          <span className="k">★</span>
          <span className="v">{Object.values(progress.stars).reduce((a, b) => a + b, 0)}</span>
        </div>
        <button className="icon-btn" onClick={onReset} title="清空进度重新开始">
          ⟲
        </button>
      </div>
    </header>
  )
}

export function ResultTable({ result, maxRows = 200 }) {
  if (!result) return <div className="dim" style={{ padding: 4 }}>还没有结果</div>
  const rows = result.rows.slice(0, maxRows)
  if (!result.rows.length) return <div className="dim" style={{ padding: 4 }}>查询成功，但一行都没返回（0 行）。</div>
  return (
    <div>
      <div className="tblwrap">
        <table className="res">
          <thead>
            <tr>
              <th style={{ width: 42 }}>#</th>
              {result.columns.map((c, i) => (
                <th key={i}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri}>
                <td className="idx">{ri + 1}</td>
                {r.map((v, vi) => (
                  <td key={vi} className={v === null ? 'null' : ''}>
                    {v === null ? 'NULL' : String(v)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="dim" style={{ marginTop: 6, fontSize: 12 }}>
        共 {result.rows.length} 行{result.rows.length > maxRows ? `（只显示前 ${maxRows} 行）` : ''}
      </div>
    </div>
  )
}

export function ObjectTree({ only, openTable, onToggle, onPick, glow }) {
  const list = only ? TABLES.filter((t) => only.includes(t.name)) : TABLES
  return (
    <div className={glow ? 'glow' : ''} data-testid="object-tree">
      <div className="conn">
        <span className="dot" />
        <span className="mono" style={{ fontSize: 12 }}>
          ecommerce.db
        </span>
        <div className="grow" />
        <span className="dim" style={{ fontSize: 11 }}>
          SQLite
        </span>
      </div>
      {list.map((t) => {
        const open = openTable === t.name
        return (
          <div key={t.name}>
            <button
              className={`tree-node ${open ? 'open active' : ''}`}
              onClick={() => onToggle(t.name)}
              data-testid={`tree-${t.name}`}
            >
              <span className="caret">
                <IconChevron width={11} height={11} />
              </span>
              <IconTable width={14} height={14} style={{ color: 'var(--brand)' }} />
              <span className="mono">{t.name}</span>
              <span className="cn">{t.cn}</span>
            </button>
            {open &&
              t.columns.map(([name, ty]) => (
                <div className="col-row" key={name} onClick={() => onPick?.(name)} title="点击把字段名插进编辑器">
                  <div className="l1">
                    <code>{name}</code>
                    <span className="ty">{ty}</span>
                  </div>
                  <div className="l2">{t.columns.find((c) => c[0] === name)?.[2]}</div>
                </div>
              ))}
          </div>
        )
      })}
    </div>
  )
}

/** 关卡里直接摊开要用的表：字段名、类型、中文含义，都能点 */
export function SchemaCard({ names, onPick, onPreview }) {
  const list = TABLES.filter((t) => names.includes(t.name))
  return (
    <div>
      {list.map((t) => (
        <div className="schema-tbl" key={t.name}>
          <div className="hd">
            <span className="mono">{t.name}</span>
            <span className="cn">{t.cn}</span>
            <div className="grow" />
            <button className="btn ghost sm" onClick={() => onPreview?.(t.name)} title="在下方看这张表的数据">
              看数据
            </button>
          </div>
          {t.columns.map(([name, ty, desc]) => (
            <div className="row2" key={name}>
              <code onClick={() => onPick?.(name)} title="点一下插进编辑器">
                {name}
              </code>
              <span className="ty">{ty}</span>
              <span className="mn">{desc}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export function SyntaxNotes({ sql }) {
  const { tokens, legend } = React.useMemo(() => annotate(sql), [sql])
  return (
    <div>
      <div className="syntax">
        {tokens.map((tk, i) => {
          if (tk.t === 'ws') return tk.v
          const cls =
            tk.t === 'kw' ? 'kw' : tk.t === 'fn' ? 'fn' : tk.t === 'str' ? 'str' : tk.t === 'num' ? 'num' : tk.t === 'punc' ? 'punc' : ''
          return (
            <span key={i} className={cls}>
              {tk.v}
            </span>
          )
        })}
      </div>
      {legend.length > 0 && (
        <div className="legend">
          {legend.map(([k, v]) => (
            <div className="legend-row" key={k}>
              <code>{k}</code>
              <span>{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function Toast({ text }) {
  if (!text) return null
  return <div className="toast">{text}</div>
}

const KW_RE = /\b(SELECT|FROM|WHERE|AND|OR|NOT|NULL|IS|IN|LIKE|ORDER BY|GROUP BY|HAVING|LIMIT|DISTINCT|LEFT JOIN|JOIN|ON|AS|DESC|ASC|SUM|COUNT|AVG|ROUND|CASE WHEN|THEN|ELSE|END|strftime|substr|instr|IFNULL|ISNULL)\b/g

/** 把文案按「代码片段」和「普通文字」切开 */
function splitCode(text) {
  const raw = String(text ?? '')
  const out = []
  const re = /(`[^`]*`|'[^']*')/g
  let last = 0
  let m
  while ((m = re.exec(raw))) {
    if (m.index > last) out.push({ t: 'p', v: raw.slice(last, m.index) })
    out.push({ t: 'c', v: m[0] })
    last = m.index + m[0].length
  }
  if (last < raw.length) out.push({ t: 'p', v: raw.slice(last) })
  return out
}

/** 普通文字里的 SQL 关键字高亮 */
function renderKeywords(s, key) {
  const bits = []
  let last = 0
  let m
  KW_RE.lastIndex = 0
  while ((m = KW_RE.exec(s))) {
    if (m.index > last) bits.push(s.slice(last, m.index))
    bits.push(
      <code className="inline-kw" key={`${key}-${m.index}`}>
        {m[0]}
      </code>
    )
    last = m.index + m[0].length
  }
  if (last < s.length) bits.push(s.slice(last))
  return <React.Fragment key={key}>{bits}</React.Fragment>
}

/** 只处理代码片段与关键字 */
export function SqlText({ text }) {
  const parts = React.useMemo(() => splitCode(text), [text])
  return (
    <>
      {parts.map((p, i) =>
        p.t === 'c' ? (
          <code className="inline-code" key={i}>
            {p.v.startsWith('`') ? p.v.slice(1, -1) : p.v}
          </code>
        ) : (
          renderKeywords(p.v, i)
        )
      )}
    </>
  )
}

/**
 * 富文本：代码片段 + 关键字 + 术语（术语带虚线下划线，鼠标停上去有解释）。
 * 零基础玩家第一次遇到专业词时，不用离开当前页面就能查。
 */
export function RichText({ text }) {
  const parts = React.useMemo(() => splitCode(text), [text])
  return (
    <>
      {parts.map((p, i) =>
        p.t === 'c' ? (
          <code className="inline-code" key={i}>
            {p.v.startsWith('`') ? p.v.slice(1, -1) : p.v}
          </code>
        ) : (
          <React.Fragment key={i}>
            {markTerms(p.v).map((seg, k) =>
              seg.term ? (
                <span className="term" key={k} title={`${seg.term.name}：${seg.term.what}\n例：${seg.term.demo}`}>
                  {seg.v}
                </span>
              ) : (
                renderKeywords(seg.v, k)
              )
            )}
          </React.Fragment>
        )
      )}
    </>
  )
}

/** 编辑器里的颜色各代表什么 */
export function ColorLegend() {
  return (
    <div className="legend-bar" title="编辑器里的颜色含义">
      <span className="legend-title">颜色含义</span>
      {COLOR_LEGEND.map((l) => (
        <span className={'lg ' + l.cls} key={l.label} title={l.note}>
          <i />
          {l.label}
        </span>
      ))}
    </div>
  )
}

/** 三段式提示：学什么 + 怎么做 + 最小示例 */
export function HintList({ hints, used, onUse, onInsert }) {
  const labels = ['方向提示', '结构提示', '参考写法']
  return (
    <div>
      {hints.map((h, i) => {
        const open = used > i
        return (
          <div className={'hint-row' + (open ? ' open' : '')} key={i}>
            <button className="hint-head" onClick={() => !open && onUse(i + 1)}>
              <span className="n">{i + 1}</span>
              <span>{open ? h.learn : `点开看：${labels[i]}`}</span>
              <div className="grow" />
              <span className="dim" style={{ fontSize: 11.5 }}>
                {open ? '已展开' : '点这里'}
              </span>
            </button>
            {open && (
              <div className="hint-body">
                <div className="hint-how">
                  <RichText text={h.how} />
                </div>
                <code className="hint-code" onClick={() => onInsert?.(h.demo)} title="点一下放进编辑器">
                  {h.demo}
                </code>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/** 术语卡：是什么 + 最小示例 */
export function TermList({ terms }) {
  if (!terms?.length) return null
  return (
    <div>
      {terms.map((t) => (
        <div className="term-row" key={t.key}>
          <div className="term-name">{t.name}</div>
          <div className="term-what">{t.what}</div>
          <code className="term-demo">{t.demo}</code>
        </div>
      ))}
    </div>
  )
}

/** 本关可能用到的值：点一下就插入，连引号一起给，不用手打 */
export function ValueChips({ values, onPick }) {
  if (!values?.length) return null
  return (
    <div className="valchips">
      {values.map((v) => (
        <button key={v.text} className="valchip" onClick={() => onPick(v.text)} title={v.note}>
          {v.text}
        </button>
      ))}
    </div>
  )
}
