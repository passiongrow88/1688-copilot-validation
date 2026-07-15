param(
  [string]$OutDir = "C:\Users\ltc_o\90Days\TableFlow-Marketing-Assets-v0.1.3"
)

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

$ErrorActionPreference = "Stop"
$Ink = [System.Drawing.Color]::FromArgb(23, 32, 51)
$Muted = [System.Drawing.Color]::FromArgb(104, 115, 134)
$Line = [System.Drawing.Color]::FromArgb(217, 222, 232)
$Paper = [System.Drawing.Color]::FromArgb(246, 248, 251)
$Blue = [System.Drawing.Color]::FromArgb(36, 59, 122)
$BlueSoft = [System.Drawing.Color]::FromArgb(238, 242, 255)
$Green = [System.Drawing.Color]::FromArgb(21, 115, 71)
$GreenSoft = [System.Drawing.Color]::FromArgb(232, 247, 239)
$Amber = [System.Drawing.Color]::FromArgb(151, 101, 21)
$AmberSoft = [System.Drawing.Color]::FromArgb(255, 248, 236)
$Purple = [System.Drawing.Color]::FromArgb(112, 76, 182)
$PurpleSoft = [System.Drawing.Color]::FromArgb(244, 239, 255)
$White = [System.Drawing.Color]::White

function Font([float]$size, [string]$style = "Regular", [string]$family = "Segoe UI") {
  $fontStyle = [System.Drawing.FontStyle]::Regular
  if ($style -match "Bold") { $fontStyle = $fontStyle -bor [System.Drawing.FontStyle]::Bold }
  if ($style -match "Italic") { $fontStyle = $fontStyle -bor [System.Drawing.FontStyle]::Italic }
  return New-Object System.Drawing.Font($family, $size, $fontStyle, [System.Drawing.GraphicsUnit]::Pixel)
}

function Brush($color) { return New-Object System.Drawing.SolidBrush($color) }
function PenC($color, [float]$width = 1) { return New-Object System.Drawing.Pen($color, $width) }

