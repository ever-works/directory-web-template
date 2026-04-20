$base = "e:\updated dev\ever works\review templet 02\directory-web-template\apps\web\app\[locale]\help\components"

# ==== usage-guide.tsx ====
$f = "$base\usage-guide.tsx"
$c = [System.IO.File]::ReadAllText($f)

$c = $c.Replace('color: "text-indigo-600 dark:text-indigo-400"', 'color: "text-neutral-900 dark:text-white"')
$c = $c.Replace('gradient: "from-indigo-500 to-purple-500"', 'gradient: "from-neutral-700 to-neutral-900"')

# Header mb-10 -> mb-6, h2 text-2xl -> text-base, p text-sm -> text-xs
$c = $c.Replace('<h2 className="text-2xl font-semibold tracking-tight mb-2 text-neutral-900 dark:text-white">{t(''USAGE_GUIDE_TITLE'')}</h2>', '<h2 className="text-base font-semibold tracking-tight mb-2 text-neutral-900 dark:text-white">{t(''USAGE_GUIDE_TITLE'')}</h2>')
$c = $c.Replace('<p className="text-neutral-500 dark:text-neutral-400 text-sm max-w-2xl leading-relaxed">{t(''USAGE_GUIDE_SUBTITLE'')}</p>', '<p className="text-neutral-500 dark:text-neutral-400 text-xs max-w-2xl leading-relaxed">{t(''USAGE_GUIDE_SUBTITLE'')}</p>')
$c = $c.Replace('           <div className="mb-10">', '           <div className="mb-6">')

# IDE toolbar dots
$c = $c.Replace('w-3 h-3 bg-red-500 rounded-full', 'w-3 h-3 bg-neutral-300 dark:bg-neutral-600 rounded-full')
$c = $c.Replace('w-3 h-3 bg-yellow-500 rounded-full', 'w-3 h-3 bg-neutral-400 dark:bg-neutral-500 rounded-full')
$c = $c.Replace('w-3 h-3 bg-green-500 rounded-full', 'w-3 h-3 bg-neutral-500 dark:bg-neutral-400 rounded-full')

# Sidebar section title
$c = $c.Replace('text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 uppercase tracking-wider', 'text-xs font-medium text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-widest')

# Tab content p-6 -> p-4, space-y-6 -> space-y-4
$c = $c.Replace('activeTab === "code" && (' + "`r`n" + '                  <div className="space-y-6">', 'activeTab === "code" && (' + "`r`n" + '                  <div className="space-y-4">')

# Prerequisites/Next Steps headings text-lg -> text-xs, mb-3 -> mb-2
$c = $c.Replace('className="text-lg font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">', 'className="text-xs font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">')

# Remove text-green-600 from span in Next Steps
$c = $c.Replace('className="text-green-600">', 'className="">')

# Next Steps bullet bg-green-500 -> neutral
$c = $c.Replace('className="flex items-center gap-2 text-slate-700 dark:text-slate-300">' + "`r`n" + '                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>', 'className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">' + "`r`n" + '                              <div className="w-2 h-2 bg-neutral-400 dark:bg-neutral-500 rounded-full"></div>')

# Tab content p-6 -> p-4
$c = $c.Replace('<div className="p-6">' + "`r`n" + '                {activeTab === "code"', '<div className="p-4">' + "`r`n" + '                {activeTab === "code"')

# Best Practices
$c = $c.Replace('<div className="mt-10">', '<div className="mt-8">')
$c = $c.Replace('className="text-lg font-semibold text-slate-900 dark:text-white mb-5">', 'className="text-sm font-semibold text-slate-900 dark:text-white mb-3">')

