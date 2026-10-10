/**
 * 三段式提示：每条只保留「学什么(learn) + 怎么做(how) + 最小示例(demo)」。
 * 和 explanations / story / alternatives 一样按关卡 id 组织，
 * 界面统一通过 hintsOf(id) 取，避免在关卡数据里塞大段文字。
 */

export const HINTS = {
  1: [
    { learn: '星号代表所有列', how: 'SELECT 和 FROM 之间写 *', demo: 'SELECT * FROM products' },
    { learn: '表名从哪来', how: '左边列表里列出的就是表名，点一下能插进来', demo: 'products' },
    { learn: '完整答案', how: '点一下放进编辑器，再点执行', demo: 'SELECT * FROM products' }
  ],
  2: [
    { learn: '逗号分隔列', how: '多个列名之间用英文逗号隔开', demo: 'name, price, category' },
    { learn: '别名改表头', how: '用 AS：列名 AS 新表头', demo: 'name AS product_name' },
    { learn: '完整答案', how: '三列都要写别名，别忘了逗号', demo: 'SELECT name AS product_name, price AS price, category AS category FROM products' }
  ],
  3: [
    { learn: 'WHERE 筛行', how: '条件写在 FROM 表名后面', demo: "WHERE channel = '小红书'" },
    { learn: '文字要加引号', how: '英文单引号包住文字值，按 Shift 切英文', demo: "'小红书'" },
    { learn: '完整答案', how: '点一下放进编辑器', demo: "SELECT * FROM users WHERE channel = '小红书'" }
  ],
  4: [
    { learn: '两个条件用 AND', how: '时间范围和订单状态都要满足', demo: "order_time >= '2026-06-16' AND status = 'paid'" },
    { learn: '时间当文字比', how: '时间也是文字，加英文单引号用 >= <= 比较', demo: "order_time <= '2026-06-20 23:59:59'" },
    { learn: '完整答案', how: '别忘了 status 这个条件', demo: "SELECT * FROM orders WHERE order_time >= '2026-06-16' AND order_time <= '2026-06-20 23:59:59' AND status = 'paid'" }
  ],
  5: [
    { learn: 'LIKE 模糊匹配', how: '百分号代表任意内容，两头都加', demo: "name LIKE '%蓝牙%'" },
    { learn: '两个条件用 OR', how: '满足其中一个就算', demo: "name LIKE '%蓝牙%' OR name LIKE '%无线%'" },
    { learn: '完整答案', how: '点一下放进编辑器', demo: "SELECT * FROM products WHERE name LIKE '%蓝牙%' OR name LIKE '%无线%'" }
  ],
  6: [
    { learn: '空值判断', how: '判断空值要用 IS NULL，不能用等号', demo: 'WHERE channel IS NULL' },
    { learn: '为什么不能用 =', how: '= NULL 永远匹配不到任何行', demo: '要用 IS NULL' },
    { learn: '完整答案', how: '点一下放进编辑器', demo: 'SELECT * FROM users WHERE channel IS NULL' }
  ],
  7: [
    { learn: 'ORDER BY 排序', how: 'DESC 从大到小，ASC 从小到大', demo: 'ORDER BY price DESC' },
    { learn: 'LIMIT 取前几条', how: '排序之后再限制行数', demo: 'ORDER BY price DESC LIMIT 10' },
    { learn: '完整答案', how: '价格相同时按 product_id 升序', demo: 'SELECT * FROM products ORDER BY price DESC, product_id ASC LIMIT 10' }
  ],
  8: [
    { learn: 'DISTINCT 去重', how: '放在 SELECT 后面、列名前面', demo: 'SELECT DISTINCT channel' },
    { learn: '空值也算一种值', how: '没有渠道记录的人会以 NULL 出现，别过滤掉', demo: 'SELECT DISTINCT channel FROM users' },
    { learn: '完整答案', how: '点一下放进编辑器', demo: 'SELECT DISTINCT channel FROM users' }
  ],
  9: [
    { learn: 'SUM 求和', how: '括号里写要相加的列名', demo: 'SUM(total_amount) AS gmv' },
    { learn: '只算已支付', how: '已取消、已退款的订单不算收入', demo: "WHERE status = 'paid'" },
    { learn: '完整答案', how: '点一下放进编辑器', demo: "SELECT SUM(total_amount) AS gmv FROM orders WHERE status = 'paid'" }
  ],
  10: [
    { learn: 'GROUP BY 分组', how: '按哪列分组，就把哪列写进 SELECT', demo: 'SELECT order_source, COUNT(*)' },
    { learn: '先筛再分组', how: 'WHERE 写在 GROUP BY 前面', demo: "WHERE status = 'paid' GROUP BY order_source" },
    { learn: '完整答案', how: '计数用 COUNT(*)，金额用 SUM', demo: "SELECT order_source, COUNT(*) AS order_cnt, SUM(total_amount) AS gmv FROM orders WHERE status = 'paid' GROUP BY order_source" }
  ],
  11: [
    { learn: '筛组用 HAVING', how: '分组之后的筛选不能用 WHERE', demo: 'HAVING COUNT(*) >= 500' },
    { learn: '写在 GROUP BY 后面', how: '顺序是 WHERE → GROUP BY → HAVING', demo: 'GROUP BY order_source HAVING COUNT(*) >= 500' },
    { learn: '完整答案', how: '点一下放进编辑器', demo: "SELECT order_source, COUNT(*) AS order_cnt FROM orders WHERE status = 'paid' GROUP BY order_source HAVING COUNT(*) >= 500" }
  ],
  12: [
    { learn: 'JOIN 接两张表', how: 'ON 后面写两张表靠什么对应', demo: 'JOIN users u ON o.user_id = u.user_id' },
    { learn: '给表起短名', how: 'o 代表 orders，u 代表 users，字段前要带上', demo: 'FROM orders o JOIN users u' },
    { learn: '完整答案', how: '另外要按时间倒序取 20 条', demo: "SELECT o.order_id, o.order_time, u.name AS user_name, u.city AS user_city FROM orders o JOIN users u ON o.user_id = u.user_id WHERE o.status = 'paid' ORDER BY o.order_time DESC LIMIT 20" }
  ],
  13: [
    { learn: '先 JOIN 再分组', how: '把城市接进来，再按城市分组', demo: 'JOIN users u ON o.user_id = u.user_id GROUP BY u.city' },
    { learn: '别忘筛已支付', how: 'WHERE 写在 GROUP BY 前面', demo: "WHERE o.status = 'paid'" },
    { learn: '完整答案', how: '两列：订单数 order_cnt、销售额 gmv', demo: "SELECT u.city, COUNT(*) AS order_cnt, SUM(o.total_amount) AS gmv FROM orders o JOIN users u ON o.user_id = u.user_id WHERE o.status = 'paid' GROUP BY u.city" }
  ],
  14: [
    { learn: '四列一起算', how: '渠道、订单数、销售额、客单价', demo: 'channel, order_cnt, gmv, avg_order_value' },
    { learn: '客单价怎么来', how: '销售额除以订单数，用 ROUND 保留两位', demo: 'ROUND(SUM(o.total_amount) / COUNT(*), 2)' },
    { learn: '完整答案', how: '点一下放进编辑器', demo: "SELECT u.channel, COUNT(*) AS order_cnt, ROUND(SUM(o.total_amount), 2) AS gmv, ROUND(SUM(o.total_amount) / COUNT(*), 2) AS avg_order_value FROM orders o JOIN users u ON o.user_id = u.user_id WHERE o.status = 'paid' GROUP BY u.channel" }
  ],
  15: [
    { learn: '三张表接起来', how: '明细表 → 订单表 → 商品表', demo: 'order_items oi JOIN orders o JOIN products p' },
    { learn: '只算已支付的件数', how: '不过滤状态会把取消订单也算进销量', demo: "WHERE o.status = 'paid'" },
    { learn: '完整答案', how: '按件数降序取前 10', demo: "SELECT p.product_id, p.name, SUM(oi.quantity) AS total_qty FROM order_items oi JOIN orders o ON oi.order_id = o.order_id JOIN products p ON oi.product_id = p.product_id WHERE o.status = 'paid' GROUP BY p.product_id, p.name ORDER BY total_qty DESC, p.product_id ASC LIMIT 10" }
  ],
  16: [
    { learn: '先数每人几单', how: '子查询里按用户分组计数', demo: 'SELECT user_id, COUNT(*) AS cnt FROM orders GROUP BY user_id' },
    { learn: '再统计分布', how: '用 CASE WHEN 把「下单≥2次」挑出来', demo: 'SUM(CASE WHEN cnt >= 2 THEN 1 ELSE 0 END)' },
    { learn: '完整答案', how: '复购率保留 4 位小数，不要乘 100', demo: "SELECT COUNT(*) AS user_cnt, SUM(CASE WHEN cnt >= 2 THEN 1 ELSE 0 END) AS repeat_cnt, ROUND(SUM(CASE WHEN cnt >= 2 THEN 1 ELSE 0 END) * 1.0 / COUNT(*), 4) AS repeat_rate FROM (SELECT user_id, COUNT(*) AS cnt FROM orders WHERE status = 'paid' GROUP BY user_id)" }
  ],
  17: [
    { learn: 'CASE WHEN 打标签', how: '按注册时间分成新用户和老用户', demo: "CASE WHEN u.register_time >= '2026-08-01' THEN '新用户' ELSE '老用户' END" },
    { learn: '人数要去重', how: '同一人下多单只能算一个', demo: 'COUNT(DISTINCT o.user_id)' },
    { learn: '完整答案', how: '只统计 8 月下过单的人', demo: "SELECT CASE WHEN u.register_time >= '2026-08-01' THEN '新用户' ELSE '老用户' END AS user_type, COUNT(DISTINCT o.user_id) AS user_cnt FROM orders o JOIN users u ON o.user_id = u.user_id WHERE o.order_time >= '2026-08-01' AND o.order_time <= '2026-08-31 23:59:59' GROUP BY user_type" }
  ],
  18: [
    { learn: 'strftime 切月份', how: '把完整时间戳切成 YYYY-MM', demo: "strftime('%Y-%m', order_time) AS month" },
    { learn: '按月份分组排序', how: '分组用别名，排序方向要看要求', demo: 'GROUP BY month ORDER BY month DESC' },
    { learn: '完整答案', how: '只算已支付订单', demo: "SELECT strftime('%Y-%m', order_time) AS month, ROUND(SUM(total_amount), 2) AS gmv FROM orders WHERE status = 'paid' GROUP BY month ORDER BY month DESC" }
  ],
  19: [
    { learn: '订单数要去重', how: '一个订单含多个同品类商品会重复计数', demo: 'COUNT(DISTINCT o.order_id)' },
    { learn: '退款订单怎么数', how: '用 CASE WHEN 只挑 refunded 的订单', demo: "COUNT(DISTINCT CASE WHEN o.status = 'refunded' THEN o.order_id END)" },
    { learn: '完整答案', how: '按退款率从高到低排序', demo: "SELECT p.category, COUNT(DISTINCT o.order_id) AS total_orders, COUNT(DISTINCT CASE WHEN o.status = 'refunded' THEN o.order_id END) AS refund_orders, ROUND(COUNT(DISTINCT CASE WHEN o.status = 'refunded' THEN o.order_id END) * 1.0 / COUNT(DISTINCT o.order_id), 4) AS refund_rate FROM order_items oi JOIN products p ON oi.product_id = p.product_id JOIN orders o ON oi.order_id = o.order_id GROUP BY p.category ORDER BY refund_rate DESC" }
  ]
}

export const hintsOf = (levelId) => HINTS[levelId] || []
