Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public class NBWin {
  [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc cb, IntPtr l);
  delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr h, int n);
  [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] static extern bool SetWindowPos(IntPtr h, IntPtr after, int x, int y, int cx, int cy, uint flags);
  public static bool Activate() {
    IntPtr found = IntPtr.Zero;
    EnumWindows((h,l) => {
      var t = new StringBuilder(512); GetWindowText(h, t, 512);
      if (t.ToString() == "notebox") { found = h; return false; }
      return true;
    }, IntPtr.Zero);
    if (found == IntPtr.Zero) return false;
    ShowWindow(found, 3);
    SetForegroundWindow(found);
    return true;
  }
}
'@
[NBWin]::Activate() | Out-Null
