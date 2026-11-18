$ErrorActionPreference = 'Stop'
$ws = New-Object -ComObject WScript.Shell
$lnk = 'E:\Users\notebox.lnk'
$sc = $ws.CreateShortcut($lnk)
$sc.TargetPath = 'C:\Windows\System32\wscript.exe'
$sc.Arguments = '"D:\_workspace\notebox\notebox.vbs"'
$sc.WorkingDirectory = 'D:\_workspace\notebox'
$sc.Description = 'notebox local records app'
$sc.Save()
Write-Output ('created=' + (Test-Path -LiteralPath $lnk))
