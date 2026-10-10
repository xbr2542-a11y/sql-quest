/** 表结构元信息（中文说明，用于表结构面板与字典页） */

export const TABLES = [
  {
    name: 'users',
    cn: '用户表',
    desc: '每个注册用户一行。获客渠道、城市、注册时间都在这。',
    columns: [
      ['user_id', 'INTEGER', '用户 ID，主键'],
      ['name', 'TEXT', '姓名'],
      ['phone', 'TEXT', '手机号（有个别重复，是同一个人开了多个账号）'],
      ['city', 'TEXT', '城市'],
      ['channel', 'TEXT', '获客渠道：小红书 / 抖音 / 朋友圈广告 / 自然流量，早期用户可能为空'],
      ['register_time', 'TEXT', '注册时间，格式 YYYY-MM-DD HH:MM:SS']
    ]
  },
  {
    name: 'products',
    cn: '商品表',
    desc: '公司所有的 SKU，50 个。价格是当前标价。',
    columns: [
      ['product_id', 'INTEGER', '商品 ID，主键'],
      ['name', 'TEXT', '商品名'],
      ['category', 'TEXT', '品类：数码配件 / 家居生活 / 服饰鞋包 / 食品饮料 / 美妆个护'],
      ['price', 'REAL', '当前售价（元）'],
      ['cost', 'REAL', '成本价（元）'],
      ['on_sale', 'INTEGER', '是否在售：1 在售，0 已下架']
    ]
  },
  {
    name: 'orders',
    cn: '订单表',
    desc: '核心事实表。注意：已取消和已退款的订单也在表里，统计前先想清楚要不要过滤。',
    columns: [
      ['order_id', 'INTEGER', '订单号，主键'],
      ['user_id', 'INTEGER', '下单用户 ID'],
      ['order_time', 'TEXT', '下单时间'],
      ['status', 'TEXT', "订单状态：paid 已支付 / cancelled 已取消 / refunded 已退款"],
      ['order_source', 'TEXT', '下单入口：app / miniprogram / web'],
      ['total_amount', 'REAL', '订单金额（元），已扣除优惠']
    ]
  },
  {
    name: 'order_items',
    cn: '订单明细表',
    desc: '每个订单买了哪些商品、买了几件。一个订单会有多行。',
    columns: [
      ['item_id', 'INTEGER', '明细 ID，主键'],
      ['order_id', 'INTEGER', '所属订单号'],
      ['product_id', 'INTEGER', '商品 ID'],
      ['quantity', 'INTEGER', '购买件数'],
      ['unit_price', 'REAL', '成交单价（元）'],
      ['discount_amount', 'REAL', '该行优惠金额，0 和 NULL 都有']
    ]
  },
  {
    name: 'payments',
    cn: '支付流水表',
    desc: '支付记录。和订单状态是两个口径，做报表时要注意用哪个。',
    columns: [
      ['payment_id', 'INTEGER', '支付流水号，主键'],
      ['order_id', 'INTEGER', '对应订单号'],
      ['paid_time', 'TEXT', '支付时间'],
      ['method', 'TEXT', '支付方式：wechat / alipay / card'],
      ['amount', 'REAL', '支付金额（元）'],
      ['status', 'TEXT', '支付结果：success / failed / pending']
    ]
  },
  {
    name: 'refunds',
    cn: '退款表',
    desc: '退款申请记录，一个订单可能有多条。',
    columns: [
      ['refund_id', 'INTEGER', '退款单号，主键'],
      ['order_id', 'INTEGER', '对应订单号'],
      ['refund_time', 'TEXT', '退款时间'],
      ['amount', 'REAL', '退款金额（元）'],
      ['reason', 'TEXT', '退款原因']
    ]
  },
  {
    name: 'shipments',
    cn: '物流表',
    desc: '发货与收货记录。没送达的订单，到货时间是空的。',
    columns: [
      ['shipment_id', 'INTEGER', '物流单号，主键'],
      ['order_id', 'INTEGER', '对应订单号'],
      ['ship_time', 'TEXT', '发货时间'],
      ['arrive_time', 'TEXT', '到货时间，未送达为空'],
      ['status', 'TEXT', '物流状态：delivered / in_transit / returned']
    ]
  },
  {
    name: 'events',
    cn: '埋点事件表',
    desc: '用户在 App 里的行为埋点，8 月一个月的数据，用于漏斗分析。',
    columns: [
      ['event_id', 'INTEGER', '事件 ID，主键'],
      ['user_id', 'INTEGER', '用户 ID'],
      ['event_time', 'TEXT', '发生时间'],
      ['event_type', 'TEXT', '行为类型：view 浏览 / cart 加购 / order 下单 / pay 支付'],
      ['product_id', 'INTEGER', '相关商品 ID']
    ]
  },
  {
    name: 'coupons',
    cn: '优惠券表',
    desc: '发放给用户的优惠券及其使用情况。',
    columns: [
      ['coupon_id', 'INTEGER', '券 ID，主键'],
      ['user_id', 'INTEGER', '归属用户'],
      ['coupon_type', 'TEXT', '券类型：满100减20 / 满200减50 / 无门槛10元'],
      ['amount', 'REAL', '面额（元）'],
      ['used', 'INTEGER', '是否已使用：1 是，0 否'],
      ['expire_time', 'TEXT', '过期时间']
    ]
  }
]

/** CodeMirror 自动补全用的简洁结构 */
export const CM_SCHEMA = Object.fromEntries(TABLES.map((t) => [t.name, t.columns.map((c) => c[0])]))
