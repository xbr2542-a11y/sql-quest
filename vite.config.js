import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * 把构建出来的 CSS 直接内联进 index.html。
 * 原因：<link rel=stylesheet> 会挡住浏览器渲染（外网访问时首屏要等 CSS 下载完才出画面，
 * 实测多等约 1 秒）。这个站点 CSS 只有 40KB，内联后首屏能立刻画出来。
 */
const inlineCss = {
  name: 'inline-css',
  apply: 'build',
  enforce: 'post',
  generateBundle(_options, bundle) {
    const html = Object.values(bundle).find((f) => f.fileName.endsWith('.html'))
    const css = Object.values(bundle).find((f) => f.type === 'asset' && f.fileName.endsWith('.css'))
    if (!html || !css) return
    const href = `./${css.fileName}`
    const tag = new RegExp(`<link[^>]*href="${href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`)
    if (!tag.test(html.source)) return
    html.source = html.source.replace(tag, `<style>${css.source}</style>`)
    delete bundle[css.fileName]
  }
}

export default defineConfig({
  // 相对路径：构建产物放在域名根目录或任意子目录都能用
  base: './',
  plugins: [react(), inlineCss],
  server: {
    port: 5173,
    // 绑定所有网卡：这样同一 Wi-Fi 下的手机、别人电脑也能用局域网地址打开。
    // 只想本机访问时用 npm run dev:local。
    host: true,
    // 允许隧道域名访问（否则 Vite 会以「Host 不允许」挡掉公网请求）
    allowedHosts: ['.trycloudflare.com', '.ngrok-free.app', '.ngrok.io', '.loca.lt']
  },
  preview: {
    host: true,
    allowedHosts: ['.trycloudflare.com', '.ngrok-free.app', '.ngrok.io', '.loca.lt']
  },
  build: {
    chunkSizeWarningLimit: 4096
  }
})
