$f = "e:\updated dev\ever works\review templet 02\directory-web-template\apps\web\app\[locale]\help\help-client.tsx"
$c = [System.IO.File]::ReadAllText($f)

# Step color fields
$c = $c.Replace('"text-blue-600 dark:text-blue-400"', '"text-neutral-900 dark:text-white"')
$c = $c.Replace('"text-indigo-600 dark:text-indigo-400"', '"text-neutral-900 dark:text-white"')
$c = $c.Replace('"text-green-600 dark:text-green-400"', '"text-neutral-900 dark:text-white"')
$c = $c.Replace('"text-purple-600 dark:text-purple-400"', '"text-neutral-900 dark:text-white"')
$c = $c.Replace('"text-orange-600 dark:text-orange-400"', '"text-neutral-900 dark:text-white"')
$c = $c.Replace('"text-yellow-600 dark:text-yellow-400"', '"text-neutral-900 dark:text-white"')
$c = $c.Replace('"text-red-600 dark:text-red-400"', '"text-neutral-900 dark:text-white"')

# Step gradient fields
$c = $c.Replace('"from-blue-500 to-cyan-500"', '"from-neutral-700 to-neutral-900"')
$c = $c.Replace('"from-indigo-500 to-purple-500"', '"from-neutral-700 to-neutral-900"')
$c = $c.Replace('"from-green-500 to-emerald-500"', '"from-neutral-700 to-neutral-900"')
$c = $c.Replace('"from-purple-500 to-pink-500"', '"from-neutral-700 to-neutral-900"')
$c = $c.Replace('"from-orange-500 to-red-500"', '"from-neutral-700 to-neutral-900"')
$c = $c.Replace('"from-yellow-500 to-orange-500"', '"from-neutral-700 to-neutral-900"')
$c = $c.Replace('"from-red-500 to-pink-500"', '"from-neutral-700 to-neutral-900"')

# getDifficultyColor function
$c = $c.Replace('case "beginner": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";', 'case "beginner": return "bg-neutral-100 text-neutral-600 dark:bg-white/8 dark:text-neutral-400";')
$c = $c.Replace('case "intermediate": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300";', 'case "intermediate": return "bg-neutral-100 text-neutral-600 dark:bg-white/8 dark:text-neutral-400";')
$c = $c.Replace('case "advanced": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";', 'case "advanced": return "bg-neutral-100 text-neutral-600 dark:bg-white/8 dark:text-neutral-400";')

# Step header icon gradient
$c = $c.Replace('bg-linear-to-br ${navigationSteps[currentStep].gradient}', 'bg-neutral-900 dark:bg-white/10')

# Interactive guide header icon
$c = $c.Replace('bg-linear-to-br from-theme-primary-100 to-cyan-100 dark:from-theme-primary-900/30 dark:to-cyan-900/30', 'bg-neutral-100 dark:bg-white/8')
$c = $c.Replace('text-theme-primary-600 dark:text-theme-primary-400', 'text-neutral-600 dark:text-neutral-400')

# Completed step card
$c = $c.Replace('"border-green-300 dark:border-green-500/30 bg-green-50/60 dark:bg-green-500/5"', '"border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/3"')

# Completion badge circle
$c = $c.Replace('w-4 h-4 bg-green-500 rounded-full flex items-center justify-center shrink-0', 'w-4 h-4 bg-neutral-900 dark:bg-white rounded-full flex items-center justify-center shrink-0')

# Step number badge states
$c = $c.Replace('"bg-theme-primary-500 text-white"', '"bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"')
$c = $c.Replace('"bg-green-500 text-white"', '"bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"')

# Active step card
$c = $c.Replace('"border-theme-primary-400 dark:border-theme-primary-500 bg-theme-primary-50 dark:bg-theme-primary-500/8"', '"border-neutral-900/20 dark:border-white/20 bg-neutral-50 dark:bg-white/4"')

# Current label
$c = $c.Replace('"text-[10px] text-theme-primary-600 dark:text-theme-primary-400 font-semibold"', '"text-[10px] text-neutral-700 dark:text-neutral-300 font-semibold"')

# Quick nav completed state
$c = $c.Replace('"bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20"', '"bg-neutral-100 dark:bg-white/8 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-white/8"')

# Progress bar
$c = $c.Replace('className="h-full bg-theme-primary-500 transition-all duration-500 rounded-full"', 'className="h-full bg-neutral-900 dark:bg-white transition-all duration-500 rounded-full"')

# Search focus ring
$c = $c.Replace('focus:ring-2 focus:ring-theme-primary-500/50 focus:border-theme-primary-400', 'focus:ring-1 focus:ring-neutral-300 dark:focus:ring-white/20 focus:border-neutral-400 dark:focus:border-white/20')

[System.IO.File]::WriteAllText($f, $c)
Write-Host "help-client done"
