import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // 相对路径：构建产物放在域名根目录或任意子目录都能用
  base: './',
  plugins: [react()],
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
