/**
 * 关卡自检：把所有参考 SQL 真跑一遍，确认它们都能执行、结果合理，
 * 并打印出设定阈值（如 HAVING 的门槛、TOP N 的并列情况）所需的数据。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import initSqlJs from 'sql.js'
import { LEVELS } from '../src/levels.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const SQL = await initSqlJs({
  locateFile: (f) => path.join(root, 'node_modules', 'sql.js', 'dist', f)
})
const db = new SQL.Database()
db.run(fs.readFileSync(path.join(root, 'public', 'seed.sql'), 'utf8'))

const run = (sql) => {
  const res = db.exec(sql)
  return res.length ? res[res.length - 1] : { columns: [], values: [] }
}
const show = (r, n = 4) => {
  const rows = r.values.slice(0, n).map((v) => v.map((x) => (x === null ? 'NULL' : x)).join(' | '))
  return `[${r.columns.join(', ')}]\n      ` + rows.join('\n      ') + (r.values.length > n ? `\n      … 共 ${r.values.length} 行` : '')
}

console.log('=== 参考 SQL 自检 ===')
let bad = 0
for (const lv of LEVELS) {
  try {
    const r = run(lv.referenceSql)
    const rows = r.values.length
    const flag = rows === 0 ? '  ⚠️ 空结果' : ''
    console.log(`\n关 ${lv.id} · ${lv.title}  (${rows} 行)${flag}`)
    console.log('   ' + show(r))
    if (rows === 0) bad++
  } catch (e) {
    bad++
    console.log(`\n关 ${lv.id} · ${lv.title}  ❌ 报错: ${e.message}`)
  }
}

console.log('\n\n=== 阈值与并列情况对照 ===')
console.log('\n[关11] 订单来源单量：')
console.log(show(run("SELECT order_source, COUNT(*) AS c FROM orders WHERE status='paid' GROUP BY order_source ORDER BY c DESC")))
console.log('\n[关7] 价格最高的 12 个商品（看有没有并列）：')
console.log(show(run('SELECT product_id, price FROM products ORDER BY price DESC, product_id ASC LIMIT 12'), 12))
console.log('\n[关8] channel 去重结果：')
console.log(show(run('SELECT DISTINCT channel FROM users')))
console.log('\n[关5] 蓝牙/无线商品数：')
console.log(show(run("SELECT COUNT(*) FROM products WHERE name LIKE '%蓝牙%' OR name LIKE '%无线%'")))
console.log('\n[关14] TOP 12 销量（看第 10 名附近是否有并列）：')
console.log(show(run("SELECT p.product_id, SUM(oi.quantity) AS q FROM order_items oi JOIN orders o ON oi.order_id=o.order_id JOIN products p ON oi.product_id=p.product_id WHERE o.status='paid' GROUP BY p.product_id ORDER BY q DESC, p.product_id ASC LIMIT 12"), 12))
console.log('\n[关18] 各品类退款率（看是否有并列）：')
console.log(show(run("SELECT p.category, COUNT(DISTINCT o.order_id) t, COUNT(DISTINCT CASE WHEN o.status='refunded' THEN o.order_id END) r, ROUND(COUNT(DISTINCT CASE WHEN o.status='refunded' THEN o.order_id END)*1.0/COUNT(DISTINCT o.order_id),4) rate FROM order_items oi JOIN products p ON oi.product_id=p.product_id JOIN orders o ON oi.order_id=o.order_id GROUP BY p.category ORDER BY rate DESC"), 6))
console.log('\n[关12] order_time 是否有并列（取 top20 边界外的值）：')
console.log(show(run("SELECT COUNT(*) AS total, COUNT(DISTINCT order_time) AS distinct_time FROM orders WHERE status='paid'")))
console.log('\n[关16] 八月新老客分布：')
console.log(show(run("SELECT CASE WHEN u.register_time >= '2026-08-01' THEN '新用户' ELSE '老用户' END AS t, COUNT(DISTINCT o.user_id) c FROM orders o JOIN users u ON o.user_id=u.user_id WHERE o.order_time >= '2026-08-01' AND o.order_time <= '2026-08-31 23:59:59' GROUP BY t")))
console.log('\n[关15] 复购数据：')
console.log(show(run("SELECT COUNT(*) AS user_cnt, SUM(CASE WHEN cnt>=2 THEN 1 ELSE 0 END) AS repeat_cnt, ROUND(SUM(CASE WHEN cnt>=2 THEN 1 ELSE 0 END)*1.0/COUNT(*),4) AS repeat_rate FROM (SELECT user_id, COUNT(*) AS cnt FROM orders WHERE status='paid' GROUP BY user_id)")))

console.log(`\n结论：${bad === 0 ? '全部参考 SQL 正常 ✅' : `${bad} 个关卡需要修 ❌`}`)
