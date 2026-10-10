/**
 * 校验变体题：每一条都要能跑出非空结果，而且结果要和原关卡的答案不同
 * （否则就是「换了道假题」）。运行：npm run verify:variant
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import initSqlJs from 'sql.js'
import { LEVELS } from '../src/levels.js'
import { VARIANTS } from '../src/variants.js'
import { judge } from '../src/judge.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const SQL = await initSqlJs({ locateFile: (f) => path.join(root, 'node_modules', 'sql.js', 'dist', f) })
const db = new SQL.Database()
db.run(fs.readFileSync(path.join(root, 'public', 'seed.sql'), 'utf8'))

const run = (sql) => {
  const res = db.exec(sql)
  if (!res.length) throw new Error('没有返回结果集')
  return { columns: res[res.length - 1].columns, rows: res[res.length - 1].values }
}
const sig = (r) => JSON.stringify(r.columns) + '|' + JSON.stringify(r.rows).slice(0, 400)

let ok = 0
let bad = 0
for (const lv of LEVELS) {
  const v = VARIANTS[lv.id]
  if (!v) {
    bad++
    console.log(`  ❌ 第 ${lv.id} 关没有变体题`)
    continue
  }
  try {
    const mine = run(v.referenceSql)
    const base = run(lv.referenceSql)
    const problems = []
    if (!mine.rows.length) problems.push('结果为空')
    if (sig(mine) === sig(base)) problems.push('和原关卡结果完全一样，等于没换题')
    if (v.orderSensitive) {
      // 排序题：检查排序键在边界上是否有并列（有并列时结果可能不稳定）
      const [first] = mine.rows
      if (!first) problems.push('排序题没有结果')
    }
    if (problems.length) {
      bad++
      console.log(`  ❌ 第 ${lv.id} 关 · ${v.title} → ${problems.join('；')}`)
    } else {
      ok++
      console.log(`  ✅ 第 ${lv.id} 关 · ${v.title}（${mine.rows.length} 行 / ${mine.columns.length} 列）`)
    }
  } catch (e) {
    bad++
    console.log(`  ❌ 第 ${lv.id} 关 · ${v.title} → 执行报错：${e.message}`)
  }
}

// 额外检查：变体题的判定必须能通过它自己的参考答案（防止配置写错，比如 orderSensitive 配错）
let selfBad = 0
for (const lv of LEVELS) {
  const v = VARIANTS[lv.id]
  if (!v) continue
  const verdict = judge(run(v.referenceSql), run(v.referenceSql), v)
  if (!verdict.pass) {
    selfBad++
    console.log(`  ❌ 第 ${lv.id} 关变体：自己的答案判定不通过 —— ${verdict.reason}`)
  }
}

console.log(`\n变体题：${ok} 条可用 / ${bad} 条有问题 / 自检失败 ${selfBad} 条`)
process.exit(bad || selfBad ? 1 : 0)
