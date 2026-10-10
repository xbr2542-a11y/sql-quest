import React from 'react'
import { LEVELS } from './levels.js'
import { LESSONS } from './lessons.js'
import { completedCount, rankOf, RANKS, pendingItems, lessonsDone, reviewStageLabel, DAY } from './progress.js'
import { IconCheck, IconSpark } from './icons.jsx'

/** 按课程顺序把 19 关分成四类能力，用于「能力分布」 */
const SKILLS = [
  { name: '基础查询', from: 1, to: 8, desc: 'SELECT / WHERE / ORDER BY / DISTINCT' },
  { name: '聚合统计', from: 9, to: 11, desc: 'SUM / GROUP BY / HAVING' },
  { name: '多表关联', from: 12, to: 13, desc: 'JOIN' },
  { name: '业务分析', from: 14, to: 19, desc: '渠道 / 复购 / 留存 / 退款排查' }
]

const dueText = (w, now) => {
  const diff = w.dueAt - now
  if (diff <= 0) return '已到期，可以复盘了'
  const days = Math.ceil(diff / DAY)
  return days <= 1 ? '明天到期' : `${days} 天后到期`
}

export default function Profile({ progress, onReview, onLessons, toast }) {
  const now = Date.now()
  const rankInfo = rankOf(progress)
  const done = completedCount(progress)
  const stars = Object.values(progress.stars).reduce((a, b) => a + b, 0)
  const wrong = pendingItems(progress)
  const lessons = lessonsDone(progress)
  const nextNeed = rankInfo.next ? rankInfo.next.need - rankInfo.done : 0

  const skills = SKILLS.map((s) => {
    const list = LEVELS.filter((l) => l.id >= s.from && l.id <= s.to)
    const starsOf = list.map((l) => progress.stars[l.id] || 0)
    const got = starsOf.reduce((a, b) => a + b, 0)
    const finished = starsOf.filter((v) => v > 0).length
    const avg = finished ? got / finished : 0
    return { ...s, total: list.length, finished, avg }
  })

  const copyReport = () => {
    const lines = [
      `【数据部新人 · 我的数据】`,
      `职级：${rankInfo.rank.title}（月薪 ¥${rankInfo.rank.salary.toLocaleString()}）`,
      `闯关：${done}/${LEVELS.length} 关，累计 ${stars} 颗星`,
      `基础课：${lessons}/${LESSONS.length} 节`,
      `能力：` + skills.map((s) => `${s.name}${s.finished ? '★' + s.avg.toFixed(1) : '未开始'}`).join(' · '),
      wrong.length ? `待改进：${wrong.length} 项` : '待改进：无'
    ]
    navigator.clipboard?.writeText(lines.join('\n'))
    toast?.('成绩单已复制，可以发出去')
  }

  if (done === 0 && lessons === 0) {
    return (
      <div className="page narrow">
        <h2 style={{ margin: '0 0 6px', fontSize: 20 }}>我的数据</h2>
        <p className="muted">还没有学习记录。先去上「零基础第一课」，或者在关卡地图里开始闯关。</p>
        <button className="btn primary" onClick={onLessons}>
          开始第 1 课
        </button>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="crumb">
        <span>
          <b>我的数据</b>
        </span>
        <span className="dim">· 你在这家公司干了什么、拿到了什么，都在这里</span>
        <div className="grow" />
        <button className="btn ghost sm" onClick={copyReport}>
          复制成绩单
        </button>
      </div>

      <div className="profile-hero">
        <div>
          <div className="ph-rank">{rankInfo.rank.title}</div>
          <div className="ph-salary">
            月薪 ¥{rankInfo.rank.salary.toLocaleString()}
            {rankInfo.next && (
              <span className="dim" style={{ fontSize: 13, marginLeft: 8 }}>
                · 再完成 {nextNeed} 关晋升 {rankInfo.next.title}（¥{rankInfo.next.salary.toLocaleString()}）
              </span>
            )}
          </div>
        </div>
        <div className="ph-stats">
          <div className="ph-stat">
            <b>{done}</b>
            <span>过关</span>
          </div>
          <div className="ph-stat">
            <b>{stars}</b>
            <span>颗星</span>
          </div>
          <div className="ph-stat">
            <b>{lessons}</b>
            <span>基础课</span>
          </div>
          <div className="ph-stat">
            <b>{progress.bonus}</b>
            <span>奖金</span>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 14 }}>
        <div className="panel-head">职级阶梯</div>
        <div className="panel-body">
          {RANKS.map((r, i) => {
            const reached = rankInfo.index >= i
            const current = rankInfo.index === i
            return (
              <div className={'ladder-row' + (reached ? ' reached' : '') + (current ? ' current' : '')} key={r.title}>
                <span className="lv-badge">L{i + 1}</span>
                <span className="lv-title">{r.title}</span>
                <span className="lv-pay">¥{r.salary.toLocaleString()}</span>
                <div className="lv-bar">
                  <i style={{ width: current ? '100%' : reached ? '100%' : `${Math.min(100, (done / r.need) * 100)}%` }} />
                </div>
                <span className="dim" style={{ fontSize: 12, width: 68, textAlign: 'right' }}>
                  {reached ? (current ? '当前' : '已达成') : `需 ${r.need} 关`}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="panel" style={{ marginTop: 14 }}>
        <div className="panel-head">
          能力分布
          <span className="sub">按知识点分组，星星是你每关拿到的评级</span>
        </div>
        <div className="panel-body">
          <div className="skill-grid">
            {skills.map((s) => (
              <div className="skill-card" key={s.name}>
                <div className="sk-head">
                  <span className="sk-name">{s.name}</span>
                  <span className="dim" style={{ fontSize: 12 }}>
                    已完成 {s.finished}/{s.total}
                  </span>
                </div>
                <div className="sk-stars">
                  {s.finished ? (
                    <>
                      {'★'.repeat(Math.max(1, Math.round(s.avg)))}
                      {'☆'.repeat(3 - Math.max(1, Math.round(s.avg)))}
                      <span className="sk-num">平均 {s.avg.toFixed(1)}</span>
                    </>
                  ) : (
                    <span className="sk-num">还没开始</span>
                  )}
                </div>
                <div className="sk-bar">
                  <i style={{ width: `${(s.finished / s.total) * 100}%` }} />
                </div>
                <div className="sk-desc">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 14 }}>
        <div className="panel-head">
          待改进
          <span className="sub">做错过的知识点，会在 1 / 3 / 7 天后换个场景再问你一遍</span>
          <div className="grow" />
          {wrong.length > 0 && (
            <button className="btn sm" onClick={onReview}>
              去复盘
            </button>
          )}
        </div>
        <div className="panel-body">
          {wrong.length === 0 ? (
            <div className="muted">
              {progress.cleared?.length ? `目前没有待改进项。已经掌握 ${progress.cleared.length} 个知识点 👏` : '目前没有待改进项。'}
            </div>
          ) : (
            wrong.map((w) => (
              <div className="wrong-row" key={w.levelId}>
                <span className="wr-id">第 {w.levelId} 关</span>
                <span className="wr-title">{LEVELS.find((l) => l.id === w.levelId)?.title || ''}</span>
                <span className="wr-stage">{reviewStageLabel(w)}</span>
                <div className="grow" />
                <span className={'wr-due' + (w.dueAt <= now ? ' now' : '')}>{dueText(w, now)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="panel" style={{ marginTop: 14 }}>
        <div className="panel-head">基础课进度</div>
        <div className="panel-body">
          <div className="lesson-progress">
            {LESSONS.map((l) => (
              <span className={'lp-dot' + (progress.lessons?.[l.id] ? ' ok' : '')} key={l.id} title={l.title}>
                {progress.lessons?.[l.id] ? <IconCheck width={11} height={11} /> : l.id}
              </span>
            ))}
          </div>
          <div className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>
            {lessons >= LESSONS.length ? '14 节全部完成，基础概念已经过了一遍。' : `还有 ${LESSONS.length - lessons} 节没上。`}
            {lessons < LESSONS.length && (
              <button className="btn ghost sm" style={{ marginLeft: 8 }} onClick={onLessons}>
                继续上课
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
