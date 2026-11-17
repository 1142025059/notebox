$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $root

if (-not (Test-Path -LiteralPath (Join-Path $root 'node_modules'))) {
    Write-Host '首次运行，安装依赖…'
    npm install
}

if (-not (Test-Path -LiteralPath (Join-Path $root 'web\dist\index.html'))) {
    Write-Host '构建前端…'
    npm run build
}

Write-Host 'notebox 启动中： http://127.0.0.1:8787 （Ctrl+C 停止）'
Start-Process 'http://127.0.0.1:8787'
npm start
