/**
 * 生成电商库种子数据（固定随机种子，可复现）
 * 输出：public/seed.sql（由前端按需 fetch，不打进主包）
 */
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '..', 'public', 'seed.sql')

/* ---------- 确定性随机 ---------- */
function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rnd = mulberry32(20260910)
const randInt = (a, b) => a + Math.floor(rnd() * (b - a + 1))
const pick = (arr) => arr[Math.floor(rnd() * arr.length)]
const round2 = (n) => Math.round(n * 100) / 100
function weighted(pairs) {
  const total = pairs.reduce((s, p) => s + p[1], 0)
  let r = rnd() * total
  for (const [v, w] of pairs) {
    r -= w
    if (r <= 0) return v
  }
  return pairs[pairs.length - 1][0]
}

/* ---------- 时间 ---------- */
const DAY = 86400000
const t0 = Date.parse('2026-03-01T00:00:00Z')
const t1 = Date.parse('2026-08-31T23:59:59Z')
const fmt = (ts) => {
  const d = new Date(ts)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(
    d.getUTCHours()
  )}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`
}
const randTime = (from, to) => (from >= to ? to : from + Math.floor(rnd() * (to - from)))

/* 大促窗口 */
const PROMO_618 = [Date.parse('2026-06-16T00:00:00Z'), Date.parse('2026-06-20T23:59:59Z')]
const PROMO_88 = [Date.parse('2026-08-08T00:00:00Z'), Date.parse('2026-08-10T23:59:59Z')]

/* ---------- 用户 ---------- */
const SURNAME = '赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦许何吕施张孔曹严华金魏陶姜'.split('')
const GIVEN = ['伟','芳','娜','敏','静','强','磊','洋','艳','勇','军','杰','娟','涛','明','超','秀英','丽','鹏','宇','鑫','雪','晨','悦','浩','琳','帆','璐','博','婷']
const CITIES = ['上海','北京','深圳','杭州','广州','成都','武汉','南京']
const CHANNELS = ['小红书','抖音','朋友圈广告','自然流量']

const users = []
for (let i = 1; i <= 600; i++) {
  const name = pick(SURNAME) + pick(GIVEN)
  // 6% 的老用户没有渠道记录（脏数据陷阱）
  const channel = rnd() < 0.06 ? null : weighted([['小红书', 34], ['抖音', 30], ['朋友圈广告', 22], ['自然流量', 14]])
  // 前 200 个是早期注册的老用户（高频复购），后 400 个是后续获取、只买过一次的用户
  const reg =
    i <= 200
      ? randTime(Date.parse('2025-06-01T00:00:00Z'), Date.parse('2025-12-31T00:00:00Z'))
      : randTime(Date.parse('2026-01-01T00:00:00Z'), Date.parse('2026-08-25T00:00:00Z'))
  users.push({
    user_id: i,
    name,
    city: pick(CITIES),
    channel,
    register_time: fmt(reg),
    phone: `13${randInt(1, 9)}${String(randInt(0, 99999999)).padStart(8, '0')}`,
    _t: reg
  })
}
// 少量重复手机号（一人多账号）
for (let k = 0; k < 8; k++) {
  const a = randInt(0, users.length - 1)
  const b = randInt(0, users.length - 1)
  users[b].phone = users[a].phone
}

/* ---------- 商品 ---------- */
const CATALOG = {
  数码配件: ['蓝牙耳机','无线鼠标','快充充电头','机械键盘','数据线','移动电源','无线充电板','蓝牙音箱','车载支架','手机壳'],
  家居生活: ['收纳盒','香薰蜡烛','抱枕','置物架','保温杯','台灯','毛毯','拖鞋','衣架','垃圾桶'],
  服饰鞋包: ['羽绒服','牛仔裤','帆布鞋','双肩包','卫衣','棒球帽','针织衫','运动裤','单肩包','围巾'],
  食品饮料: ['坚果礼盒','挂耳咖啡','冷冻牛排','燕麦片','气泡水','茶叶礼盒','巧克力','速食面','蜂蜜','果干'],
  美妆个护: ['洗面奶','面膜','护手霜','洗发水','精华液','防晒霜','电动牙刷','香水','身体乳','唇膏']
}
const VARIANTS = ['经典款','升级款','Pro','轻享版','家庭装','限定款','基础版','旗舰款']
const products = []
let pid = 0
for (const [category, names] of Object.entries(CATALOG)) {
  for (const base of names) {
    pid++
    const price = round2(randInt(1900, 89900) / 100)
    products.push({
      product_id: pid,
      name: `${base}·${pick(VARIANTS)}${pid % 3 === 0 ? ' ' + (pid % 7) + '代' : ''}`,
      category,
      price,
      cost: round2(price * (0.42 + rnd() * 0.28)),
      on_sale: rnd() < 0.92 ? 1 : 0
    })
  }
}

/* ---------- 订单 ---------- */
const SOURCES = [['app', 58], ['miniprogram', 30], ['web', 12]]
const REFUND_REASONS = ['质量问题','尺码不合适','不想要了','发错货','物流太慢','价格降了']
const PAY_METHODS = [['wechat', 52], ['alipay', 40], ['card', 8]]

const orders = []
const orderItems = []
let itemId = 0

/* 先生成 2500 个时间槽（含大促），再把用户分配到槽位：
   - 后 400 个用户各只买一次（一次性用户）
   - 前 200 个老用户承接其余订单（高频复购）
   - 下单时间必须晚于注册时间，保证数据自洽 */
const CORE = users.filter((u) => u.user_id <= 200)
const ONE_TIME = users.filter((u) => u.user_id > 200)
const slots = []
for (let i = 0; i < 2500; i++) {
  const r = rnd()
  if (r < 0.15) slots.push({ min: PROMO_618[0], max: PROMO_618[1] })
  else if (r < 0.27) slots.push({ min: PROMO_88[0], max: PROMO_88[1] })
  else slots.push({ min: t0, max: t1 })
}
const assignment = new Array(slots.length).fill(null)
const taken = new Array(slots.length).fill(false)
for (const u of ONE_TIME) {
  const ok = []
  for (let i = 0; i < slots.length; i++) if (!taken[i] && slots[i].max >= u._t + 3600000) ok.push(i)
  if (!ok.length) continue
  const idx = ok[Math.floor(rnd() * ok.length)]
  taken[idx] = true
  assignment[idx] = u
}
for (let i = 0; i < slots.length; i++) {
  if (!assignment[i]) assignment[i] = CORE[Math.floor(rnd() * CORE.length)]
}

for (let i = 1; i <= 2500; i++) {
  const slot = slots[i - 1]
  const u = assignment[i - 1]
  const userId = u.user_id
  const orderTime = randTime(Math.max(slot.min, u._t + 3600000), slot.max)

  const status = weighted([['paid', 82], ['cancelled', 10], ['refunded', 8]])
  const source = weighted(SOURCES)

  const nItems = randInt(1, 4)
  const used = new Set()
  let total = 0
  const items = []
  // 取消订单里 70% 也留了明细（真实数据就是这样）
  if (status !== 'cancelled' || rnd() < 0.7) {
    for (let j = 0; j < nItems; j++) {
      const p = randInt(1, products.length)
      if (used.has(p)) continue
      used.add(p)
      const prod = products[p - 1]
      const qty = randInt(1, 3)
      const unit = rnd() < 0.05 ? round2(prod.price * 0.95) : prod.price
      const dRoll = rnd()
      const discount = dRoll < 0.55 ? 0 : dRoll < 0.8 ? round2(randInt(500, 5000) / 100) : null
      const line = round2(qty * unit - (discount || 0))
      total += line
      items.push({ item_id: ++itemId, order_id: i, product_id: p, quantity: qty, unit_price: unit, discount_amount: discount })
    }
  }
  orderItems.push(...items)
  orders.push({
    order_id: i,
    user_id: userId,
    order_time: fmt(orderTime),
    status,
    order_source: source,
    total_amount: round2(total),
    _t: orderTime
  })
}

/* ---------- 支付 / 退款 / 物流 ---------- */
const payments = []
const refunds = []
const shipments = []
let payId = 0
let refId = 0
let shipId = 0
for (const o of orders) {
  if (o.status !== 'cancelled') {
    payId++
    payments.push({
      payment_id: payId,
      order_id: o.order_id,
      paid_time: fmt(o._t + randInt(1, 240) * 60000),
      method: weighted(PAY_METHODS),
      amount: o.total_amount,
      status: rnd() < 0.97 ? 'success' : 'failed'
    })
  }
  if (o.status === 'refunded') {
    refId++
    refunds.push({
      refund_id: refId,
      order_id: o.order_id,
      refund_time: fmt(o._t + randInt(1, 20) * DAY),
      amount: round2(o.total_amount * (0.5 + rnd() * 0.5)),
      reason: pick(REFUND_REASONS)
    })
  }
  if (o.status === 'paid' || (o.status === 'refunded' && rnd() < 0.5)) {
    shipId++
    const shipT = o._t + randInt(6, 72) * 3600000
    const st = weighted([['delivered', 80], ['in_transit', 12], ['returned', 8]])
    shipments.push({
      shipment_id: shipId,
      order_id: o.order_id,
      ship_time: fmt(shipT),
      arrive_time: st === 'delivered' ? fmt(shipT + randInt(1, 6) * DAY) : null,
      status: st
    })
  }
}

/* ---------- 埋点事件（8 月漏斗） ---------- */
const events = []
const evStart = Date.parse('2026-08-01T00:00:00Z')
const evEnd = Date.parse('2026-08-31T23:59:59Z')
for (let i = 1; i <= 3000; i++) {
  events.push({
    event_id: i,
    user_id: randInt(1, 600),
    event_time: fmt(randTime(evStart, evEnd)),
    event_type: weighted([['view', 60], ['cart', 25], ['order', 10], ['pay', 5]]),
    product_id: randInt(1, products.length)
  })
}

/* ---------- 优惠券 ---------- */
const coupons = []
const COUPON_TYPES = [['满100减20', 20], ['满200减50', 50], ['无门槛10元', 10]]
for (let i = 1; i <= 400; i++) {
  const [type, amount] = pick(COUPON_TYPES)
  coupons.push({
    coupon_id: i,
    user_id: randInt(1, 600),
    coupon_type: type,
    amount,
    used: rnd() < 0.42 ? 1 : 0,
    expire_time: fmt(randTime(t0, t1 + 30 * DAY))
  })
}

/* ---------- 输出 SQL ---------- */
const q = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)

function insert(table, cols, rows, batch = 250) {
  const out = []
  for (let i = 0; i < rows.length; i += batch) {
    const chunk = rows.slice(i, i + batch)
    out.push(
      `INSERT INTO ${table} (${cols.join(', ')}) VALUES\n` +
        chunk.map((r) => `(${r.map(q).join(',')})`).join(',\n') +
        ';'
    )
  }
  return out.join('\n')
}

const sql = []
sql.push(`-- 数据部新人 · 电商库种子数据（固定种子生成，请勿手改）
BEGIN TRANSACTION;

