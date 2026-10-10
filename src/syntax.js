/**
 * SQL 语法体检：在报错之前，先拿玩家自己写的句子做检查，
 * 直接告诉他「你这句话的哪一段有问题、应该怎么改」。
 *
 * 面向的是完全零基础的人：不说「常见原因可能是」，只说他这句里的具体位置，
 * 以及键盘上该怎么操作（比如中文标点要按 Shift 切换输入法）。
 *
 * 覆盖新手最常踩、而 SQLite 报错完全看不懂的几类：
 *   1. 中文标点（最常见，SQLite 报的位置还特别误导）
 *   2. 列与列之间忘了逗号（或者干脆连成一串）
 *   3. 表名和字段名粘在一起（products_name）
 *   4. 末尾多了逗号
 *   5. AS 前面没有列名 / 连着写两个 AS
 *   6. 表名不存在
 *   7. 引号没配对
 *   8. 缺 FROM
 */

import { TABLES } from './schema.js'

const TABLE_NAMES = TABLES.map((t) => t.name)
const COLUMN_NAMES = [...new Set(TABLES.flatMap((t) => t.columns.map((c) => c[0])))]
const CLAUSE_WORDS = ['FROM', 'WHERE', 'GROUP', 'HAVING', 'ORDER', 'LIMIT', 'JOIN', 'LEFT', 'RIGHT', 'INNER']
const KEYWORDS = new Set([
  'SELECT','FROM','WHERE','GROUP','BY','HAVING','ORDER','LIMIT','AS','AND','OR','NOT','IN','LIKE','IS','NULL',
  'DESC','ASC','JOIN','LEFT','RIGHT','INNER','OUTER','ON','DISTINCT','CASE','WHEN','THEN','ELSE','END','BETWEEN','*'
])
const FUNCS = new Set(['COUNT','SUM','AVG','MIN','MAX','ROUND','STRFTIME','SUBSTR','INSTR','IFNULL','COALESCE','CAST','REAL'])

/** 按分隔符切分，忽略括号内和引号内 */
function splitTop(s, sep = ',') {
  const out = []
  let buf = ''
  let depth = 0
  let quote = false
  for (const ch of s) {
    if (ch === "'") quote = !quote
    if (!quote) {
      if (ch === '(') depth++
      else if (ch === ')') depth = Math.max(0, depth - 1)
      else if (ch === sep && depth === 0) {
        out.push(buf)
        buf = ''
        continue
      }
    }
    buf += ch
  }
  out.push(buf)
  return out
}

/** 按空格切分，括号内和引号内不切 —— ROUND(SUM(x), 2) 算一个整体 */
function wordsTop(s) {
  const out = []
  let buf = ''
  let depth = 0
  let quote = false
  const push = () => {
    if (buf.trim()) out.push(buf.trim())
    buf = ''
  }
  for (const ch of s) {
    if (ch === "'") quote = !quote
    if (!quote) {
      if (ch === '(') depth++
      else if (ch === ')') depth = Math.max(0, depth - 1)
    }
    if (/\s/.test(ch) && depth === 0 && !quote) push()
    else buf += ch
  }
  push()
  return out
}

const clean = (w) => String(w || '').replace(/[;,()]/g, '').replace(/^[a-z]+\./i, '')
const isKnownColumn = (w) => COLUMN_NAMES.includes(clean(w).toLowerCase())
const isKnownTable = (w) => TABLE_NAMES.includes(clean(w).toLowerCase())
const isBare = (w) => /^[\w.*]+$/.test(w) && !KEYWORDS.has(w.toUpperCase()) && !FUNCS.has(w.toUpperCase())
const quote = (s) => `\`${s}\``

function lev(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 0; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return dp[a.length][b.length]
}
const near = (list, word, max = 3) => {
  const w = String(word || '').toLowerCase()
  return list
    .map((x) => ({ x, d: lev(w, x) }))
    .filter((o) => o.d <= Math.max(2, Math.floor(w.length / 3)))
    .sort((a, b) => a.d - b.d)
    .slice(0, max)
    .map((o) => o.x)
}

/** 把一个连在一起的长词拆成已知字段名（namepricecategory → name | price | category） */
function splitIntoColumns(word) {
  const w = String(word || '').toLowerCase()
  if (w.length < 6) return []
  const found = []
  let i = 0
  while (i < w.length) {
    const hit = COLUMN_NAMES.filter((c) => c.length >= 3 && w.startsWith(c, i)).sort((a, b) => b.length - a.length)[0]
    if (!hit) return []
    found.push(hit)
    i += hit.length
  }
  return found.length >= 2 ? found : []
}

