' notebox launcher (portable package).
' First run also creates a desktop shortcut, so the app can be opened
' without digging into the extracted folder every time.
' Closing the window stops the server and releases all resources.
' Keep this file pure ASCII: VBScript reads .vbs as ANSI, so non-ASCII
' characters break the string literals and the script fails to compile.
Option Explicit

Dim fso, sh, baseDir, nodeExe, entry, q, readyFlag, i
Dim desktopPath, lnkPath, lnk
Dim browserPath

Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")

baseDir = fso.GetParentFolderName(WScript.ScriptFullName)
nodeExe = baseDir & "\node.exe"
entry = baseDir & "\scripts\launcher.mjs"

' Portable packages ship node.exe next to this script. A source checkout has no
' bundled runtime, so fall back to a locally installed Node.js.
If Not fso.FileExists(nodeExe) Then
  nodeExe = sh.ExpandEnvironmentStrings("%ProgramFiles%") & "\nodejs\node.exe"
End If
If Not fso.FileExists(nodeExe) Then
  nodeExe = "C:\nvm4w\nodejs\node.exe"
End If
If Not fso.FileExists(nodeExe) Then
  nodeExe = sh.ExpandEnvironmentStrings("%ProgramFiles(x86)%") & "\nodejs\node.exe"
End If
If Not fso.FileExists(nodeExe) Then
  MsgBox "Cannot find Node.js. Extract the portable zip (it bundles node.exe), or install Node.js to use a source checkout.", 16, "notebox"
  WScript.Quit 1
End If

If Not fso.FileExists(entry) Then
  MsgBox "Cannot find the launcher script:" & vbCrLf & vbCrLf & entry, 16, "notebox"
  WScript.Quit 1
End If

q = Chr(34)

' Create a desktop shortcut once. It points at notebox.cmd, which starts the
' window from a console process and is roughly twice as fast as this script host.
' Failures (read-only desktop, redirected desktop, policy restrictions) are ignored on purpose.
desktopPath = sh.SpecialFolders("Desktop")
If Len(desktopPath) > 0 Then
  lnkPath = desktopPath & "\notebox.lnk"
  If Not fso.FileExists(lnkPath) Then
    On Error Resume Next
    Set lnk = sh.CreateShortcut(lnkPath)
    lnk.TargetPath = "cmd.exe"
    lnk.Arguments = "/c " & q & baseDir & "\notebox.cmd" & q
    lnk.WorkingDirectory = baseDir
    lnk.Description = "notebox"
    lnk.IconLocation = sh.ExpandEnvironmentStrings("%SystemRoot%") & "\System32\notepad.exe,0"
    lnk.WindowStyle = 7
    lnk.Save
    On Error GoTo 0
  End If
End If

readyFlag = sh.ExpandEnvironmentStrings("%TEMP%") & "\notebox-ready.flag"
If fso.FileExists(readyFlag) Then
  On Error Resume Next
  fso.DeleteFile readyFlag, True
  On Error GoTo 0
End If

' 1) Start the service launcher hidden. It starts the node server, writes the
'    ready flag, and keeps a watcher that stops the server when the window closes.
sh.Run q & nodeExe & q & " " & q & entry & q, 0, False

' 2) Wait for the server to be ready (max 20 seconds).
For i = 1 To 100
  WScript.Sleep 200
  If fso.FileExists(readyFlag) Then Exit For
Next

' 3) Locate a Chromium-based browser.
browserPath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
If Not fso.FileExists(browserPath) Then browserPath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
If Not fso.FileExists(browserPath) Then browserPath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
If Not fso.FileExists(browserPath) Then browserPath = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
If Not fso.FileExists(browserPath) Then
  MsgBox "Cannot find Microsoft Edge or Google Chrome. Please install one of them and run this file again.", 16, "notebox"
  WScript.Quit 1
End If

' 4) Open the app window through ShellExecute (the Explorer launch path).
'    Launching Chromium from this script host delays the window by several seconds;
'    prefer the desktop shortcut (notebox.cmd) for a fast start.
Dim shellApp, params
params = q & "--app=http://127.0.0.1:8787/" & q _
  & " " & q & "--user-data-dir=" & baseDir & "\profile" & q _
  & " " & q & "--start-maximized" & q _
  & " " & q & "--no-first-run" & q _
  & " " & q & "--no-default-browser-check" & q _
  & " " & q & "--disable-background-mode" & q _
  & " " & q & "--disable-sync" & q _
  & " " & q & "--disable-background-networking" & q _
  & " " & q & "--disable-component-update" & q _
  & " " & q & "--disable-default-apps" & q _
  & " " & q & "--no-service-autorun" & q _
  & " " & q & "--password-store=basic" & q
Set shellApp = CreateObject("Shell.Application")
shellApp.ShellExecute browserPath, params, baseDir, "open", 1
