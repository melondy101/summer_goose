# 从 narration.json 生成每段中文配音 WAV（Microsoft Huihui）。
# 用法：powershell -ExecutionPolicy Bypass -File scripts\make_narration.ps1
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Speech

$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root "test-results\narration"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$lines = Get-Content -Raw -Encoding UTF8 (Join-Path $root "test-results\narration.json") | ConvertFrom-Json
$format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(44100, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)

foreach ($prop in $lines.PSObject.Properties) {
  $name = $prop.Name
  $text = $prop.Value
  $wav = Join-Path $outDir "$name.wav"
  $s = New-Object System.Speech.Synthesis.SpeechSynthesizer
  $s.SelectVoice("Microsoft Huihui Desktop")
  $s.Rate = 0
  $s.SetOutputToWaveFile($wav, $format)
  $s.Speak($text)
  $s.Dispose()
  Write-Output "OK $name.wav"
}
