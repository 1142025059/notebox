' notebox launcher: start the server and open the app window.
' Closing the window stops the server and releases all resources.
' This file is used inside the portable package, so every path is relative to
' its own folder. Do not hard-code absolute paths here.
Option Explicit

Dim fso, sh, base, nodeExe, entry, q
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")

base = fso.GetParentFolderName(WScript.ScriptFullName)
nodeExe = base & "\node.exe"
entry = base & "\scripts\launcher.mjs"

If Not fso.FileExists(nodeExe) Then
  MsgBox "找不到 node.exe，请确认压缩包已完整解压：" & vbCrLf & nodeExe, 16, "notebox"
  WScript.Quit 1
End If

If Not fso.FileExists(entry) Then
  MsgBox "找不到启动器 launcher.mjs：" & vbCrLf & entry, 16, "notebox"
  WScript.Quit 1
End If

q = Chr(34)
sh.Run q & nodeExe & q & " " & q & entry & q, 0, False
