@echo off
cd /d "d:\next-level\mess meal management"
echo Changing to directory: %CD%
node src/server.js > server_test4.log 2>&1
echo Server exit code: %ERRORLEVEL%
echo === SERVER LOG ===
type server_test4.log
echo === END LOG ===
