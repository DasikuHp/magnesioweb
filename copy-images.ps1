$src = "C:\Users\h\Documents\Downloads\magnesiomsi\old-assets"
$dst = "C:\Users\h\.zenflow\worktrees\zencoder-default-34bf\public\images"

$files = @(
    "1botedeverde.jpg",
    "3productosjuntos.png",
    "aceitemagensio1.png",
    "botede6verde.png",
    "packde4naranja.png",
    "packde4verde.png",
    "packde6naranja.png",
    "packsdeaceite.png",
    "parejafeliz.png",
    "Foto-stock-abuela.png",
    "ChatGPT Image 27 abr 2026, 16_06_01.png"
)

foreach ($f in $files) {
    $srcPath = Join-Path $src $f
    $dstPath = Join-Path $dst $f
    if (Test-Path $srcPath) {
        Copy-Item -Path $srcPath -Destination $dstPath
        Write-Host "Copied: $f"
    } else {
        Write-Host "Not found: $f"
    }
}
Write-Host "Done"
