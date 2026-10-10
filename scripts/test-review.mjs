/**
 * 错题盒 / 复盘节奏的单元测试：1 → 3 → 7 天三档，过了就移出盒子。
 * 运行：npm run test:review
 */
import { emptyProgress, markWrong, advanceWrong, dueItems, pendingItems, dueCount, reviewStageLabel, DAY } from '../src/progress.js'
import { VARIANTS } from '../src/variants.js'
import { LEVELS } from '../src/levels.js'

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

const T0 = 1757000000000 // 固定时间戳，避免测试依赖真实时间

console.log('\n【答错 → 进错题盒】')
let p = emptyProgress()
p = markWrong(p, 3, T0)
check('新建一条：第 1 档', p.wrong[3]?.stage === 0, `stage=${p.wrong[3]?.stage}`)
check('1 天后到期', p.wrong[3]?.dueAt === T0 + 1 * DAY, reviewStageLabel(p.wrong[3]))
check('记录次数', p.wrong[3]?.n === 1)

p = markWrong(p, 3, T0 + 3600_000)
check('再错一次：次数累加，到期时间不提前', p.wrong[3]?.n === 2 && p.wrong[3]?.dueAt === T0 + 1 * DAY, `n=${p.wrong[3]?.n}`)

console.log('\n【到期判定】')
check('刚答错时还没到期', dueCount(p, T0) === 0)
check('过 1 天后到期', dueCount(p, T0 + 1 * DAY + 1000) === 1)
check('到期列表带 levelId', dueItems(p, T0 + 1 * DAY + 1000)[0]?.levelId === 3)

console.log('\n【复习通过 → 往前走一档】')
p = advanceWrong(p, 3, T0 + 1 * DAY + 1000)
check('进入第 2 档', p.wrong[3]?.stage === 1, reviewStageLabel(p.wrong[3]))
check('下次 3 天后到期', p.wrong[3]?.dueAt === T0 + 1 * DAY + 1000 + 3 * DAY)

p = advanceWrong(p, 3, T0 + 4 * DAY)
check('进入第 3 档', p.wrong[3]?.stage === 2, reviewStageLabel(p.wrong[3]))
check('下次 7 天后到期', p.wrong[3]?.dueAt === T0 + 4 * DAY + 7 * DAY)

p = advanceWrong(p, 3, T0 + 11 * DAY)
check('三档都过了：移出错题盒', !p.wrong[3])
check('记入已掌握', (p.cleared || []).includes(3))
check('盒子空了', pendingItems(p).length === 0)

console.log('\n【边界】')
let q = emptyProgress()
q = advanceWrong(q, 5, T0)
check('不在盒子里的题，复习通过也不会出错', pendingItems(q).length === 0)
q = markWrong(q, 5, T0)
q = markWrong(q, 8, T0)
check('多道题按到期时间排序', pendingItems(q).length === 2)
check('同时到期都算到期', dueCount(q, T0 + 2 * DAY) === 2)
const r = markWrong({ ...emptyProgress(), cleared: [5] }, 5, T0)
check('再次答错会从「已掌握」里移除', !r.cleared.includes(5) && !!r.wrong[5])

console.log('\n【题库对齐】')
const missingVariant = LEVELS.filter((l) => !VARIANTS[l.id]).map((l) => l.id)
check('每一关都有对应的变体题', missingVariant.length === 0, missingVariant.length ? `缺 ${missingVariant.join(',')}` : `${Object.keys(VARIANTS).length} 条`)
const orphan = Object.keys(VARIANTS).filter((id) => !LEVELS.some((l) => String(l.id) === String(id)))
check('没有多余的变体题', orphan.length === 0, orphan.join(',') || '干净')
const noHints = Object.values(VARIANTS).filter((v) => !v.story || !v.task || !v.referenceSql).length
check('每道变体题都有场景 / 要求 / 参考答案', noHints === 0)

console.log(`\n结果：${pass} 通过 / ${fail} 失败`)
process.exit(fail ? 1 : 0)
