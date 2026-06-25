param(
  [string]$SupabaseUrl = "https://cdhbfyqtubqnmgjdgkab.supabase.co",
  [string]$ServiceRoleKey = ""
)

if (-not $ServiceRoleKey) {
  $match = Get-Content -Path "$PSScriptRoot\..\.env.local" -ErrorAction SilentlyContinue | Select-String "SUPABASE_SERVICE_ROLE_KEY=(.+)" | Select-Object -First 1
  if ($match) { $ServiceRoleKey = $match.Matches.Groups[1].Value }
}

if (-not $ServiceRoleKey) {
  Write-Error "SUPABASE_SERVICE_ROLE_KEY no encontrada en .env.local"
  exit 1
}

$headers = @{
  "apikey" = $ServiceRoleKey
  "Authorization" = "Bearer $ServiceRoleKey"
  "Content-Type" = "application/json"
  "Prefer" = "return=minimal"
}

function Invoke-Supabase {
  param($Method, $Endpoint, $Body)
  $uri = "${SupabaseUrl}/rest/v1/${Endpoint}"
  try {
    $json = $Body | ConvertTo-Json -Depth 5
    $r = Invoke-RestMethod -Uri $uri -Method $Method -Headers $headers -Body $json -ErrorAction Stop
    return $r
  } catch {
    Write-Error "Error en ${Method} ${Endpoint}: $_"
    if ($_.Exception.Response) {
      $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
      Write-Error "Response: $($reader.ReadToEnd())"
    }
    throw
  }
}

$planAmateur = @{ id = "0dffdc41-d14b-40a4-bc95-43a2795c1de6"; nombre = "Plan Amateur"; precio = 10990; tokens = 4 }
$planPro = @{ id = "47b73746-4000-490d-a2d0-66d5dec0ab90"; nombre = "Plan Pro"; precio = 19990; tokens = 6 }
$planSeleccion = @{ id = "4865a952-5ac7-4bc8-997a-0280cb269ca2"; nombre = "Plan Selección"; precio = 29900; tokens = 12 }

$users = @(
  @{ id = "b9944865-6670-4455-ba37-bb8e76346435"; nombre = "Joaquin Lepe Segovia"; plan = $planAmateur; meses = @("2026-02-01","2026-03-01","2026-04-01","2026-05-01","2026-06-01") }
  @{ id = "7cabc9c7-3507-45e6-9c31-7ccdff347ab5"; nombre = "Alvaro Ulloa"; plan = $planPro; meses = @("2026-03-01","2026-04-01","2026-05-01","2026-06-01") }
  @{ id = "5b485829-b8ab-47d9-94d6-97e7e7b07ba0"; nombre = "joaquin Lepe Segovia"; plan = $planPro; meses = @("2026-04-01","2026-05-01","2026-06-01") }
  @{ id = "54c194a2-098b-4cf1-913d-a30d275266e7"; nombre = "Maickol Perez Jackson"; plan = $planAmateur; meses = @("2026-05-01","2026-06-01") }
  @{ id = "2d0b74da-ba2c-4ffd-bc41-924889b8143c"; nombre = "Vida Rodriguez Palacios"; plan = $planPro; meses = @("2026-06-01") }
  @{ id = "a9ea5d02-0bf2-45c9-8ee1-a80b5abbb7b8"; nombre = "Maickol Sebastian"; plan = $planSeleccion; meses = @("2026-05-01","2026-06-01") }
)

function Get-TokensUsados {
  param([string]$UserId, [string]$Mes, [int]$MaxTokens)
  $seed = ($UserId.GetHashCode() + $Mes.GetHashCode()) -band 0x7FFFFFFF
  $rng = [Random]::new($seed % 10000)
  $maxUsar = [Math]::Min($MaxTokens, 5)
  $minUsar = [Math]::Min(1, $maxUsar)
  $mesNum = [int]($Mes.Substring(5,2))
  if ($mesNum -le 2) { return $rng.Next(1, [Math]::Min(3, $maxUsar+1)) }
  if ($mesNum -le 4) { return $rng.Next(1, [Math]::Min(4, $maxUsar+1)) }
  return $rng.Next(2, [Math]::Min(6, $maxUsar+1))
}