/** 把「挤在一起的几列」切开：在「别名 之后、下一个 列名 AS 之前」切 */
function splitMergedColumns(raw, words, asCount) {
  if (asCount === 0) {
    const bare = words.filter(isBare)
    return bare.length >= 2 ? bare : null
  }
  const groups = String(raw)
    .split(/(?<=\S)\s+(?=[\w.*]+\s+AS\b)/i)
    .map((s) => s.trim())
    .filter(Boolean)
  return groups.length >= 2 ? groups : null
}

/** 把 SELECT 之后的文本按子句切开 */
function parseClauses(sql) {
  const up = sql.toUpperCase()
  const si = up.search(/\bSELECT\b/)
  if (si < 0) return null
  const rest = sql.slice(si + 6)
  const upRest = rest.toUpperCase()
  let fi = -1
  let depth = 0
  let quoteOpen = false
  for (let i = 0; i < rest.length; i++) {
    const ch = rest[i]
    if (ch === "'") quoteOpen = !quoteOpen
    if (quoteOpen) continue
    if (ch === '(') depth++
    else if (ch === ')') depth = Math.max(0, depth - 1)
    else if (depth === 0 && upRest.startsWith('FROM', i) && /\s|$/.test(rest[i + 4] || ' ')) {
      fi = i
      break
    }
  }
  if (fi < 0) return { selectList: rest, fromClause: null }
  return { selectList: rest.slice(0, fi), fromClause: rest.slice(fi + 4) }
}

/** FROM/JOIN 后面第一个词是表名 */
function tableTokens(fromClause) {
  const words = wordsTop(fromClause)
  const out = []
  let expectTable = true
  for (const w of words) {
    const up = w.toUpperCase()
    if (expectTable) {
      out.push(clean(w))
      expectTable = false
      continue
    }
    if (up === 'JOIN') expectTable = true
    if (CLAUSE_WORDS.includes(up) && up !== 'JOIN') break
  }
  return out.filter(Boolean)
}

