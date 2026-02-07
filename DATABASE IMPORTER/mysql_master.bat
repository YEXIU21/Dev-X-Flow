@echo off
TITLE MySQL Master Tool Launcher
CLS
ECHO Launching Cyber-MySQL Master Tool...
powershell -ExecutionPolicy Bypass -File "%~dp0mysql_master.ps1"
PAUSE
