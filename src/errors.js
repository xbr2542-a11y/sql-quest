/** 把 SQLite 的英文报错翻译成人话，并尽量给出「你是不是想写…」的建议 */

import { TABLES } from './schema.js'

const ALL_COLUMNS = TABLES.flatMap((t) => t.columns.map((c) => c[0]))
const ALL_TABLES = TABLES.map((t) => t.name)

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

function nearest(word, pool, max = 3) {
  const w = word.toLowerCase()
  return [...new Set(pool)]
    .map((p) => ({ p, d: lev(w, p.toLowerCase()) }))
    .filter((x) => x.d <= Math.max(2, Math.floor(w.length / 3)))
    .sort((a, b) => a.d - b.d)
    .slice(0, max)
    .map((x) => x.p)
}

export function translateError(raw, sqlText = '') {
  const msg = String(raw || '').replace(/^Error:\s*/, '')
  let m

  if ((m = msg.match(/no such table:\s*(\S+)/i))) {
    const tables = nearest(m[1], ALL_TABLES)
    return {
      title: `没有找到表 ${m[1]}`,
      detail:
        `库里没有叫 ${m[1]} 的表。` +
        (tables.length ? `你是不是想写 ${tables.map((t) => `\`${t}\``).join(' 或 ')}？` : '') +
        `\n可用的表：${ALL_TABLES.join('、')}`
    }
  }

  if ((m = msg.match(/no such column:\s*(\S+)/i))) {
    const word = m[1].split('.').pop()
    const cols = nearest(word, ALL_COLUMNS)
    return {
      title: `没有找到字段 ${m[1]}`,
      detail:
        `没有这个字段。` +
        (cols.length ? `你是不是想写 ${cols.map((c) => `\`${c}\``).join(' 或 ')}？` : '') +
        `\n可以在右侧「表结构」里点开对应表，字段名可以直接点。`
    }
  }

  if ((m = msg.match(/no such function:\s*(\S+)/i))) {
    return {
      title: `没有这个函数 ${m[1]}`,
      detail: `SQLite 里没有 \`${m[1]}\` 这个函数。常用的是 SUM / COUNT / AVG / MAX / MIN / ROUND / strftime。`
    }
  }

  if ((m = msg.match(/ambiguous column name:\s*(\S+)/i))) {
    return {
      title: `字段 ${m[1]} 有歧义`,
      detail: `多个表里都有 \`${m[1]}\` 这个字段，SQL 不知道该用哪张表的。\n解决办法：在字段名前面加上表别名，比如 \`o.${m[1]}\`。`
    }
  }

  if ((m = msg.match(/near "(.+?)":\s*syntax error/i))) {
    const nearby = m[1]
    let guess = '常见原因：少了逗号、关键字拼错、字符串忘了加单引号。'
    if (/^[\u4e00-\u9fa5]/.test(nearby)) guess = '中文字符串要用单引号包起来，例如 \'小红书\'。'
    else if (/[，。；：（）]/.test(nearby)) guess = 'SQL 里要用英文标点，不能写中文的逗号、括号、引号。'
    else if (/^(from|where|group|order|select|join)$/i.test(nearby)) guess = `\`${nearby}\` 前面可能少了一个逗号或表名。`
    return { title: `语法错误：${nearby} 附近`, detail: `${guess}\n出错位置：… ${nearby} …` }
  }

  if (/incomplete input/i.test(msg)) {
    return {
      title: 'SQL 好像没写完',
      detail: '通常是括号没闭合、少了一个右括号，或者最后多了一个逗号。'
    }
  }

  if (/misuse of aggregate/i.test(msg)) {
    return {
      title: '聚合函数用错地方了',
      detail: 'SUM / COUNT 这类函数是把多行合成一行，不能直接写在 WHERE 里。要在分组之后做筛选，请用 HAVING。'
    }
  }

  if (/wrong number of arguments/i.test(msg)) {
    return { title: '函数的参数个数不对', detail: '检查一下括号里该给几个参数，比如 ROUND(值, 小数位数) 需要两个。' }
  }

  if (/^\s*$/i.test(sqlText) || /no statement/i.test(msg)) {
    return { title: '还没有写 SQL', detail: '在编辑器里写一条查询语句，再点「执行」或按 Ctrl + Enter。' }
  }

  return { title: '执行出错', detail: msg }
}

export function noResultHint(sqlText) {
  if (/^\s*(insert|update|delete|create|drop|alter|begin|commit)/i.test(sqlText)) {
    return {
      title: '这条语句没有返回结果表格',
      detail: '关卡要的是一条查询语句（以 SELECT 开头），它应该返回一个结果表格。'
    }
  }
  return {
    title: '没有拿到结果表格',
    detail: '这条 SQL 执行成功，但没有返回任何结果。关卡需要一条 SELECT 查询。'
  }
}
