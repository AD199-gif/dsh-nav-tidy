#requires -Version 5.1
<#
.SYNOPSIS
  Sync this checkout into an installed profile (for developing against a live dsh).
.DESCRIPTION
  `dsh plugin add file:<this dir>` may hard-link the files into the profile, so a
  rewritten source file can end up as two independent copies — and Copy-Item onto
  the linked one fails with "cannot overwrite the item with itself". This script
  copies through a temporary file and Move-Item, and skips files whose hash already
  matches.
.EXAMPLE
  pwsh -File scripts/dev-sync.ps1 -Profile "$env:USERPROFILE\.dsh\profiles\desktop"
#>
[CmdletBinding()]
param(
  [string]$Profile = (Join-Path $env:USERPROFILE '.dsh\profiles\desktop')
)

$ErrorActionPreference = 'Stop'
$src = Split-Path $PSScriptRoot -Parent
$dst = Join-Path $Profile 'node_modules\dsh-nav-tidy'

if (-not (Test-Path $dst)) {
  throw "dsh-nav-tidy is not installed in $Profile — run: dsh plugin --profile <name> add file:$src"
}

foreach ($item in @('lib\index.js', 'lib\client.js', 'package.json', 'cordis.patch.yml')) {
  $from = Join-Path $src $item
  if (-not (Test-Path $from)) { continue }
  $to = Join-Path $dst $item
  $parent = Split-Path $to -Parent
  if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent | Out-Null }

  if ((Test-Path $to) -and ((Get-FileHash $from).Hash -eq (Get-FileHash $to).Hash)) {
    Write-Host "  skip   $item (identical)"
    continue
  }

  $tmp = "$to.navtidy-new"
  Copy-Item $from $tmp -Force
  Move-Item $tmp $to -Force
  Write-Host "  synced $item"
}

Write-Host ''
Write-Host 'Done. Restart dsh — the host snapshots client bundles at startup.'
