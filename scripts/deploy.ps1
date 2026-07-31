$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

python scripts/validate_site.py
if ($LASTEXITCODE -ne 0) {
    throw "Website validation failed."
}

node --check js/main.js
if ($LASTEXITCODE -ne 0) {
    throw "JavaScript syntax validation failed."
}

$status = git status --porcelain
if ($status) {
    throw "Commit all changes before deploying."
}

git push origin main
if ($LASTEXITCODE -ne 0) {
    throw "Could not push the main branch."
}

git push origin main:gh-pages
if ($LASTEXITCODE -ne 0) {
    throw "Could not update the GitHub Pages branch."
}

Write-Output "Deployment submitted: https://salesio.github.io/navigator-consulting/"