# Best practice card icons (class only, no emoji)
$c = $c.Replace('className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center shrink-0"', 'className="w-7 h-7 bg-neutral-900 dark:bg-white/10 rounded-md flex items-center justify-center shrink-0"')
$c = $c.Replace('className="w-8 h-8 bg-neutral-900 dark:bg-white/30 rounded-lg flex items-center justify-center shrink-0"', 'className="w-7 h-7 bg-neutral-900 dark:bg-white/10 rounded-md flex items-center justify-center shrink-0"')
$c = $c.Replace('className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center shrink-0"', 'className="w-7 h-7 bg-neutral-900 dark:bg-white/10 rounded-md flex items-center justify-center shrink-0"')
$c = $c.Replace('className="w-8 h-8 bg-neutral-500 dark:bg-white/15 rounded-lg flex items-center justify-center shrink-0"', 'className="w-7 h-7 bg-neutral-900 dark:bg-white/10 rounded-md flex items-center justify-center shrink-0"')
$c = $c.Replace('<span className="text-white text-sm">', '<span className="text-white dark:text-neutral-400 text-xs">')

# Best practice cards: rounded-xl p-5 -> rounded-lg p-4
$c = $c.Replace('"bg-white dark:bg-white/3 rounded-xl p-5 border border-slate-200 dark:border-white/6"', '"bg-white dark:bg-white/3 rounded-lg p-4 border border-slate-200 dark:border-white/6"')

[System.IO.File]::WriteAllText($f, $c)
Write-Host "usage-guide done"

# ==== monetization-section.tsx ====
$f = "$base\monetization-section.tsx"
$c = [System.IO.File]::ReadAllText($f)

# Header
$c = $c.Replace('"text-2xl font-semibold tracking-tight mb-2 text-neutral-900 dark:text-white">' + "`r`n" + '            {t(''MONETIZATION_SECTION_TITLE'')}', '"text-base font-semibold tracking-tight mb-2 text-neutral-900 dark:text-white">' + "`r`n" + '            {t(''MONETIZATION_SECTION_TITLE'')}')
$c = $c.Replace('"text-neutral-500 dark:text-neutral-400 text-sm max-w-2xl leading-relaxed">' + "`r`n" + '            {t(''MONETIZATION_SECTION_SUBTITLE'')}', '"text-neutral-500 dark:text-neutral-400 text-xs max-w-2xl leading-relaxed">' + "`r`n" + '            {t(''MONETIZATION_SECTION_SUBTITLE'')}')
$c = $c.Replace('<div className="mb-10">' + "`r`n" + '          <p className="text-xs font-medium uppercase tracking-widest', '<div className="mb-6">' + "`r`n" + '          <p className="text-xs font-medium uppercase tracking-widest')

# Stats
$c = $c.Replace('"grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16"', '"grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10"')
$c = $c.Replace('"bg-white dark:bg-white/3 rounded-xl p-5 border border-slate-200 dark:border-white/6 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors duration-200"', '"bg-white dark:bg-white/3 rounded-lg p-4 border border-slate-200 dark:border-white/6 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors duration-200"')
$c = $c.Replace('"text-2xl font-bold text-slate-900 dark:text-white mb-1"', '"text-lg font-bold text-slate-900 dark:text-white mb-1"')

# Methods grid
$c = $c.Replace('"grid lg:grid-cols-3 gap-8 mb-16"', '"grid lg:grid-cols-3 gap-4 mb-10"')

# Method card icon size
$c = $c.Replace('`w-10 h-10 rounded-lg bg-neutral-900 dark:bg-white/10 flex items-center justify-center text-white text-lg mb-3`', '`w-8 h-8 rounded-md bg-neutral-900 dark:bg-white/10 flex items-center justify-center text-white text-sm mb-2`')
$c = $c.Replace('"text-center mb-6"', '"text-center mb-4"')

