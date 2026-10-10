/**
 * 「怎么想出来」：把写一条 SQL 的思考过程拆成一串问题。
 * 刻意不是「给你格式照着填」——每个子句都先问「要解决什么问题」，
 * 再讲「不写它会怎样」，最后才给出可插入的骨架。
 */

import { clauseList } from './sqlMeta.js'

const REASON = {
  SELECT: {
    q: '我要看全部列，还是只看其中几列？',
    what:
      'SELECT 后面写你要看的列。这里有一个岔路口：\n' +
      '　· 全部列都要 → 写一个星号 * （它是「所有列」的简写）\n' +
      '　· 只要其中几列 → 把列名一个个写出来，中间用英文逗号隔开',
    why:
      '一张表有几十列，你不说要看哪些，数据库不知道给什么。关键在于这两个选择不能混：写了星号就是把所有列都要回来，' +
      '只要三列却写了星号，结果列数对不上，判定会直接不通过。',
    branches: [
      { cond: '全部列都要', code: 'SELECT * FROM 表名' },
      { cond: '只要其中几列', code: 'SELECT 列名, 列名 FROM 表名' }
    ],
    trap:
      '新手的经典坑：在上一关学会了写 *，到这一关还是写 * ——如果这一关只要几列，写星号会把整张表的列全要回来，判定会说「列数不对」。'
  },
  FROM: {
    q: '这些东西放在哪张表里？',
    what: 'FROM 后面写表名。',
    why: '库里有 9 张表。你不说从哪张拿，它就不知道该翻哪一本。判断方法很简单：你要的字段名，在哪张表的字段列表里出现过。',
    trap: '新手常见错误：表名写错或写了字段名。表名可以用左边列表点出来。'
  },
  JOIN: {
    q: '要的信息是不是分散在两张表里？',
    what: 'JOIN 把另一张表接进来，ON 后面写两张表靠什么对上。',
    why: '订单表里只有用户 ID，看不到姓名和城市。要拿到它们，就得说明「订单的 user_id 等于用户的 user_id」，两张表才能一行行拼起来。',
    trap: '新手常见错误：只写 JOIN 不写 ON，或者两边字段名没对上，结果会变成一个巨大的交叉表。'
  },
  WHERE: {
    q: '有没有不需要的行，要先剔除掉？',
    what: 'WHERE 后面写筛选条件，把不符合要求的行挡在外面。',
    why: '表里通常混着你不要的数据（比如已取消、已退款的订单）。不筛，算出来的数就会偏大——这就是工作中的「口径」，也是新人最容易挨骂的地方。',
    trap: "新手常见错误：文字条件忘了加英文单引号（'paid'），或者用 = NULL 判断空值（要用 IS NULL）。"
  },
  'GROUP BY': {
    q: '是只看一个总数，还是要分成几类分别看？',
    what: 'GROUP BY 指明「按哪一列分组」，分组之后 COUNT、SUM 才是分别对每一组算。',
    why: '「一共卖了多少」和「每个渠道各卖了多少」是两个完全不同的问题。后者必须先分组，数据库才知道你要的是每一组各自的小计。',
    trap: '新手常见错误：SELECT 里放了没有参与分组、也没被 COUNT/SUM 包起来的列。'
  },
  HAVING: {
    q: '分组出来的结果，还要不要再剔掉一些组？',
    what: 'HAVING 在分组之后筛「组」。',
    why: 'WHERE 是在分组前筛「行」，HAVING 是在分组后筛「组」。像「只看单量超过 500 的入口」，得先算出每组的单量才谈得上筛，所以只能用 HAVING。',
    trap: '新手常见错误：把 HAVING 写成 WHERE，执行会直接报聚合函数用错地方。'
  },
  'ORDER BY': {
    q: '结果要不要按某种顺序排？',
    what: 'ORDER BY 指定排序字段，DESC 是从大到小，ASC 或省略是从小到大。',
    why: '数据库不保证返回顺序。想要「最贵的排前面」，就得明说；做 TOP N 时，排序和 LIMIT 必须一起用才有意义。',
    trap: '新手常见错误：方向写反（该 DESC 写了 ASC），结果拿成了最便宜的十个。'
  },
  LIMIT: {
    q: '只要前几条，还是要全部？',
    what: 'LIMIT 限制最多返回几行。',
    why: '表里几千行，你只要前十名，多取回来既慢又难看清。配合 ORDER BY 就是「取前几名」的标准写法。',
    trap: '新手常见错误：只写 LIMIT 不写 ORDER BY——那就是随手取几条，不是「前几名」。'
  }
}

/** 数一数 SELECT 后面有几个顶层逗号 —— 用来判断这一关要几列 */
function countSelectColumns(list) {
  let depth = 0
  let commas = 0
  let quote = false
  for (const ch of String(list || '')) {
    if (ch === "'") quote = !quote
    if (quote) continue
    if (ch === '(') depth++
    else if (ch === ')') depth = Math.max(0, depth - 1)
    else if (ch === ',' && depth === 0) commas++
  }
  return commas + 1
}

/**
 * 这一关的 SELECT 到底是「全部列」还是「其中几列」——
 * 从他自己的参考答案推出来，直接写在步骤里，不用玩家猜。
 */
function selectChoiceNote(referenceSql) {
  const m = String(referenceSql || '').match(/SELECT([\s\S]*?)\bFROM\b/i)
  if (!m) return null
  const list = m[1].trim()
  if (/^\*$/.test(list.replace(/\s+/g, ''))) {
    return { kind: 'all', text: '这一关要的是「整张表的全部列」，所以在 SELECT 后面写星号 * 就够了。' }
  }
  const n = countSelectColumns(list)
  return {
    kind: 'some',
    text:
      `这一关只要 ${n} 列，所以不能写星号——写了星号会把整张表的列都取回来，判定会告诉你列数不对。` +
      `把这几列的名字写出来，中间用英文逗号隔开。`
  }
}

/** 这一关该按什么顺序想，每一步都带「为什么」 */
export function thinkingSteps(referenceSql) {
  const note = selectChoiceNote(referenceSql)
  return clauseList(referenceSql)
    .map((c) => ({
      clause: c,
      ...REASON[c],
      // 只给 SELECT 这一步挂上「这一关怎么选」
      choiceNote: c === 'SELECT' ? note : null
    }))
    .filter((s) => s.q)
}
