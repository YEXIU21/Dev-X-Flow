<#
.SYNOPSIS
    CYBER-MYSQL MASTER TOOL v2.0
    Universal Database Management Utility with Futuristic UI

.DESCRIPTION
    A powerful, universal tool for MySQL management in XAMPP/Windows environments.
    Features:
    - Dynamic Database Selection (Works with ANY local database)
    - Dynamic SQL File Selection (Pick any dump file)
    - Modern "Cyber" UI (Colors, ASCII Art, Progress Bars)
    - Selective Restoration & Full Reinstallation

.NOTES
    Updated: 2026-01-31
#>

$ErrorActionPreference = "Stop"

# --- Configuration ---
$DB_HOST = "127.0.0.1"
$DB_USER = "root"
$DefaultExportDir = "db_exports_txt"

# Search for mysql in path or standard locations if not found
if (!(Get-Command mysql -ErrorAction SilentlyContinue)) {
    $env:Path += ";C:\xampp\mysql\bin"
}

# --- UI Theme Functions ---

function Draw-Line {
    param ([string]$Color = "Cyan")
    Write-Host "================================================================================" -ForegroundColor $Color
}

function Show-Cyber-Header {
    Clear-Host
    $titleColor = "Magenta"
    $borderColor = "Cyan"
    
    Draw-Line -Color $borderColor
    Write-Host "   __  __  __  __  _____   ____   __      __  __  __           _____ " -ForegroundColor $titleColor
    Write-Host "  |  \/  | \ \/ / / ____|  / __ \ \ \    / / |  \/  |    /\   |_   _|" -ForegroundColor $titleColor
    Write-Host "  | \  / |  \  / | (___   | |  | | \ \  / /  | \  / |   /  \    | |  " -ForegroundColor $titleColor
    Write-Host "  | |\/| |   | |   \___ \ | |  | |  \ \/ /   | |\/| |  / /\ \   | |  " -ForegroundColor $titleColor
    Write-Host "  | |  | |   | |   ____) || |__| |   \  /    | |  | | / ____ \ _| |_ " -ForegroundColor $titleColor
    Write-Host "  |_|  |_|   |_|  |_____/  \___\_\    \/     |_|  |_|/_/    \_\_____|" -ForegroundColor $titleColor
    Write-Host ""
    
    Draw-Line -Color $borderColor
    Write-Host "   SYSTEM: ONLINE   |   USER: $DB_USER   |   HOST: $DB_HOST   |   TIME: $(Get-Date -Format 'HH:mm')" -ForegroundColor Green
    
    if ($global:CURRENT_DB) {
        Write-Host "   ACTIVE TARGET DATABASE  >>  " -NoNewline -ForegroundColor Yellow
        Write-Host "$global:CURRENT_DB" -ForegroundColor White -BackgroundColor DarkMagenta
    } else {
         Write-Host "   ACTIVE TARGET DATABASE  >>  " -NoNewline -ForegroundColor Yellow
         Write-Host "NONE SELECTED" -ForegroundColor Red
    }
    Draw-Line -Color $borderColor
    Write-Host ""
}

