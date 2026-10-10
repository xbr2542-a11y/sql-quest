/**
 * 生成项目二维码（PNG + SVG），用于放进简历或打印。
 * 用法：npm run qrcode                       → 用默认线上地址
 *      npm run qrcode -- https://你的域名/    → 指定地址（换成国内域名后重新生成一次即可）
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import QRCode from 'qrcode'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const DEFAULT_URL = 'https://xbr2542-a11y.github.io/sql-quest/'
const url = process.argv[2] || DEFAULT_URL

if (!/^https?:\/\//.test(url)) {
  console.error('地址要以 http:// 或 https:// 开头，例如：npm run qrcode -- https://sql.example.com/')
  process.exit(1)
}

const outDir = path.join(root, 'docs')
fs.mkdirSync(outDir, { recursive: true })

const opts = {
  errorCorrectionLevel: 'M',
  margin: 2,
  color: { dark: '#16202c', light: '#ffffff' }
}

await QRCode.toFile(path.join(outDir, 'qr-code.png'), url, { ...opts, width: 1024 })
await QRCode.toFile(path.join(outDir, 'qr-code.svg'), url, opts)
// 简历里常用小尺寸，另存一张 300px 的
await QRCode.toFile(path.join(root, '二维码.png'), url, { ...opts, width: 300 })

console.log('二维码生成完成：')
console.log(`  地址：${url}`)
console.log('  docs/qr-code.png（1024px，高清/打印用）')
console.log('  docs/qr-code.svg（矢量，放大不糊）')
console.log('  二维码.png（300px，直接贴简历）')
