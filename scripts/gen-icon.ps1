# Generate app-icon.png (red gradient + gold ring + glyph), ASCII-only on purpose:
# PowerShell 5.1 reads BOM-less files as ANSI, non-ASCII text breaks parsing.
Add-Type -AssemblyName System.Drawing

$size = 512
$bmp = New-Object System.Drawing.Bitmap($size, $size)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias

$rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  $rect,
  [System.Drawing.Color]::FromArgb(178, 24, 28),
  [System.Drawing.Color]::FromArgb(102, 10, 14),
  90)
$g.FillRectangle($brush, $rect)

$gold = [System.Drawing.Color]::FromArgb(246, 208, 135)
$ringPen = New-Object System.Drawing.Pen($gold, 14)
$g.DrawEllipse($ringPen, 106, 106, 300, 300)

# U+6B22 = "huan" (welcome)
$glyph = [string][char]0x6B22
$font = New-Object System.Drawing.Font(
  "Microsoft YaHei", 168,
  [System.Drawing.FontStyle]::Bold,
  [System.Drawing.GraphicsUnit]::Pixel)
$fmt = New-Object System.Drawing.StringFormat
$fmt.Alignment = [System.Drawing.StringAlignment]::Center
$fmt.LineAlignment = [System.Drawing.StringAlignment]::Center
$textBrush = New-Object System.Drawing.SolidBrush($gold)
$g.DrawString($glyph, $font, $textBrush, 256, 252, $fmt)

$g.Dispose()
$out = Join-Path -Path (Split-Path -Path $PSScriptRoot -Parent) -ChildPath "app-icon.png"
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Host "app-icon.png generated"