function Show-Spinner {
    param ([string]$Activity = "Processing")
    $chars = @("|", "/", "-", "\")
    for ($i = 0; $i -lt 10; $i++) {
        foreach ($c in $chars) {
            Write-Host -NoNewline "`r[$c] $Activity..." -ForegroundColor Yellow
            Start-Sleep -Milliseconds 50
        }
    }
    Write-Host "`r[+] $Activity... DONE      " -ForegroundColor Green
}

# --- Core Logic Functions ---

function Get-Database-List {
    $dbs = mysql -h $DB_HOST -u $DB_USER -N -e "SHOW DATABASES;"
    # Filter out system DBs if desired, or keep them. Let's filter slightly to reduce noise.
    $dbs = $dbs | Where-Object { $_ -notin @("information_schema", "performance_schema", "mysql", "phpmyadmin", "sys") }
    return $dbs
}

function Select-Target-Database {
    Show-Cyber-Header
    Write-Host "AVAILABLE DATA CHANNELS" -ForegroundColor Yellow
    Write-Host "-----------------------"
    
    $dbs = Get-Database-List
    $i = 1
    foreach ($db in $dbs) {
        Write-Host " [$i] $db" -ForegroundColor Cyan
        $i++
    }
    
    Write-Host ""
    $choice = Read-Host "Select Database Channel (Number)"
    
    if ($choice -match '^\d+$') {
        $idx = [int]$choice
        if ($idx -ge 1 -and $idx -le $dbs.Count) {
             $global:CURRENT_DB = $dbs[$idx - 1]
             return
        }
    }
    
    Write-Host "Invalid Selection." -ForegroundColor Red
    Start-Sleep -Seconds 1
}

function Select-Input-File {
    $files = Get-ChildItem -Filter *.sql
    if ($files.Count -eq 0) {
        Write-Host "No .sql artifacts found in current sector." -ForegroundColor Red
        return $null
    }

    Write-Host "AVAILABLE DATA ARTIFACTS (.sql)" -ForegroundColor Yellow
    Write-Host "-------------------------------"
    $i = 1
    foreach ($f in $files) {
        Write-Host " [$i] $($f.Name)  " -NoNewline -ForegroundColor Cyan
        Write-Host "($([math]::Round($f.Length / 1MB, 2)) MB)" -ForegroundColor DarkGray
        $i++
    }
    
    Write-Host ""
    $choice = Read-Host "Select Artifact (Number)"
    
    if ($choice -match '^\d+$') {
        $idx = [int]$choice
        if ($idx -ge 1 -and $idx -le $files.Count) {
            return $files[$idx - 1].FullName
        }
    }
    return $null
}

function View-Status {
    if (!$global:CURRENT_DB) { Select-Target-Database; if (!$global:CURRENT_DB) { return } }
    
    Show-Cyber-Header
    Write-Host "SCANNING SCHEMA: $global:CURRENT_DB" -ForegroundColor Yellow
    
    $query = "SELECT table_name, table_rows, round(((data_length + index_length) / 1024 / 1024), 2) as 'size_mb' FROM information_schema.tables WHERE table_schema = '$global:CURRENT_DB' ORDER BY table_name;"
    
    mysql -h $DB_HOST -u $DB_USER -t -e "$query"
    
    Write-Host ""
    Read-Host "Press Enter to return to Command Deck..."
}

function Export-To-Txt {
    if (!$global:CURRENT_DB) { Select-Target-Database; if (!$global:CURRENT_DB) { return } }
    
    Show-Cyber-Header
    $exportPath = Join-Path $PWD "$DefaultExportDir\_$global:CURRENT_DB"
    if (!(Test-Path $exportPath)) { New-Item -ItemType Directory -Force -Path $exportPath | Out-Null }
    
    Write-Host "INITIATING DATA EXTRACTION PROTOCOL..." -ForegroundColor Magenta
    
    $tables = mysql -h $DB_HOST -u $DB_USER -D $global:CURRENT_DB -N -e "SHOW TABLES;"
    
    foreach ($table in $tables) {
        if ([string]::IsNullOrWhiteSpace($table)) { continue }
        Write-Host " > Extracting Entity: " -NoNewline -ForegroundColor Cyan
        Write-Host "$table" -ForegroundColor White
        
        $outFile = Join-Path $exportPath "$table.txt"
        "=== SCHEMA DEFINITION ==`n" | Out-File $outFile -Encoding UTF8
        mysql -h $DB_HOST -u $DB_USER -D $global:CURRENT_DB -e "SHOW CREATE TABLE $table\G" | Out-File $outFile -Append -Encoding UTF8
        
        "`n=== DATA SAMPLE (First 50 R) ==`n" | Out-File $outFile -Append -Encoding UTF8
        mysql -h $DB_HOST -u $DB_USER -D $global:CURRENT_DB -e "SELECT * FROM $table LIMIT 50\G" | Out-File $outFile -Append -Encoding UTF8
    }
    
    Show-Spinner -Activity "Finalizing Output"
    Write-Host "Extraction Complete. Data secured in: $exportPath" -ForegroundColor Green
    Invoke-Item $exportPath
    Pause
}

function Selective-Restore {
    Show-Cyber-Header
    
    # 1. Select SQL File
    $sqlFile = Select-Input-File
    if (!$sqlFile) { return }
    
    # 2. Select Database (Target)
    if (!$global:CURRENT_DB) { Select-Target-Database; if (!$global:CURRENT_DB) { return } }
    
    Show-Cyber-Header
    Write-Host "TARGET: $global:CURRENT_DB" -ForegroundColor Yellow
    Write-Host "SOURCE: $(Split-Path $sqlFile -Leaf)" -ForegroundColor Yellow
    Write-Host "Scanning Source for Table definitions..." -ForegroundColor DarkGray
    
    # Scan file
    $matches = Select-String -Path $sqlFile -Pattern "CREATE TABLE \`?([a-zA-Z0-9_]+)\`?"
    $tables = @()
    $matches | ForEach-Object {
        if ($_.Line -match "CREATE TABLE \`?([a-zA-Z0-9_]+)\`?") {
            $tables += [PSCustomObject]@{ Name = $matches[0].Groups[1].Value; Line = $_.LineNumber }
        }
    }
    
    if ($tables.Count -eq 0) { Write-Host "No tables detected in source." -ForegroundColor Red; Pause; return }

    # Display List
    Write-Host "`nDETECTED TABLES:" -ForegroundColor Cyan
    $i = 1
    foreach ($t in $tables) {
        Write-Host " [$i] $($t.Name)"
        $i++
    }
    
    $choice = Read-Host "`nEnter ID of Table to INJECT (0 to Cancel)"
    
    if ($choice -match '^\d+$') {
         $idx = [int]$choice
         if ($idx -eq 0 -or $idx -gt $tables.Count) { return }
         $selectedTable = $tables[$idx - 1]
    } else {
         return
    }
    
    Write-Host "`nWARNING: This will DROP '$($selectedTable.Name)' in '$global:CURRENT_DB' and replace it." -ForegroundColor Red -BackgroundColor Yellow
    $confirm = Read-Host "Type 'YES' to Execute"
    if ($confirm -ne 'YES') { return }
    
    # Extraction Logic
    $startLine = $selectedTable.Line
    $nextTableIndex = $choice
    $endLine = $null
    
    Show-Spinner -Activity "Extracting Data Stream"
    
    $tempSql = "temp_inject.sql"
    
    if ($nextTableIndex -lt $tables.Count) {
        $count = $tables[$nextTableIndex].Line - 1 - $startLine + 1
        Get-Content $sqlFile | Select-Object -Skip ($startLine - 1) -First $count | Set-Content $tempSql
    } else {
        Get-Content $sqlFile | Select-Object -Skip ($startLine - 1) | Set-Content $tempSql
    }
    
    # Prepend Drop
    "DROP TABLE IF EXISTS $($selectedTable.Name);`n" + (Get-Content $tempSql -Raw) | Set-Content $tempSql
    
    Show-Spinner -Activity "Injecting into Matrix"
    cmd /c "mysql -h $DB_HOST -u $DB_USER -D $global:CURRENT_DB < $tempSql"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "INJECTION SUCCESSFUL." -ForegroundColor Green
    } else {
        Write-Host "INJECTION FAILED." -ForegroundColor Red
    }
    
    Remove-Item $tempSql -ErrorAction SilentlyContinue
    Pause
}