export function analyzeSyntax(sqlText) {
  const sql = String(sqlText || '')
  const findings = []
  if (!sql.trim()) return findings
  // pri 越小越靠前：先说他最该动手改的那处
  const push = (title, detail, pri = 50) => findings.push({ title, detail, pri })

  /* 1. 中文标点：SQLite 报错位置很误导，所以优先说清楚 */
  const cn = sql.match(/[，。；：、（）【】「」“”‘’]/g)
  if (cn) {
    const chars = [...new Set(cn)].join(' ')
    const idx = sql.search(/[，。；：、（）【】「」“”‘’]/)
    const around = sql.slice(Math.max(0, idx - 16), idx + 16).replace(/\s+/g, ' ')
    push(
      `你打的是中文标点 ${chars}`,
      `位置在这里：…${around}…\n键盘上按一下 Shift 就能切换中英文输入法。切换成英文之后，逗号才是 ,（英文逗号），引号才是 ' （英文单引号）。`,
      10
    )
  }

  const parsed = parseClauses(sql)

  /* 2. SELECT 里列与列之间的问题 */
  if (parsed && parsed.selectList.trim()) {
    const raw = parsed.selectList.trim()
    const parts = splitTop(raw, ',')
    const words = wordsTop(raw)
    const asCount = words.filter((w) => w.toUpperCase() === 'AS').length

    // 连着两个 AS
    const doubleAs = raw.match(/\bAS\s+AS\b/i)
    if (doubleAs) {
      push('这里连着写了两个 AS', `你写的是：${quote(raw.match(/.{0,18}\bAS\s+AS\b.{0,18}/i)?.[0] || 'AS AS')}\n一个别名只要一个 AS：列名 AS 别名。`, 60)
    }

    // 一个 AS 前面没有列名
    const firstWords = wordsTop(parts[0] || '')
    if (firstWords[0] && firstWords[0].toUpperCase() === 'AS') {
      push('AS 前面少了一个列名', 'AS 的左边必须紧跟一个列名或表达式，右边才是它的别名，比如：name AS product_name。', 60)
    }

    // 末尾多余逗号
    if (/,\s*$/.test(raw)) {
      push('最后一个列名后面多了逗号', `你写的是：${quote(raw.slice(-24))}\n逗号只写在两列之间，最后一列后面不能再写。`, 60)
    }

    if (!doubleAs) {
      if (parts.length === 1) {
        // 一整段里挤了好几列：靠 AS 数量判断，或者靠「裸词数量」判断
        const bare = words.filter(isBare)
        const merged = asCount >= 2 || (asCount === 0 && bare.length >= 2)
        if (merged) {
          const groups = splitMergedColumns(raw, words, asCount) || [raw]
          push(
            '列和列之间少了逗号',
            groups.length > 1
              ? `你在 SELECT 后面把好几列挤在了一起：\n${groups.map((g) => quote(g)).join('  ')}\n每一列之间要用英文逗号隔开（键盘上字母 M 右边那个键，中文输入法下打出来的是「，」）。改完是这样：\n${groups.join(' , ')}`
              : `SELECT 后面这一串看起来不止一列：\n${quote(raw)}\n每一列之间要用英文逗号隔开，写成：列名 , 列名 , 列名`,
            40
          )
        } else if (bare.length === 1 && !isKnownColumn(bare[0]) && splitIntoColumns(bare[0]).length >= 2) {
          const cols = splitIntoColumns(bare[0])
          push(
            '这一段是几个字段名连在一起了',
            `你写的是：${quote(bare[0])}\n看起来是把 ${cols.map((c) => quote(c)).join('、')} 连成了一串。字段名之间要用英文逗号隔开：\n${cols.join(' , ')}`,
            40
          )
        }
      }
    }
  }

  /* 3. 表名 */
  if (parsed?.fromClause) {
    const fromWords = wordsTop(parsed.fromClause)
    // 先看表名本身对不对（这是最该先改的）
    for (const t of tableTokens(parsed.fromClause)) {
      if (isKnownTable(t)) continue
      const glued = TABLE_NAMES.find((tb) => t.toLowerCase().startsWith(tb + '_'))
      if (glued) {
        const rest = t.slice(glued.length + 1)
        push(
          `${quote(t)} 不是表，也不像字段`,
          `看起来是把表名 ${quote(glued)} 和字段名 ${quote(rest)} 粘在一起了。这两个要分开写：\n表名放在 FROM 后面，字段名放在 SELECT 后面 ——\nSELECT ${rest} FROM ${glued}`,
          20
        )
      } else {
        const guess = near(TABLE_NAMES, t)
        push(
          `没有叫 ${quote(t)} 的表`,
          `库里只有这些表：${TABLE_NAMES.map((x) => quote(x)).join('、')}。` +
            (guess.length ? `\n你是不是想写 ${guess.map((g) => quote(g)).join(' 或 ')}？` : ''),
          20
        )
      }
    }
    // 表名后面写了不止一个 AS
    const clauseEnd = fromWords.findIndex((w, i) => i > 0 && ['WHERE', 'GROUP', 'ORDER', 'LIMIT'].includes(w.toUpperCase()))
    const region = clauseEnd < 0 ? fromWords : fromWords.slice(0, clauseEnd)
    const asInFrom = region.filter((w) => w.toUpperCase() === 'AS').length
    if (asInFrom >= 2) {
      push(
        'FROM 后面多了东西',
        `你在 FROM 后面写了：${quote(region.join(' ').slice(0, 52))}\nFROM 后面只需要表名，最多再跟一个表别名（FROM products AS p）。那些带 AS 的列和别名，应该写在 SELECT 后面，中间用逗号隔开。`,
        30
      )
    }
  } else if (parsed) {
    push('还缺 FROM', 'SELECT 说的是「要看什么」，还要用 FROM 说明「从哪张表拿」，写法是：SELECT 列名 FROM 表名。', 30)
  }

  /* 4. 引号没配对 */
  if ((sql.match(/'/g) || []).length % 2 === 1) {
    push('单引号没有配对', "文字值要用一对英文单引号包起来，比如 'paid'。这句话里少了一个 '（在英文输入法下打）。", 70)
  }

  return findings.sort((a, b) => a.pri - b.pri).slice(0, 3)
}

/** 从参考 SQL 推出这一关的「语法要点」，显示在任务卡上，先教规则再让他写 */
export function syntaxTips(referenceSql) {
  const sql = String(referenceSql || '')
  const tips = []
  const parsed = parseClauses(sql)
  if (parsed?.selectList) {
    const parts = splitTop(parsed.selectList.trim(), ',')
    if (parts.length >= 2) tips.push('列与列之间用英文逗号 , 隔开')
    if (/\bAS\b/i.test(parsed.selectList)) tips.push('别名用 AS 连接：列名 AS 别名')
  }
  if (/'[^']*'/.test(sql)) tips.push("文字值要加英文单引号：'paid'")
  if (/\bIS\s+NULL\b/i.test(sql)) tips.push('判断空值用 IS NULL，不要写 = NULL')
  if (/\bGROUP\s+BY\b/i.test(sql)) tips.push('要分组统计时先写 GROUP BY')
  if (/\bORDER\s+BY\b/i.test(sql)) tips.push('排序用 ORDER BY，DESC 是从大到小')
  if (/\bJOIN\b/i.test(sql)) tips.push('跨两张表用 JOIN ... ON 说明怎么对应')
  return tips.slice(0, 3)
}
