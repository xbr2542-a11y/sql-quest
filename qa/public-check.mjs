/** 临时验证：公网地址能否真正打开并使用（交付前删除） */
import { createRequire } from 'node:module'
const require = createRequire('E:/小程序测试/package.json')
const { chromium } = require('playwright-core')

const URL = process.argv[2]
if (!URL) {
  console.log('缺少地址参数')
  process.exit(1)
}

const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const failed = []
page.on('response', (r) => {
  if (r.status() >= 400) failed.push(`${r.status()} ${r.url().slice(0, 90)}`)
})
page.on('pageerror', (e) => failed.push('PAGEERROR ' + e.message))

console.log('访问:', URL)
const t0 = Date.now()
await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(3000)
console.log(`加载耗时: ${((Date.now() - t0) / 1000).toFixed(1)} 秒`)
console.log('标题:', await page.title())
console.log('首屏:', (await page.locator('.hero h1').count()) ? '✅ 渲染成功' : '❌ 空白')

// 真的跑一次查询，确认数据也能通过公网加载
await page.evaluate(() =>
  localStorage.setItem('sqlquest.progress.v1', JSON.stringify({ stars: { 1: 3, 2: 3 }, bonus: 50, path: 'basic', tutorialDone: true }))
)
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(3500)
await page.getByRole('button', { name: /回到关卡地图|从第 1 关开始/ }).first().click().catch(() => {})
await page.waitForTimeout(600)
await page.locator('.lv', { hasText: '这批用户从哪来的' }).click()
await page.waitForTimeout(900)
await page.locator('.cm-content').click()
await page.keyboard.type("SELECT * FROM users WHERE channel = '小红书'")
await page.locator('[data-testid="run"]').click()
await page.waitForTimeout(1500)
const rows = await page.evaluate(() => document.querySelectorAll('table.res tbody tr').length)
console.log(`SQL 执行: ${rows > 0 ? `✅ 返回 ${rows} 行` : '❌ 失败'}`)
console.log(`失败请求: ${failed.length ? failed.join(' | ') : '（无）'}`)

await browser.close()