# Method card stats
$c = $c.Replace('"space-y-3 mb-6"', '"space-y-2 mb-4"')
$c = $c.Replace('"text-sm text-slate-500 dark:text-slate-400">{t("REVENUE_POTENTIAL")}', '"text-xs text-slate-500 dark:text-slate-400">{t("REVENUE_POTENTIAL")}')
$c = $c.Replace('"text-sm text-slate-500 dark:text-slate-400">{t("SETUP_TIME")}', '"text-xs text-slate-500 dark:text-slate-400">{t("SETUP_TIME")}')
$c = $c.Replace('"text-sm text-slate-500 dark:text-slate-400">{t("DIFFICULTY")}', '"text-xs text-slate-500 dark:text-slate-400">{t("DIFFICULTY")}')
$c = $c.Replace('"font-semibold text-neutral-900 dark:text-white">{method.revenue}</span>', '"text-xs font-semibold text-neutral-900 dark:text-white">{method.revenue}</span>')
$c = $c.Replace('"font-semibold text-neutral-900 dark:text-white">{method.setupTime}</span>', '"text-xs font-semibold text-neutral-900 dark:text-white">{method.setupTime}</span>')

# Detailed header text-lg -> text-sm
$c = $c.Replace('"text-lg font-semibold text-slate-900 dark:text-white">' + "`r`n" + '                    {monetizationMethods', '"text-sm font-semibold text-slate-900 dark:text-white">' + "`r`n" + '                    {monetizationMethods')

# Detailed content p-6 -> p-4; gap-8 -> gap-4
$c = $c.Replace('<div className="p-6">' + "`r`n" + '              <div className="grid lg:grid-cols-2 gap-8">', '<div className="p-4">' + "`r`n" + '              <div className="grid lg:grid-cols-2 gap-4">')

# Remove colored spans in headings
$c = $c.Replace('className="text-blue-600">', 'className="">')
$c = $c.Replace('className="text-green-600">', 'className="">')
$c = $c.Replace('className="text-red-600">', 'className="">')

# headings: font-semibold mb-4 -> text-xs font-semibold mb-3
$c = $c.Replace('"font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2"', '"text-xs font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2"')

# Pros/Cons bullets
$c = $c.Replace('"w-2 h-2 bg-green-500 rounded-full"></div>' + "`r`n" + '                          {pro}', '"w-2 h-2 bg-neutral-400 dark:bg-neutral-500 rounded-full"></div>' + "`r`n" + '                          {pro}')
$c = $c.Replace('"w-2 h-2 bg-red-500 rounded-full"></div>' + "`r`n" + '                          {con}', '"w-2 h-2 bg-neutral-400 dark:bg-neutral-500 rounded-full"></div>' + "`r`n" + '                          {con}')

# Expanded details
$c = $c.Replace('"mt-8 pt-8 border-t', '"mt-6 pt-6 border-t')
$c = $c.Replace('"grid md:grid-cols-3 gap-6">', '"grid md:grid-cols-3 gap-4">')

# CTA
$c = $c.Replace('"bg-gray-50 dark:bg-white/3 rounded-xl p-8 border border-gray-100 dark:border-white/6">' + "`r`n" + '            <h3 className="text-lg font-semibold mb-3', '"bg-gray-50 dark:bg-white/3 rounded-xl p-6 border border-gray-100 dark:border-white/6">' + "`r`n" + '            <h3 className="text-base font-semibold mb-2')
$c = $c.Replace('"text-slate-600 dark:text-slate-400 text-sm mb-5 max-w-2xl mx-auto">' + "`r`n" + '              {t("START_MONETIZING_DESC")}', '"text-slate-600 dark:text-slate-400 text-xs mb-4 max-w-2xl mx-auto">' + "`r`n" + '              {t("START_MONETIZING_DESC")}')

[System.IO.File]::WriteAllText($f, $c)
Write-Host "monetization-section done"

# ==== support.tsx ====
$f = "$base\support.tsx"
$c = [System.IO.File]::ReadAllText($f)

