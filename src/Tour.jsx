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

  // 卡片尺寸要真实测量：写死尺寸会导致卡片顶出屏幕、按钮点不到
  const cardRef = React.useRef(null)
  const [cardSize, setCardSize] = React.useState({ w: 620, h: 220 })
  React.useLayoutEffect(() => {
    const measure = () => {
      const el = cardRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      setCardSize((prev) => (Math.abs(prev.w - r.width) < 1 && Math.abs(prev.h - r.height) < 1 ? prev : { w: r.width, h: r.height }))
    }
    measure()
    const t = setTimeout(measure, 60)
    window.addEventListener('resize', measure)
    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', measure)
    }
  }, [i, step?.title, step?.body, step?.done, step?.note?.text])

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

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
  const gap = 14
  const margin = 12
  // 横向宽卡片：宽度跟着屏幕走，正文行数少一半，卡片就矮一半
  // 横向宽卡片：屏幕越宽卡片越宽，正文行数越少、卡片越矮
  const cardW = Math.max(300, Math.min(780, vw - margin * 2))
  const cardH = Math.min(cardSize.h, vh - margin * 2)

  let cardPos = { left: clamp((vw - cardW) / 2, margin, vw - cardW - margin), top: clamp((vh - cardH) / 2, margin, vh - cardH - margin) }
  if (hole) {
    const spaceBelow = vh - hole.bottom
    const spaceAbove = hole.top
    const spaceRight = vw - hole.right
    const spaceLeft = hole.left
    const leftAligned = clamp(hole.left, margin, vw - cardW - margin)
    if (spaceBelow >= cardH + gap) cardPos = { left: leftAligned, top: hole.bottom + gap }
    else if (spaceAbove >= cardH + gap) cardPos = { left: leftAligned, top: hole.top - gap - cardH }
    else if (spaceRight >= cardW + gap) cardPos = { left: hole.right + gap, top: clamp(hole.top, margin, Math.max(margin, vh - cardH - margin)) }
    else if (spaceLeft >= cardW + gap) cardPos = { left: hole.left - gap - cardW, top: clamp(hole.top, margin, Math.max(margin, vh - cardH - margin)) }
    // 兜底：贴着能看到的那一侧，并保证整张卡片落在屏幕内
    else cardPos = { left: leftAligned, top: clamp(spaceBelow > spaceAbove ? hole.bottom + gap : hole.top - gap - cardH, margin, Math.max(margin, vh - cardH - margin)) }
  }
  // 无论如何都不能越界
  cardPos = {
    left: clamp(cardPos.left, margin, Math.max(margin, vw - cardW - margin)),
    top: clamp(cardPos.top, margin, Math.max(margin, vh - cardH - margin))
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
      <div
        className={'tour-card' + (vw >= 1080 ? ' wide' : '')}
        ref={cardRef}
        style={{ left: cardPos.left, top: cardPos.top, width: cardW, maxHeight: vh - margin * 2 }}
        data-testid="tour-card"
      >
        <div className="tour-top">
          <span className="tour-step">第 {i + 1} / {steps.length} 步</span>
          <div className="grow" />
          <button className="btn ghost sm" onClick={onSkip}>
            跳过
          </button>
        </div>

        <div className="tour-main">
          <div className="tour-title">{step.title}</div>
          <div className="tour-body">{step.body}</div>
        </div>

        <div className="tour-side">
          {step.actionText && (
            <div className="tour-action">
              <span className={step.done ? 'okdot' : 'dotpulse'} />
              <span>{step.actionText}</span>
            </div>
          )}
          {step.actionText && <div className={'tour-state ' + (step.done ? 'ok' : 'wait')}>{step.done ? '✅ 已完成' : '还没完成'}</div>}
          {step.note && (
            <div className={`tour-note ${step.note.kind}`}>
              {step.note.kind === 'warn' ? '⚠️ ' : step.note.kind === 'ok' ? '✅ ' : '💡 '}
              {step.note.text}
            </div>
          )}
          {step.done && !last && (
            <div className="tour-done">
              <span className="okdot" />
              {step.doneHint || '做对了，正在进入下一步…'}
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
              <button className="btn primary sm" onClick={() => (last ? onFinish?.() : setI(i + 1))} data-testid="tour-next">
                {last ? step.finishText || '完成' : '下一步'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
