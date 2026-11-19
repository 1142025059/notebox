' notebox launcher (portable package).
' Closing the window stops the server and releases all resources.
' Keep this file pure ASCII: VBScript reads .vbs as ANSI, so non-ASCII
' characters break the string literals and the script fails to compile.
Option Explicit

Dim fso, sh, baseDir, nodeExe, entry, q
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")

baseDir = fso.GetParentFolderName(WScript.ScriptFullName)
nodeExe = baseDir & "\node.exe"
entry = baseDir & "\scripts\launcher.mjs"

If Not fso.FileExists(nodeExe) Then
  MsgBox "Cannot find node.exe. Please extract the whole zip archive first, then run this file:" & vbCrLf & vbCrLf & nodeExe, 16, "notebox"
  WScript.Quit 1
End If

If Not fso.FileExists(entry) Then
  MsgBox "Cannot find the launcher script:" & vbCrLf & vbCrLf & entry, 16, "notebox"
  WScript.Quit 1
End If

q = Chr(34)
sh.Run q & nodeExe & q & " " & q & entry & q, 0, False
