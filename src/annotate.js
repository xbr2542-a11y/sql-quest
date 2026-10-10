/**
 * 把一条 SQL 拆成带颜色的片段，并用大白话解释里面出现的关键字。
 * 用途：零基础玩家看不懂 SELECT / FROM / WHERE 时，旁边直接给中文意思。
 */

const KEYWORDS = {
  SELECT: '要从表里取出哪些列',
  FROM: '从哪张表里取',
  WHERE: '只保留满足条件的行',
  'GROUP BY': '把这些行按某一列归成几组',
  HAVING: '分组之后再筛掉不合格的组',
  'ORDER BY': '按某一列排序',
  LIMIT: '只看前几条',
  AS: '给这一列起个新名字',
  AND: '两个条件都要满足',
  OR: '满足其中一个就行',
  IN: '在给定的几个值里面',
  LIKE: '按模糊的样子匹配文字',
  DISTINCT: '重复的值只留一个',
  JOIN: '把另一张表接进来',
  ON: '两张表按什么条件接',
  'IS NULL': '判断这个位置是空的',
  'IS NOT NULL': '判断这个位置不是空的',
  DESC: '从大到小',
  ASC: '从小到大',
  'CASE WHEN': '按条件分成几种情况',
  THEN: '满足条件时取这个值',
  ELSE: '不满足时取这个值',
  END: '结束这段判断',
  NULL: '空值（没有记录）',
  SUM: '把这一列的数字加起来',
  COUNT: '数一数有多少行',
  AVG: '求平均值',
  ROUND: '保留几位小数',
  strftime: '把时间切成想要的粒度，比如按月',
  '*': '所有列'
}

const MULTI = ['GROUP BY', 'ORDER BY', 'IS NOT NULL', 'IS NULL', 'CASE WHEN']

export function annotate(sql) {
  const tokens = []
  const src = String(sql || '')
  let i = 0
  while (i < src.length) {
    const c = src[i]
    const rest = src.slice(i)
    if (/\s/.test(c)) {
      let j = i
      while (j < src.length && /\s/.test(src[j])) j++
      tokens.push({ t: 'ws', v: src.slice(i, j) })
      i = j
      continue
    }
    if (c === "'") {
      let j = i + 1
      while (j < src.length && src[j] !== "'") j++
      tokens.push({ t: 'str', v: src.slice(i, Math.min(j + 1, src.length)) })
      i = j + 1
      continue
    }
    if (/[0-9]/.test(c)) {
      let j = i
      while (j < src.length && /[0-9.]/.test(src[j])) j++
      tokens.push({ t: 'num', v: src.slice(i, j) })
      i = j
      continue
    }
    if (/[A-Za-z_\u4e00-\u9fa5]/.test(c)) {
      const upperRest = rest.toUpperCase()
      const multi = MULTI.find((m) => upperRest.startsWith(m) && /[^A-Z_]/.test(rest.slice(m.length, m.length + 1) || ' '))
      if (multi) {
        tokens.push({ t: 'kw', v: src.slice(i, i + multi.length), k: multi })
        i += multi.length
        continue
      }
      let j = i
      while (j < src.length && /[A-Za-z0-9_\u4e00-\u9fa5]/.test(src[j])) j++
      const word = src.slice(i, j)
      const up = word.toUpperCase()
      if (KEYWORDS[up]) tokens.push({ t: 'kw', v: word, k: up })
      else if (KEYWORDS[word]) tokens.push({ t: 'fn', v: word, k: word })
      else if (['MIN', 'MAX', 'COALESCE'].includes(up)) tokens.push({ t: 'fn', v: word })
      else tokens.push({ t: 'id', v: word })
      i = j
      continue
    }
    if (c === '*') {
      tokens.push({ t: 'kw', v: '*', k: '*' })
      i++
      continue
    }
    tokens.push({ t: 'punc', v: c })
    i++
  }

  const seen = new Set()
  const legend = []
  for (const tk of tokens) {
    if ((tk.t === 'kw' || tk.t === 'fn') && tk.k && KEYWORDS[tk.k] && !seen.has(tk.k)) {
      seen.add(tk.k)
      legend.push([tk.v, KEYWORDS[tk.k]])
    }
  }
  return { tokens, legend: legend.slice(0, 8) }
}
