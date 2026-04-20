$base = "e:\updated dev\ever works\review templet 02\directory-web-template\apps\web\app\[locale]\help\components"

# ── installation-guide.tsx ─────────────────────────────────────────────────
$f = "$base\installation-guide.tsx"
$c = [System.IO.File]::ReadAllText($f)
$c = $c.Replace('${tip.color}', 'bg-neutral-100 dark:bg-white/8')
$c = $c.Replace('bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', 'bg-neutral-100 text-neutral-700 dark:bg-white/8 dark:text-neutral-300')
$c = $c.Replace('bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300', 'bg-neutral-100 text-neutral-700 dark:bg-white/8 dark:text-neutral-300')
$c = $c.Replace('bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', 'bg-neutral-100 text-neutral-700 dark:bg-white/8 dark:text-neutral-300')
[System.IO.File]::WriteAllText($f, $c)
Write-Host "installation-guide done"

# ── usage-guide.tsx ────────────────────────────────────────────────────────
$f = "$base\usage-guide.tsx"
$c = [System.IO.File]::ReadAllText($f)
# sidebar gradient icons
$c = $c.Replace('bg-linear-to-r ${section.gradient}', 'bg-neutral-900 dark:bg-white/10')
# active sidebar highlight
$c = $c.Replace('bg-blue-100 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-800', 'bg-neutral-100 dark:bg-white/8 border border-neutral-200 dark:border-white/10')
# active content tab border
$c = $c.Replace('text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400', 'text-neutral-900 dark:text-white border-b-2 border-neutral-900 dark:border-white')
# note boxes
$c = $c.Replace('bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800', 'bg-neutral-50 dark:bg-white/5 rounded-lg border border-neutral-200 dark:border-white/8')
$c = $c.Replace('text-blue-700 dark:text-blue-300', 'text-neutral-600 dark:text-neutral-400')
# browser chrome dots  
$c = $c.Replace('bg-red-400', 'bg-neutral-300 dark:bg-neutral-600')
$c = $c.Replace('bg-yellow-400', 'bg-neutral-300 dark:bg-neutral-600')
$c = $c.Replace('bg-green-400', 'bg-neutral-300 dark:bg-neutral-600')
[System.IO.File]::WriteAllText($f, $c)
Write-Host "usage-guide done"

# ── support.tsx ────────────────────────────────────────────────────────────
$f = "$base\support.tsx"
$c = [System.IO.File]::ReadAllText($f)
# gradient channel icons
$c = $c.Replace('bg-linear-to-r ${channel.gradient}', 'bg-neutral-900 dark:bg-white/10')
# channel name text color
$c = $c.Replace('${channel.color}', 'text-neutral-900 dark:text-white')
# status color function
$c = $c.Replace('case "online": return "bg-green-500";', 'case "online": return "bg-neutral-400 dark:bg-neutral-500";')
$c = $c.Replace('case "busy": return "bg-yellow-500";', 'case "busy": return "bg-neutral-400 dark:bg-neutral-500";')
$c = $c.Replace('case "offline": return "bg-red-500";', 'case "offline": return "bg-neutral-300 dark:bg-neutral-600";')
$c = $c.Replace('default: return "bg-gray-500";', 'default: return "bg-neutral-300 dark:bg-neutral-600";')
# dashboard icon bg
$c = $c.Replace('w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center', 'w-8 h-8 bg-neutral-900 dark:bg-white/10 rounded-lg flex items-center justify-center')
# FAQ tags
$c = $c.Replace('bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300', 'bg-neutral-100 dark:bg-white/8 text-neutral-600 dark:text-neutral-400')
# live chat avatar
$c = $c.Replace('w-8 h-8 bg-green-500 rounded-full flex items-center justify-center', 'w-8 h-8 bg-neutral-900 dark:bg-white/10 rounded-full flex items-center justify-center')
# chat send button
$c = $c.Replace('bg-green-600 hover:bg-green-700 text-white rounded-lg', 'bg-neutral-900 hover:bg-neutral-700 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 rounded-lg')
# active border
$c = $c.Replace('border-blue-500 dark:border-blue-500', 'border-neutral-900/20 dark:border-white/20')
[System.IO.File]::WriteAllText($f, $c)
Write-Host "support done"

