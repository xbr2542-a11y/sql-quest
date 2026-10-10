/**
 * 校验「其他写法」：每一条都必须能通过对应关卡的判定，否则就是教错了。
 * 运行：npm run verify:alt
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import initSqlJs from 'sql.js'
import { LEVELS } from '../src/levels.js'
import { ALTERNATIVES } from '../src/alternatives.js'
import { judge } from '../src/judge.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const SQL = await initSqlJs({ locateFile: (f) => path.join(root, 'node_modules', 'sql.js', 'dist', f) })
const db = new SQL.Database()
db.run(fs.readFileSync(path.join(root, 'public', 'seed.sql'), 'utf8'))

const run = (sql) => {
  const res = db.exec(sql)
  return res.length ? { columns: res[res.length - 1].columns, rows: res[res.length - 1].values } : { columns: [], rows: [] }
}

let ok = 0
let bad = 0
let missing = 0
for (const lv of LEVELS) {
  const alts = ALTERNATIVES[lv.id] || []
  if (!alts.length) {
    missing++
    console.log(`  ⚠️  第 ${lv.id} 关还没有其他写法`)
    continue
  }
  for (const a of alts) {
    try {
      const v = judge(run(lv.referenceSql), run(a.sql), lv)
      if (v.pass) {
        ok++
        console.log(`  ✅ 第 ${lv.id} 关 · ${a.title}`)
      } else {
        bad++
        console.log(`  ❌ 第 ${lv.id} 关 · ${a.title} → 判定不通过：${(v.reason || '').split('\n')[0]}`)
      }
    } catch (e) {
      bad++
      console.log(`  ❌ 第 ${lv.id} 关 · ${a.title} → 执行报错：${e.message}`)
    }
  }
}
console.log(`\n其他写法：${ok} 条通过 / ${bad} 条有问题 / ${missing} 关待补`)
process.exit(bad ? 1 : 0)
