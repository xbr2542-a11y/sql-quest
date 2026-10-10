/**
 * 渲染冒烟测试：用 Vite 的 SSR 能力真实渲染各个页面组件，
 * 抓出「模块能编译但一渲染就崩」的问题（比如引用了不存在的变量或组件）。
 */
import { createServer } from 'vite'
import React from 'react'
import { renderToString } from 'react-dom/server'

const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error'
})

let pass = 0
let fail = 0
const smoke = (name, fn) => {
  try {
    const html = fn()
    if (html && html.length > 50) {
      pass++
      console.log(`  ✅ ${name}（渲染出 ${html.length} 字符）`)
    } else {
      fail++
      console.log(`  ❌ ${name} → 渲染结果为空`)
    }
  } catch (e) {
    fail++
    console.log(`  ❌ ${name} → ${e.message}`)
  }
}

console.log('\n【页面渲染冒烟】')

const pages = await server.ssrLoadModule('/src/pages.jsx')
const ui = await server.ssrLoadModule('/src/ui.jsx')
const progress = await server.ssrLoadModule('/src/progress.js')
const levels = await server.ssrLoadModule('/src/levels.js')
const play = await server.ssrLoadModule('/src/LevelPlay.jsx')
const review = await server.ssrLoadModule('/src/Review.jsx')
const variants = await server.ssrLoadModule('/src/variants.js')

const p = { ...progress.emptyProgress(), stars: { 1: 3, 2: 2, 5: 3 }, bonus: 250, path: 'basic' }
const rankInfo = progress.rankOf(p)

smoke('入职页', () => renderToString(React.createElement(pages.Intro, { onPick: () => {}, hasProgress: true })))
smoke('顶栏', () =>
  renderToString(
    React.createElement(ui.TopBar, { rankInfo, progress: p, route: { page: 'map' }, onNav: () => {}, onReset: () => {} })
  )
)
smoke('关卡地图', () =>
  renderToString(
    React.createElement(pages.LevelMap, {
      progress: p,
      unlocked: new Set([1, 2, 3, 4, 5, 13, 17]),
      onOpen: () => {},
      onUnlockAdvanced: () => {},
      toast: () => {}
    })
  )
)
smoke('关卡页（第 4 关）', () =>
  renderToString(
    React.createElement(play.default, {
      db: {},
      level: levels.LEVELS[3],
      progress: p,
      onFinish: () => {},
      onBack: () => {},
      toast: () => {}
    })
  )
)
smoke('关卡页（Boss 关 19）', () =>
  renderToString(
    React.createElement(play.default, {
      db: {},
      level: levels.LEVELS.find((l) => l.id === 19),
      progress: p,
      onFinish: () => {},
      onBack: () => {},
      toast: () => {}
    })
  )
)
smoke('结果表格', () =>
  renderToString(
    React.createElement(ui.ResultTable, { result: { columns: ['a', 'b'], rows: [[1, null], [2, 'x']] } })
  )
)
smoke('对象树', () => renderToString(React.createElement(ui.ObjectTree, { only: ['orders'], openTable: 'orders' })))
smoke('语法注解', () => renderToString(React.createElement(ui.SyntaxNotes, { sql: "SELECT name, price FROM products WHERE price > 100" })))
smoke('周会复盘页', () =>
  renderToString(
    React.createElement(review.default, {
      db: {},
      queue: [{ levelId: 3, level: levels.LEVELS[2], variant: variants.VARIANTS[3] }],
      onPass: () => {},
      onExit: () => {},
      onFinish: () => {}
    })
  )
)

console.log(`\n结果：${pass} 通过 / ${fail} 失败`)

// 关卡数据完整性检查
console.log('\n【关卡数据完整性】')
const need = ['id', 'track', 'point', 'title', 'story', 'task', 'tables', 'referenceSql', 'hints']
let missing = 0
for (const l of levels.LEVELS) {
  const gaps = need.filter((k) => l[k] === undefined)
  if (gaps.length) {
    missing++
    console.log(`  ❌ 第 ${l.id} 关缺字段：${gaps.join(', ')}`)
  }
  if (l.hints.length !== 3) {
    missing++
    console.log(`  ❌ 第 ${l.id} 关提示不是 3 条`)
  }
  if (l.referenceSql.includes('undefined')) {
    missing++
    console.log(`  ❌ 第 ${l.id} 关参考 SQL 里有 undefined`)
  }
}
const ids = levels.LEVELS.map((l) => l.id)
if (ids.join(',') !== ids.map((_, i) => i + 1).join(',')) {
  missing++
  console.log('  ❌ 关卡 ID 不连续')
}
if (levels.LEVELS.length !== 19) {
  missing++
  console.log(`  ❌ 关卡数量是 ${levels.LEVELS.length}，期望 19`)
}
console.log(missing ? `  ${missing} 个问题` : '  ✅ 19 关数据完整（字段齐全、提示各 3 条、ID 连续、参考 SQL 无空缺）')

await server.close()
process.exit(fail + missing ? 1 : 0)