# ── monetization-section.tsx ───────────────────────────────────────────────
$f = "$base\monetization-section.tsx"
$c = [System.IO.File]::ReadAllText($f)
$c = $c.Replace('bg-linear-to-r ${method.gradient}', 'bg-neutral-900 dark:bg-white/10')
$c = $c.Replace('${method.color}', 'text-neutral-900 dark:text-white')
$c = $c.Replace('bg-linear-to-r ${monetizationMethods[activeMethod].gradient}', 'bg-neutral-900 dark:bg-white/10')
$c = $c.Replace('border-blue-500 dark:border-blue-500', 'border-neutral-900/20 dark:border-white/20')
# revenue / setup time stats
$c = $c.Replace('text-green-600 dark:text-green-400', 'text-neutral-900 dark:text-white')
$c = $c.Replace('text-blue-600 dark:text-blue-400', 'text-neutral-900 dark:text-white')
# difficulty badges
$c = $c.Replace('"Easy" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"', '"Easy" ? "bg-neutral-100 text-neutral-700 dark:bg-white/8 dark:text-neutral-300"')
$c = $c.Replace('"Medium" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"', '"Medium" ? "bg-neutral-100 text-neutral-700 dark:bg-white/8 dark:text-neutral-300"')
$c = $c.Replace('"bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"', '"bg-neutral-100 text-neutral-700 dark:bg-white/8 dark:text-neutral-300"')
$c = $c.Replace('w-2 h-2 bg-blue-500 rounded-full', 'w-2 h-2 bg-neutral-400 dark:bg-neutral-500 rounded-full')
# feature heading icon handled separately
[System.IO.File]::WriteAllText($f, $c)
Write-Host "monetization-section done"

# ── process-explanation.tsx ────────────────────────────────────────────────
$f = "$base\process-explanation.tsx"
$c = [System.IO.File]::ReadAllText($f)
$c = $c.Replace('bg-linear-to-r ${step.gradient}', 'bg-neutral-900 dark:bg-white/10')
$c = $c.Replace('${step.color}', 'text-neutral-900 dark:text-white')
$c = $c.Replace('border-blue-500 dark:border-blue-500', 'border-neutral-900/20 dark:border-white/20')
# timeline nodes
$c = $c.Replace('"bg-green-500 border-green-500 shadow-lg shadow-green-500/50"', '"bg-neutral-900 dark:bg-white border-neutral-900 dark:border-white"')
$c = $c.Replace('"bg-blue-500 border-blue-500 shadow-lg shadow-blue-500/50 animate-pulse"', '"bg-neutral-900 dark:bg-white border-neutral-900 dark:border-white"')
# complexity badges
$c = $c.Replace('"Simple" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"', '"Simple" ? "bg-neutral-100 text-neutral-700 dark:bg-white/8 dark:text-neutral-300"')
$c = $c.Replace('"Moderate" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"', '"Moderate" ? "bg-neutral-100 text-neutral-700 dark:bg-white/8 dark:text-neutral-300"')
$c = $c.Replace('"bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"', '"bg-neutral-100 text-neutral-700 dark:bg-white/8 dark:text-neutral-300"')
# progress % label color
$c = $c.Replace('text-blue-600 dark:text-blue-400', 'text-neutral-900 dark:text-white')
# completed checkmark
$c = $c.Replace('w-6 h-6 bg-green-500 rounded-full flex items-center justify-center', 'w-6 h-6 bg-neutral-900 dark:bg-white rounded-full flex items-center justify-center')
# requirement dot
$c = $c.Replace('w-2 h-2 bg-blue-500 rounded-full', 'w-2 h-2 bg-neutral-400 dark:bg-neutral-500 rounded-full')
# inline heading icons handled separately
[System.IO.File]::WriteAllText($f, $c)
Write-Host "process-explanation done"

