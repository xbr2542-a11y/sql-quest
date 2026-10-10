/**
 * 判定逻辑用例测试：用真实数据库跑「玩家写法 vs 参考写法」，确认该过的过、该拦的拦，
 * 并且确认错误提示能指出具体是哪个字段/哪一步出了问题。
 * 运行：npm run test
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import initSqlJs from 'sql.js'
import { LEVELS } from '../src/levels.js'
import { judge, diagnose } from '../src/judge.js'
import { translateError } from '../src/errors.js'
import { starsFor, rankOf, emptyProgress } from '../src/progress.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const SQL = await initSqlJs({ locateFile: (f) => path.join(root, 'node_modules', 'sql.js', 'dist', f) })
const db = new SQL.Database()
db.run(fs.readFileSync(path.join(root, 'public', 'seed.sql'), 'utf8'))

const run = (sql) => {
  const res = db.exec(sql)
  if (!res.length) throw new Error('no result set')
  return { columns: res[res.length - 1].columns, rows: res[res.length - 1].values }
}
const lv = (id) => LEVELS.find((l) => l.id === id)
const check = (playerSql, levelId) => judge(run(lv(levelId).referenceSql), run(playerSql), lv(levelId))

let pass = 0
let fail = 0
const ok = (label, extra = '') => {
  pass++
  console.log(`  ✅ ${label}${extra ? ' → ' + extra : ''}`)
}
const no = (label, detail) => {
  fail++
  console.log(`  ❌ ${label} → ${detail}`)
}

const shouldPass = (name, sql, id) => {
  try {
    const v = check(sql, id)
    v.pass ? ok(name) : no(name, `应该通过但被拦：${v.reason}`)
  } catch (e) {
    no(name, `执行报错：${e.message}`)
  }
}
const shouldFail = (name, sql, id) => {
  try {
    const v = check(sql, id)
    if (v.pass) no(name, '错误写法竟然通过了')
    else ok(name, v.reason.split('\n')[0].slice(0, 60))
  } catch (e) {
    ok(name, `直接报错也算拦下：${e.message}`)
  }
}
/** 断言失败提示里必须出现某个关键词（这是「零基础友好」的核心） */
const shouldSay = (name, sql, id, keyword) => {
  try {
    const v = check(sql, id)
    const text = `${v.reason || ''} ${v.tip || ''}`
    if (!v.pass && text.includes(keyword)) ok(name, `提示里包含「${keyword}」`)
    else if (!v.pass) no(name, `提示里没有「${keyword}」：${text.slice(0, 90)}`)
    else no(name, '居然通过了')
  } catch (e) {
    no(name, `执行报错：${e.message}`)
  }
}
const shouldDiagnose = (name, sql, id, keyword) => {
  const r = diagnose(sql, lv(id))
  const hit = r.find((x) => x.includes(keyword))
  if (hit) ok(name, hit.slice(0, 56))
  else no(name, `诊断里没有「${keyword}」，实际：${JSON.stringify(r).slice(0, 90)}`)
}

console.log('\n【应当通过】不同写法但结果正确')
shouldPass('第3关 小写关键字 + 多余空格', "select  *   from users where channel='小红书'", 3)
shouldPass('第3关 换个写法用 IN', "SELECT * FROM users WHERE channel IN ('小红书')", 3)
shouldPass('第7关 省略并列打破条件（恰好无并列）', 'SELECT * FROM products ORDER BY price DESC LIMIT 10', 7)
shouldPass('第9关 多算一层 ROUND', "SELECT ROUND(SUM(total_amount), 2) AS gmv FROM orders WHERE status = 'paid'", 9)
shouldPass('第13关 JOIN+分组（新加的过渡关）', lv(13).referenceSql, 13)
shouldPass('第14关 用 CTE 代替 JOIN', "WITH t AS (SELECT u.channel AS ch, o.total_amount AS amt FROM orders o JOIN users u ON o.user_id = u.user_id WHERE o.status = 'paid') SELECT ch AS channel, COUNT(*) AS order_cnt, ROUND(SUM(amt), 2) AS gmv, ROUND(SUM(amt) / COUNT(*), 2) AS avg_order_value FROM t GROUP BY ch", 14)
shouldPass('第10关 用子查询代替直接分组', "SELECT order_source, COUNT(*) AS order_cnt, SUM(total_amount) AS gmv FROM orders WHERE status = 'paid' GROUP BY order_source", 10)
shouldPass('第12关 用 LEFT JOIN', "SELECT o.order_id, o.order_time, u.name AS user_name, u.city AS user_city FROM orders o LEFT JOIN users u ON o.user_id = u.user_id WHERE o.status = 'paid' ORDER BY o.order_time DESC LIMIT 20", 12)
shouldPass('第16关 不用子查询而用 HAVING 两步', "SELECT (SELECT COUNT(DISTINCT user_id) FROM orders WHERE status='paid') AS user_cnt, (SELECT COUNT(*) FROM (SELECT user_id FROM orders WHERE status='paid' GROUP BY user_id HAVING COUNT(*)>=2)) AS repeat_cnt, ROUND((SELECT COUNT(*) FROM (SELECT user_id FROM orders WHERE status='paid' GROUP BY user_id HAVING COUNT(*)>=2)) * 1.0 / (SELECT COUNT(DISTINCT user_id) FROM orders WHERE status='paid'), 4) AS repeat_rate", 16)
shouldPass('第19关 Boss 关正确写法', lv(19).referenceSql, 19)
shouldPass('第17关 CASE 换 substr 写法', "SELECT CASE WHEN u.register_time >= '2026-08-01' THEN '新用户' ELSE '老用户' END AS user_type, COUNT(DISTINCT o.user_id) AS user_cnt FROM orders o JOIN users u ON o.user_id = u.user_id WHERE substr(o.order_time,1,7) = '2026-08' GROUP BY user_type", 17)

