$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$destination = $args[0]
if (-not $destination) { throw 'Brak folderu instalacji.' }
$temporary = Join-Path ([IO.Path]::GetTempPath()) ('minverse-' + [guid]::NewGuid())
try {
    New-Item -ItemType Directory -Path $temporary | Out-Null
    # Resolve both assets from one release, so a concurrent publication cannot mix them.
    $release = Invoke-RestMethod -Uri 'https://api.github.com/repos/ignacy12tul-byte/launcher/releases/latest' -Headers @{ 'User-Agent' = 'minverse-installer' }
    $asset = @($release.assets | Where-Object name -eq 'Launcher.exe')
    $checksum = @($release.assets | Where-Object name -eq 'Launcher.exe.sha256')
    if ($asset.Count -ne 1 -or $checksum.Count -ne 1) { throw 'Wydanie nie zawiera Launcher.exe i Launcher.exe.sha256.' }
    foreach ($url in @($asset[0].browser_download_url, $checksum[0].browser_download_url)) {
        if (-not $url.StartsWith('https://github.com/ignacy12tul-byte/launcher/releases/download/', [StringComparison]::Ordinal)) { throw 'Nieprawidlowy adres wydania.' }
    }
    $file = Join-Path $temporary 'Launcher.exe'
    Invoke-WebRequest -UseBasicParsing -Uri $asset[0].browser_download_url -OutFile $file
    $hashContent = (Invoke-WebRequest -UseBasicParsing -Uri $checksum[0].browser_download_url).Content
    if ($hashContent -is [byte[]]) { $hashContent = [Text.Encoding]::UTF8.GetString($hashContent) }
    $expected = ([string]$hashContent).Trim().Split([char[]]" `t`r`n", [StringSplitOptions]::RemoveEmptyEntries)[0]
    if ($expected -notmatch '^[a-fA-F0-9]{64}$') { throw 'Nieprawidlowy plik SHA256.' }
    if ((Get-FileHash -Algorithm SHA256 $file).Hash -ne $expected) { throw 'Blad integralnosci SHA256. Instalacja przerwana.' }
    $bytes = [IO.File]::ReadAllBytes($file)
    if ($bytes.Length -lt 1024 -or $bytes[0] -ne 77 -or $bytes[1] -ne 90) { throw 'Pobrany plik nie jest programem Windows.' }
    New-Item -ItemType Directory -Path $destination -Force | Out-Null
    # Copy to the target volume before the final rename. Preserve an existing install on failure.
    $pending = Join-Path $destination 'Launcher.pending.exe'
    Copy-Item $file $pending -Force
    $target = Join-Path $destination 'Launcher.exe'
    if (Test-Path $target) { [IO.File]::Replace($pending, $target, $null) }
    else { [IO.File]::Move($pending, $target) }
    Write-Output 'Launcher zostal pobrany i zweryfikowany.'
    exit 0
} catch {
    Write-Output $_.Exception.Message
    exit 1
} finally {
    if (Test-Path $temporary) { Remove-Item $temporary -Recurse -Force }
}
