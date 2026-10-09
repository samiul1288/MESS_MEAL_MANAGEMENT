@echo off
cd /d "d:\next-level\mess meal management"
echo Starting server...
node src/server.js > server_test.log 2>&1
echo Server PID: %ERRORLEVEL%
type server_test.log
