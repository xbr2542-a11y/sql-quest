/**
 * 语法体检的用例测试：拿真实会写出来的错误，检查提示是否指到了具体位置。
 * 运行：npm run test:syntax
 */
import { analyzeSyntax } from '../src/syntax.js'

let pass = 0
let fail = 0
const check = (label, sql, mustSay) => {
  const fs = analyzeSyntax(sql)
  const text = fs.map((f) => f.title + ' ' + f.detail).join(' ')
  const missing = mustSay.filter((k) => !text.includes(k))
  if (fs.length && !missing.length) {
    pass++
    console.log(`  ✅ ${label}\n     → ${fs[0].title}：${fs[0].detail.split('\n')[0].slice(0, 70)}`)
  } else {
    fail++
    console.log(`  ❌ ${label} → ${fs.length ? `缺关键词 ${missing.join(' / ')}` : '没有给出任何提示'}`)
    console.log(`     实际：${JSON.stringify(fs).slice(0, 200)}`)
  }
}
const checkClean = (label, sql) => {
  const fs = analyzeSyntax(sql)
  if (!fs.length) {
    pass++
    console.log(`  ✅ ${label}（没有误报）`)
  } else {
    fail++
    console.log(`  ❌ ${label} → 误报：${fs[0].title}`)
  }
}

console.log('\n【用户实际遇到的那句】')
check('表名字段名粘一起 + 缺逗号 + 多 AS', 'select*FROM products_name AS product_name AS price AS category', ['products_name', 'products'])

console.log('\n【列之间忘了逗号】')
check('两列之间没逗号', 'SELECT name AS product_name price AS price FROM products', ['逗号'])
check('三个裸列名挤在一起', 'SELECT name price category FROM products', ['逗号'])
check('直接连写', 'SELECT namepricecategory FROM products', ['逗号'])

console.log('\n【中文标点】')
check('中文逗号', 'select name AS product_name，price AS price FROM products', ['中文标点', '英文'])
check('中文括号', 'SELECT COUNT（*） FROM orders', ['中文标点'])

console.log('\n【表名】')
check('表名不存在', 'SELECT * FROM order', ['没有叫', 'orders'])
check('表名写错一个字符', 'SELECT * FROM order_items2', ['没有叫', 'order_items'])

console.log('\n【逗号与 AS】')
check('末尾多逗号', 'SELECT name, price, FROM products', ['多了逗号'])
check('AS 前面没列名', 'SELECT AS name FROM products', ['AS 前面'])
check('连续两个 AS', 'SELECT name AS AS product_name FROM products', ['两个 AS'])

console.log('\n【引号与结构】')
check('单引号没配对', "SELECT * FROM orders WHERE status = 'paid", ['单引号'])
check('缺 FROM', 'SELECT name, price', ['FROM'])

console.log('\n【不能误报】')
checkClean('正常的单列', 'SELECT name FROM products')
checkClean('正常的别名', 'SELECT name AS product_name, price AS price FROM products')
checkClean('函数里的逗号', 'SELECT ROUND(SUM(total_amount), 2) AS gmv FROM orders')
checkClean('COUNT(*)', 'SELECT COUNT(*) AS order_cnt FROM orders')
checkClean('带表别名的 JOIN', "SELECT u.city, COUNT(*) AS order_cnt FROM orders o JOIN users u ON o.user_id = u.user_id WHERE o.status = 'paid' GROUP BY u.city")
checkClean('下划线表名', 'SELECT p.category, SUM(oi.quantity) FROM order_items oi JOIN products p ON oi.product_id = p.product_id GROUP BY p.category')
checkClean('字符串里的中文', "SELECT * FROM users WHERE channel = '小红书'")
checkClean('带空格的函数', 'SELECT COUNT(DISTINCT o.user_id) AS user_cnt FROM orders o')

console.log(`\n结果：${pass} 通过 / ${fail} 失败`)
process.exit(fail ? 1 : 0)