console.log('\n【应当拦下】典型错误')
shouldFail('第1关 只选了部分列', 'SELECT name FROM products', 1)
shouldFail('第2关 别名写错', 'SELECT name AS product, price AS price, category AS category FROM products', 2)
shouldFail('第4关 忘了过滤 status（脏数据陷阱）', "SELECT * FROM orders WHERE order_time >= '2026-06-16' AND order_time <= '2026-06-20 23:59:59'", 4)
shouldFail('第6关 用 = NULL 写空值判断', 'SELECT * FROM users WHERE channel = NULL', 6)
shouldFail('第7关 排序方向反了', 'SELECT * FROM products ORDER BY price ASC LIMIT 10', 7)
shouldFail('第7关 忘了 LIMIT', 'SELECT * FROM products ORDER BY price DESC', 7)
shouldFail('第8关 把空值过滤掉了', 'SELECT DISTINCT channel FROM users WHERE channel IS NOT NULL', 8)
shouldFail('第9关 忘了过滤已支付（算多了）', 'SELECT SUM(total_amount) AS gmv FROM orders', 9)
shouldFail('第10关 用了错误的过滤条件', "SELECT order_source, COUNT(*) AS order_cnt, SUM(total_amount) AS gmv FROM orders WHERE status != 'paid' GROUP BY order_source", 10)
shouldFail('第11关 用 WHERE 代替 HAVING', "SELECT order_source, COUNT(*) AS order_cnt FROM orders WHERE status = 'paid' AND COUNT(*) >= 500 GROUP BY order_source", 11)
shouldFail('第13关 忘记 JOIN（用不到城市字段）', "SELECT city, COUNT(*) AS order_cnt, SUM(total_amount) AS gmv FROM orders GROUP BY city", 13)
shouldFail('第15关 没过滤订单状态（把取消订单也算销量）', "SELECT p.product_id, p.name, SUM(oi.quantity) AS total_qty FROM order_items oi JOIN products p ON oi.product_id = p.product_id GROUP BY p.product_id, p.name ORDER BY total_qty DESC LIMIT 10", 15)
shouldFail('第16关 复购率乘了 100', "SELECT COUNT(*) AS user_cnt, SUM(CASE WHEN cnt >= 2 THEN 1 ELSE 0 END) AS repeat_cnt, ROUND(SUM(CASE WHEN cnt >= 2 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 4) AS repeat_rate FROM (SELECT user_id, COUNT(*) AS cnt FROM orders WHERE status = 'paid' GROUP BY user_id)", 16)
shouldFail('第17关 没用 DISTINCT（同一人重复计数）', "SELECT CASE WHEN u.register_time >= '2026-08-01' THEN '新用户' ELSE '老用户' END AS user_type, COUNT(*) AS user_cnt FROM orders o JOIN users u ON o.user_id = u.user_id WHERE o.order_time >= '2026-08-01' AND o.order_time <= '2026-08-31 23:59:59' GROUP BY user_type", 17)
shouldFail('第18关 月份排反了（用了升序）', "SELECT strftime('%Y-%m', order_time) AS month, ROUND(SUM(total_amount), 2) AS gmv FROM orders WHERE status = 'paid' GROUP BY month ORDER BY month ASC", 18)
shouldFail('第18关 月份没写 ORDER BY', "SELECT strftime('%Y-%m', order_time) AS month, ROUND(SUM(total_amount), 2) AS gmv FROM orders WHERE status = 'paid' GROUP BY month", 18)
shouldFail('第19关 漏掉 DISTINCT（订单被重复计数）', "SELECT p.category, COUNT(o.order_id) AS total_orders, COUNT(CASE WHEN o.status = 'refunded' THEN o.order_id END) AS refund_orders, ROUND(COUNT(CASE WHEN o.status = 'refunded' THEN o.order_id END) * 1.0 / COUNT(o.order_id), 4) AS refund_rate FROM order_items oi JOIN products p ON oi.product_id = p.product_id JOIN orders o ON oi.order_id = o.order_id GROUP BY p.category ORDER BY refund_rate DESC", 19)

