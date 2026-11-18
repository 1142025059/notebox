@echo off
rem 独立启动 notebox：不依赖豆包沙箱，不在豆包的进程组里
cd /d D:\_workspace\notebox
"C:\nvm4w\nodejs\node.exe" --disable-warning=ExperimentalWarning server/index.js >> "%TEMP%\notebox-run.log" 2>> "%TEMP%\notebox-run-err.log"
