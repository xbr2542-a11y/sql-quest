/**
 * 给零基础玩家的三件工具：
 *  1. 结构模板：这一关的 SQL「长什么形状」（不泄露列名和取值）
 *  2. 值清单：本关可能用到的字面值，点一下就插入，不用手打引号
 *  3. 实时体检：一边写一边告诉你格式有没有问题，而不是等执行才报错
 */

const CLAUSES = [
  ['SELECT', /\bSELECT\b/i],
  ['FROM', /\bFROM\b/i],
  ['JOIN', /\bJOIN\b/i],
  ['WHERE', /\bWHERE\b/i],
  ['GROUP BY', /\bGROUP BY\b/i],
  ['HAVING', /\bHAVING\b/i],
  ['ORDER BY', /\bORDER BY\b/i],
  ['LIMIT', /\bLIMIT\b/i]
]

/** 这条 SQL 用了哪些子句，按固定顺序 */
export function clauseList(sql) {
  const s = String(sql || '')
  return CLAUSES.filter(([, re]) => re.test(s)).map(([name]) => name)
}

/** 只给「形状」，不给内容：SELECT __ FROM __ WHERE __ */
export function clauseTemplate(sql) {
  return clauseList(sql)
    .map((c) => `${c} __`)
    .join(' ')
}

/** 从参考 SQL 里抠出所有字面值，让玩家点一下就能插入（连引号一起给） */
export function literalsOf(sql) {
  const out = []
  const seen = new Set()
  for (const m of String(sql || '').matchAll(/'([^']*)'/g)) {
    if (seen.has(m[0])) continue
    seen.add(m[0])
    out.push({ text: m[0], note: '文字值要带英文单引号' })
  }
  if (/\bNULL\b/.test(String(sql || '')) && !seen.has('NULL')) {
    seen.add('NULL')
    out.push({ text: 'NULL', note: 'NULL 不加引号，它表示「空」' })
  }
  return out
}

const PLACEHOLDER = /要看的列|表名|筛选条件|分组|排序|只要前几条|两张表怎么对应|__/

/** 实时体检：一边写一边提示，不是等执行才报错 */
export function lintSql(text, level) {
  const s = String(text || '')
  if (!s.trim()) return []
  const out = []

  // 标点和引号的问题交给 analyzeSyntax（它能指出具体位置），这里只管结构
  if (PLACEHOLDER.test(s)) {
    out.push({ kind: 'info', msg: '模板里的中文说明还没替换成真实内容' })
  }
  if (!/\bSELECT\b/i.test(s)) {
    out.push({ kind: 'info', msg: '查询要以 SELECT 开头——告诉数据库「我要看什么」' })
  } else if (/\bFROM\b/i.test(s)) {
    // 只在结构有点样子之后才提醒缺什么，避免刚敲两个字就一堆提示
    const mine = clauseList(s)
    for (const c of clauseList(level?.referenceSql)) {
      if (c !== 'SELECT' && !mine.includes(c)) {
        out.push({ kind: 'info', msg: `这一关还需要 ${c}` })
      }
    }
  }

  return out.slice(0, 3)
}

/**
 * 编辑器上方的快捷词。刻意只留最基础的几个：给的是「关键字」，不是「整句话」。
 * 写完 SELECT 之后要填什么，仍然得自己想。
 */
export const BASIC_BLOCKS = [
  { label: 'SELECT', insert: 'SELECT ', why: 'SELECT：我要看什么。' },
  { label: 'FROM', insert: 'FROM ', why: 'FROM：从哪张表拿。' },
  { label: 'WHERE', insert: 'WHERE ', why: 'WHERE：把不符合条件的行剔除掉。' },
  { label: 'AND', insert: 'AND ', why: 'AND：两个条件都要满足。' },
  { label: 'OR', insert: 'OR ', why: 'OR：满足其中一个就算。' }
]
