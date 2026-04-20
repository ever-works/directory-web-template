$base = "e:\updated dev\ever works\review templet 02\directory-web-template\apps\web\app\[locale]"
$files = @(
	"$base\about\page.tsx",
	"$base\help\components\process-explanation.tsx",
	"$base\help\components\technology-card.tsx",
	"$base\help\components\installation-guide.tsx",
	"$base\help\components\usage-guide.tsx",
	"$base\help\components\support.tsx",
	"$base\help\components\monetization-section.tsx",
	"$base\help\components\hero-landing.tsx",
	"$base\help\components\env-configuration.tsx",
	"$base\help\components\tech-stack.tsx"
)
$patterns = @("bg-linear-to-r","bg-linear-to-br","from-blue-","from-green-","from-orange-","from-red-","from-purple-","from-pink-","text-blue-","text-green-","text-orange-","text-purple-","text-pink-","text-yellow-","text-red-","bg-blue-","bg-green-","bg-orange-","bg-red-","bg-indigo-","bg-yellow-","bg-violet-","bg-emerald-","border-blue-","animate-float")
foreach ($f in $files) {
	$name = Split-Path $f -Leaf
	$content = [System.IO.File]::ReadAllText($f)
	$found = @()
	foreach ($p in $patterns) { if ($content.Contains($p)) { $found += $p } }
	if ($found.Count -gt 0) { Write-Host "REMAINING [$name]: $($found -join ', ')" }
	else { Write-Host "CLEAN [$name]" }
}
