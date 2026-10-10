import React from 'react'
import { IconChevron } from './icons.jsx'

/**
 * 游戏式分步指引：高亮目标元素 + 遮罩挡住其他区域 + 明确告诉你现在该点哪里。
 * 遮罩会拦截其他区域的点击，所以玩家不会「点错地方然后卡住」。
 */
export default function Tour({ steps, onFinish, onSkip, onAction, onClear }) {
  const [i, setI] = React.useState(0)
  const [rect, setRect] = React.useState(null)
  const step = steps[i]
  const last = i === steps.length - 1

  // 目标元素的位置：会随窗口尺寸和滚动变化，轮询 + 监听足够稳
  React.useEffect(() => {
    let alive = true
    const measure = () => {
      if (!alive) return
      if (!step?.target) {
        setRect(null)
        return
      }
      const el = document.querySelector(step.target)
      if (!el) {
        setRect(null)
        return
      }
      const r = el.getBoundingClientRect()
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
    }
    measure()
    const t = setInterval(measure, 350)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      alive = false
      clearInterval(t)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [i, step?.target])

  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onSkip?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onSkip])

  // 做对了就自动进入下一步（留一点时间让他看到结果）
  React.useEffect(() => {
    if (!step?.action || !step?.done || last) return
    const t = setTimeout(() => setI((k) => Math.min(k + 1, steps.length - 1)), step.hold ?? 900)
    return () => clearTimeout(t)
  }, [i, step?.action, step?.done, last, steps.length, step?.hold])

  // 如果目标元素本身消失了，退回居中卡片
  const pad = 6
  const vw = typeof window === 'undefined' ? 1440 : window.innerWidth
  const vh = typeof window === 'undefined' ? 900 : window.innerHeight
  const hole = rect
    ? {
        top: Math.max(0, rect.top - pad),
        left: Math.max(0, rect.left - pad),
        right: Math.min(vw, rect.left + rect.width + pad),
        bottom: Math.min(vh, rect.top + rect.height + pad)
      }
    : null

  const cardW = 356
  let cardPos = { left: Math.max(16, (vw - cardW) / 2), top: Math.max(16, vh / 2 - 130) }
  if (hole) {
    const spaceBelow = vh - hole.bottom
    const spaceAbove = hole.top
    const spaceRight = vw - hole.right
    if (spaceBelow > 250) cardPos = { left: Math.min(Math.max(16, hole.left), vw - cardW - 16), top: hole.bottom + 14 }
    else if (spaceAbove > 250) cardPos = { left: Math.min(Math.max(16, hole.left), vw - cardW - 16), top: hole.top - 14 - 216 }
    else if (spaceRight > cardW + 24) cardPos = { left: hole.right + 16, top: Math.min(Math.max(16, hole.top), vh - 250) }
    else cardPos = { left: Math.max(16, hole.left - cardW - 16), top: Math.min(Math.max(16, hole.top), vh - 250) }
  }

  const arrowAt = hole
    ? {
        left: Math.min(vw - 60, Math.max(12, (hole.left + hole.right) / 2 - 34)),
        top: cardPos.top < hole.top ? hole.top - 34 : hole.bottom + 30
      }
    : null

  return (
    <>
      {/* 遮罩：只留出目标区域可以点 */}
      {hole ? (
        <>
          <div className="tour-dim" style={{ left: 0, top: 0, right: 0, height: hole.top }} />
          <div className="tour-dim" style={{ left: 0, top: hole.bottom, right: 0, bottom: 0 }} />
          <div className="tour-dim" style={{ left: 0, top: hole.top, width: hole.left, height: hole.bottom - hole.top }} />
          <div className="tour-dim" style={{ left: hole.right, top: hole.top, right: 0, height: hole.bottom - hole.top }} />
          <div
            className="tour-hole"
            style={{ left: hole.left, top: hole.top, width: hole.right - hole.left, height: hole.bottom - hole.top }}
          />
        </>
      ) : (
        <div className="tour-dim" style={{ inset: 0 }} />
      )}

      {/* 指向目标的小箭头 + 点这里 */}
      {hole && arrowAt && (
        <div className="tour-pointer" style={{ left: arrowAt.left, top: arrowAt.top }}>
          <span className="tour-tap">
            {step.action ? '请在这里操作' : '就是这里'}
          </span>
          {cardPos.top < hole.top ? (
            <IconChevron className="tour-arrow down" width={16} height={16} />
          ) : (
            <IconChevron className="tour-arrow up" width={16} height={16} />
          )}
        </div>
      )}

      {/* 讲解卡片 */}
      <div className="tour-card" style={{ left: cardPos.left, top: cardPos.top, width: cardW }} data-testid="tour-card">
        <div className="tour-head">
          <span className="tour-step">
            第 {i + 1} / {steps.length} 步
          </span>
          <div className="grow" />
          <button className="btn ghost sm" onClick={onSkip}>
            跳过
          </button>
        </div>
        <div className="tour-title">{step.title}</div>
        <div className="tour-body">{step.body}</div>
        {step.actionText && (
          <div className="tour-action">
            <span className={step.done ? 'okdot' : 'dotpulse'} />
            <span>{step.actionText}</span>
            <div className="grow" />
            <span className={'tour-state ' + (step.done ? 'ok' : 'wait')}>{step.done ? '✅ 已完成' : '还没完成'}</span>
          </div>
        )}
        {step.note && (
          <div className={`tour-note ${step.note.kind}`}>
            {step.note.kind === 'warn' ? '⚠️ ' : step.note.kind === 'ok' ? '✅ ' : '💡 '}
            {step.note.text}
          </div>
        )}
        <div className="tour-foot">
          <div className="tour-dots">
            {steps.map((_, k) => (
              <i key={k} className={k === i ? 'on' : k < i ? 'done' : ''} />
            ))}
          </div>
          <div className="grow" />
          {i > 0 && (
            <button className="btn sm" onClick={() => setI(i - 1)}>
              上一步
            </button>
          )}
          {step.action && !step.done && step.canClear && (
            <button className="btn sm" onClick={onClear} title="把编辑器清空重来">
              清空重来
            </button>
          )}
          {step.action && !step.done ? (
            <button className="btn primary sm" onClick={() => onAction?.(step)} data-testid="tour-action">
              {step.helpText || '点这里，我帮你做'}
            </button>
          ) : (
            <button
              className="btn primary sm"
              onClick={() => (last ? onFinish?.() : setI(i + 1))}
              data-testid="tour-next"
            >
              {last ? step.finishText || '完成' : '下一步'}
            </button>
          )}
        </div>
        {step.done && !last && (
          <div className="tour-done">
            <span className="okdot" />
            {step.doneHint || '做对了，正在进入下一步…'}
          </div>
        )}
      </div>
    </>
  )
}
