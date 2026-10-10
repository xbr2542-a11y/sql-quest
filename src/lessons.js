/**
 * 零基础第一课：14 个短课，覆盖基础 SQL 概念。
 * 每一课都按同一套流程走：
 *   是什么(what) → 有什么作用(role) → 最小示例(demo) → 玩家动手(task)
 *   → 即时反馈（判定 + 语法体检，复用现有系统）→ 简短总结(summary)
 * 这里只放内容，不动游戏机制。
 */

export const LESSONS = [
  {
    id: 1,
    title: '数据库和表',
    concept: '数据库 / 表 / 行 / 列',
    what: '数据库就是一个仓库，里面装着好几张「表」。表长得像 Excel 的一张工作表。',
    role: '你要的数据都放在表里，所以拿到问题时第一个念头应该是：我要的数据在哪张表？',
    demo: 'SELECT * FROM products',
    demoNote: '把 products 表（商品表）整张调出来看',
    task: '查出 products 表的全部内容，看看它长什么样。',
    tables: ['products'],
    referenceSql: 'SELECT * FROM products',
    hints: [
      { learn: '表名在哪看', how: '左边那一栏列出的就是所有表', demo: 'products' },
      { learn: '怎么写', how: '先写 SELECT，再写 FROM 加表名', demo: 'SELECT * FROM products' },
      { learn: '完整答案', how: '点一下就能放进编辑器', demo: 'SELECT * FROM products' }
    ],
    summary: '一张表 = 一类数据；一行 = 一条记录；一列 = 一类信息。',
    terms: ['database', 'table', 'row', 'column']
  },
  {
    id: 2,
    title: '列名：只把你需要的列拿出来',
    concept: '列名（字段）/ 逗号 / 空格 / 分号',
    what: '每一列都有自己的名字，叫「列名」，也叫「字段名」。',
    role: '要哪几列就在 SELECT 后面写哪几个列名，中间用英文逗号隔开。',
    demo: 'SELECT name, price FROM products',
    demoNote: '只要商品名和价格两列',
    task: '从 products 里查出商品名（name）和价格（price）两列。',
    tables: ['products'],
    referenceSql: 'SELECT name, price FROM products',
    hints: [
      { learn: '逗号的作用', how: '多个列名之间用英文逗号隔开', demo: 'name, price' },
      { learn: '空格与分号', how: '词之间用空格分开；句尾分号可写可不写', demo: 'SELECT name, price FROM products;' },
      { learn: '完整答案', how: '点一下就能放进编辑器', demo: 'SELECT name, price FROM products' }
    ],
    summary: '列与列之间用英文逗号；词与词之间用空格；分号可写可不写。',
    terms: ['columnName', 'field', 'keyword']
  },
  {
    id: 3,
    title: '别名：给列换个表头',
    concept: '别名 / AS / 表头',
    what: '别名就是给列临时换个名字，用 AS 连接。',
    role: '要求里点名要某个表头时（比如要 product_name），就用别名改掉表头。',
    demo: 'SELECT name AS product_name FROM products',
    demoNote: '表头从 name 变成 product_name',
    task: '查出商品名和价格，表头要求分别是 product_name 和 price。',
    tables: ['products'],
    referenceSql: 'SELECT name AS product_name, price AS price FROM products',
    hints: [
      { learn: 'AS 的写法', how: '列名 + AS + 新名字', demo: 'name AS product_name' },
      { learn: '两列都要改', how: '两列之间别忘了逗号', demo: 'name AS product_name, price AS price' },
      { learn: '完整答案', how: '点一下就能放进编辑器', demo: 'SELECT name AS product_name, price AS price FROM products' }
    ],
    summary: '别名用 AS 连接，只改表头，不改数据。',
    terms: ['alias', 'header']
  },
  {
    id: 4,
    title: '筛选行：WHERE 和字符串',
    concept: 'WHERE / 字符串 / 等号',
    what: 'WHERE 是一把筛子，把不符合条件的行挡在外面。用英文单引号包起来的文字叫「字符串」。',
    role: '只要一部分数据时，就用 WHERE 说明条件；文字必须加英文单引号。',
    demo: "SELECT * FROM products WHERE category = '数码配件'",
    demoNote: '只要数码配件这一类商品',
    task: "查出 category（品类）为 '数码配件' 的商品，全部列。",
    tables: ['products'],
    referenceSql: "SELECT * FROM products WHERE category = '数码配件'",
    hints: [
      { learn: '条件写在哪', how: 'FROM 表名 后面接 WHERE 条件', demo: "WHERE category = '数码配件'" },
      { learn: '引号别写错', how: '文字值要用英文单引号，按 Shift 切英文', demo: "'数码配件'" },
      { learn: '完整答案', how: '点一下就能放进编辑器', demo: "SELECT * FROM products WHERE category = '数码配件'" }
    ],
    summary: 'WHERE 负责筛行；文字值要用英文单引号包起来。',
    terms: ['string', 'operator']
  },
  {
    id: 5,
    title: '比大小：运算符',
    concept: '运算符 >= <= > <',
    what: '运算符用来比较大小：> 大于、< 小于、>= 大于等于、<= 小于等于。',
    role: '价格、时间、数量这类数字，都可以用运算符来筛。',
    demo: 'SELECT name, price FROM products WHERE price >= 300',
    demoNote: '只要 300 元及以上的商品',
    task: '查出价格大于等于 300 的商品，两列：name、price。',
    tables: ['products'],
    referenceSql: 'SELECT name, price FROM products WHERE price >= 300',
    hints: [
      { learn: '符号怎么写', how: '大于等于是 >=，别忘了等号', demo: 'price >= 300' },
      { learn: '数字不用引号', how: '数字直接写，加了引号也能跑但不规范', demo: 'price >= 300' },
      { learn: '完整答案', how: '点一下就能放进编辑器', demo: 'SELECT name, price FROM products WHERE price >= 300' }
    ],
    summary: '数字比较直接用运算符，不需要引号。',
    terms: ['operator']
  },
  {
    id: 6,
    title: '两个条件：AND 和 OR',
    concept: 'AND / OR',
    what: 'AND 表示两个条件都要满足，OR 表示满足其中一个就行。',
    role: '业务问题几乎都是多条件的，比如「数码配件里价格 300 以上的」。',
    demo: "SELECT name, price FROM products WHERE category = '数码配件' AND price >= 300",
    demoNote: '既是数码配件、价格又要 300 以上',
    task: "查出 category 为 '数码配件' 且 price 大于等于 300 的商品，两列：name、price。",
    tables: ['products'],
    referenceSql: "SELECT name, price FROM products WHERE category = '数码配件' AND price >= 300",
    hints: [
      { learn: '用哪个词', how: '两个条件都满足用 AND', demo: '条件一 AND 条件二' },
      { learn: '顺序不影响', how: '两个条件谁先写都行', demo: "price >= 300 AND category = '数码配件'" },
      { learn: '完整答案', how: '点一下就能放进编辑器', demo: "SELECT name, price FROM products WHERE category = '数码配件' AND price >= 300" }
    ],
    summary: 'AND = 都要满足；OR = 满足一个就行。',
    terms: ['operator']
  },
  {
    id: 7,
    title: '排序：ORDER BY',
    concept: 'ORDER BY / DESC',
    what: 'ORDER BY 决定结果按哪一列排队，DESC 表示从大到小。',
    role: '数据库默认的顺序是不保证的，要看「最贵的」必须先排序。',
    demo: 'SELECT name, price FROM products ORDER BY price DESC',
    demoNote: '价格从高到低排',
    task: '查出商品的 name 和 price，按价格从高到低排序。',
    tables: ['products'],
    referenceSql: 'SELECT name, price FROM products ORDER BY price DESC',
    hints: [
      { learn: '写在哪', how: '放在整句的最后', demo: 'ORDER BY price DESC' },
      { learn: '方向', how: 'DESC 从大到小，ASC 或省略是从小到大', demo: 'ORDER BY price DESC' },
      { learn: '完整答案', how: '点一下就能放进编辑器', demo: 'SELECT name, price FROM products ORDER BY price DESC' }
    ],
    summary: '要排序就写 ORDER BY；从大到小加 DESC。',
    terms: ['keyword']
  },
  {
    id: 8,
    title: '只要前几条：LIMIT',
    concept: 'LIMIT',
    what: 'LIMIT 限制结果最多返回几行。',
    role: '「最贵的前 5 个」这类需求，就是排序 + LIMIT 一起用。',
    demo: 'SELECT name, price FROM products ORDER BY price DESC LIMIT 5',
    demoNote: '最贵的 5 个商品',
    task: '查出价格最高的 5 个商品，两列：name、price，从高到低排序。',
    tables: ['products'],
    referenceSql: 'SELECT name, price FROM products ORDER BY price DESC LIMIT 5',
    hints: [
      { learn: 'LIMIT 的作用', how: '后面写数字，表示只要几行', demo: 'LIMIT 5' },
      { learn: '顺序', how: '先 ORDER BY 排序，再 LIMIT 取前几条', demo: 'ORDER BY price DESC LIMIT 5' },
      { learn: '完整答案', how: '点一下就能放进编辑器', demo: 'SELECT name, price FROM products ORDER BY price DESC LIMIT 5' }
    ],
    summary: '排序 + LIMIT = 取前几名；只写 LIMIT 就是随手取几条。',
    terms: ['keyword']
  },
  {
    id: 9,
    title: '去重：DISTINCT',
    concept: 'DISTINCT',
    what: 'DISTINCT 把重复的值合并掉，只留一个。',
    role: '「我们一共有几个品类」这种问题，就是去重之后数一数。',
    demo: 'SELECT DISTINCT category FROM products',
    demoNote: '列出所有出现过的品类，每个只出现一次',
    task: '列出 products 表里出现过的所有品类，每个只出现一次。',
    tables: ['products'],
    referenceSql: 'SELECT DISTINCT category FROM products',
    hints: [
      { learn: '写在哪', how: 'DISTINCT 放在 SELECT 后面、列名前面', demo: 'SELECT DISTINCT category' },
      { learn: '作用', how: '相同的值只保留一个', demo: 'SELECT DISTINCT category FROM products' },
      { learn: '完整答案', how: '点一下就能放进编辑器', demo: 'SELECT DISTINCT category FROM products' }
    ],
    summary: 'DISTINCT 去重，常用来回答「一共有几种」。',
    terms: ['keyword']
  },
  {
    id: 10,
    title: '数一数、加一加：聚合函数',
    concept: '聚合函数 / 括号 / COUNT / SUM',
    what: '聚合函数把很多行合并成一个结果，名字后面跟一对英文括号。',
    role: '「一共多少个」「一共多少钱」都用它。COUNT 数行数，SUM 把一列加起来。',
    demo: 'SELECT COUNT(*) AS product_cnt, SUM(price) AS price_sum FROM products',
    demoNote: '数一数有几个商品，再把价格加起来',
    task: '输出两列：products 表的商品个数（别名 product_cnt）和价格合计（别名 price_sum）。',
    tables: ['products'],
    referenceSql: 'SELECT COUNT(*) AS product_cnt, SUM(price) AS price_sum FROM products',
    hints: [
      { learn: '怎么数行', how: 'COUNT(*) 的括号里写星号', demo: 'COUNT(*) AS product_cnt' },
      { learn: '怎么求和', how: 'SUM 的括号里写要相加的列名', demo: 'SUM(price) AS price_sum' },
      { learn: '完整答案', how: '点一下就能放进编辑器', demo: 'SELECT COUNT(*) AS product_cnt, SUM(price) AS price_sum FROM products' }
    ],
    summary: '聚合函数 = 把多行变成一行；括号里写要处理的内容。',
    terms: ['function', 'aggregate']
  },
  {
    id: 11,
    title: '分组统计：GROUP BY',
    concept: 'GROUP BY',
    what: 'GROUP BY 按某一列把行分成几堆，再对每一堆分别统计。',
    role: '「每个品类各有几个商品」这种问题，必须先把行分组。',
    demo: 'SELECT category, COUNT(*) AS cnt FROM products GROUP BY category',
    demoNote: '每个品类各有多少个商品',
    task: '按 category 分组，统计每个品类的商品个数，两列：category、cnt。',
    tables: ['products'],
    referenceSql: 'SELECT category, COUNT(*) AS cnt FROM products GROUP BY category',
    hints: [
      { learn: '分组列要放进 SELECT', how: '你按哪列分组，就把它写在 SELECT 里', demo: 'SELECT category, COUNT(*)' },
      { learn: 'GROUP BY 写在哪', how: '放在最后', demo: 'GROUP BY category' },
      { learn: '完整答案', how: '点一下就能放进编辑器', demo: 'SELECT category, COUNT(*) AS cnt FROM products GROUP BY category' }
    ],
    summary: '先 GROUP BY 分组，再对每一组做 COUNT / SUM。',
    terms: ['aggregate', 'keyword']
  },
  {
    id: 12,
    title: '分组之后再筛选：HAVING',
    concept: 'HAVING / WHERE 与 HAVING 的区别',
    what: 'HAVING 在分组之后筛「组」。',
    role: 'WHERE 筛的是行，HAVING 筛的是分组结果。要按统计值筛，只能用 HAVING。',
    demo: 'SELECT category, COUNT(*) AS cnt FROM products GROUP BY category HAVING COUNT(*) >= 10',
    demoNote: '只看商品数不少于 10 个的品类',
    task: '按 category 分组统计商品个数（别名 cnt），只保留个数不少于 10 的品类。',
    tables: ['products'],
    referenceSql: 'SELECT category, COUNT(*) AS cnt FROM products GROUP BY category HAVING COUNT(*) >= 10',
    hints: [
      { learn: '为什么不能用 WHERE', how: '分组还没算出来时，没法比较组的大小', demo: '要写 HAVING' },
      { learn: '写在哪', how: 'HAVING 放在 GROUP BY 后面', demo: 'GROUP BY category HAVING COUNT(*) >= 10' },
      { learn: '完整答案', how: '点一下就能放进编辑器', demo: 'SELECT category, COUNT(*) AS cnt FROM products GROUP BY category HAVING COUNT(*) >= 10' }
    ],
    summary: 'WHERE 筛行（分组前），HAVING 筛组（分组后）。',
    terms: ['keyword', 'aggregate']
  },
  {
    id: 13,
    title: '把两张表接起来：JOIN',
    concept: 'JOIN / ON / 表名',
    what: 'JOIN 把另一张表接进来，ON 后面写两张表靠什么对应。',
    role: '订单表里只有用户 ID，看不到姓名。要姓名就得把用户表接进来。',
    demo: 'SELECT o.order_id, u.name AS user_name FROM orders o JOIN users u ON o.user_id = u.user_id LIMIT 10',
    demoNote: '把订单和用户接起来，看每笔订单是谁下的',
    task: '查出订单号（order_id）和下单用户姓名（别名 user_name），只取 10 行。',
    tables: ['orders', 'users'],
    referenceSql: 'SELECT o.order_id, u.name AS user_name FROM orders o JOIN users u ON o.user_id = u.user_id LIMIT 10',
    hints: [
      { learn: '连接条件', how: '订单的 user_id 等于用户的 user_id', demo: 'ON o.user_id = u.user_id' },
      { learn: '表别名 o 和 u', how: '给表起短名，写字段时带上它就清楚是谁的', demo: 'FROM orders o JOIN users u' },
      { learn: '完整答案', how: '点一下就能放进编辑器', demo: 'SELECT o.order_id, u.name AS user_name FROM orders o JOIN users u ON o.user_id = u.user_id LIMIT 10' }
    ],
    summary: '两张表靠共同的字段接起来：JOIN 表 ON 对应关系。',
    terms: ['tableName', 'columnName', 'alias']
  },
  {
    id: 14,
    title: '空值：NULL 与 IS NULL',
    concept: 'NULL / IS NULL',
    what: 'NULL 表示「这里什么都没填」，它不等于 0，也不等于空文字。',
    role: '判断空值不能用等号，要用 IS NULL；否则一条都查不到。',
    demo: 'SELECT * FROM users WHERE channel IS NULL',
    demoNote: '找出没有渠道记录的用户',
    task: '查出所有 channel 为空的用户，全部列。',
    tables: ['users'],
    referenceSql: 'SELECT * FROM users WHERE channel IS NULL',
    hints: [
      { learn: '别用等号', how: '= NULL 永远匹配不到任何行', demo: '要用 IS NULL' },
      { learn: '写在哪', how: '和普通条件一样写在 WHERE 后面', demo: 'WHERE channel IS NULL' },
      { learn: '完整答案', how: '点一下就能放进编辑器', demo: 'SELECT * FROM users WHERE channel IS NULL' }
    ],
    summary: '空值判断只有一种写法：IS NULL。',
    terms: ['null']
  }
]

export const getLesson = (id) => LESSONS.find((l) => l.id === id)
