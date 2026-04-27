for ($i = 1; $i -le 140; $i++) {
    $num = $i.ToString("D3")
    $src = "C:\Users\h\Documents\Downloads\magnesiomsi\old-assets\ezgif-frame-$num.jpg"
    $dst = "C:\Users\h\.zenflow\worktrees\zencoder-default-34bf\public\sequence\frame_$($i - 1).jpg"
    Copy-Item -Path $src -Destination $dst
}
Write-Host "Done copying frames"