# Header
$c = $c.Replace('<div className="mb-10">' + "`r`n" + '          <p className="text-xs font-medium uppercase tracking-widest text-neutral-400', '<div className="mb-6">' + "`r`n" + '          <p className="text-xs font-medium uppercase tracking-widest text-neutral-400')
$c = $c.Replace('"text-2xl font-semibold tracking-tight mb-2 text-neutral-900 dark:text-white">' + "`r`n" + '            {t("NEED_HELP")}', '"text-base font-semibold tracking-tight mb-2 text-neutral-900 dark:text-white">' + "`r`n" + '            {t("NEED_HELP")}')
$c = $c.Replace('"text-neutral-500 dark:text-neutral-400 text-sm max-w-2xl leading-relaxed">' + "`r`n" + '            {t("NEED_HELP_DESC")}', '"text-neutral-500 dark:text-neutral-400 text-xs max-w-2xl leading-relaxed">' + "`r`n" + '            {t("NEED_HELP_DESC")}')

# Dashboard header text-lg -> text-sm
$c = $c.Replace('"text-lg font-semibold text-slate-900 dark:text-white">' + "`r`n" + '                  Support Dashboard', '"text-sm font-semibold text-slate-900 dark:text-white">' + "`r`n" + '                  Support Dashboard')

# Tabs px-4 py-2 text-sm -> px-3 py-1.5 text-xs
$c = $c.Replace('flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md', 'flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md')

# Tab container p-6 -> p-4
$c = $c.Replace('<div className="p-6">' + "`r`n" + '            {activeTab === ''channels''', '<div className="p-4">' + "`r`n" + '            {activeTab === ''channels''')

# Channels
$c = $c.Replace('"space-y-6">' + "`r`n" + '                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">', '"space-y-4">' + "`r`n" + '                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">')
$c = $c.Replace('"bg-slate-50 dark:bg-white/3 rounded-xl p-5 border border-slate-200 dark:border-white/6 hover:border-slate-300 dark:hover:border-white/8 transition-colors duration-200"', '"bg-slate-50 dark:bg-white/3 rounded-lg p-4 border border-slate-200 dark:border-white/6 hover:border-slate-300 dark:hover:border-white/8 transition-colors duration-200"')
$c = $c.Replace('`w-10 h-10 rounded-lg bg-neutral-900 dark:bg-white/10 flex items-center justify-center text-white text-lg`', '`w-8 h-8 rounded-md bg-neutral-900 dark:bg-white/10 flex items-center justify-center text-white text-sm`')
$c = $c.Replace('`font-bold text-lg text-neutral-900 dark:text-white`', '`font-semibold text-sm text-neutral-900 dark:text-white`')
$c = $c.Replace('"flex items-start justify-between mb-4">' + "`r`n" + '                        <div className="flex items-center gap-3">', '"flex items-start justify-between mb-3">' + "`r`n" + '                        <div className="flex items-center gap-3">')
$c = $c.Replace('"text-slate-600 dark:text-slate-400 text-sm mb-4">' + "`r`n" + '                        {channel.description}', '"text-slate-600 dark:text-slate-400 text-xs mb-3">' + "`r`n" + '                        {channel.description}')
$c = $c.Replace('"grid grid-cols-2 gap-4 mb-4">', '"grid grid-cols-2 gap-3 mb-3">')
$c = $c.Replace('"mb-4">' + "`r`n" + '                        <h5 className="text-xs font-semibold', '"mb-3">' + "`r`n" + '                        <h5 className="text-xs font-semibold')

# FAQ items
$c = $c.Replace('"space-y-4">' + "`r`n" + '                  {filteredFAQ.map', '"space-y-3">' + "`r`n" + '                  {filteredFAQ.map')
$c = $c.Replace('"bg-slate-50 dark:bg-white/3 rounded-xl p-6 border border-slate-200 dark:border-white/6 hover:border-slate-300 dark:hover:border-white/8 transition-all duration-300"', '"bg-slate-50 dark:bg-white/3 rounded-lg p-4 border border-slate-200 dark:border-white/6 hover:border-slate-300 dark:hover:border-white/8 transition-all duration-300"')
$c = $c.Replace('"font-semibold text-slate-900 dark:text-white mb-3">' + "`r`n" + '                        {item.question}', '"text-sm font-semibold text-slate-900 dark:text-white mb-2">' + "`r`n" + '                        {item.question}')