CREATE TABLE users (
  user_id       INTEGER PRIMARY KEY,
  name          TEXT,
  phone         TEXT,
  city          TEXT,
  channel       TEXT,
  register_time TEXT
);

CREATE TABLE products (
  product_id INTEGER PRIMARY KEY,
  name       TEXT,
  category   TEXT,
  price      REAL,
  cost       REAL,
  on_sale    INTEGER
);

CREATE TABLE orders (
  order_id     INTEGER PRIMARY KEY,
  user_id      INTEGER,
  order_time   TEXT,
  status       TEXT,
  order_source TEXT,
  total_amount REAL
);

CREATE TABLE order_items (
  item_id         INTEGER PRIMARY KEY,
  order_id        INTEGER,
  product_id      INTEGER,
  quantity        INTEGER,
  unit_price      REAL,
  discount_amount REAL
);

CREATE TABLE payments (
  payment_id INTEGER PRIMARY KEY,
  order_id   INTEGER,
  paid_time  TEXT,
  method     TEXT,
  amount     REAL,
  status     TEXT
);

CREATE TABLE refunds (
  refund_id   INTEGER PRIMARY KEY,
  order_id    INTEGER,
  refund_time TEXT,
  amount      REAL,
  reason      TEXT
);

CREATE TABLE shipments (
  shipment_id INTEGER PRIMARY KEY,
  order_id    INTEGER,
  ship_time   TEXT,
  arrive_time TEXT,
  status      TEXT
);

