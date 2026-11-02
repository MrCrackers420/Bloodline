@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if not errorlevel 1 (
  py -3 tools\run_hosted.py
) else (
  where python >nul 2>nul
  if not errorlevel 1 (
    python tools\run_hosted.py
  ) else (
    echo Python 3 is required for the optional hosted desktop mode.
    echo You can still open the standalone HTML directly for offline Latch 98.
    echo Install Python 3 from python.org, then run this file again.
  )
)
if errorlevel 1 echo Hosting did not start. See the error above.
pause
