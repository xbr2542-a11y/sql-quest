/**
 * 符号词典：SQL 里那些「特殊字符」到底是干什么的、什么时候写、什么时候不写。
 * 零基础玩家最先卡住的往往不是语法结构，而是 * , ' = ( ) % 这些符号。
 * 每个符号都必须回答四个问题：它是什么、什么时候用、什么时候不用、用错会怎样。
 */

export const SYMBOLS = [
  {
    char: '*',
    name: '星号',
    what: '「所有列」的简写。写在 SELECT 后面，表示整张表的列我全要。',
    when: '你不确定要看哪些列，或者就是想看看整张表长什么样的时候。',
    whenNot: '只要其中几列时，绝对不能写它——写星号会把所有列都要回来，列数对不上就算错。这时候要把列名一个个写出来，中间用英文逗号隔开。',
    ex: { code: 'SELECT * FROM products', note: '看 products 的全部列' },
    bad: { code: 'SELECT * FROM products', note: '只想要 name 和 price 两列时，这样写就错了 → 要写 SELECT name, price FROM products' }
  },
  {
    char: ',',
    name: '英文逗号',
    what: '把要看的几列分开。',
    when: 'SELECT 后面写了两个以上的列名时，列与列之间必须有逗号。',
    whenNot: '最后一个列名后面不要写逗号，会报错。',
    ex: { code: 'SELECT name, price FROM products', note: '两列之间一个逗号' },
    bad: { code: 'SELECT name price FROM products', note: '中间没有逗号 → 数据库看不懂' }
  },
  {
    char: "'",
    name: '英文单引号',
    what: '把「文字值」包起来。',
    when: "比较文字内容的时候，比如 channel = '小红书'、status = 'paid'。",
    whenNot: '数字不用加引号（price > 100）；字段名和表名也不用加引号。',
    ex: { code: "WHERE status = 'paid'", note: '文字值 paid 用单引号' },
    bad: { code: 'WHERE status = paid', note: '没加引号 → 数据库会以为 paid 是一个字段名' }
  },
  {
    char: '=',
    name: '等号（以及 >= <=）',
    what: '比较两边是不是相等；加上 > < 就是比大小。',
    when: "筛条件，比如 status = 'paid'、price >= 100、order_time <= '2026-06-20'。",
    whenNot: '判断「空值」时不能用等号，要写 IS NULL。',
    ex: { code: "WHERE status = 'paid'", note: '只保留已支付的订单' },
    bad: { code: 'WHERE channel = NULL', note: '空值不能用 = 判断 → 要写 IS NULL' }
  },
  {
    char: 'AS',
    name: 'AS（别名）',
    what: '给一列起个新名字，结果表的表头就变成这个名字。',
    when: '要求里点名要某个表头时（比如要求 product_name），就写 列名 AS product_name。',
    whenNot: '不需要改表头时可以省略。',
    ex: { code: 'SELECT name AS product_name FROM products', note: '把 name 这列改名成 product_name' },
    bad: { code: 'SELECT name AS product_name price AS price', note: '两列之间少了逗号' }
  },
  {
    char: '_',
    name: '下划线',
    what: '字段名和表名的一部分，不是空格。',
    when: '字段名本身就这么写，比如 product_id、order_time、total_amount。要照着左边表结构里的名字原样打。',
    whenNot: '不要自己把表名和字段名连起来：products 表的 name 列不是 products_name，它是 products 这张表里的 name 列。',
    ex: { code: 'SELECT order_id, order_time FROM orders', note: '字段名里本来就有下划线' },
    bad: { code: 'FROM products_name', note: '把表名和字段名粘在一起了' }
  },
  {
    char: '%',
    name: '百分号',
    what: '模糊匹配的「任意内容」，只在 LIKE 里用。',
    when: "要找名字里包含某段文字时，比如 name LIKE '%蓝牙%'。",
    whenNot: '精确匹配不要用 LIKE，直接用等号。',
    ex: { code: "WHERE name LIKE '%蓝牙%'", note: '名字里任何位置出现蓝牙都算' },
    bad: { code: "WHERE name = '%蓝牙%'", note: '等号会当成「名字正好等于 %蓝牙%」' }
  },
  {
    char: 'NULL',
    name: 'NULL（空值）',
    what: '表示「这里什么都没有填」，它不等于 0，也不等于空字符串。',
    when: '判断某列是不是空的：IS NULL（是空的）、IS NOT NULL（不是空的）。',
    whenNot: '不要写 = NULL，那样一条都查不到。',
    ex: { code: 'WHERE channel IS NULL', note: '找出没有渠道记录的用户' },
    bad: { code: 'WHERE channel = NULL', note: '永远匹配不到任何行' }
  },
  {
    char: '( )',
    name: '英文括号',
    what: '把函数要处理的内容包起来，比如 COUNT(*)、SUM(total_amount)、ROUND(值, 2)。',
    when: '用到函数的时候。',
    whenNot: '括号要用英文的；成对出现，别只写一半。',
    ex: { code: 'SELECT COUNT(*) FROM orders', note: '数一数有多少行' },
    bad: { code: 'SELECT COUNT（*） FROM orders', note: '中文括号 → 报错' }
  }
]

const BY_CHAR = Object.fromEntries(SYMBOLS.map((s) => [s.char, s]))

/** 这一关会用到哪些符号 —— 直接从他自己的参考答案里推导，不靠人工标注 */
export function symbolsForLevel(referenceSql) {
  const sql = String(referenceSql || '')
  const found = []
  const has = (k) => found.includes(k)
  const add = (k) => {
    if (!has(k)) found.push(k)
  }

  if (/SELECT\s+\*/i.test(sql)) add('*')
  const m = sql.match(/SELECT([\s\S]*?)\bFROM\b/i)
  if (m) {
    const list = m[1]
    let depth = 0
    let commas = 0
    for (const ch of list) {
      if (ch === '(') depth++
      else if (ch === ')') depth--
      else if (ch === ',' && depth === 0) commas++
    }
    if (commas > 0) add(',')
    if (/\bAS\b/i.test(list)) add('AS')
  }
  if (/'[^']*'/.test(sql)) add("'")
  if (/\bIS\s+(NOT\s+)?NULL\b/i.test(sql) || /\bNULL\b/i.test(sql)) add('NULL')
  if (/(>=|<=|(?<![<>=!])=(?!=))/.test(sql)) add('=')
  if (/LIKE/i.test(sql)) add('%')
  if (/\w\(/.test(sql) || /\(/.test(sql)) add('( )')
  // 下划线：字段/表名里出现时也算（几乎每关都有，放在最后，靠截断控制）
  if (/\b\w+_\w+\b/.test(sql)) add('_')

  return found.map((c) => BY_CHAR[c]).filter(Boolean)
}

/** 一开始最该讲清楚的那个符号：星号优先 */
export function primarySymbol(referenceSql) {
  const list = symbolsForLevel(referenceSql)
  return list.find((s) => s.char === '*') || list[0] || null
}
