$dir = "e:\updated dev\ever works\review templet 02\directory-web-template\apps\web\app\[locale]\help\components"
$patterns = @('text-2xl','text-xl font-bold','text-xl font-semibold','text-lg font-semibold','text-lg font-bold','mt-16','p-8','gap-8','green-50','green-900','green-500','bg-linear-to-r','from-blue-','from-green-','indigo-','violet-','purple-')

Get-ChildItem "$dir\*.tsx" | ForEach-Object {
	$name = $_.Name
	$content = [System.IO.File]::ReadAllText($_.FullName)
	$found = @()
	foreach ($p in $patterns) {
		if ($content.Contains($p)) { $found += $p }
	}
	if ($found.Count -gt 0) { Write-Host "[$name]: $($found -join ', ')" }
	else { Write-Host "CLEAN [$name]" }
}
