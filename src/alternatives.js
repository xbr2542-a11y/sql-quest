/**
 * 其他写法：同一件事的另一种写法 + 为什么这么写。
 * 这些 SQL 会被 scripts/verify-alternatives.mjs 逐条跑判定，确保不会教错。
 */

export const ALTERNATIVES = {
  1: [
    {
      title: '把 * 展开写全',
      sql: 'SELECT product_id, name, category, price, cost, on_sale FROM products',
      why: '这就是 * 的真身。结果一模一样，但表结构变了（比如加了一列）你能立刻发现，所以真实工作里更常这么写。'
    },
    {
      title: '关键字写小写也能跑',
      sql: 'select * from products',
      why: 'SQL 不区分大小写，select 和 SELECT 是一回事。团队里通常关键字写大写、字段写小写，读起来更清楚。'
    }
  ],
  2: [
    {
      title: '省略 AS',
      sql: 'SELECT name product_name, price price, category category FROM products',
      why: 'AS 可以省掉，直接写「列名 别名」也行。写上 AS 更清楚，是更常见的写法。'
    },
    {
      title: '用双引号包住别名',
      sql: 'SELECT name AS "product_name", price AS "price", category AS "category" FROM products',
      why: '别名里有特殊字符或空格时要用引号包起来。注意这是英文双引号，它表示「名字」，不是文字值。'
    }
  ],
  3: [
    {
      title: '用 IN 代替 =',
      sql: "SELECT * FROM users WHERE channel IN ('小红书')",
      why: 'IN 后面跟一个列表。只有一个值时用 IN 有点多余，但以后要同时筛几个渠道时，写 IN (...) 比一堆 OR 清爽得多。'
    },
    {
      title: '用 LIKE 做等值匹配',
      sql: "SELECT * FROM users WHERE channel LIKE '小红书'",
      why: 'LIKE 不加百分号时，要求「完全相同」。加上 % 才变成模糊匹配。'
    }
  ],
  4: [
    {
      title: '用 BETWEEN 写范围',
      sql: "SELECT * FROM orders WHERE order_time BETWEEN '2026-06-16' AND '2026-06-20 23:59:59' AND status = 'paid'",
      why: 'BETWEEN ... AND ... 等于「大于等于左边，且小于等于右边」，两头都包含，写时间范围时很常用。'
    },
    {
      title: '用开区间代替 23:59:59',
      sql: "SELECT * FROM orders WHERE order_time >= '2026-06-16' AND order_time < '2026-06-21' AND status = 'paid'",
      why: '不用纠结当天最后一秒是几点几分：只要「小于第二天 0 点」，当天所有时刻都包含进来了，这是更稳妥的写法。'
    }
  ],
  5: [
    {
      title: '用 instr 判断是否包含',
      sql: "SELECT * FROM products WHERE instr(name, '蓝牙') > 0 OR instr(name, '无线') > 0",
      why: 'instr(文字, 要找的内容) 返回位置，找到就大于 0。它和 LIKE 都能做「包含」，LIKE 更常见。'
    }
  ],
  6: [
    {
      title: '用 IS NOT NULL 再取反',
      sql: 'SELECT * FROM users WHERE NOT (channel IS NOT NULL)',
      why: '先判断「不是空」，再整个取反。逻辑上等价，但绕了一圈——直接用 IS NULL 读起来最清楚。'
    },
    {
      title: '用 ISNULL 后缀写法',
      sql: 'SELECT * FROM users WHERE channel ISNULL',
      why: 'SQLite 还支持把 ISNULL 写在字段后面，意思完全一样。知道有这个写法就行，团队里更常写 IS NULL。'
    }
  ],
  7: [
    {
      title: '不写并列时的第二排序键',
      sql: 'SELECT * FROM products ORDER BY price DESC LIMIT 10',
      why: '这一关的价格刚好没有并列，所以省掉也不会错。但只要有两条价格相同，数据库返回的顺序就可能变——加第二排序键是为了结果稳定。'
    },
    {
      title: '把 LIMIT 写成 OFFSET 形式',
      sql: 'SELECT * FROM products ORDER BY price DESC, product_id ASC LIMIT 10 OFFSET 0',
      why: 'OFFSET 0 表示「从第 0 条开始取」，等于没偏移。以后做分页（第二页、第三页）就靠它。'
    }
  ],
  8: [
    {
      title: '用 GROUP BY 去重',
      sql: 'SELECT channel FROM users GROUP BY channel',
      why: 'GROUP BY 会把相同的值并成一组，每组只出一行，效果和 DISTINCT 一样。如果要顺便统计每组数量，用 GROUP BY 更方便。'
    }
  ],
  9: [
    {
      title: '外面再套一层 ROUND',
      sql: "SELECT ROUND(SUM(total_amount), 2) AS gmv FROM orders WHERE status = 'paid'",
      why: '金额通常保留两位小数。ROUND(值, 2) 就是「四舍五入到两位」。'
    },
    {
      title: '先从子查询取数，再在外层汇总',
      sql: "SELECT SUM(amt) AS gmv FROM (SELECT total_amount AS amt FROM orders WHERE status = 'paid')",
      why: '先在小括号里筛出已支付订单，再在外层加总。步骤分开写，出错时更容易看出是哪一步的问题。'
    }
  ],
  10: [
    {
      title: '用列序号分组',
      sql: "SELECT order_source, COUNT(*) AS order_cnt, SUM(total_amount) AS gmv FROM orders WHERE status = 'paid' GROUP BY 1",
      why: 'GROUP BY 1 表示「按 SELECT 里的第 1 列分组」。写起来快，但别人读的时候要回头数第几列是什么，正式代码里还是写列名。'
    }
  ],
  11: [
    {
      title: '在 HAVING 里直接用别名',
      sql: "SELECT order_source, COUNT(*) AS order_cnt FROM orders WHERE status = 'paid' GROUP BY order_source HAVING order_cnt >= 500",
      why: 'SQLite 允许在 HAVING 里用 SELECT 起的别名。有些数据库不认，写 COUNT(*) >= 500 最保险。'
    },
    {
      title: '先分组，再在外层筛',
      sql: "SELECT * FROM (SELECT order_source, COUNT(*) AS order_cnt FROM orders WHERE status = 'paid' GROUP BY order_source) WHERE order_cnt >= 500",
      why: '把分组结果当成一张临时表，再对这张表用 WHERE。HAVING 就是这个动作的简写。'
    }
  ],
  12: [
    {
      title: '用 LEFT JOIN 兜住右表缺失的行',
      sql: "SELECT o.order_id, o.order_time, u.name AS user_name, u.city AS user_city FROM orders o LEFT JOIN users u ON o.user_id = u.user_id WHERE o.status = 'paid' ORDER BY o.order_time DESC LIMIT 20",
      why: 'LEFT JOIN 保留左表全部的行，右表没配上就填 NULL。这里每笔订单都有对应用户，结果和 JOIN 一样；但如果数据里有「查不到用户」的订单，JOIN 会把它悄悄丢掉，LEFT JOIN 不会。'
    },
    {
      title: '用逗号连接两张表（老写法）',
      sql: "SELECT o.order_id, o.order_time, u.name AS user_name, u.city AS user_city FROM orders o, users u WHERE o.user_id = u.user_id AND o.status = 'paid' ORDER BY o.order_time DESC LIMIT 20",
      why: '把两张表用逗号列出来，再用 WHERE 写连接条件。效果一样，但现在都用 JOIN ... ON，因为连接条件混在 WHERE 里很容易漏掉，一漏就变成两个表的所有组合。'
    }
  ],
  13: [
    {
      title: '把两张表换个顺序',
      sql: "SELECT u.city, COUNT(*) AS order_cnt, SUM(o.total_amount) AS gmv FROM users u JOIN orders o ON u.user_id = o.user_id WHERE o.status = 'paid' GROUP BY u.city",
      why: '内连接里两张表谁在前都一样。到了 LEFT JOIN 就不一样了，那时顺序决定「保留谁」。'
    }
  ],
  14: [
    {
      title: '用 CTE 给中间结果起个名字',
      sql: "WITH paid AS (SELECT u.channel AS ch, o.total_amount AS amt FROM orders o JOIN users u ON o.user_id = u.user_id WHERE o.status = 'paid') SELECT ch AS channel, COUNT(*) AS order_cnt, ROUND(SUM(amt), 2) AS gmv, ROUND(SUM(amt) / COUNT(*), 2) AS avg_order_value FROM paid GROUP BY ch",
      why: 'WITH 名字 AS (...) 相当于「先算好一张临时表，后面直接用它」。步骤多的查询用它，逻辑会清楚很多。'
    },
    {
      title: '用 COUNT(o.order_id) 代替 COUNT(*)',
      sql: "SELECT u.channel, COUNT(o.order_id) AS order_cnt, ROUND(SUM(o.total_amount), 2) AS gmv, ROUND(SUM(o.total_amount) / COUNT(o.order_id), 2) AS avg_order_value FROM orders o JOIN users u ON o.user_id = u.user_id WHERE o.status = 'paid' GROUP BY u.channel",
      why: 'COUNT(*) 数所有行，COUNT(列) 只数这一列不为空的行。这里 order_id 永远有值，所以结果一样；换成可能为空的列，结果就会差。'
    }
  ],
  15: [
    {
      title: 'ORDER BY 里直接写聚合函数',
      sql: "SELECT p.product_id, p.name, SUM(oi.quantity) AS total_qty FROM order_items oi JOIN orders o ON oi.order_id = o.order_id JOIN products p ON oi.product_id = p.product_id WHERE o.status = 'paid' GROUP BY p.product_id, p.name ORDER BY SUM(oi.quantity) DESC, p.product_id ASC LIMIT 10",
      why: '排序可以直接写 SUM(...)，也可以写它前面的别名 total_qty，两种都一样。'
    },
    {
      title: '用列序号排序',
      sql: "SELECT p.product_id, p.name, SUM(oi.quantity) AS total_qty FROM order_items oi JOIN orders o ON oi.order_id = o.order_id JOIN products p ON oi.product_id = p.product_id WHERE o.status = 'paid' GROUP BY p.product_id, p.name ORDER BY 3 DESC, 1 ASC LIMIT 10",
      why: 'ORDER BY 3 表示「按第 3 列排序」，也就是 total_qty。省字，但别人要回头数——推荐写列名或别名。'
    }
  ],
  16: [
    {
      title: '用 SUM(条件) 代替 SUM(CASE WHEN)',
      sql: "SELECT COUNT(*) AS user_cnt, SUM(cnt >= 2) AS repeat_cnt, ROUND(AVG(cnt >= 2), 4) AS repeat_rate FROM (SELECT user_id, COUNT(*) AS cnt FROM orders WHERE status = 'paid' GROUP BY user_id)",
      why: '在 SQLite 里条件本身会算出 1（成立）或 0（不成立）。所以 SUM(条件) 就是「有多少人满足」，AVG(条件) 就是「满足的比例」——正好是复购率。'
    },
    {
      title: '三个数分开算，再相除',
      sql: "SELECT (SELECT COUNT(DISTINCT user_id) FROM orders WHERE status='paid') AS user_cnt, (SELECT COUNT(*) FROM (SELECT user_id FROM orders WHERE status='paid' GROUP BY user_id HAVING COUNT(*) >= 2)) AS repeat_cnt, ROUND((SELECT COUNT(*) FROM (SELECT user_id FROM orders WHERE status='paid' GROUP BY user_id HAVING COUNT(*) >= 2)) * 1.0 / (SELECT COUNT(DISTINCT user_id) FROM orders WHERE status='paid'), 4) AS repeat_rate",
      why: '把总人数、复购人数分别算出来再相除。写得长，但每一步都很直白，适合先把逻辑想清楚。'
    }
  ],
  17: [
    {
      title: '用 substr 切月份代替两个时间边界',
      sql: "SELECT CASE WHEN u.register_time >= '2026-08-01' THEN '新用户' ELSE '老用户' END AS user_type, COUNT(DISTINCT o.user_id) AS user_cnt FROM orders o JOIN users u ON o.user_id = u.user_id WHERE substr(o.order_time, 1, 7) = '2026-08' GROUP BY user_type",
      why: 'substr(文字, 1, 7) 取前 7 个字符，正好是 2026-08。比写两个时间边界更不容易漏掉月底的时刻。'
    },
    {
      title: '用 IFNULL 兜底空值',
      sql: "SELECT CASE WHEN IFNULL(u.register_time, '') >= '2026-08-01' THEN '新用户' ELSE '老用户' END AS user_type, COUNT(DISTINCT o.user_id) AS user_cnt FROM orders o JOIN users u ON o.user_id = u.user_id WHERE o.order_time >= '2026-08-01' AND o.order_time <= '2026-08-31 23:59:59' GROUP BY user_type",
      why: 'IFNULL(值, 备用值) 在值为空时用备用值顶上。这份数据里注册时间没有空的，真实数据经常有，养成兜底习惯能少踩坑。'
    }
  ],
  18: [
    {
      title: '用 substr 切月份',
      sql: "SELECT substr(order_time, 1, 7) AS month, ROUND(SUM(total_amount), 2) AS gmv FROM orders WHERE status = 'paid' GROUP BY month ORDER BY month DESC",
      why: '时间存成 2026-03-15 08:30:00 这样的文字，前 7 个字符正好是月份。效果和 strftime 一样，但只对固定格式的时间管用。'
    },
    {
      title: '用列序号排序',
      sql: "SELECT strftime('%Y-%m', order_time) AS month, ROUND(SUM(total_amount), 2) AS gmv FROM orders WHERE status = 'paid' GROUP BY month ORDER BY 1 DESC",
      why: 'ORDER BY 1 表示按第 1 列（month）排序，DESC 是从晚到早。'
    }
  ],
  19: [
    {
      title: '先按「订单 × 品类」去重，再统计',
      sql: "WITH base AS (SELECT DISTINCT oi.order_id, p.category, o.status FROM order_items oi JOIN products p ON oi.product_id = p.product_id JOIN orders o ON oi.order_id = o.order_id) SELECT category, COUNT(*) AS total_orders, SUM(status = 'refunded') AS refund_orders, ROUND(SUM(status = 'refunded') * 1.0 / COUNT(*), 4) AS refund_rate FROM base GROUP BY category ORDER BY refund_rate DESC",
      why: '一个订单可能买了好几个同品类商品，会重复出现。先用 DISTINCT 把「订单 + 品类」去重成一条，后面直接数行数就行，不必每一步都写 COUNT(DISTINCT ...)。'
    },
    {
      title: '用 CAST 明确转成小数再除',
      sql: "SELECT p.category, COUNT(DISTINCT o.order_id) AS total_orders, COUNT(DISTINCT CASE WHEN o.status = 'refunded' THEN o.order_id END) AS refund_orders, ROUND(CAST(COUNT(DISTINCT CASE WHEN o.status = 'refunded' THEN o.order_id END) AS REAL) / COUNT(DISTINCT o.order_id), 4) AS refund_rate FROM order_items oi JOIN products p ON oi.product_id = p.product_id JOIN orders o ON oi.order_id = o.order_id GROUP BY p.category ORDER BY refund_rate DESC",
      why: '两个整数相除，有的数据库会直接丢掉小数部分（变成 0）。乘 1.0 和 CAST(... AS REAL) 都是为了先变成小数再除，这是真实工作里非常常见的坑。'
    }
  ]
}
