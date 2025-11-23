@echo off
REM K6 Cloud Test Runner
REM This script sets up environment and runs K6 tests with cloud output

echo ========================================
echo K6 CLOUD TEST RUNNER
echo ========================================
echo.

REM Set K6 Cloud token (add your token here)
REM set K6_CLOUD_TOKEN=your_token_here
REM set K6_CLOUD_HOST=https://app.k6.io

if "%1"=="" (
    echo Usage: run-cloud.bat [test-script] [mode]
    echo.
    echo Modes:
    echo   stream  - Stream results to cloud ^(free, runs locally^)
    echo   cloud   - Execute on cloud infrastructure ^(uses VUh^)
    echo.
    echo Examples:
    echo   run-cloud.bat scripts/load-test-cloud.js stream
    echo   run-cloud.bat scripts/load-test-cloud.js cloud
    goto :end
)

if "%2"=="cloud" (
    echo Running test on K6 Cloud infrastructure...
    echo This will use VUh from your quota
    echo.
    .\k6-v0.52.0-windows-amd64\k6.exe cloud %1
) else (
    echo Streaming results to K6 Cloud...
    echo Test runs locally ^(no VUh used^)
    echo.
    .\k6-v0.52.0-windows-amd64\k6.exe run --out cloud %1
)

echo.
echo ========================================
echo Test completed!
echo View results at: https://app.k6.io
echo ========================================

:end
