/**
 * 符号教学的用例测试：确认「什么时候写星号 / 什么时候不写」这类判断是自动且正确的。
 * 运行：npm run test:symbols
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import initSqlJs from 'sql.js'
import { LEVELS } from '../src/levels.js'
import { VARIANTS } from '../src/variants.js'
import { symbolsForLevel, primarySymbol, SYMBOLS } from '../src/symbols.js'
import { thinkingSteps } from '../src/why.js'
import { judge } from '../src/judge.js'

let pass = 0
let fail = 0
const check = (label, cond, extra = '') => {
  if (cond) {
    pass++
    console.log(`  ✅ ${label}${extra ? ' → ' + extra : ''}`)
  } else {
    fail++
    console.log(`  ❌ ${label}${extra ? ' → ' + extra : ''}`)
  }
}

console.log('\n【符号词典本身】')
check('每个符号都回答「什么时候写」', SYMBOLS.every((s) => s.when && s.whenNot && s.what))
check('每个符号都有正例和反例', SYMBOLS.every((s) => s.ex?.code && s.bad?.code))
check(
  '星号那条必须写清「什么时候不写」',
  SYMBOLS.find((s) => s.char === '*')?.whenNot.includes('只要其中几列'),
  SYMBOLS.find((s) => s.char === '*')?.whenNot.slice(0, 40)
)

console.log('\n【按关卡自动推出该讲哪些符号】')
const lv = (id) => LEVELS.find((l) => l.id === id)
check('第 1 关会讲星号', symbolsForLevel(lv(1).referenceSql).some((s) => s.char === '*'))
check('第 2 关会讲逗号和 AS', ['AS'].every((c) => symbolsForLevel(lv(2).referenceSql).some((s) => s.char === c)),
  symbolsForLevel(lv(2).referenceSql).map((s) => s.char).join(' '))
check('第 2 关不该把星号当成主要符号', primarySymbol(lv(2).referenceSql)?.char !== '*',
  '主符号=' + primarySymbol(lv(2).referenceSql)?.char)
check('第 6 关会讲 NULL', symbolsForLevel(lv(6).referenceSql).some((s) => s.char === 'NULL'))
check('第 5 关会讲百分号', symbolsForLevel(lv(5).referenceSql).some((s) => s.char === '%'))
check('第 19 关会讲括号（函数）', symbolsForLevel(lv(19).referenceSql).some((s) => s.char === '( )'))

console.log('\n【「这一关该不该用星号」自动判断】')
const noteOf = (id, src) => {
  const s = src || lv(id).referenceSql
  return thinkingSteps(s).find((x) => x.clause === 'SELECT')?.choiceNote
}
check('第 1 关判定为「全部列」', noteOf(1)?.kind === 'all', noteOf(1)?.text.slice(0, 30))
check('第 2 关判定为「只要几列」且说了列数', noteOf(2)?.kind === 'some' && noteOf(2).text.includes('3 列'))
check('第 3 关判定为「全部列」', noteOf(3)?.kind === 'all')
check('第 12 关判定为「只要几列」', noteOf(12)?.kind === 'some')
check('SELECT 的问题本身就是二选一', thinkingSteps(lv(1).referenceSql).find((s) => s.clause === 'SELECT').q.includes('全部列'))
const everyLevelHasNote = LEVELS.every((l) => noteOf(l.id))
check('19 关每一关都能给出选择提示', everyLevelHasNote)
const variantsOk = Object.entries(VARIANTS).every(([id, v]) => noteOf(Number(id), v.referenceSql))
check('19 道变体题也都能给出选择提示', variantsOk)

console.log('\n【用了星号但这一关不该用 → 判定必须点出来】')
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const SQL = await initSqlJs({ locateFile: (f) => path.join(root, 'node_modules', 'sql.js', 'dist', f) })
const db = new SQL.Database()
db.run(fs.readFileSync(path.join(root, 'public', 'seed.sql'), 'utf8'))
const run = (sql) => {
  const r = db.exec(sql)
  return r.length ? { columns: r[r.length - 1].columns, rows: r[r.length - 1].values } : { columns: [], rows: [] }
}
const lv2 = lv(2)
const v = judge(run(lv2.referenceSql), run('SELECT * FROM products'), lv2, 'SELECT * FROM products')
check('第 2 关写星号 → 提示里点名星号', !v.pass && (v.reason + v.tip).includes('星号'), (v.reason || '').split('\n')[0])
check('并且说明「什么时候才写星号」', (v.tip || '').includes('全部列都要才写'))

console.log(`\n结果：${pass} 通过 / ${fail} 失败`)
process.exit(fail ? 1 : 0)
