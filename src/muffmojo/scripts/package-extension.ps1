$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Resolve-Path (Join-Path $scriptDir "..\..\..")
$distRoot = Join-Path $projectRoot "dist"
$extensionRoot = Join-Path $distRoot "extension"

if (Test-Path $extensionRoot) {
  Remove-Item $extensionRoot -Recurse -Force
}

New-Item -ItemType Directory -Path $extensionRoot | Out-Null
New-Item -ItemType Directory -Path (Join-Path $extensionRoot "src\muffmojo\data") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $extensionRoot "src\muffmojo\utils") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $extensionRoot "src\muffmojo\website") -Force | Out-Null

$rootFiles = @(
  "manifest.json",
  "content.js",
  "popup.html",
  "popup.css",
  "popup.js",
  "bgremoved.png",
  "README.md"
)

foreach ($file in $rootFiles) {
  Copy-Item (Join-Path $projectRoot $file) (Join-Path $extensionRoot $file) -Force
}

$srcFiles = @(
  "src\muffmojo\data\emoji-dataset.js",
  "src\muffmojo\data\emoji-source-gemoji.json",
  "src\muffmojo\utils\fuzzySearch.js",
  "src\muffmojo\utils\emojiDataset.js",
  "src\muffmojo\utils\caretPositioning.js",
  "src\muffmojo\website\index.html",
  "src\muffmojo\website\styles.css"
)

foreach ($file in $srcFiles) {
  Copy-Item (Join-Path $projectRoot $file) (Join-Path $extensionRoot $file) -Force
}

Write-Output "Packaged extension to $extensionRoot"
