Set-Location "C:\Users\migue\OneDrive\Desktop\HotelVALORA"

git add .

$date = Get-Date -Format "yyyy-MM-dd HH:mm"
$status = git status --porcelain

if ($status) {
    git commit -m "auto backup: $date"
    git push origin main
}