# ── technology-card.tsx ────────────────────────────────────────────────────
$f = "$base\technology-card.tsx"
$c = [System.IO.File]::ReadAllText($f)
# gradient pairs → neutral
$c = $c.Replace('from-blue-500 to-cyan-500', 'from-neutral-700 to-neutral-900')
$c = $c.Replace('from-green-500 to-emerald-500', 'from-neutral-700 to-neutral-900')
$c = $c.Replace('from-purple-500 to-pink-500', 'from-neutral-700 to-neutral-900')
$c = $c.Replace('from-orange-500 to-red-500', 'from-neutral-700 to-neutral-900')
$c = $c.Replace('from-pink-500 to-rose-500', 'from-neutral-700 to-neutral-900')
$c = $c.Replace('from-yellow-500 to-amber-500', 'from-neutral-700 to-neutral-900')
$c = $c.Replace('from-red-500 to-pink-500', 'from-neutral-700 to-neutral-900')
$c = $c.Replace('from-gray-500 to-slate-500', 'from-neutral-700 to-neutral-900')
# text colors from getColorClasses map
$c = $c.Replace('text-blue-600 dark:text-blue-400', 'text-neutral-900 dark:text-white')
$c = $c.Replace('text-green-600 dark:text-green-400', 'text-neutral-900 dark:text-white')
$c = $c.Replace('text-purple-600 dark:text-purple-400', 'text-neutral-900 dark:text-white')
$c = $c.Replace('text-orange-600 dark:text-orange-400', 'text-neutral-900 dark:text-white')
$c = $c.Replace('text-pink-600 dark:text-pink-400', 'text-neutral-900 dark:text-white')
$c = $c.Replace('text-yellow-600 dark:text-yellow-400', 'text-neutral-900 dark:text-white')
$c = $c.Replace('text-red-600 dark:text-red-400', 'text-neutral-900 dark:text-white')
# border colors from map
$c = $c.Replace('border-blue-200 dark:border-blue-800', 'border-neutral-200 dark:border-white/6')
$c = $c.Replace('border-green-200 dark:border-green-800', 'border-neutral-200 dark:border-white/6')
$c = $c.Replace('border-purple-200 dark:border-purple-800', 'border-neutral-200 dark:border-white/6')
$c = $c.Replace('border-orange-200 dark:border-orange-800', 'border-neutral-200 dark:border-white/6')
$c = $c.Replace('border-pink-200 dark:border-pink-800', 'border-neutral-200 dark:border-white/6')
$c = $c.Replace('border-yellow-200 dark:border-yellow-800', 'border-neutral-200 dark:border-white/6')
$c = $c.Replace('border-red-200 dark:border-red-800', 'border-neutral-200 dark:border-white/6')
# hover borders
$c = $c.Replace('hover:border-blue-300 dark:hover:border-blue-700', 'hover:border-neutral-300 dark:hover:border-white/8')
$c = $c.Replace('hover:border-green-300 dark:hover:border-green-700', 'hover:border-neutral-300 dark:hover:border-white/8')
$c = $c.Replace('hover:border-purple-300 dark:hover:border-purple-700', 'hover:border-neutral-300 dark:hover:border-white/8')
$c = $c.Replace('hover:border-orange-300 dark:hover:border-orange-700', 'hover:border-neutral-300 dark:hover:border-white/8')
$c = $c.Replace('hover:border-pink-300 dark:hover:border-pink-700', 'hover:border-neutral-300 dark:hover:border-white/8')
$c = $c.Replace('hover:border-yellow-300 dark:hover:border-yellow-700', 'hover:border-neutral-300 dark:hover:border-white/8')
$c = $c.Replace('hover:border-red-300 dark:hover:border-red-700', 'hover:border-neutral-300 dark:hover:border-white/8')
# popularity badges
$c = $c.Replace('bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200', 'bg-neutral-100 dark:bg-white/8 text-neutral-700 dark:text-neutral-300')
$c = $c.Replace('bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200', 'bg-neutral-100 dark:bg-white/8 text-neutral-700 dark:text-neutral-300')
# getPerformanceColor function
$c = $c.Replace('if (score >= 90) return "text-green-600 dark:text-green-400";', 'if (score >= 90) return "text-neutral-900 dark:text-white";')
$c = $c.Replace('if (score >= 70) return "text-yellow-600 dark:text-yellow-400";', 'if (score >= 70) return "text-neutral-700 dark:text-neutral-300";')
$c = $c.Replace('return "text-red-600 dark:text-red-400";', 'return "text-neutral-500 dark:text-neutral-400";')
# usage bar gradient
$c = $c.Replace('h-full bg-linear-to-r ${colors.bg} transition-all duration-1000 ease-out', 'h-full bg-neutral-900 dark:bg-white transition-all duration-1000 ease-out')
# use-cases dot
$c = $c.Replace('w-1.5 h-1.5 bg-blue-500 rounded-full', 'w-1.5 h-1.5 bg-neutral-400 dark:bg-neutral-500 rounded-full')
# icon bg
$c = $c.Replace('bg-linear-to-br ${colors.bg}', 'bg-neutral-900 dark:bg-white/10')
[System.IO.File]::WriteAllText($f, $c)
Write-Host "technology-card done"

