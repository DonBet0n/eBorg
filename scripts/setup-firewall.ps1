# Перевіряємо чи запущено з правами адміністратора
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "Цей скрипт потребує прав адміністратора. Будь ласка, запустіть PowerShell від імені адміністратора." -ForegroundColor Red
    Exit 1
}

# Видаляємо всі старі правила
Remove-NetFirewallRule -DisplayName "Expo*" -ErrorAction SilentlyContinue
Remove-NetFirewallRule -DisplayName "Node.js*" -ErrorAction SilentlyContinue

try {
    # Знаходимо шляхи до виконуваних файлів
    $nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
    $npmPath = (Get-Command npm -ErrorAction SilentlyContinue).Source
    $npxPath = (Get-Command npx -ErrorAction SilentlyContinue).Source

    # Додаємо правила для Node.js
    if ($nodePath) {
        New-NetFirewallRule -DisplayName "Node.js (in)" -Direction Inbound -Program $nodePath -Action Allow -Profile Private,Domain
        New-NetFirewallRule -DisplayName "Node.js (out)" -Direction Outbound -Program $nodePath -Action Allow -Profile Private,Domain
    }

    # Додаємо правила для npm
    if ($npmPath) {
        New-NetFirewallRule -DisplayName "npm (in)" -Direction Inbound -Program $npmPath -Action Allow -Profile Private,Domain
        New-NetFirewallRule -DisplayName "npm (out)" -Direction Outbound -Program $npmPath -Action Allow -Profile Private,Domain
    }

    # Додаємо правила для npx
    if ($npxPath) {
        New-NetFirewallRule -DisplayName "npx (in)" -Direction Inbound -Program $npxPath -Action Allow -Profile Private,Domain
        New-NetFirewallRule -DisplayName "npx (out)" -Direction Outbound -Program $npxPath -Action Allow -Profile Private,Domain
    }

    # Додаємо правила для портів
    $ports = @(8081, 19000, 19001, 19002, 19003, 19004, 19005, 19006)

    foreach ($port in $ports) {
        New-NetFirewallRule -DisplayName "Expo Port $port (in)" `
            -Direction Inbound `
            -Protocol TCP `
            -LocalPort $port `
            -Action Allow `
            -Profile Private,Domain

        New-NetFirewallRule -DisplayName "Expo Port $port (out)" `
            -Direction Outbound `
            -Protocol TCP `
            -LocalPort $port `
            -Action Allow `
            -Profile Private,Domain
    }

    # Додаємо правило для всього процесу Node.js
    New-NetFirewallRule -DisplayName "Node.js All Traffic" `
        -Direction Inbound `
        -Protocol TCP `
        -LocalPort Any `
        -Program "$env:ProgramFiles\nodejs\node.exe" `
        -Action Allow `
        -Profile Private,Domain

    Write-Host "Правила брандмауера успішно створені." -ForegroundColor Green
    
    # Показуємо інформацію про створені правила
    Write-Host "`nСтворені правила для програм:"
    if ($nodePath) { Write-Host "Node.js: $nodePath" }
    if ($npmPath) { Write-Host "npm: $npmPath" }
    if ($npxPath) { Write-Host "npx: $npxPath" }

} catch {
    Write-Host "Помилка при створенні правил брандмауера: $_" -ForegroundColor Red
    Exit 1
}
