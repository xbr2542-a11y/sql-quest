/**
 * 术语表：零基础玩家第一次遇到的专业词，都要能查到「是什么 + 最小示例」。
 * 不写定义式的长句，每条都配一个人人能看懂的例子。
 */

export const TERMS = [
  {
    key: 'database',
    name: '数据库',
    aka: ['库'],
    what: '存放所有表的仓库。你不需要装它，它就在浏览器里跑着。',
    demo: '我们这个库叫 ecommerce.db，里面有 9 张表'
  },
  {
    key: 'table',
    name: '表',
    what: '一类数据的集合，长得像 Excel 里的一张工作表。',
    demo: 'products 表 = 全部商品的清单'
  },
  {
    key: 'row',
    name: '行',
    what: '表里的一条记录。查询结果里，一行就是一个对象。',
    demo: 'products 里的一行 = 一个商品'
  },
  {
    key: 'column',
    name: '列',
    what: '表里的一竖列，装的是同一类信息。',
    demo: 'name 这一列 = 所有商品的名字'
  },
  {
    key: 'columnName',
    name: '列名',
    aka: ['字段名'],
    what: '列的名字。写 SQL 时你要用的就是它。',
    demo: 'name、price、category 都是列名'
  },
  {
    key: 'field',
    name: '字段',
    what: '「列」的另一种叫法，写代码的人更常说字段。两个词是一个意思。',
    demo: 'price 字段 = 商品价格那一列'
  },
  {
    key: 'header',
    name: '表头',
    what: '查询结果表格最上面那一行，写着每一列叫什么。',
    demo: '结果是 product_name / price / category 三列表头'
  },
  {
    key: 'alias',
    name: '别名',
    what: '给列临时起的另一个名字，只改变表头，不改数据。',
    demo: 'name AS product_name —— 表头就变成 product_name'
  },
  {
    key: 'keyword',
    name: '关键字',
    what: 'SQL 里有固定含义的词，不能拿来当列名用。',
    demo: 'SELECT、FROM、WHERE、ORDER BY 都是关键字'
  },
  {
    key: 'string',
    name: '字符串',
    what: '用英文单引号包起来的一段文字。',
    demo: "'paid'、'小红书'、'2026-06-16'"
  },
  {
    key: 'null',
    name: 'NULL',
    what: '表示「这里什么都没填」。它不等于 0，也不等于空文字。',
    demo: 'channel IS NULL —— 找出没有渠道记录的用户'
  },
  {
    key: 'operator',
    name: '运算符',
    what: '用来比较大小的符号。数字直接比，文字要加单引号。',
    demo: 'price >= 300、status = \'paid\''
  },
  {
    key: 'function',
    name: '函数',
    what: '数据库自带的工具，括号里放要处理的内容。',
    demo: 'COUNT(*)、SUM(total_amount)、ROUND(值, 2)'
  },
  {
    key: 'aggregate',
    name: '聚合函数',
    what: '把很多行合并成一个结果。',
    demo: 'SUM(total_amount) = 一共卖了多少钱'
  },
  {
    key: 'tableName',
    name: '表名',
    what: '表的称呼，写在 FROM 后面，告诉数据库从哪张表拿数据。',
    demo: 'FROM products'
  }
]

export const termByName = (name) => TERMS.find((t) => t.name === name)

const ALIASES = TERMS.flatMap((t) => [t.name, ...(t.aka || [])].map((n) => ({ n, t }))).sort(
  (a, b) => b.n.length - a.n.length
)

/** 找出这段文字里出现了哪些术语（按出现顺序、去重） */
export function termsIn(text) {
  const s = String(text || '')
  const hits = []
  for (const { n, t } of ALIASES) {
    if (s.includes(n) && !hits.includes(t)) hits.push(t)
  }
  return hits
}

/** 给一段白话文案里的术语加下划线（返回 {v, term} 片段），供 RichText 渲染 */
export function markTerms(text) {
  const s = String(text || '')
  const out = []
  let i = 0
  while (i < s.length) {
    const hit = ALIASES.find(({ n }) => s.startsWith(n, i))
    if (hit) {
      out.push({ v: hit.n, term: hit.t })
      i += hit.n.length
      continue
    }
    let j = i + 1
    while (j < s.length && !ALIASES.some(({ n }) => s.startsWith(n, j))) j++
    out.push({ v: s.slice(i, j) })
    i = j
  }
  return out
}
