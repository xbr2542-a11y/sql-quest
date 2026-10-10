/**
 * 结果集比对判定：不做 SQL 字符串匹配。
 * 失败时返回的是「能指着具体字段说话」的诊断，而不是「期望 3 列、返回 2 列」。
 */

const NULL_KEY = '\u0000NULL'

function keyOf(value, step) {
  if (value === null || value === undefined) return NULL_KEY
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return String(value)
    return String(Math.round(value / step))
  }
  return String(value).trim()
}

const makeKeys = (rows, step) => rows.map((r) => r.map((v) => keyOf(v, step)).join('\u0001'))
const norm = (s) => String(s).trim().toLowerCase()
const list = (arr) => arr.map((c) => `\`${c}\``).join('、')

function lev(a, b) {
  const m = a.length
  const n = b.length
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)])
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return dp[m][n]
}

/** 别名写错时，尽量说出「差在哪」 */
function aliasAdvice(want, got) {
  const w = norm(want)
  const g = norm(got)
  if (w.replace(/_/g, '') === g.replace(/_/g, '')) return '看着像是下划线的问题'
  if (g.replace(/\s/g, '') === w.replace(/\s/g, '')) return '中间多了空格'
  if (lev(w, g) <= 2) return '拼写很接近了，注意每个字母'
  if (w.startsWith(g) || g.startsWith(w)) return '少了几个字符'
  return null
}

export function judge(expected, actual, level) {
  const step = level.tolerance ?? 0.005
  const expKeys = makeKeys(expected.rows, step)
  const actKeys = makeKeys(actual.rows, step)
  const expCols = expected.columns.map(String)
  const actCols = actual.columns.map(String)

  /* ---------- 1. 列数：说清楚多了/少了哪一列 ---------- */
  if (expCols.length !== actCols.length) {
    const expSet = new Set(expCols.map(norm))
    const actSet = new Set(actCols.map(norm))
    const missing = expCols.filter((c) => !actSet.has(norm(c)))
    const extra = actCols.filter((c) => !expSet.has(norm(c)))

    if (actCols.length < expCols.length) {
      const which = missing.length && missing.length <= 5 ? `少的是：${list(missing)}。` : ''
      return {
        pass: false,
        kind: 'columns',
        reason: `你只返回了 ${actCols.length} 列，这一关要求 ${expCols.length} 列。${which ? '\n' + which : ''}`,
        tip: `要求的列是：${list(expCols)}（按这个顺序）。`
      }
    }
    return {
      pass: false,
      kind: 'columns',
      reason:
        `你返回了 ${actCols.length} 列，这一关只要求 ${expCols.length} 列。` +
        (extra.length && extra.length <= 5 ? `\n多了：${list(extra)}。` : ''),
      tip: `只要这几列，顺序也别换：${list(expCols)}。`
    }
  }

  /* ---------- 2. 列名（别名）：说清楚哪一列叫什么 ---------- */
  if (level.compareColumnNames) {
    const bad = []
    for (let i = 0; i < expCols.length; i++) {
      if (norm(expCols[i]) === norm(actCols[i])) continue
      const advice = aliasAdvice(expCols[i], actCols[i])
      bad.push(`第 ${i + 1} 列要求叫 \`${expCols[i]}\`，你写的是 \`${actCols[i]}\`${advice ? `（${advice}）` : ''}`)
    }
    if (bad.length) {
      return {
        pass: false,
        kind: 'alias',
        reason: `数字对了，但表头名字不对：\n${bad.join('\n')}`,
        tip: '别名用 AS 起：列名 AS 要求的名字，比如 name AS product_name。'
      }
    }
  }

  /* ---------- 3. 行数 ---------- */
  if (expected.rows.length !== actual.rows.length) {
    const more = actual.rows.length > expected.rows.length
    return {
      pass: false,
      kind: 'rows',
      reason: `行数不对：要求 ${expected.rows.length} 行，你返回了 ${actual.rows.length} 行。`.replace('要求', '这一关要'),
      tip: more
        ? '多了说明筛得不够狠：检查 WHERE 是不是少了条件，或者忘了 DISTINCT / LIMIT。'
        : '少了说明筛得太狠：检查条件是不是写太严，多表关联时也别把该留的行筛掉了。'
    }
  }

  if (expKeys.every((k, i) => k === actKeys[i])) return { pass: true }

  /* ---------- 4. 内容不一致 ---------- */
  const multiset = (keys) => {
    const m = new Map()
    keys.forEach((k, i) => {
      const arr = m.get(k) || []
      arr.push(i)
      m.set(k, arr)
    })
    return m
  }
  const expMap = multiset(expKeys)
  const actMap = multiset(actKeys)
  const missing = []
  const extra = []
  for (const [k, idxs] of actMap) {
    const left = idxs.length - (expMap.get(k)?.length || 0)
    for (let i = 0; i < left; i++) extra.push(idxs[i])
  }
  for (const [k, idxs] of expMap) {
    const left = idxs.length - (actMap.get(k)?.length || 0)
    for (let i = 0; i < left; i++) missing.push(idxs[i])
  }

  // 内容完全一致，只是顺序不同
  if (!missing.length && !extra.length) {
    if (!level.orderSensitive) return { pass: true }
    const first = expKeys.findIndex((k, i) => k !== actKeys[i])
    return {
      pass: false,
      kind: 'order',
      reason: `数据都对了，但顺序不对（从第 ${first + 1} 行开始不一样）。`,
      tip: '这一关要求排序。检查 ORDER BY 用的字段，以及是升序还是降序（DESC 是从大到小）。',
      expected,
      actual
    }
  }

  // 单行：把两个数直接摆出来，比看差异表好懂
  const fmtRow = (row) => row.map((v) => (v === null ? 'NULL' : String(v))).join('  |  ')
  if (expected.rows.length === 1 && actual.rows.length === 1) {
    const cols = expCols.map((c, i) => `${c}：要求 ${fmtSingle(expected.rows[0][i])}，你算出 ${fmtSingle(actual.rows[0][i])}`)
    return {
      pass: false,
      kind: 'values',
      reason: `算出来的数不对。\n${cols.join('\n')}`,
      tip: '对照任务说明里的口径，检查筛选条件和聚合范围。',
      expected,
      actual
    }
  }

  return {
    pass: false,
    kind: 'diff',
    reason: `结果对不上：少了 ${missing.length} 行，多了 ${extra.length} 行。`,
    tip:
      '点开「差异分析」，看看具体是哪些行不一样。' +
      (level.orderSensitive ? '\n如果是排序方向写反了，检查 ORDER BY 后面要不要加 DESC（从大到小）。' : ''),
    expected,
    actual,
    missingRows: missing.map((i) => expected.rows[i]),
    extraRows: extra.map((i) => actual.rows[i])
  }
}