function RoundedPath([float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $path.AddArc($x, $y, $d, $d, 180, 90)
  $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  return $path
}

function FillRound($g, $color, [float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $p = RoundedPath $x $y $w $h $r
  $b = Brush $color
  $g.FillPath($b, $p)
  $b.Dispose(); $p.Dispose()
}

function StrokeRound($g, $color, [float]$x, [float]$y, [float]$w, [float]$h, [float]$r, [float]$width = 1) {
  $p = RoundedPath $x $y $w $h $r
  $pen = PenC $color $width
  $g.DrawPath($pen, $p)
  $pen.Dispose(); $p.Dispose()
}

function Text($g, [string]$text, [float]$x, [float]$y, [float]$size, $color, [string]$style = "Regular", [float]$maxWidth = 0, [string]$family = "Segoe UI") {
  $f = Font $size $style $family
  $b = Brush $color
  if ($maxWidth -gt 0) {
    $rect = New-Object System.Drawing.RectangleF($x, $y, $maxWidth, 1000)
    $fmt = New-Object System.Drawing.StringFormat
    $fmt.Trimming = [System.Drawing.StringTrimming]::Word
    $g.DrawString($text, $f, $b, $rect, $fmt)
    $fmt.Dispose()
  } else {
    $g.DrawString($text, $f, $b, [float]$x, [float]$y)
  }
  $b.Dispose(); $f.Dispose()
}

function TextCell($g, [string]$text, [float]$x, [float]$y, [float]$w, [float]$h, [float]$size, $color, [string]$style = "Regular", [string]$family = "Segoe UI") {
  $f = Font $size $style $family
  $b = Brush $color
  $rect = New-Object System.Drawing.RectangleF($x, $y, $w, $h)
  $fmt = New-Object System.Drawing.StringFormat
  $fmt.Trimming = [System.Drawing.StringTrimming]::EllipsisCharacter
  $fmt.FormatFlags = [System.Drawing.StringFormatFlags]::NoWrap
  $g.DrawString($text, $f, $b, $rect, $fmt)
  $fmt.Dispose(); $b.Dispose(); $f.Dispose()
}

function Chip($g, [string]$label, [float]$x, [float]$y, $bg, $fg) {
  $f = Font 22 "Bold"
  $size = $g.MeasureString($label, $f)
  FillRound $g $bg $x $y ($size.Width + 34) 44 18
  Text $g $label ($x + 17) ($y + 9) 22 $fg "Bold"
  $f.Dispose()
  return $size.Width + 46
}

function Header($g, [string]$kicker, [string]$title, [string]$subtitle, [int]$w, [float]$x = 72, [float]$y = 62) {
  Text $g $kicker $x $y 22 $Blue "Bold"
  Text $g $title $x ($y + 38) 58 $Ink "Bold" ($w * 0.58)
  Text $g $subtitle $x ($y + 178) 27 $Muted "Regular" ($w * 0.48)
}

function DrawLogo($g, [float]$x, [float]$y, [float]$scale = 1) {
  FillRound $g $Ink $x $y (58 * $scale) (58 * $scale) (14 * $scale)
  Text $g "TF" ($x + 13 * $scale) ($y + 13 * $scale) (22 * $scale) $White "Bold"
  Text $g "TableFlow" ($x + 74 * $scale) ($y + 9 * $scale) (28 * $scale) $Ink "Bold"
  Text $g "Local table exports" ($x + 76 * $scale) ($y + 39 * $scale) (14 * $scale) $Muted
}

function DrawTable($g, [float]$x, [float]$y, [float]$w, [float]$rowH = 42) {
  $headers = @("Product", "Price", "Supplier", "Notes")
  $cnEarbuds = -join ([char[]](0x84dd,0x7259,0x8033,0x673a))
  $cnShenzhenSupplier = -join ([char[]](0x6df1,0x5733,0x4f9b,0x5e94,0x5546))
  $cnExportOk = -join ([char[]](0x652f,0x6301,0x4e2d,0x6587,0x5bfc,0x51fa))
  $cnDurian = -join ([char[]](0x69b4,0x83b2,0x9c9c,0x679c))
  $cnMalaysia = -join ([char[]](0x9a6c,0x6765,0x897f,0x4e9a))
  $cnFrozenFruit = -join ([char[]](0x51b7,0x51bb,0x679c,0x8089))
  $rows = @(
    @("Bluetooth", "19.90", "Shenzhen", "Export OK"),
    @($cnEarbuds, "19.90", $cnShenzhenSupplier, $cnExportOk),
    @($cnDurian, "88.00", $cnMalaysia, $cnFrozenFruit),
    @("Research", "42.00", "Global", "CSV JSON MD")
  )
  $small = $w -lt 500
  if ($small -and $rowH -lt 36) { $rowH = 36 }
  $headerSize = if ($small) { 13 } else { 19 }
  $cellSize = if ($small) { 12 } else { 18 }
  FillRound $g $White $x $y $w (($rows.Count + 1) * $rowH + 22) 12
  StrokeRound $g $Line $x $y $w (($rows.Count + 1) * $rowH + 22) 12
  $colWeights = @(0.29, 0.17, 0.27, 0.27)
  $colX = @($x + 18)
  for ($i = 1; $i -lt $colWeights.Count; $i++) {
    $colX += $x + 18 + (($colWeights[0..($i-1)] | Measure-Object -Sum).Sum * ($w - 36))
  }
  for ($i = 0; $i -lt $headers.Count; $i++) {
    $cw = $colWeights[$i] * ($w - 36)
    TextCell $g $headers[$i] $colX[$i] ($y + 16) ($cw - 8) 26 $headerSize $Ink "Bold"
  }
  for ($r = 0; $r -lt $rows.Count; $r++) {
    $yy = $y + 58 + $r * $rowH
    $pen = PenC $Line
    $g.DrawLine($pen, $x + 16, $yy - 8, $x + $w - 16, $yy - 8)
    $pen.Dispose()
    for ($c = 0; $c -lt 4; $c++) {
      $family = if ($rows[$r][$c] -match "[\u4e00-\u9fff]") { "Microsoft YaHei UI" } else { "Segoe UI" }
      $cw = $colWeights[$c] * ($w - 36)
      TextCell $g $rows[$r][$c] $colX[$c] $yy ($cw - 8) ($rowH - 6) $cellSize $Muted "Regular" $family
    }
  }
}

function DrawPopup($g, [float]$x, [float]$y, [float]$scale = 1, [string]$state = "ready") {
  $w = 380 * $scale; $h = 540 * $scale
  FillRound $g $White $x $y $w $h (18 * $scale)
  StrokeRound $g $Line $x $y $w $h (18 * $scale) 2
  DrawLogo $g ($x + 24 * $scale) ($y + 24 * $scale) (0.7 * $scale)
  FillRound $g $GreenSoft ($x + 250 * $scale) ($y + 28 * $scale) (92 * $scale) (30 * $scale) (15 * $scale)
  Text $g "Local only" ($x + 266 * $scale) ($y + 36 * $scale) (13 * $scale) $Green "Bold"
  FillRound $g $Ink ($x + 24 * $scale) ($y + 92 * $scale) ($w - 48 * $scale) (46 * $scale) (9 * $scale)
  Text $g "Scan this page" ($x + 132 * $scale) ($y + 105 * $scale) (18 * $scale) $White "Bold"
  FillRound $g $White ($x + 24 * $scale) ($y + 154 * $scale) ($w - 48 * $scale) (58 * $scale) (9 * $scale)
  StrokeRound $g $Line ($x + 24 * $scale) ($y + 154 * $scale) ($w - 48 * $scale) (58 * $scale) (9 * $scale)
  Text $g "Free monthly exports" ($x + 42 * $scale) ($y + 166 * $scale) (15 * $scale) $Ink "Bold"
  $quota = if ($state -eq "paywall") { "10 of 10 used this month." } elseif ($state -eq "review") { "5 of 10 used this month." } else { "3 of 10 used this month." }
  Text $g $quota ($x + 42 * $scale) ($y + 188 * $scale) (14 * $scale) $Muted
  DrawTable $g ($x + 24 * $scale) ($y + 230 * $scale) ($w - 48 * $scale) (31 * $scale)
  FillRound $g $BlueSoft ($x + 24 * $scale) ($y + 440 * $scale) ($w - 48 * $scale) (46 * $scale) (9 * $scale)
  StrokeRound $g ([System.Drawing.Color]::FromArgb(200,210,255)) ($x + 24 * $scale) ($y + 440 * $scale) ($w - 48 * $scale) (46 * $scale) (9 * $scale)
  Text $g "Unlock Unlimited - US`$25 Lifetime" ($x + 58 * $scale) ($y + 454 * $scale) (16 * $scale) $Blue "Bold"
  if ($state -eq "review") {
    FillRound $g $White ($x + 24 * $scale) ($y + 496 * $scale) ($w - 48 * $scale) (30 * $scale) (8 * $scale)
    Text $g "Rate us if TableFlow helps." ($x + 80 * $scale) ($y + 503 * $scale) (13 * $scale) $Ink "Bold"
  }
  if ($state -eq "paywall") {
    FillRound $g $AmberSoft ($x + 24 * $scale) ($y + 496 * $scale) ($w - 48 * $scale) (30 * $scale) (8 * $scale)
    Text $g "Monthly free quota is full." ($x + 76 * $scale) ($y + 503 * $scale) (13 * $scale) $Amber "Bold"
  }
}

function DrawWorkflow($g, [float]$x, [float]$y) {
  $steps = @(
    @("1", "Scan", "Find HTML tables"),
    @("2", "Preview", "Check first 5 rows"),
    @("3", "Export", "CSV, JSON, Markdown, Excel")
  )
  for ($i=0; $i -lt $steps.Count; $i++) {
    $sx = $x + $i * 250
    FillRound $g $White $sx $y 210 130 14
    StrokeRound $g $Line $sx $y 210 130 14
    FillRound $g $BlueSoft ($sx+18) ($y+18) 38 38 19
    Text $g $steps[$i][0] ($sx+32) ($y+26) 18 $Blue "Bold"
    Text $g $steps[$i][1] ($sx+18) ($y+66) 25 $Ink "Bold"
    Text $g $steps[$i][2] ($sx+18) ($y+98) 17 $Muted
    if ($i -lt 2) {
      $pen = PenC ([System.Drawing.Color]::FromArgb(150,160,180)) 3
      $g.DrawLine($pen, $sx + 218, $y + 65, $sx + 242, $y + 65)
      $pen.Dispose()
    }
  }
}

function NewCanvas([int]$w, [int]$h, [string]$path, [scriptblock]$draw) {
  $dir = Split-Path $path
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  $bmp = New-Object System.Drawing.Bitmap($w, $h)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
  $g.Clear($Paper)
  & $draw $g $w $h
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}

if (Test-Path $OutDir) { Remove-Item -LiteralPath $OutDir -Recurse -Force }
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$screens = @(
  @("chrome-store-screenshots\01-export-any-html-table.png", "Export Any HTML Table", "to Excel, CSV, JSON & Markdown", "ready", @("Excel", "CSV", "JSON", "Markdown")),
  @("chrome-store-screenshots\02-one-click-export.png", "One Click Export", "No AI. No login. Works offline.", "ready", @("No AI", "No login", "Offline", "Local")),
  @("chrome-store-screenshots\03-chinese-unicode-excel-ready.png", "Supports Chinese", "UTF-8. Unicode. Excel ready.", "review", @("Chinese", "UTF-8", "Unicode", "Excel")),
  @("chrome-store-screenshots\04-perfect-for-research-procurement.png", "Perfect for", "1688, Alibaba, Amazon, research, procurement.", "ready", @("1688", "Alibaba", "Amazon", "Research", "Procurement")),
  @("chrome-store-screenshots\05-free-monthly-upgrade-anytime.png", "Free Monthly Exports", "Upgrade anytime for USD25 lifetime.", "paywall", @("Free monthly", "Upgrade anytime", "USD25", "Lifetime"))
)
foreach ($s in $screens) {
  NewCanvas 1280 800 (Join-Path $OutDir $s[0]) {
    param($g,$w,$h)
    Header $g "TABLEFLOW V0.1.3" $s[1] $s[2] $w
    DrawPopup $g 760 110 1.12 $s[3]
    $x = 72
    $y = 548
    $palette = @(
      @($GreenSoft, $Green),
      @($BlueSoft, $Blue),
      @($PurpleSoft, $Purple),
      @($AmberSoft, $Amber),
      @($BlueSoft, $Blue)
    )
    $chips = $s[4]
    for ($i = 0; $i -lt $chips.Count; $i++) {
      if ($x -gt 550) {
        $x = 72
        $y += 58
      }
      $colors = $palette[$i % $palette.Count]
      $x += Chip $g $chips[$i] $x $y $colors[0] $colors[1]
    }
    Text $g "No AI credits. Local table processing. Free monthly exports." 72 682 24 $Ink "Bold" 600
  }
}

NewCanvas 1400 560 (Join-Path $OutDir "feature-graphic\tableflow-feature-1400x560.png") {
  param($g,$w,$h)
  DrawLogo $g 72 56 1
  Text $g "Export web tables without cleanup busywork" 72 136 52 $Ink "Bold" 650
  Text $g "HTML tables to Excel, CSV, JSON, and Markdown. Chinese text stays readable. No AI credits required." 72 328 24 $Muted "Regular" 640
  $x=72; $y=438
  $x += Chip $g "Free monthly exports" $x $y $BlueSoft $Blue
  $x += Chip $g "US`$25 Lifetime" $x $y $GreenSoft $Green
  DrawPopup $g 930 42 0.88 "ready"
}

NewCanvas 1200 627 (Join-Path $OutDir "social\social-linkedin-1200x627.png") {
  param($g,$w,$h)
  Header $g "TABLEFLOW" "Stop copy-pasting messy web tables" "Export HTML tables to Excel, CSV, JSON, and Markdown with Chinese support." $w 64 52
  DrawWorkflow $g 64 420
  DrawPopup $g 820 58 0.82 "ready"
}

NewCanvas 1600 900 (Join-Path $OutDir "social\social-x-1600x900.png") {
  param($g,$w,$h)
  Header $g "TABLEFLOW" "HTML tables to Excel in seconds" "CSV, JSON, Markdown, Chinese support, no AI credits, and free monthly exports." $w 90 78
  DrawTable $g 90 560 760 54
  DrawPopup $g 1050 90 1.15 "review"
}

NewCanvas 1080 1080 (Join-Path $OutDir "social\social-instagram-square-1080.png") {
  param($g,$w,$h)
  DrawLogo $g 78 70 1
  Text $g "Export web tables" 78 180 64 $Ink "Bold" 760
  Text $g "Excel. CSV. JSON. Markdown. Chinese support." 78 330 34 $Muted "Regular" 760
  DrawPopup $g 590 168 1.02 "ready"
  $x=78; $y=790
  $x += Chip $g "No AI Credits" $x $y $PurpleSoft $Purple
  $x += Chip $g "US`$25 Lifetime" $x $y $GreenSoft $Green
  Text $g "10 free exports every month" 78 880 34 $Ink "Bold"
}

NewCanvas 1080 1920 (Join-Path $OutDir "social\social-story-1080x1920.png") {
  param($g,$w,$h)
  DrawLogo $g 80 90 1.2
  Text $g "Turn any HTML table into a clean file." 80 260 72 $Ink "Bold" 820
  DrawPopup $g 245 610 1.45 "paywall"
  Text $g "Excel / CSV / JSON / Markdown" 80 1540 44 $Ink "Bold"
  Text $g "Chinese support. No AI credits. US`$25 lifetime unlimited exports." 80 1615 34 $Muted "Regular" 860
}

NewCanvas 1270 760 (Join-Path $OutDir "product-hunt\product-hunt-banner-1270x760.png") {
  param($g,$w,$h)
  FillRound $g ([System.Drawing.Color]::FromArgb(255, 97, 68)) 72 62 96 96 24
  Text $g "PH" 99 91 34 $White "Bold"
  Text $g "TableFlow" 190 70 48 $Ink "Bold"
  Text $g "Export HTML tables" 72 182 54 $Ink "Bold" 700
  Text $g "to Excel, CSV, JSON, Markdown" 72 264 42 $Ink "Bold" 740
  Text $g "Local processing. Chinese support. 10 free monthly exports. US`$25 lifetime unlimited." 72 382 26 $Muted "Regular" 650
  DrawPopup $g 835 80 1.05 "ready"
}

NewCanvas 1200 630 (Join-Path $OutDir "readme\readme-hero-1200x630.png") {
  param($g,$w,$h)
  DrawLogo $g 64 56 1
  Text $g "TableFlow exports clean data from webpage tables." 64 154 52 $Ink "Bold" 670
  Text $g "Scan, preview, and download Excel, CSV, JSON, or Markdown. Everything stays in the browser." 64 300 26 $Muted "Regular" 620
  DrawPopup $g 780 48 0.98 "ready"
}

NewCanvas 1200 680 (Join-Path $OutDir "readme\readme-workflow-1200x680.png") {
  param($g,$w,$h)
  Text $g "How TableFlow works" 72 64 52 $Ink "Bold"
  DrawWorkflow $g 72 180
  DrawTable $g 72 390 900 45
}

NewCanvas 1600 900 (Join-Path $OutDir "landing-page\landing-hero-1600x900.png") {
  param($g,$w,$h)
  DrawLogo $g 90 78 1.15
  Text $g "Export HTML tables to useful files." 90 190 76 $Ink "Bold" 780
  Text $g "TableFlow scans visible web tables and exports Excel, CSV, JSON, and Markdown. Chinese text stays readable. No AI credits required." 90 390 34 $Muted "Regular" 760
  $x=90; $y=600
  $x += Chip $g "10 free exports / month" $x $y $BlueSoft $Blue
  $x += Chip $g "US`$25 Lifetime" $x $y $GreenSoft $Green
  DrawPopup $g 1050 95 1.16 "review"
}

NewCanvas 1280 720 (Join-Path $OutDir "youtube\youtube-thumbnail-1280x720.png") {
  param($g,$w,$h)
  FillRound $g ([System.Drawing.Color]::FromArgb(255, 0, 0)) 72 60 92 64 18
  Text $g "PLAY" 88 80 24 $White "Bold"
  Text $g "Export any HTML table" 72 160 70 $Ink "Bold" 720
  Text $g "Excel + CSV + JSON + Markdown" 72 330 38 $Blue "Bold"
  Text $g "No AI Credits. Chinese support. Free monthly exports." 72 395 28 $Muted "Regular" 620
  DrawPopup $g 840 60 1.04 "ready"
}

$story = @(
  @("01-hook.png", "Stop copy-pasting tables", "Show a messy webpage table becoming a clean TableFlow preview.", "ready"),
  @("02-scan.png", "Scan the page", "Click Scan this page and reveal detected table rows.", "ready"),
  @("03-formats.png", "Pick your format", "Highlight Excel, CSV, JSON, and Markdown outputs.", "ready"),
  @("04-chinese.png", "Chinese stays readable", "Show Chinese supplier rows inside the preview.", "review"),
  @("05-free-quota.png", "10 free exports monthly", "Show free monthly exports and review prompt after 5 uses.", "review"),
  @("06-pro.png", "Unlock unlimited", "Show US`$25 Lifetime CTA after monthly quota is full.", "paywall")
)
foreach ($frame in $story) {
  NewCanvas 1920 1080 (Join-Path $OutDir ("hyperframe\" + $frame[0])) {
    param($g,$w,$h)
    Header $g "HYPERFRAME STORYBOARD" $frame[1] $frame[2] $w 100 90
    DrawPopup $g 1230 130 1.35 $frame[3]
    DrawTable $g 100 650 850 58
  }
}

$index = @"
# TableFlow v0.1.3 Marketing Assets

Generated assets use the current TableFlow popup UI and highlight:
Export HTML tables, Excel, CSV, JSON, Markdown, Chinese support, No AI Credits, Free Monthly Exports, and US`$25 Lifetime.

## Files

- chrome-store-screenshots/*.png - Chrome Web Store screenshots, 1280x800
- feature-graphic/tableflow-feature-1400x560.png - Chrome feature graphic
- social/*.png - LinkedIn/X/Instagram/story images
- product-hunt/product-hunt-banner-1270x760.png - Product Hunt launch banner
- readme/*.png - README hero and workflow images
- landing-page/landing-hero-1600x900.png - Landing hero image
- youtube/youtube-thumbnail-1280x720.png - YouTube thumbnail
- hyperframe/*.png - 6-frame storyboard images
- hyperframe/HYPERFRAME-STORYBOARD.md - storyboard notes
"@
[IO.File]::WriteAllText((Join-Path $OutDir "ASSET-INDEX.md"), $index, [Text.UTF8Encoding]::new($false))

$storyMd = @"
# HyperFrame Storyboard - TableFlow v0.1.3

1. Hook: Stop copy-pasting tables.
2. Scan: TableFlow detects HTML tables on the current page.
3. Formats: Export as Excel, CSV, JSON, or Markdown.
4. Chinese support: Chinese product and supplier data stays readable.
5. Free quota: 10 free monthly exports, non-incentivized review prompt after 5 uses.
6. Pro CTA: Unlock unlimited exports for US`$25 Lifetime.

Tone: modern SaaS, practical, local-first, no AI credits.
"@
[IO.File]::WriteAllText((Join-Path $OutDir "hyperframe\HYPERFRAME-STORYBOARD.md"), $storyMd, [Text.UTF8Encoding]::new($false))

Get-ChildItem -Path $OutDir -Recurse -File | Select-Object FullName, Length
