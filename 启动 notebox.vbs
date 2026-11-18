' notebox launcher: start server + open an app window.
' Closing the window stops the server and releases all resources.
Set sh = CreateObject("WScript.Shell")
sh.Run """C:\nvm4w\nodejs\node.exe"" ""D:\_workspace\notebox\scripts\launcher.mjs""", 0, False
