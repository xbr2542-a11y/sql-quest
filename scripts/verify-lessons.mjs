/**
 * 校验零基础第一课：每一课的参考答案都要能跑出非空结果，
 * 而且每课都要具备完整教学流程（是什么/作用/示例/任务/总结/提示）。
 * 运行：npm run verify:lesson
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import initSqlJs from 'sql.js'
import { LESSONS } from '../src/lessons.js'
import { TERMS } from '../src/glossary.js'
import { symbolsForLevel } from '../src/symbols.js'
import { thinkingSteps } from '../src/why.js'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const SQL = await initSqlJs({ locateFile: (f) => path.join(root, 'node_modules', 'sql.js', 'dist', f) })
const db = new SQL.Database()
db.run(fs.readFileSync(path.join(root, 'public', 'seed.sql'), 'utf8'))

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

console.log('\n【每一课都能跑出结果】')
for (const l of LESSONS) {
  try {
    const r = db.exec(l.referenceSql)
    const rows = r.length ? r[r.length - 1].values.length : 0
    const cols = r.length ? r[r.length - 1].columns.length : 0
    check(`第 ${l.id} 课 · ${l.title}`, rows > 0, `${rows} 行 / ${cols} 列`)
  } catch (e) {
    check(`第 ${l.id} 课 · ${l.title}`, false, '报错：' + e.message)
  }
}

console.log('\n【每一课的教学流程是完整的】')
const need = ['title', 'concept', 'what', 'role', 'demo', 'demoNote', 'task', 'referenceSql', 'summary']
for (const l of LESSONS) {
  const missing = need.filter((k) => !l[k])
  const hintsOk = Array.isArray(l.hints) && l.hints.length === 3 && l.hints.every((h) => h.learn && h.how && h.demo)
  if (!missing.length && hintsOk) pass++
  else {
    fail++
    console.log(`  ❌ 第 ${l.id} 课 缺：${missing.join(',') || '提示结构不对'}`)
  }
}
console.log(`  （共 ${LESSONS.length} 课，检查字段齐全 + 三条提示结构）`)

console.log('\n【文案长度受控（不堆大段文字）】')
const longWhat = LESSONS.filter((l) => l.what.length > 60)
const longRole = LESSONS.filter((l) => l.role.length > 60)
check('「是什么」都不超过 60 字', longWhat.length === 0, longWhat.map((l) => l.id).join(',') || 'ok')
check('「有什么作用」都不超过 60 字', longRole.length === 0, longRole.map((l) => l.id).join(',') || 'ok')
const longHint = LESSONS.flatMap((l) => l.hints.map((h) => ({ id: l.id, ...h }))).filter((h) => h.how.length > 34)
check('提示的「怎么做」都不超过 34 字', longHint.length === 0, longHint.map((h) => `${h.id}课`).join(',') || 'ok')

console.log('\n【覆盖了要求的概念】')
const all = LESSONS.map((l) => `${l.concept} ${l.what} ${l.role} ${l.demo} ${l.task}`).join(' ')
const mustCover = ['SELECT', 'FROM', 'WHERE', 'ORDER BY', 'LIMIT', 'DISTINCT', 'AS', 'AND', 'OR', 'COUNT', 'SUM', 'GROUP BY', 'HAVING', 'JOIN', 'NULL', 'IS NULL']
const missingConcept = mustCover.filter((c) => !all.includes(c))
check('要求的基础概念全部覆盖', missingConcept.length === 0, missingConcept.join(',') || mustCover.length + ' 个概念全在')
check('讲到了逗号与引号', all.includes('逗号') && all.includes('单引号'))
check('讲到了空格与分号', all.includes('空格') && all.includes('分号'))
check('讲到了括号', all.includes('括号'))
check('讲到了运算符', all.includes('运算符'))

console.log('\n【术语表】')
const mustTerms = ['数据库', '表', '行', '列', '列名', '字段', '表头', '别名', '关键字', '字符串', 'NULL']
const termNames = TERMS.map((t) => t.name + (t.aka || []).join(''))
const missingTerm = mustTerms.filter((t) => !termNames.some((n) => n.includes(t)))
check('要求的术语都有解释', missingTerm.length === 0, missingTerm.join(',') || TERMS.length + ' 条术语')
check('每条术语都有最小示例', TERMS.every((t) => t.demo && t.what), TERMS.filter((t) => !t.demo).map((t) => t.name).join(',') || 'ok')

console.log('\n【复用现有教学系统：每课都能自动生成思考步骤与符号说明】')
const noSteps = LESSONS.filter((l) => thinkingSteps(l.referenceSql).length === 0)
check('每课都能推出「怎么想出来」的步骤', noSteps.length === 0, noSteps.map((l) => l.id).join(',') || 'ok')
const withStar = LESSONS.filter((l) => /SELECT\s+\*/i.test(l.referenceSql))
check(
  '用到星号的课程都会讲星号',
  withStar.length > 0 && withStar.every((l) => symbolsForLevel(l.referenceSql).some((s) => s.char === '*')),
  `${withStar.length} 课`
)
const withComma = LESSONS.filter((l) => l.referenceSql.match(/SELECT[\s\S]*?,[\s\S]*?FROM/i))
check(
  '多列课程都会讲逗号',
  withComma.length > 0 && withComma.every((l) => symbolsForLevel(l.referenceSql).some((s) => s.char === ',')),
  `${withComma.length} 课`
)
const withQuote = LESSONS.filter((l) => /'/.test(l.referenceSql))
check(
  '用到字符串的课程都会讲单引号',
  withQuote.length > 0 && withQuote.every((l) => symbolsForLevel(l.referenceSql).some((s) => s.char === "'")),
  `${withQuote.length} 课`
)
const distinctLesson = LESSONS.find((l) => l.title.includes('DISTINCT'))
check('没有特殊符号的课程返回空列表且不报错', symbolsForLevel(distinctLesson.referenceSql).length === 0, `${distinctLesson.title} 没有特殊符号（符合预期）`)

console.log(`\n结果：${pass} 通过 / ${fail} 失败`)
process.exit(fail ? 1 : 0)
