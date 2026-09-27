$ErrorActionPreference = "Stop"

Write-Warning "Legacy local/recovery launcher only. Canonical production is DataNest-managed."

if (-not $env:SUPABASE_URL) {
  $env:SUPABASE_URL = "https://sgqdmfgjbprsoqsmgigi.supabase.co"
}

if (-not $env:SUPABASE_PUBLISHABLE_KEY) {
  throw "SUPABASE_PUBLISHABLE_KEY is required. Set it in the current PowerShell session before starting Resonance DataNest."
}

if (-not (Test-Path ".next")) {
  npm install
  npm run check
  npm run build
}

npm start