console.log('\n【错误反馈：要指着具体字段说话】')
shouldSay('第1关 少列时说清楚少了哪些字段', 'SELECT name FROM products', 1, 'product_id')
shouldSay('第1关 多列时说明这关只要几列', 'SELECT * FROM products, users', 1, '列')
shouldSay('第2关 别名写错指出第几列、要求叫什么', 'SELECT name AS product, price AS price, category AS category FROM products', 2, 'product_name')
shouldSay('第2关 别名少下划线时点出来', 'SELECT name AS productname, price AS price, category AS category FROM products', 2, '下划线')
shouldSay('第4关 行数多了提示筛得不够狠', "SELECT * FROM orders WHERE order_time >= '2026-06-16' AND order_time <= '2026-06-20 23:59:59'", 4, 'WHERE')
shouldSay('第7关 排序方向反了要说清楚', 'SELECT * FROM products ORDER BY price ASC LIMIT 10', 7, 'ORDER BY')
shouldSay('第9关 单值算错时把两个数都摆出来', 'SELECT SUM(total_amount) AS gmv FROM orders', 9, '要求')

console.log('\n【SQL 体检：猜出可能的原因】')
shouldDiagnose('忘了过滤订单状态', 'SELECT SUM(total_amount) AS gmv FROM orders', 9, '订单状态')
shouldDiagnose('用 = NULL 判断空值', 'SELECT * FROM users WHERE channel = NULL', 6, 'IS NULL')
shouldDiagnose('漏了 WHERE', 'SELECT * FROM orders', 4, 'WHERE')
shouldDiagnose('漏了 GROUP BY', 'SELECT order_source, COUNT(*) FROM orders', 10, 'GROUP BY')
shouldDiagnose('漏了 JOIN', "SELECT city, COUNT(*) FROM orders GROUP BY city", 13, 'JOIN')
shouldDiagnose('漏了 DISTINCT', 'SELECT channel FROM users', 8, 'DISTINCT')
shouldDiagnose('漏了 LIMIT', 'SELECT * FROM products ORDER BY price DESC', 7, 'LIMIT')
shouldDiagnose('用了中文标点', 'SELECT * FROM products WHERE on_sale = 1， LIMIT 10', 1, '英文标点')
shouldDiagnose('别名该用 AS', 'SELECT name, price, category FROM products', 2, 'AS')
shouldDiagnose(
  '新老客没去重',
  "SELECT CASE WHEN u.register_time >= '2026-08-01' THEN '新用户' ELSE '老用户' END AS user_type, COUNT(*) AS user_cnt FROM orders o JOIN users u ON o.user_id = u.user_id WHERE o.order_time >= '2026-08-01' GROUP BY user_type",
  17,
  'COUNT(DISTINCT'
)
shouldDiagnose('排序方向反了要给方向提示', 'SELECT * FROM products ORDER BY price ASC LIMIT 10', 7, 'DESC')

console.log('\n【报错翻译】')
const errCases = [
  ['no such column: amout', 'amout'],
  ['no such table: order', 'order'],
  ['near "form": syntax error', 'form'],
  ['ambiguous column name: user_id', 'user_id'],
  ['incomplete input', ''],
  ['misuse of aggregate: SUM()', '']
]
for (const [raw, kw] of errCases) {
  const t = translateError(raw, 'SELECT 1')
  if (t && t.title && t.detail && (!kw || t.title.includes(kw) || t.detail.includes(kw))) {
    ok(raw, t.title)
  } else {
    no(raw, JSON.stringify(t))
  }
}
const colErr = translateError('no such column: amout')
if (/amount/.test(colErr.detail)) ok('错别字给出建议', 'amout → amount')
else no('错别字建议', colErr.detail)

console.log('\n【星级与晋升】')
const starCases = [
  [1, 0, 3, '零提示一次通过 = 3 星'],
  [2, 0, 2, '重试过 = 2 星'],
  [1, 1, 2, '用过提示 = 2 星'],
  [1, 3, 1, '看了答案 = 1 星']
]
for (const [a, h, want, label] of starCases) {
  const got = starsFor(a, h)
  got === want ? ok(label) : no(label, `得到 ${got}，期望 ${want}`)
}
const p = emptyProgress()
rankOf(p).rank.title === '数据实习生' && rankOf(p).rank.salary === 3000
  ? ok('初始职级：数据实习生 ¥3000')
  : no('初始职级', rankOf(p).rank.title)
const p2 = { ...emptyProgress(), stars: { 1: 3, 2: 2, 3: 3, 4: 2 } }
rankOf(p2).rank.title === '数据运营专员' ? ok('完成 4 关后晋升：数据运营专员 ¥6000') : no('晋升判定', rankOf(p2).rank.title)
const p3 = { ...emptyProgress(), stars: Object.fromEntries([...Array(13)].map((_, i) => [i + 1, 3])) }
rankOf(p3).rank.title === '高级数据分析师' ? ok('完成 13 关后晋升：高级数据分析师 ¥13000') : no('13 关晋升', rankOf(p3).rank.title)

console.log(`\n结果：${pass} 通过 / ${fail} 失败`)
process.exit(fail ? 1 : 0)
