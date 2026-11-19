param(
  [int]$AppearTimeoutMs = 25000,
  [int]$PollMs = 600
)

# Keep this file pure ASCII: Windows PowerShell 5.1 reads .ps1 as ANSI,
# so non-ASCII characters can break parsing on machines with a different code page.

Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public class NBWatch {
  [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc cb, IntPtr l);
  delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] static extern int GetClassName(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr h, int n);
  [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr h);

  static IntPtr FindHandle() {
    IntPtr found = IntPtr.Zero;
    EnumWindows((h,l) => {
      // Do not require the window to be visible: when Edge is started from a
      // hidden parent it may create the window in a hidden state, and Activate()
      // is responsible for showing it. Filtering by visibility here would deadlock.
      var c = new StringBuilder(256); GetClassName(h, c, 256);
      if (!c.ToString().StartsWith("Chrome_WidgetWin")) return true;
      var t = new StringBuilder(512); GetWindowText(h, t, 512);
      if (t.ToString() == "notebox") { found = h; return false; }
      return true;
    }, IntPtr.Zero);
    return found;
  }

  public static bool Find() {
    return FindHandle() != IntPtr.Zero;
  }

  public static bool Activate() {
    IntPtr h = FindHandle();
    if (h == IntPtr.Zero) return false;
    ShowWindow(h, 3);
    SetForegroundWindow(h);
    return true;
  }
}
'@

# Phase 1: wait for the app window to appear
$deadline = (Get-Date).AddMilliseconds($AppearTimeoutMs)
$found = $false
while ((Get-Date) -lt $deadline) {
  if ([NBWatch]::Find()) {
    $found = $true
    break
  }
  Start-Sleep -Milliseconds 150
}

if (-not $found) {
  exit 2
}

# Maximize and focus as soon as the window exists
[NBWatch]::Activate() | Out-Null

# Phase 2: exit when the window is gone, so the launcher can stop the server
while ($true) {
  Start-Sleep -Milliseconds $PollMs
  if (-not [NBWatch]::Find()) {
    exit 0
  }
}
