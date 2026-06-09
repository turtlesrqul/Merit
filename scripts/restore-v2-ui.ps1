$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot

$pairs = @(
  @{ Source = "app/globals.v2.css"; Target = "app/globals.css" },
  @{ Source = "components/app-shell.v2.tsx"; Target = "components/app-shell.tsx" },
  @{ Source = "components/projects/discovery-feed.v2.tsx"; Target = "components/projects/discovery-feed.tsx" },
  @{ Source = "components/projects/project-card.v2.tsx"; Target = "components/projects/project-card.tsx" },
  @{ Source = "components/profile/profile-studio.v2.tsx"; Target = "components/profile/profile-studio.tsx" },
  @{ Source = "app/home/page.v2.tsx"; Target = "app/home/page.tsx" },
  @{ Source = "app/profile/page.v2.tsx"; Target = "app/profile/page.tsx" },
  @{ Source = "app/projects/[projectId]/page.v2.tsx"; Target = "app/projects/[projectId]/page.tsx" }
)

foreach ($pair in $pairs) {
  $sourcePath = Join-Path $root $pair.Source
  $targetPath = Join-Path $root $pair.Target

  if (Test-Path -LiteralPath $sourcePath) {
    Copy-Item -LiteralPath $sourcePath -Destination $targetPath -Force
    Write-Host "Restored $($pair.Target)"
  } else {
    Write-Warning "Skipped missing backup: $($pair.Source)"
  }
}

Write-Host "V2 UI restore complete."