const fmtSingle = (v) => (v === null ? 'NULL' : typeof v === 'number' ? String(Math.round(v * 10000) / 10000) : String(v))

/**
 * 对玩家的 SQL 做一次「体检」，给出针对性的可能原因。
 * 这是给零基础用户最值钱的部分：不告诉他答案，但告诉他大概错在哪。
 */
export function diagnose(playerSql, level) {
  const mine = String(playerSql || '')
  const ref = String(level.referenceSql || '')
  const has = (sql, re) => re.test(sql)
  const mineUp = mine.toUpperCase()
  const refUp = ref.toUpperCase()
  const out = []

  if (/[，。；：（）“”‘’]/.test(mine)) out.push('SQL 里只能用英文标点：把中文的逗号、括号、引号换成英文的。')
  if (/[‘’“”]|'[^']*[，。]'/.test(mine)) out.push("字符串要用英文单引号包起来，比如 '小红书'。")

  if (/\bIS\s+NOT\s+NULL\b/i.test(ref) === false && /=\s*NULL/i.test(mine)) {
    out.push('判断空值不能用 = NULL，要用 IS NULL——否则永远匹配不到任何行。')
  }
  if (/\bIS\s+NULL\b/i.test(ref) && !/IS\s+NULL/i.test(mine) && /=\s*NULL/i.test(mine)) {
    out.push('判断空值不能用 = NULL，要用 IS NULL。')
  }
  if (has(refUp, /\bWHERE\b/) && !has(mineUp, /\bWHERE\b/)) {
    out.push('这一关要先把符合条件的行筛出来，你的 SQL 里没有 WHERE。')
  }
  if (has(refUp, /STATUS\s*=\s*'PAID'/) && !/STATUS\s*=\s*'PAID'/i.test(mine)) {
    out.push("还没有过滤订单状态。表里混着已取消、已退款的订单，只算已支付的：WHERE status = 'paid'。")
  }
  if (has(refUp, /\bGROUP BY\b/) && !has(mineUp, /\bGROUP BY\b/)) {
    out.push('这一关要「分组统计」，你的 SQL 里没有 GROUP BY。')
  }
  if (has(refUp, /\bJOIN\b/) && !has(mineUp, /\bJOIN\b/)) {
    out.push('要用的字段不在一张表里，需要用 JOIN 把两张表接起来。')
  }
  if (has(refUp, /\bHAVING\b/) && !has(mineUp, /\bHAVING\b/)) {
    out.push('筛选分组结果要用 HAVING，不是 WHERE。')
  }
  if (has(refUp, /\bDISTINCT\b/) && !has(mineUp, /\bDISTINCT\b/)) {
    out.push('这一关要去重，试试在列名前面加 DISTINCT。')
  }
  if (has(refUp, /\bLIMIT\b/) && !has(mineUp, /\bLIMIT\b/)) {
    out.push('这一关只需要一部分结果，记得用 LIMIT 限制行数。')
  }
  if (has(refUp, /\bORDER BY\b/) && !has(mineUp, /\bORDER BY\b/)) {
    out.push('这一关要求排序，需要写 ORDER BY。')
  }
  if (/\bORDER BY\b/i.test(ref) && /\bDESC\b/i.test(ref) && /\bORDER BY\b/i.test(mine) && !/\bDESC\b/i.test(mine)) {
    out.push('排序方向：这一关要从大到小，ORDER BY 后面要加 DESC。')
  }
  if (/\bORDER BY\b/i.test(ref) && !/\bDESC\b/i.test(ref) && /\bDESC\b/i.test(mine)) {
    out.push('这一关是从小到大排，不要写 DESC。')
  }
  if (level.compareColumnNames && !/\bAS\b/i.test(mine)) {
    out.push('表头名字有要求时，用 AS 起别名：列名 AS 要求的名字。')
  }
  if (has(refUp, /\bROUND\b/) && !has(mineUp, /\bROUND\b/)) {
    out.push('结果要保留指定的小数位，用 ROUND(值, 位数)。')
  }
  if (refUp.includes('COUNT(DISTINCT') && !mineUp.includes('COUNT(DISTINCT')) {
    out.push('同一个人/同一张订单只能算一次，人数或订单数要用 COUNT(DISTINCT 字段)。')
  }

  return [...new Set(out)].slice(0, 4)
}