function Full-Reinstall {
    Show-Cyber-Header
    
    $sqlFile = Select-Input-File
    if (!$sqlFile) { return }
    
    # Ask for Target DB Name (Manual entry allows creating NEW db)
    Write-Host "`nEnter TARGET Database Name." -ForegroundColor Yellow
    Write-Host "If it exists, it will be WIPED. If not, it will be CREATED." -ForegroundColor Gray
    
    $targetDB = Read-Host "Database Name (e.g., slc_db)"
    if ([string]::IsNullOrWhiteSpace($targetDB)) { return }
    
    Write-Host "`nCRITICAL WARNING: NUCLEAR OPTION INITIATED." -ForegroundColor Red -BackgroundColor Yellow
    Write-Host "Target '$targetDB' will be completely destroyed and rebuilt from $(Split-Path $sqlFile -Leaf)." -ForegroundColor Red
    $confirm = Read-Host "Type 'EXECUTE' to confirm"
    
    if ($confirm -eq 'EXECUTE') {
        Show-Spinner -Activity "Dropping & Recreating Database"
        mysql -h $DB_HOST -u $DB_USER -e "DROP DATABASE IF EXISTS $targetDB; CREATE DATABASE $targetDB;"
        
        Write-Host "Importing massive data stream... Standby..." -ForegroundColor Yellow
        cmd /c "mysql -h $DB_HOST -u $DB_USER $targetDB < `"$sqlFile`""
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`nSYSTEM RESTORED SUCCESSFULLY." -ForegroundColor Green
            $global:CURRENT_DB = $targetDB
        } else {
            Write-Host "`nSYSTEM RESTORE FAILED." -ForegroundColor Red
        }
    }
    Pause
}

# --- Main Command Deck ---

# Initialize global var
$global:CURRENT_DB = $null

do {
    Show-Cyber-Header
    Write-Host "COMMAND DECK" -ForegroundColor Yellow
    Write-Host "------------"
    Write-Host " [1] SELECT TARGET DATABASE   " -NoNewline -ForegroundColor White; Write-Host "(Switch Channel)" -ForegroundColor DarkGray
    Write-Host " [2] SYSTEM STATUS            " -NoNewline -ForegroundColor White; Write-Host "(View Tables/Sizes)" -ForegroundColor DarkGray
    Write-Host " [3] EXPORT DATA              " -NoNewline -ForegroundColor White; Write-Host "(Dump to Text)" -ForegroundColor DarkGray
    Write-Host " [4] SURGICAL RESTORE         " -NoNewline -ForegroundColor White; Write-Host "(Restore Specific Table)" -ForegroundColor DarkGray
    Write-Host " [5] FACTORY RESET            " -NoNewline -ForegroundColor White; Write-Host "(Full Reinstall)" -ForegroundColor DarkGray
    Write-Host " [Q] TERMINATE LINK" -ForegroundColor Red
    Write-Host ""
    
    $selection = Read-Host "Awaiting Command"
    
    switch ($selection) {
        '1' { Select-Target-Database }
        '2' { View-Status }
        '3' { Export-To-Txt }
        '4' { Selective-Restore }
        '5' { Full-Reinstall }
        'q' { Clear-Host; Write-Host "Connection Terminated." -ForegroundColor Red; exit }
        'Q' { Clear-Host; Write-Host "Connection Terminated." -ForegroundColor Red; exit }
    }
} while ($true)
