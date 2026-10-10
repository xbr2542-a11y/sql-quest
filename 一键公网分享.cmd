@echo off
chcp 65001 >nul
cd /d "%~dp0"
title SQL 学习游戏 - 公网分享

echo ============================================================
echo   SQL 学习游戏 · 公网分享
echo ============================================================
echo.
echo 这个脚本会做两件事：
echo   1) 启动本地服务（打包版，端口 4173）
echo   2) 建立一个公网地址，让任何人用手机/电脑都能打开
echo.
echo 注意：这个窗口不要关；关了链接就失效。
echo.

echo [1/2] 启动本地服务...
start "SQL游戏-本地服务（不要关）" cmd /k "npm run preview -- --port 4173"
timeout /t 6 >nul

echo [2/2] 建立公网链接...
echo.
echo 等十几秒，下面会出现一行 https://xxxx.trycloudflare.com 的地址，
echo 把那个地址发出去就行。手机请用浏览器打开（微信可能拦）。
echo.

if exist "%ProgramFiles(x86)%\cloudflared\cloudflared.exe" (
  "%ProgramFiles(x86)%\cloudflared\cloudflared.exe" tunnel --url http://127.0.0.1:4173
) else (
  echo 没找到 cloudflared，请先安装：winget install Cloudflare.cloudflared
)

echo.
echo 链接已断开。
pause