# Chat user bubble bg-indigo-600 -> neutral
$c = $c.Replace("? 'bg-indigo-600 text-white'", "? 'bg-neutral-900 dark:bg-white/80 text-white dark:text-neutral-900'")
$c = $c.Replace('focus:ring-indigo-500', 'focus:ring-neutral-900 dark:focus:ring-white/40')
$c = $c.Replace('"h-9 px-3 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"', '"h-9 px-3 text-sm font-medium bg-neutral-900 hover:bg-neutral-700 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 rounded-lg transition-colors"')

# Empty chat state
$c = $c.Replace('"text-6xl mb-4">', '"text-4xl mb-3">')
$c = $c.Replace('"text-xl font-semibold text-slate-900 dark:text-white mb-2">', '"text-sm font-semibold text-slate-900 dark:text-white mb-2">')

# Bottom CTA
$c = $c.Replace('"mt-16 text-center">', '"mt-8 text-center">')
$c = $c.Replace('"bg-gray-50 dark:bg-white/3 rounded-xl p-8 border border-gray-100 dark:border-white/6">' + "`r`n" + '            <h3 className="text-lg font-semibold mb-3', '"bg-gray-50 dark:bg-white/3 rounded-xl p-6 border border-gray-100 dark:border-white/6">' + "`r`n" + '            <h3 className="text-base font-semibold mb-2')
$c = $c.Replace('"text-slate-600 dark:text-slate-400 text-sm mb-5 max-w-2xl mx-auto">' + "`r`n" + '              Our support team', '"text-slate-600 dark:text-slate-400 text-xs mb-4 max-w-2xl mx-auto">' + "`r`n" + '              Our support team')

[System.IO.File]::WriteAllText($f, $c)
Write-Host "support done"

# ==== process-explanation.tsx ====
$f = "$base\process-explanation.tsx"
$c = [System.IO.File]::ReadAllText($f)

# Header
$c = $c.Replace('"text-xl font-semibold tracking-tight text-neutral-900 dark:text-white mb-2">', '"text-base font-semibold tracking-tight text-neutral-900 dark:text-white mb-2">')

# Progress bar
$c = $c.Replace('"mb-12">', '"mb-8">')
$c = $c.Replace('"text-sm font-medium text-slate-700 dark:text-slate-300">' + "`r`n" + '            Overall Progress', '"text-xs font-medium text-slate-500 dark:text-slate-400">' + "`r`n" + '            Overall Progress')
$c = $c.Replace('"text-sm font-bold text-neutral-900 dark:text-white">' + "`r`n" + '            {Math.round(progress)}%', '"text-xs font-semibold text-neutral-900 dark:text-white">' + "`r`n" + '            {Math.round(progress)}%')
$c = $c.Replace('"w-full bg-slate-200 dark:bg-white/8 rounded-full h-1.5 overflow-hidden"', '"w-full bg-slate-200 dark:bg-white/8 rounded-full h-1 overflow-hidden"')
$c = $c.Replace('"bg-theme-primary-500 h-full rounded-full transition-all duration-1000 ease-out"', '"bg-neutral-900 dark:bg-white h-full rounded-full transition-all duration-1000 ease-out"')

# Timeline
$c = $c.Replace('"space-y-8">', '"space-y-5">')