function Get-BoletaDate {
  param([string]$Mes)
  $parts = $Mes -split "-"
  $year = $parts[0]; $month = $parts[1]; $day = $parts[2]
  $rng = [Random]::new([int]("${year}${month}") % 10000)
  $diaPago = $rng.Next(1, 8)
  $hora = $rng.Next(8, 20)
  $min = $rng.Next(0, 60)
  $seg = $rng.Next(0, 60)
  return "${year}-${month}-$($diaPago.ToString('00'))T$($hora.ToString('00')):$($min.ToString('00')):$($seg.ToString('00')).000000"
}

$transaccionCounter = 10001

# ── 1. Limpiar membresías existentes ──
Write-Host ">>> Limpiando membresías existentes..." -ForegroundColor Yellow
try {
  Invoke-Supabase -Method Delete -Endpoint "membresia" -Body @{}
  Write-Host "    OK membresias eliminadas" -ForegroundColor Green
} catch {
  Write-Host "    No se pudo eliminar (puede que no existan)" -ForegroundColor Yellow
}

# ── 2. Preparar datos ──
Write-Host "`n>>> Preparando datos..." -ForegroundColor Yellow
$membresiasInsert = @()
$boletasInsert = @()

foreach ($user in $users) {
  foreach ($mes in $user.meses) {
    $tokensTotales = $user.plan.tokens
    $tokensUsados = Get-TokensUsados -UserId $user.id -Mes $mes -MaxTokens $tokensTotales
    $membresiaId = [guid]::NewGuid().ToString()
    $createdAt = Get-BoletaDate -Mes $mes

    $membre = New-Object PSObject -Property @{
      id = $membresiaId
      usuario_id = $user.id
      plan_id = $user.plan.id
      mes = $mes
      tokens_totales = $tokensTotales
      tokens_usados = $tokensUsados
      created_at = $createdAt
      estado = $true
    }
    $membresiasInsert += $membre

    $boleta = New-Object PSObject -Property @{
      id = [guid]::NewGuid().ToString()
      usuario_id = $user.id
      estado = "pagado"
      total = $user.plan.precio
      transaccion_id = "pop_${transaccionCounter}"
      created_at = $createdAt
      updated_at = $createdAt
      recurrencia_id = $null
      flow_confirmada = $true
    }
    $boletasInsert += $boleta
    $transaccionCounter++
  }
}

Write-Host "    $($membresiasInsert.Count) membresias, $($boletasInsert.Count) boletas generadas" -ForegroundColor Green

# ── 3. Insertar membresías (una por una para evitar errores de parseo) ──
Write-Host "`n>>> Insertando membresias..." -ForegroundColor Yellow
$ok = 0; $fail = 0
foreach ($item in $membresiasInsert) {
  try {
    Invoke-Supabase -Method Post -Endpoint "membresia" -Body @($item)
    $ok++
  } catch {
    Write-Host "    Error: $($item.usuario_id) / $($item.mes)" -ForegroundColor Red
    $fail++
  }
}
Write-Host "    OK: $ok | Fail: $fail" -ForegroundColor Green

# ── 4. Insertar boletas ──
Write-Host "`n>>> Insertando boletas..." -ForegroundColor Yellow
$ok = 0; $fail = 0
foreach ($item in $boletasInsert) {
  try {
    Invoke-Supabase -Method Post -Endpoint "boleta" -Body @($item)
    $ok++
  } catch {
    Write-Host "    Error: $($item.transaccion_id)" -ForegroundColor Red
    $fail++
  }
}
Write-Host "    OK: $ok | Fail: $fail" -ForegroundColor Green

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  POBLACION COMPLETADA" -ForegroundColor Green
Write-Host "  Membresias: $($membresiasInsert.Count)" -ForegroundColor Cyan
Write-Host "  Boletas:    $($boletasInsert.Count)" -ForegroundColor Cyan
Write-Host "  Rango:      Feb 2026 - Jun 2026" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# ── 5. Verificacion ──
Write-Host "`n>>> Verificando datos insertados..." -ForegroundColor Yellow
try {
  $vh = @{
    "apikey" = $ServiceRoleKey
    "Authorization" = "Bearer $ServiceRoleKey"
  }
  $memCount = Invoke-RestMethod -Uri "${SupabaseUrl}/rest/v1/membresia?select=count" -Headers $vh
  Write-Host "    Membresias en DB: $memCount" -ForegroundColor Green
  $bolCount = Invoke-RestMethod -Uri "${SupabaseUrl}/rest/v1/boleta?select=count" -Headers $vh
  Write-Host "    Boletas en DB: $bolCount" -ForegroundColor Green
} catch {
  Write-Host "    Error en verificacion: $_" -ForegroundColor Red
}
