const KEY = 'sqlquest.progress.v1'

export const RANKS = [
  { need: 0, title: '数据实习生', salary: 3000 },
  { need: 4, title: '数据运营专员', salary: 6000 },
  { need: 8, title: '数据分析师', salary: 9000 },
  { need: 13, title: '高级数据分析师', salary: 13000 },
  { need: 17, title: '数据主管', salary: 18000 },
  { need: 19, title: '数据负责人', salary: 25000 }
]

export const ADVANCED_COST = 600

export function emptyProgress() {
  return {
    stars: {},
    bonus: 0,
    path: null,
    tutorialDone: false,
    advancedUnlocked: false,
    advancedCode: null,
    wrong: {}, // 错题盒：{ [levelId]: { n, stage, dueAt } }
    cleared: [], // 已经彻底掌握（三档复习都过了）的关卡
    lessons: {} // 零基础第一课：{ [lessonId]: true }
  }
}

/* ---------- 零基础第一课 ---------- */

export function markLessonDone(p, lessonId) {
  if (p.lessons?.[lessonId]) return p
  return { ...p, lessons: { ...(p.lessons || {}), [lessonId]: true } }
}

export const lessonsDone = (p) => Object.keys(p.lessons || {}).length

/* ---------- 错题盒：1 / 3 / 7 天后以变体题复现 ---------- */

export const DAY = 24 * 60 * 60 * 1000
export const REVIEW_INTERVALS = [1, 3, 7]

/** 答错时记一笔；已经在盒子里就累加次数，下次复习时间不变 */
export function markWrong(p, levelId, now = Date.now()) {
  const cur = p.wrong?.[levelId]
  if (cur) return { ...p, wrong: { ...p.wrong, [levelId]: { ...cur, n: cur.n + 1 } } }
  return {
    ...p,
    wrong: { ...(p.wrong || {}), [levelId]: { n: 1, stage: 0, dueAt: now + REVIEW_INTERVALS[0] * DAY } },
    cleared: (p.cleared || []).filter((id) => id !== levelId)
  }
}

/** 复习通过（或重新自己做对）：进入下一档；三档都过了就移出盒子 */
export function advanceWrong(p, levelId, now = Date.now()) {
  const cur = p.wrong?.[levelId]
  if (!cur) return p
  const stage = cur.stage + 1
  if (stage >= REVIEW_INTERVALS.length) {
    const wrong = { ...p.wrong }
    delete wrong[levelId]
    return { ...p, wrong, cleared: [...new Set([...(p.cleared || []), levelId])] }
  }
  return { ...p, wrong: { ...p.wrong, [levelId]: { ...cur, stage, dueAt: now + REVIEW_INTERVALS[stage] * DAY } } }
}

export const pendingItems = (p) =>
  Object.entries(p.wrong || {})
    .map(([id, w]) => ({ levelId: Number(id), ...w }))
    .sort((a, b) => a.dueAt - b.dueAt)

export const dueItems = (p, now = Date.now()) => pendingItems(p).filter((w) => w.dueAt <= now)
export const dueCount = (p, now = Date.now()) => dueItems(p, now).length

/** 「待改进项」文案：这是第几档、什么时候该复习 */
export function reviewStageLabel(w) {
  const next = REVIEW_INTERVALS[w.stage]
  if (!next) return '已掌握'
  return `第 ${w.stage + 1} 次复习 · ${next} 天后到期`
}

export function loadProgress() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyProgress()
    return { ...emptyProgress(), ...JSON.parse(raw) }
  } catch {
    return emptyProgress()
  }
}

export function saveProgress(p) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    /* 忽略隐私模式下的写入失败 */
  }
}

export function resetProgress() {
  try {
    localStorage.removeItem(KEY)
  } catch {}
  return emptyProgress()
}

export const completedCount = (p) => Object.keys(p.stars).length
export const totalStars = (p) => Object.values(p.stars).reduce((s, n) => s + n, 0)

export function rankOf(p) {
  const done = completedCount(p)
  let idx = 0
  RANKS.forEach((r, i) => {
    if (done >= r.need) idx = i
  })
  return { rank: RANKS[idx], index: idx, next: RANKS[idx + 1] || null, done }
}

export function starsFor(attempts, hintsUsed) {
  if (hintsUsed >= 3 || attempts > 4) return 1
  if (hintsUsed > 0 || attempts > 1) return 2
  return 3
}

export function rewardFor(stars) {
  return 20 + stars * 10
}

export function newCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return `SQ-${s.slice(0, 4)}-${s.slice(4)}`
}
