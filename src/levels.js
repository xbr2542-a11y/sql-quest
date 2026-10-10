/**
 * 18 关关卡定义。判定方式：跑参考 SQL 得到期望结果，再与玩家结果做结果集比对。
 * track: basic = 基础线（免费） / work = 业务线（免费）
 */

export const LEVELS = [
  {
    id: 1,
    track: 'basic',
    point: 'SELECT *',
    title: '先看看手头有什么',
    story:
      '入职第一天，主管把一张商品表丢给你：「公司的 SKU 都在 products 表里，你先自己看看长什么样。」',
    task: '查出 products 表的全部行和全部列。',
    tables: ['products'],
    referenceSql: 'SELECT * FROM products',
    sample: 'SELECT * FROM products;',
    hints: [
      '要看整张表，用星号代表「所有列」。',
      'SELECT 要看的列 FROM 表名 —— 列的位置写 * 就是全部列。',
      'SELECT * FROM products'
    ]
  },
  {
    id: 2,
    track: 'basic',
    point: '选列与别名 AS',
    title: '只交该交的字段',
    story: '主管要一份商品清单，但只想要三个字段，而且列名必须是英文的规范写法，方便后面做报表。',
    task:
      '从 products 里查出三列，顺序必须是：name（别名 product_name）、price（别名 price）、category（别名 category）。这一关会校验列名。',
    tables: ['products'],
    referenceSql: 'SELECT name AS product_name, price AS price, category AS category FROM products',
    compareColumnNames: true,
    sample: 'SELECT name AS product_name, price AS price FROM products;',
    hints: [
      '不要用 * —— 明确写出你要的三列。',
      '列名可以用 AS 起别名：列名 AS 别名。第一列的别名是 product_name。',
      'SELECT name AS product_name, price AS price, category AS category FROM products'
    ]
  },
  {
    id: 3,
    track: 'basic',
    point: 'WHERE 等值筛选',
    title: '这批用户从哪来的',
    story: '运营同事问：「小红书渠道进来的用户，给我拉一份名单。」',
    task: "查出所有 channel 为 '小红书' 的用户，全部字段。",
    tables: ['users'],
    referenceSql: "SELECT * FROM users WHERE channel = '小红书'",
    sample: "SELECT * FROM users WHERE channel = '抖音';",
    hints: [
      '要按条件挑行，用 WHERE。',
      "文字条件要用单引号包起来：WHERE channel = '小红书'",
      "SELECT * FROM users WHERE channel = '小红书'"
    ]
  },
  {
    id: 4,
    track: 'basic',
    point: '范围与多条件 AND',
    title: '618 那几天卖了多少单',
    story:
      '「618 大促那几天的订单，我要看看。」运营小张强调：只要已经支付的，已取消和退款的别混进来。',
    task:
      "订单时间在 2026-06-16 00:00:00 到 2026-06-20 23:59:59 之间、且 status 为 'paid' 的订单，全部字段。",
    tables: ['orders'],
    referenceSql:
      "SELECT * FROM orders WHERE order_time >= '2026-06-16' AND order_time <= '2026-06-20 23:59:59' AND status = 'paid'",
    sample: "SELECT * FROM orders WHERE status = 'paid' AND order_time >= '2026-06-16';",
    hints: [
      '两个条件要同时满足，用 AND 连接。',
      "时间可以当字符串比大小：order_time >= '2026-06-16'。别漏了 status = 'paid'。",
      "SELECT * FROM orders WHERE order_time >= '2026-06-16' AND order_time <= '2026-06-20 23:59:59' AND status = 'paid'"
    ]
  },
  {
    id: 5,
    track: 'basic',
    point: 'IN 与 LIKE',
    title: '把相关商品捞出来',
    story: '商品部在盘点品类，要一份「蓝牙」和「无线」相关商品的清单，名字里带就算。',
    task: "查出商品名里包含「蓝牙」或「无线」的商品，全部字段。（两个条件满足其一即可）",
    tables: ['products'],
    referenceSql: "SELECT * FROM products WHERE name LIKE '%蓝牙%' OR name LIKE '%无线%'",
    sample: "SELECT * FROM products WHERE name LIKE '%耳机%';",
    hints: [
      '模糊匹配用 LIKE，% 代表任意字符。',
      "name LIKE '%蓝牙%' 表示名字里任意位置出现「蓝牙」。两个条件用 OR 连起来。",
      "SELECT * FROM products WHERE name LIKE '%蓝牙%' OR name LIKE '%无线%'"
    ]
  },
  {
    id: 6,
    track: 'basic',
    point: 'IS NULL 空值陷阱',
    title: '为什么会少一批人',
    story:
      '小张统计各渠道用户数，加起来比总人数少了 30 多个。她盯着屏幕说：「明明没错啊。」',
    task: '查出所有 channel 为空（没有渠道记录）的用户，全部字段。',
    tables: ['users'],
    referenceSql: 'SELECT * FROM users WHERE channel IS NULL',
    sample: 'SELECT * FROM users WHERE channel IS NULL;',
    hints: [
      '空值不能用 = 比较，SQL 里空值有专门的判断写法。',
      'IS NULL 用来判断「值为空」，IS NOT NULL 是「不为空」。',
      'SELECT * FROM users WHERE channel IS NULL'
    ]
  },
  {
    id: 7,
    track: 'basic',
    point: 'ORDER BY 与 LIMIT',
    title: '最贵的十个商品',
    story: '「我们最贵的十个 SKU 是哪些？」主管想看看高价商品的结构。',
    task:
      '查出价格最高的 10 个商品，全部字段，按价格从高到低排序。价格相同时，product_id 小的排前面。',
    tables: ['products'],
    referenceSql: 'SELECT * FROM products ORDER BY price DESC, product_id ASC LIMIT 10',
    orderSensitive: true,
    sample: 'SELECT * FROM products ORDER BY price DESC LIMIT 5;',
    hints: [
      '排序用 ORDER BY 列名 DESC（DESC 是从大到小）。只看前几条用 LIMIT。',
      'ORDER BY price DESC 之后加 LIMIT 10。',
      'SELECT * FROM products ORDER BY price DESC, product_id ASC LIMIT 10'
    ]
  },
  {
    id: 8,
    track: 'basic',
    point: 'DISTINCT 去重',
    title: '我们一共投了几个渠道',
    story: '老板随口一问：「我们现在的获客渠道有几个？」不能猜，得看数据。',
    task: '列出 users 表里出现过的所有渠道值，每个只出现一次。注意：没有渠道记录的那批人也要算一个值。',
    tables: ['users'],
    referenceSql: 'SELECT DISTINCT channel FROM users',
    sample: 'SELECT DISTINCT city FROM users;',
    hints: [
      '要「去重」，在一列前面加 DISTINCT。',
      'SELECT DISTINCT 列名 FROM 表名 —— 不要加 WHERE 过滤，空值也算一种值。',
      'SELECT DISTINCT channel FROM users'
    ]
  },
  {
    id: 9,
    track: 'basic',
    point: '聚合函数 SUM',
    title: '一共卖了多少钱',
    story: '「这半年已支付的订单，总销售额是多少？」这是周报里最基础的一个数。',
    task: "一行一列：已支付（status = 'paid'）订单的 total_amount 合计，别名 gmv。",
    tables: ['orders'],
    referenceSql: "SELECT SUM(total_amount) AS gmv FROM orders WHERE status = 'paid'",
    tolerance: 0.01,
    sample: 'SELECT SUM(total_amount) AS gmv FROM orders;',
    hints: [
      '把一列数字全部加起来，用 SUM()。',
      "SUM(total_amount) 会把整列相加；先用 WHERE 把已支付订单筛出来。",
      "SELECT SUM(total_amount) AS gmv FROM orders WHERE status = 'paid'"
    ]
  },
  {
    id: 10,
    track: 'basic',
    point: 'GROUP BY 分组统计',
    title: '不同入口的销售表现',
    story: '产品经理想知道：App、小程序、网页三个下单入口，各自的单量和销售额差多少。',
    task:
      "按 order_source 分组，统计已支付订单的订单数（别名 order_cnt）和销售总额（别名 gmv）。三列顺序：order_source, order_cnt, gmv。",
    tables: ['orders'],
    referenceSql:
      "SELECT order_source, COUNT(*) AS order_cnt, SUM(total_amount) AS gmv FROM orders WHERE status = 'paid' GROUP BY order_source",
    tolerance: 0.01,
    sample: 'SELECT order_source, COUNT(*) AS order_cnt FROM orders GROUP BY order_source;',
    hints: [
      '分组统计用 GROUP BY：先按某一列分组，再对每组做 COUNT / SUM。',
      'SELECT 分组列, COUNT(*) AS 别名, SUM(列) AS 别名 FROM 表 GROUP BY 分组列。',
      "SELECT order_source, COUNT(*) AS order_cnt, SUM(total_amount) AS gmv FROM orders WHERE status = 'paid' GROUP BY order_source"
    ]
  },
  {
    id: 11,
    track: 'basic',
    point: 'HAVING 分组后筛选',
    title: '哪些入口值得继续投',
    story: '「单量太少的入口就先别看了。」主管只想看单量上规模的渠道。',
    task:
      '按 order_source 统计已支付订单的订单数（别名 order_cnt），只保留订单数不少于 500 的入口，两列顺序：order_source, order_cnt。',
    tables: ['orders'],
    referenceSql:
      "SELECT order_source, COUNT(*) AS order_cnt FROM orders WHERE status = 'paid' GROUP BY order_source HAVING COUNT(*) >= 500",
    sample: 'SELECT order_source, COUNT(*) AS order_cnt FROM orders GROUP BY order_source;',
    hints: [
      '分组之后再筛选，不能用 WHERE，要用 HAVING。',
      'WHERE 是在分组前筛行，HAVING 是在分组后筛组。写法：GROUP BY 列 HAVING COUNT(*) >= 500',
      "SELECT order_source, COUNT(*) AS order_cnt FROM orders WHERE status = 'paid' GROUP BY order_source HAVING COUNT(*) >= 500"
    ]
  },
  {
    id: 12,
    track: 'basic',
    point: 'JOIN 两表关联',
    title: '把订单和人对应起来',
    story: '订单表里只有 user_id，老板要看的是「谁」下的单。姓名和城市在 users 表里，需要接起来。',
    task:
      '查出最近 20 笔已支付订单的下单时间倒序列表，四列顺序：order_id, order_time, 用户姓名（别名 user_name）、用户城市（别名 user_city）。',
    tables: ['orders', 'users'],
    referenceSql:
      "SELECT o.order_id, o.order_time, u.name AS user_name, u.city AS user_city FROM orders o JOIN users u ON o.user_id = u.user_id WHERE o.status = 'paid' ORDER BY o.order_time DESC LIMIT 20",
    orderSensitive: true,
    sample: 'SELECT o.order_id, u.name FROM orders o JOIN users u ON o.user_id = u.user_id LIMIT 10;',
    hints: [
      '两张表用 JOIN 接起来，连接条件是订单的用户 ID 等于用户的 ID。',
      'JOIN users u ON o.user_id = u.user_id —— 记得给表起短名，字段前要写表别名。',
      "SELECT o.order_id, o.order_time, u.name AS user_name, u.city AS user_city FROM orders o JOIN users u ON o.user_id = u.user_id WHERE o.status = 'paid' ORDER BY o.order_time DESC LIMIT 20"
    ]
  },
  {
    id: 13,
    track: 'basic',
    point: 'JOIN 与分组结合',
    title: '哪个城市的人最能买',
    story:
      '复盘会上老板问：「我们的用户散在上海、北京、深圳这些城市，到底哪个城市的用户最值钱？」订单表里有钱，用户表里有城市——这是你第一次要把两张表接起来，再分组统计。',
    task:
      '把 orders 和 users 接起来，按用户所在城市（users.city）统计已支付订单的订单数（别名 order_cnt）和销售总额（别名 gmv）。三列顺序：city、order_cnt、gmv。',
    tables: ['orders', 'users'],
    referenceSql:
      "SELECT u.city, COUNT(*) AS order_cnt, SUM(o.total_amount) AS gmv FROM orders o JOIN users u ON o.user_id = u.user_id WHERE o.status = 'paid' GROUP BY u.city",
    tolerance: 0.01,
    sample:
      "SELECT u.city, COUNT(*) AS order_cnt FROM orders o JOIN users u ON o.user_id = u.user_id GROUP BY u.city;",
    hints: [
      '这一关是三件事合起来：先把用户表接进来（JOIN），再按城市分组（GROUP BY），最后对每组做计数和求和。',
      "JOIN 的条件是 o.user_id = u.user_id；分组用 GROUP BY u.city；别忘了先用 WHERE o.status = 'paid' 把已支付订单筛出来。",
      "SELECT u.city, COUNT(*) AS order_cnt, SUM(o.total_amount) AS gmv FROM orders o JOIN users u ON o.user_id = u.user_id WHERE o.status = 'paid' GROUP BY u.city"
    ]
  },
  {
    id: 14,
    track: 'work',
    point: '综合看板：渠道效果',
    title: '各渠道到底值不值',
    story:
      '周会上老板问：「我们投小红书和投抖音，哪个更值？」你手上只有一份订单数据，得把渠道拆开算。',
    task:
      '按用户获客渠道（users.channel）统计已支付订单，输出四列：channel、订单数 order_cnt、销售额 gmv、客单价 avg_order_value（gmv / 订单数，保留 2 位小数）。',
    tables: ['orders', 'users'],
    referenceSql:
      "SELECT u.channel, COUNT(*) AS order_cnt, ROUND(SUM(o.total_amount), 2) AS gmv, ROUND(SUM(o.total_amount) / COUNT(*), 2) AS avg_order_value FROM orders o JOIN users u ON o.user_id = u.user_id WHERE o.status = 'paid' GROUP BY u.channel",
    tolerance: 0.02,
    hints: [
      '先 JOIN 把渠道字段接进来，再按渠道分组聚合。',
      '客单价就是 SUM(total_amount) / COUNT(*)。ROUND(值, 2) 保留两位小数。',
      "SELECT u.channel, COUNT(*) AS order_cnt, ROUND(SUM(o.total_amount), 2) AS gmv, ROUND(SUM(o.total_amount) / COUNT(*), 2) AS avg_order_value FROM orders o JOIN users u ON o.user_id = u.user_id WHERE o.status = 'paid' GROUP BY u.channel"
    ]
  },
  {
    id: 15,
    track: 'work',
    point: 'TOP N：爆款商品',
    title: '卖得最好的十个商品',
    story: '供应链要备货，需要知道销量最高的商品是哪些。注意：这个数要基于真正付了钱、且没有被取消的订单。',
    task:
      '统计已支付订单里各商品的销售件数（SUM(quantity)），三列：product_id、name、件数 total_qty。按件数从高到低取前 10，件数相同时 product_id 小的排前面。',
    tables: ['orders', 'order_items', 'products'],
    referenceSql:
      "SELECT p.product_id, p.name, SUM(oi.quantity) AS total_qty FROM order_items oi JOIN orders o ON oi.order_id = o.order_id JOIN products p ON oi.product_id = p.product_id WHERE o.status = 'paid' GROUP BY p.product_id, p.name ORDER BY total_qty DESC, p.product_id ASC LIMIT 10",
    orderSensitive: true,
    hints: [
      '明细表里才有商品和数量，要 ORDER_ITEMS 关联订单表过滤状态，再关联商品表取名字。',
      '两张 JOIN 串起来：order_items → orders → products。WHERE 里过滤 o.status。',
      "SELECT p.product_id, p.name, SUM(oi.quantity) AS total_qty FROM order_items oi JOIN orders o ON oi.order_id = o.order_id JOIN products p ON oi.product_id = p.product_id WHERE o.status = 'paid' GROUP BY p.product_id, p.name ORDER BY total_qty DESC, p.product_id ASC LIMIT 10"
    ]
  },
  {
    id: 16,
    track: 'work',
    point: '复购率',
    title: '有多少人回来了',
    story:
      '「我们的用户里有复购的比例是多少？」老板只看一个数。定义：在已支付订单里，下单次数 ≥ 2 的用户算复购用户。',
    task:
      '输出一行三列：user_cnt（有过已支付订单的用户总数）、repeat_cnt（下单 ≥ 2 次的人数）、repeat_rate（repeat_cnt / user_cnt，保留 4 位小数，不要乘 100）。',
    tables: ['orders'],
    referenceSql:
      "SELECT COUNT(*) AS user_cnt, SUM(CASE WHEN cnt >= 2 THEN 1 ELSE 0 END) AS repeat_cnt, ROUND(SUM(CASE WHEN cnt >= 2 THEN 1 ELSE 0 END) * 1.0 / COUNT(*), 4) AS repeat_rate FROM (SELECT user_id, COUNT(*) AS cnt FROM orders WHERE status = 'paid' GROUP BY user_id)",
    tolerance: 0.0002,
    hints: [
      '分两步：先算出每个用户下了几单，再统计这些用户的分布。',
      '子查询算出每人的下单次数：SELECT user_id, COUNT(*) AS cnt FROM orders WHERE status = \'paid\' GROUP BY user_id，外层再统计。',
      "SELECT COUNT(*) AS user_cnt, SUM(CASE WHEN cnt >= 2 THEN 1 ELSE 0 END) AS repeat_cnt, ROUND(SUM(CASE WHEN cnt >= 2 THEN 1 ELSE 0 END) * 1.0 / COUNT(*), 4) AS repeat_rate FROM (SELECT user_id, COUNT(*) AS cnt FROM orders WHERE status = 'paid' GROUP BY user_id)"
    ]
  },
  {
    id: 17,
    track: 'work',
    point: '新老客拆分',
    title: '八月来的都是新面孔吗',
    story:
      '八月投放加码，老板想知道拉来的是新用户还是老用户在重复下单。定义：注册时间在 2026-08-01 及之后的算新用户。',
    task:
      "统计 2026 年 8 月（8/1 到 8/31）下过单的用户，按新老客分两行输出：user_type（'新用户' 或 '老用户'）和 user_cnt（用户数，同一用户只算一次）。",
    tables: ['orders', 'users'],
    referenceSql:
      "SELECT CASE WHEN u.register_time >= '2026-08-01' THEN '新用户' ELSE '老用户' END AS user_type, COUNT(DISTINCT o.user_id) AS user_cnt FROM orders o JOIN users u ON o.user_id = u.user_id WHERE o.order_time >= '2026-08-01' AND o.order_time <= '2026-08-31 23:59:59' GROUP BY user_type",
    sample:
      "SELECT CASE WHEN u.register_time >= '2026-08-01' THEN '新用户' ELSE '老用户' END AS user_type, COUNT(*) FROM orders o JOIN users u ON o.user_id = u.user_id GROUP BY 1;",
    hints: [
      '要用 CASE WHEN 把用户打上新/老标签，再按这个标签分组。',
      'CASE WHEN 条件 THEN \'新用户\' ELSE \'老用户\' END AS user_type。人数要用 COUNT(DISTINCT o.user_id)，否则同一人下两单会被算两次。',
      "SELECT CASE WHEN u.register_time >= '2026-08-01' THEN '新用户' ELSE '老用户' END AS user_type, COUNT(DISTINCT o.user_id) AS user_cnt FROM orders o JOIN users u ON o.user_id = u.user_id WHERE o.order_time >= '2026-08-01' AND o.order_time <= '2026-08-31 23:59:59' GROUP BY user_type"
    ]
  },
  {
    id: 18,
    track: 'work',
    point: '时间趋势',
    title: '半年的销售走势',
    story: '月报要一张趋势表：每个月卖了多少钱。日期字段是完整时间戳，需要先按「月份」归并。',
    task:
      "按月份统计已支付订单的销售额，两列：month（格式 'YYYY-MM'，别名 month）、gmv（保留 2 位小数）。主管要求最近的月份放在最上面，也就是按月份从晚到早排序。",
    tables: ['orders'],
    referenceSql:
      "SELECT strftime('%Y-%m', order_time) AS month, ROUND(SUM(total_amount), 2) AS gmv FROM orders WHERE status = 'paid' GROUP BY month ORDER BY month DESC",
    orderSensitive: true,
    tolerance: 0.02,
    sample: "SELECT strftime('%Y-%m', order_time) AS month, COUNT(*) FROM orders GROUP BY month;",
    hints: [
      'SQLite 用 strftime 可以把时间戳切成想要的粒度。',
      "strftime('%Y-%m', order_time) 得到 '2026-03' 这样的月份字符串，按它 GROUP BY。注意排序方向：最近的在最上面要用 DESC。",
      "SELECT strftime('%Y-%m', order_time) AS month, ROUND(SUM(total_amount), 2) AS gmv FROM orders WHERE status = 'paid' GROUP BY month ORDER BY month DESC"
    ]
  },
  {
    id: 19,
    track: 'work',
    point: 'Boss 关：退款率排查',
    title: '哪个品类退得最凶',
    story:
      '质量部门找上门：「你们的退款率太高了。」老板让你按品类拆一下，找出问题最大的那个品类。这题没有标准写法，只有明确口径。',
    task:
      '按商品品类统计退款情况，四列：category、total_orders（涉及该品类的订单数）、refund_orders（其中状态为 refunded 的订单数）、refund_rate（refund_orders / total_orders，保留 4 位小数）。按退款率从高到低排序。同一订单算一次（用 COUNT(DISTINCT order_id)）。',
    tables: ['order_items', 'products', 'orders'],
    referenceSql:
      "SELECT p.category, COUNT(DISTINCT o.order_id) AS total_orders, COUNT(DISTINCT CASE WHEN o.status = 'refunded' THEN o.order_id END) AS refund_orders, ROUND(COUNT(DISTINCT CASE WHEN o.status = 'refunded' THEN o.order_id END) * 1.0 / COUNT(DISTINCT o.order_id), 4) AS refund_rate FROM order_items oi JOIN products p ON oi.product_id = p.product_id JOIN orders o ON oi.order_id = o.order_id GROUP BY p.category ORDER BY refund_rate DESC",
    orderSensitive: true,
    tolerance: 0.0002,
    hints: [
      '明细表里有 product_id，商品表里有品类——先把这两张表和订单表接起来，再按品类分组。',
      '订单数要 COUNT(DISTINCT o.order_id)，因为一个订单里有多个同品类商品会重复计数。退款订单数用 CASE WHEN 配合 COUNT(DISTINCT ...)。',
      "SELECT p.category, COUNT(DISTINCT o.order_id) AS total_orders, COUNT(DISTINCT CASE WHEN o.status = 'refunded' THEN o.order_id END) AS refund_orders, ROUND(COUNT(DISTINCT CASE WHEN o.status = 'refunded' THEN o.order_id END) * 1.0 / COUNT(DISTINCT o.order_id), 4) AS refund_rate FROM order_items oi JOIN products p ON oi.product_id = p.product_id JOIN orders o ON oi.order_id = o.order_id GROUP BY p.category ORDER BY refund_rate DESC"
    ]
  }
]

export const TRACKS = {
  basic: { name: '基础线', desc: '先搞懂语句本身：它是什么意思、跑出来是什么样' },
  work: { name: '业务线', desc: '直接接需求单：先用起来，卡住了再回去补基础' }
}

export const getLevel = (id) => LEVELS.find((l) => l.id === id)
