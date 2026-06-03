# Script d'installation de Docker Desktop sur Windows

Write-Host "Installation de Docker Desktop..." -ForegroundColor Green

# Vérifier si Windows Package Manager (winget) est disponible
$wingetPath = (Get-Command winget -ErrorAction SilentlyContinue).Source

if ($null -eq $wingetPath) {
    Write-Host "Winget n'est pas disponible. Téléchargement manuel de Docker Desktop..." -ForegroundColor Yellow
    # Télécharger depuis le site officiel
    $dockerUrl = "https://desktop.docker.com/win/stable/Docker%20Desktop%20Installer.exe"
    $downloadPath = "$env:TEMP\DockerInstaller.exe"
    
    Write-Host "Téléchargement en cours..." -ForegroundColor Cyan
    Invoke-WebRequest -Uri $dockerUrl -OutFile $downloadPath
    
    Write-Host "Installation en cours..." -ForegroundColor Cyan
    & $downloadPath install --quiet
    
    Write-Host "Docker Desktop a été installé. Veuillez redémarrer votre ordinateur." -ForegroundColor Green
} else {
    Write-Host "Winget trouvé. Installation de Docker Desktop..." -ForegroundColor Green
    winget install -e --id Docker.DockerDesktop
    Write-Host "Docker Desktop a été installé. Veuillez redémarrer votre ordinateur." -ForegroundColor Green
}
