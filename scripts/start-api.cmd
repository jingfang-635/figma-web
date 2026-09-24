@echo off
cd /d "%~dp0.."
node scripts\run-with-env.mjs apps\api "mvnw.cmd -q spring-boot:run"