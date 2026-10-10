/**
 * 变体题：错题在 1 / 3 / 7 天后复现时用的题。
 * 原则是「同一个知识点，换一个问题问」——不是把原题的数字改一改，
 * 而是换业务场景，逼玩家把方法迁移过去，而不是背答案。
 * 每条都由 scripts/verify-variants.mjs 验证能跑出结果。
 */

export const VARIANTS = {
  1: {
    title: '换个表练一遍',
    story: '上次是看商品表。这次换成用户表——同样是「把整张表调出来看看」，锻炼的是「表名换了我还认不认得」。',
    task: '查出 users 表的全部行和全部列。',
    tables: ['users'],
    referenceSql: 'SELECT * FROM users'
  },
  2: {
    title: '给用户表起别名',
    story: '运营要一份用户清单：姓名、城市、渠道，表头必须写成 user_name、city、channel。',
    task: '从 users 里查出三列，顺序是：name（别名 user_name）、city（别名 city）、channel（别名 channel）。这一关会校验列名。',
    tables: ['users'],
    referenceSql: 'SELECT name AS user_name, city AS city, channel AS channel FROM users',
    compareColumnNames: true
  },
  3: {
    title: '换成抖音渠道',
    story: '小红书那份名单已经交过了，运营这次要抖音渠道的。条件换了，写法不变。',
    task: "查出所有 channel 为 '抖音' 的用户，全部字段。",
    tables: ['users'],
    referenceSql: "SELECT * FROM users WHERE channel = '抖音'"
  },
  4: {
    title: '换成 88 大促',
    story: '618 复盘完了，接着复盘 8 月 8 日到 10 日的大促。时间和上次不一样，但「时间范围 + 已支付」这两个条件是一样的。',
    task: "订单时间在 2026-08-08 00:00:00 到 2026-08-10 23:59:59 之间、且 status 为 'paid' 的订单，全部字段。",
    tables: ['orders'],
    referenceSql:
      "SELECT * FROM orders WHERE order_time >= '2026-08-08' AND order_time <= '2026-08-10 23:59:59' AND status = 'paid'"
  },
  5: {
    title: '换两个关键词',
    story: '上次找蓝牙和无线，这次商品部要盘点的是「咖啡」和「茶」相关的商品。',
    task: '查出商品名里包含「咖啡」或「茶」的商品，全部字段。',
    tables: ['products'],
    referenceSql: "SELECT * FROM products WHERE name LIKE '%咖啡%' OR name LIKE '%茶%'"
  },
  6: {
    title: '换成物流表里的空值',
    story: '上次是用户没有渠道记录，这次是物流表里「还没送到」的订单——到货时间是空的。空值判断方法完全一样。',
    task: '查出所有还没送到（arrive_time 为空）的物流记录，全部字段。',
    tables: ['shipments'],
    referenceSql: 'SELECT * FROM shipments WHERE arrive_time IS NULL'
  },
  7: {
    title: '换成最便宜的',
    story: '上次看最贵的十个，这次采购要看最便宜的八个——排序方向反过来，其余一样。',
    task: '查出价格最低的 8 个商品，全部字段，按价格从低到高排序；价格相同时 product_id 小的排前面。',
    tables: ['products'],
    referenceSql: 'SELECT * FROM products ORDER BY price ASC, product_id ASC LIMIT 8',
    orderSensitive: true
  },
  8: {
    title: '换成城市去重',
    story: '老板这次问的是「我们覆盖了几个城市」，不是渠道。同样是「去重后数一数」。',
    task: '列出 users 表里出现过的所有城市，每个只出现一次。',
    tables: ['users'],
    referenceSql: 'SELECT DISTINCT city FROM users'
  },
  9: {
    title: '换成退款金额',
    story: '上次算已支付金额，这次财务要的是「退出去多少钱」——把筛选条件换成 refunded 就行。',
    task: "一行一列：已退款（status = 'refunded'）订单的 total_amount 合计，别名 refund_amount。",
    tables: ['orders'],
    referenceSql: "SELECT SUM(total_amount) AS refund_amount FROM orders WHERE status = 'refunded'",
    tolerance: 0.01
  },
  10: {
    title: '按入口统计取消单',
    story: '上次统计已支付订单，这次要看「取消掉的订单分别在哪个入口」。分组方法一样，只是筛的行不一样。',
    task: "按 order_source 分组，统计已取消（status = 'cancelled'）订单的订单数（别名 order_cnt）。两列：order_source、order_cnt。",
    tables: ['orders'],
    referenceSql:
      "SELECT order_source, COUNT(*) AS order_cnt FROM orders WHERE status = 'cancelled' GROUP BY order_source"
  },
  11: {
    title: '筛城市而不是入口',
    story: '上次筛的是下单入口，这次筛用户所在城市：单量太少的城市先不看。',
    task: '按用户所在城市统计已支付订单的订单数（别名 order_cnt），只保留订单数不少于 250 的城市。两列：city、order_cnt。',
    tables: ['orders', 'users'],
    referenceSql:
      "SELECT u.city, COUNT(*) AS order_cnt FROM orders o JOIN users u ON o.user_id = u.user_id WHERE o.status = 'paid' GROUP BY u.city HAVING COUNT(*) >= 250"
  },
  12: {
    title: '把用户接进来查退款单',
    story: '同一种接法，换个用途：这次要查最近 20 笔退款订单的客户是谁。',
    task: '查出最近 20 笔已退款订单的下单时间倒序列表，三列顺序：order_id、order_time、用户姓名（别名 user_name）。',
    tables: ['orders', 'users'],
    referenceSql:
      "SELECT o.order_id, o.order_time, u.name AS user_name FROM orders o JOIN users u ON o.user_id = u.user_id WHERE o.status = 'refunded' ORDER BY o.order_time DESC LIMIT 20",
    orderSensitive: true
  },
  13: {
    title: '接三张表按品类统计',
    story: '上次按城市统计，这次按商品品类统计销量——要接的表从两张变成三张，但思路一样：接起来、分组、求和。',
    task: '统计已支付订单里各商品品类的销售件数。两列：category、件数 total_qty。',
    tables: ['order_items', 'products', 'orders'],
    referenceSql:
      "SELECT p.category, SUM(oi.quantity) AS total_qty FROM order_items oi JOIN products p ON oi.product_id = p.product_id JOIN orders o ON oi.order_id = o.order_id WHERE o.status = 'paid' GROUP BY p.category"
  },
  14: {
    title: '把渠道看板换成城市看板',
    story: '渠道那份报表老板看过了，这次要同样口径的城市版：单量、销售额、客单价。',
    task: '按用户所在城市统计已支付订单，四列：city、订单数 order_cnt、销售额 gmv、客单价 avg_order_value（保留 2 位小数）。',
    tables: ['orders', 'users'],
    referenceSql:
      "SELECT u.city, COUNT(*) AS order_cnt, ROUND(SUM(o.total_amount), 2) AS gmv, ROUND(SUM(o.total_amount) / COUNT(*), 2) AS avg_order_value FROM orders o JOIN users u ON o.user_id = u.user_id WHERE o.status = 'paid' GROUP BY u.city",
    tolerance: 0.02
  },
  15: {
    title: '从商品换成品类',
    story: '上次排的是单个商品，这次要看品类维度——统计粒度变了，写法没变。',
    task: '统计已支付订单里各品类的销售件数（别名 total_qty），取前 3 个品类，按件数从高到低；件数相同时按 category 升序。两列：category、total_qty。',
    tables: ['order_items', 'products', 'orders'],
    referenceSql:
      "SELECT p.category, SUM(oi.quantity) AS total_qty FROM order_items oi JOIN products p ON oi.product_id = p.product_id JOIN orders o ON oi.order_id = o.order_id WHERE o.status = 'paid' GROUP BY p.category ORDER BY total_qty DESC, p.category ASC LIMIT 3",
    orderSensitive: true
  },
  16: {
    title: '算只买过一次的人占多少',
    story: '上次算复购的人有多少，这次反过来：只买过一次的人占多少。同一套两步思路，条件从「≥2」换成「=1」。',
    task: '输出一行三列：user_cnt（有过已支付订单的用户总数）、once_cnt（只下过 1 单的人数）、once_rate（once_cnt / user_cnt，保留 4 位小数，不要乘 100）。',
    tables: ['orders'],
    referenceSql:
      "SELECT COUNT(*) AS user_cnt, SUM(CASE WHEN cnt = 1 THEN 1 ELSE 0 END) AS once_cnt, ROUND(SUM(CASE WHEN cnt = 1 THEN 1 ELSE 0 END) * 1.0 / COUNT(*), 4) AS once_rate FROM (SELECT user_id, COUNT(*) AS cnt FROM orders WHERE status = 'paid' GROUP BY user_id)",
    tolerance: 0.0002
  },
  17: {
    title: '新用户都来自哪些城市',
    story: '上次只分新老客，这次再拆一层城市：注册在 8 月的新用户，分别来自哪些城市。',
    task: "按用户所在城市统计新用户人数（注册时间在 2026-08-01 及之后、且下过单的用户，同一用户只算一次）。两列：city、user_cnt。",
    tables: ['orders', 'users'],
    referenceSql:
      "SELECT u.city, COUNT(DISTINCT o.user_id) AS user_cnt FROM orders o JOIN users u ON o.user_id = u.user_id WHERE u.register_time >= '2026-08-01' GROUP BY u.city"
  },
  18: {
    title: '趋势图换成订单量',
    story: '上次这张趋势表看的是金额，这次看单量——切月份的方法一样，聚合函数换了。',
    task: "按月份统计已支付订单的订单数，两列：month（格式 'YYYY-MM'）、order_cnt。按月份从早到晚排序。",
    tables: ['orders'],
    referenceSql:
      "SELECT strftime('%Y-%m', order_time) AS month, COUNT(*) AS order_cnt FROM orders WHERE status = 'paid' GROUP BY month ORDER BY month ASC",
    orderSensitive: true
  },
  19: {
    title: '换一个维度排查退款',
    story: '上次按品类拆退款率，这次质量部要按退款原因看分布——同样是分组统计，只是换个维度问问题。',
    task: '统计每种退款原因的单数（别名 refund_cnt）和占比（refund_cnt ÷ 全部退款单数，保留 4 位小数，别名 share）。三列：reason、refund_cnt、share。按单数从高到低排序；单数相同时按 reason 升序。',
    tables: ['refunds'],
    referenceSql:
      "SELECT reason, COUNT(*) AS refund_cnt, ROUND(COUNT(*) * 1.0 / (SELECT COUNT(*) FROM refunds), 4) AS share FROM refunds GROUP BY reason ORDER BY refund_cnt DESC, reason ASC",
    orderSensitive: true,
    tolerance: 0.0002
  }
}