# ── env-configuration.tsx ──────────────────────────────────────────────────
$f = "$base\env-configuration.tsx"
$c = [System.IO.File]::ReadAllText($f)
$c = $c.Replace('bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', 'bg-neutral-100 text-neutral-700 dark:bg-white/8 dark:text-neutral-300')
$c = $c.Replace('bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300', 'bg-neutral-100 text-neutral-700 dark:bg-white/8 dark:text-neutral-300')
$c = $c.Replace('bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', 'bg-neutral-100 text-neutral-700 dark:bg-white/8 dark:text-neutral-300')
$c = $c.Replace('bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', 'bg-neutral-100 text-neutral-700 dark:bg-white/8 dark:text-neutral-300')
$c = $c.Replace('bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300', 'bg-neutral-100 text-neutral-700 dark:bg-white/8 dark:text-neutral-300')
$c = $c.Replace('bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300', 'bg-neutral-100 text-neutral-700 dark:bg-white/8 dark:text-neutral-300')
[System.IO.File]::WriteAllText($f, $c)
Write-Host "env-configuration done"

# ── tech-stack.tsx ─────────────────────────────────────────────────────────
$f = "$base\tech-stack.tsx"
$c = [System.IO.File]::ReadAllText($f)
$c = $c.Replace('text-green-600 dark:text-green-400', 'text-neutral-900 dark:text-white')
$c = $c.Replace('text-blue-600 dark:text-blue-400', 'text-neutral-900 dark:text-white')
[System.IO.File]::WriteAllText($f, $c)
Write-Host "tech-stack done"

# ── hero-landing.tsx ───────────────────────────────────────────────────────
$f = "$base\hero-landing.tsx"
$c = [System.IO.File]::ReadAllText($f)
# gradient span in h1
$c = $c.Replace('bg-linear-to-r from-theme-primary-600 to-theme-primary-400 dark:from-theme-primary-400 dark:to-theme-primary-600 bg-clip-text text-transparent', 'text-neutral-500 dark:text-neutral-400')
# live badge dot
$c = $c.Replace('w-1.5 h-1.5 bg-emerald-500 rounded-full', 'w-1.5 h-1.5 bg-neutral-400 rounded-full')
# demo badge
$c = $c.Replace('bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-medium rounded-full', 'bg-neutral-100 dark:bg-white/8 text-neutral-600 dark:text-neutral-400 text-xs font-medium rounded-full')
# demo item accent dots
$c = $c.Replace('bg-blue-500', 'bg-neutral-900 dark:bg-white/30')
$c = $c.Replace('bg-violet-500', 'bg-neutral-700 dark:bg-white/20')
$c = $c.Replace('bg-orange-500', 'bg-neutral-500 dark:bg-white/15')
[System.IO.File]::WriteAllText($f, $c)
Write-Host "hero-landing done"

Write-Host "ALL HELP COMPONENTS COMPLETE"
