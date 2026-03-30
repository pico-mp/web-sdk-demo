@echo off
setlocal enabledelayedexpansion

set OCIR_REGISTRY=ap-kulai-2.ocir.io/axhxhxvenl4p
set TAG=latest
set PLATFORM=linux/arm64
set IMAGE=%OCIR_REGISTRY%/picomp-cursor-party-demo:%TAG%

echo.
echo [pico-cursor-party-demo] Build and push to OCIR
echo   Image   : %IMAGE%
echo   Platform: %PLATFORM%
echo.
echo Login once if needed:
echo   docker login ap-kulai-2.ocir.io
echo   Username: axhxhxvenl4p/default/kjyyoung0305@gmail.com
echo   Password: OCI Auth Token
echo.

echo [1/1] Building pico-cursor-party-demo image (arm64) and pushing...
docker buildx build --platform %PLATFORM% ^
  -t %IMAGE% --push .
if errorlevel 1 exit /b 1

echo.
echo Done!
echo   %IMAGE%