# Step card
$c = $c.Replace('`ml-16 bg-white dark:bg-white/3 rounded-xl p-5 border', '`ml-16 bg-white dark:bg-white/3 rounded-lg p-4 border')
$c = $c.Replace('"flex items-start justify-between mb-4">' + "`r`n" + '                    <div className="flex items-center gap-4">', '"flex items-start justify-between mb-3">' + "`r`n" + '                    <div className="flex items-center gap-3">')
$c = $c.Replace('`w-10 h-10 rounded-lg bg-neutral-900 dark:bg-white/10 flex items-center justify-center text-white text-base`', '`w-8 h-8 rounded-md bg-neutral-900 dark:bg-white/10 flex items-center justify-center text-white text-sm`')
$c = $c.Replace('`text-lg font-bold mb-1 text-neutral-900 dark:text-white`', '`text-sm font-semibold mb-1 text-neutral-900 dark:text-white`')
$c = $c.Replace('"text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">', '"text-slate-600 dark:text-slate-400 text-xs mb-3 leading-relaxed">')

# Active step details
$c = $c.Replace('`mt-6 pt-6 border-t border-slate-200 dark:border-white/6 transition-all duration-300 ${', '`mt-4 pt-4 border-t border-slate-200 dark:border-white/6 transition-all duration-300 ${')
$c = $c.Replace('"grid md:grid-cols-2 gap-6">', '"grid md:grid-cols-2 gap-4">')

# Tips bullet green -> neutral
$c = $c.Replace('"w-2 h-2 bg-green-500 rounded-full"></div>' + "`r`n" + '                                {tip}', '"w-2 h-2 bg-neutral-400 dark:bg-neutral-500 rounded-full"></div>' + "`r`n" + '                                {tip}')

# Action buttons, CTA
$c = $c.Replace('"flex gap-2 mt-5">', '"flex gap-2 mt-3">')
$c = $c.Replace('"mt-12 text-center">', '"mt-8 text-center">')

[System.IO.File]::WriteAllText($f, $c)
Write-Host "process-explanation done"

# ==== technology-card.tsx ====
$f = "$base\technology-card.tsx"
$c = [System.IO.File]::ReadAllText($f)

# Remove yellow ring
$c = $c.Replace('      ring: "ring-2 ring-yellow-400 dark:ring-yellow-500 ring-opacity-50",', '      ring: "",')

# Main card p-6 -> p-4; gap-4 mb-4 -> gap-3 mb-3
$c = $c.Replace('"p-6">' + "`r`n" + '        {/* Header */}' + "`r`n" + '        <div className="flex items-start gap-4 mb-4">', '"p-4">' + "`r`n" + '        {/* Header */}' + "`r`n" + '        <div className="flex items-start gap-3 mb-3">')

# Expanded: mt-6 pt-6 -> mt-4 pt-4
$c = $c.Replace('"mt-6 pt-6 border-t border-slate-200 dark:border-white/6">', '"mt-4 pt-4 border-t border-slate-200 dark:border-white/6">')

# Remove colored spans from headings
$c = $c.Replace('className="text-blue-600">', 'className="">')
$c = $c.Replace('className="text-green-600">', 'className="">')
$c = $c.Replace('className="text-red-600">', 'className="">')
$c = $c.Replace('className="text-purple-600">', 'className="">')

# Pros/Cons headings font-semibold -> text-xs font-semibold
$c = $c.Replace('"font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">', '"text-xs font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">')
$c = $c.Replace('"font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">', '"text-xs font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">')

# Bullet colors -> neutral
$c = $c.Replace('"w-1.5 h-1.5 bg-green-500 rounded-full">', '"w-1.5 h-1.5 bg-neutral-400 dark:bg-neutral-500 rounded-full">')
$c = $c.Replace('"w-1.5 h-1.5 bg-red-500 rounded-full">', '"w-1.5 h-1.5 bg-neutral-400 dark:bg-neutral-500 rounded-full">')

# List items text-sm -> text-xs
$c = $c.Replace('"flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">', '"flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">')

[System.IO.File]::WriteAllText($f, $c)
Write-Host "technology-card done"
Write-Host "ALL DONE"