CREATE TABLE events (
  event_id   INTEGER PRIMARY KEY,
  user_id    INTEGER,
  event_time TEXT,
  event_type TEXT,
  product_id INTEGER
);

CREATE TABLE coupons (
  coupon_id   INTEGER PRIMARY KEY,
  user_id     INTEGER,
  coupon_type TEXT,
  amount      REAL,
  used        INTEGER,
  expire_time TEXT
);
`)

sql.push(insert('users', ['user_id','name','phone','city','channel','register_time'], users.map((u) => [u.user_id, u.name, u.phone, u.city, u.channel, u.register_time])))
sql.push(insert('products', ['product_id','name','category','price','cost','on_sale'], products.map((p) => [p.product_id, p.name, p.category, p.price, p.cost, p.on_sale])))
sql.push(insert('orders', ['order_id','user_id','order_time','status','order_source','total_amount'], orders.map((o) => [o.order_id, o.user_id, o.order_time, o.status, o.order_source, o.total_amount])))
sql.push(insert('order_items', ['item_id','order_id','product_id','quantity','unit_price','discount_amount'], orderItems.map((i) => [i.item_id, i.order_id, i.product_id, i.quantity, i.unit_price, i.discount_amount])))
sql.push(insert('payments', ['payment_id','order_id','paid_time','method','amount','status'], payments.map((p) => [p.payment_id, p.order_id, p.paid_time, p.method, p.amount, p.status])))
sql.push(insert('refunds', ['refund_id','order_id','refund_time','amount','reason'], refunds.map((r) => [r.refund_id, r.order_id, r.refund_time, r.amount, r.reason])))
sql.push(insert('shipments', ['shipment_id','order_id','ship_time','arrive_time','status'], shipments.map((s) => [s.shipment_id, s.order_id, s.ship_time, s.arrive_time, s.status])))
sql.push(insert('events', ['event_id','user_id','event_time','event_type','product_id'], events.map((e) => [e.event_id, e.user_id, e.event_time, e.event_type, e.product_id])))
sql.push(insert('coupons', ['coupon_id','user_id','coupon_type','amount','used','expire_time'], coupons.map((c) => [c.coupon_id, c.user_id, c.coupon_type, c.amount, c.used, c.expire_time])))
sql.push('COMMIT;')

fs.mkdirSync(path.dirname(OUT), { recursive: true })
const text = sql.join('\n\n')
fs.writeFileSync(OUT, text, 'utf8')
// 再存一份 gzip：托管平台（如 GitHub Pages）不会压缩 .sql，
// 浏览器直接下 796KB 太慢，这里压到约 120KB 由前端解压。
fs.writeFileSync(`${OUT}.gz`, zlib.gzipSync(text, { level: 9 }))

const stat = fs.statSync(OUT)
const gzStat = fs.statSync(`${OUT}.gz`)
console.log('seed.sql 生成完成')
console.log(`  用户 ${users.length} / 商品 ${products.length} / 订单 ${orders.length} / 明细 ${orderItems.length}`)
console.log(`  支付 ${payments.length} / 退款 ${refunds.length} / 物流 ${shipments.length} / 事件 ${events.length} / 优惠券 ${coupons.length}`)
console.log(`  文件大小 ${(stat.size / 1024).toFixed(0)} KB，压缩后 ${(gzStat.size / 1024).toFixed(0)} KB`)
