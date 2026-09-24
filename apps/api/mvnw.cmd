@REM Maven Wrapper startup script (minimal, Windows)
@echo off
setlocal
set DIRNAME=%~dp0
set WRAPPER_JAR=%DIRNAME%.mvn\wrapper\maven-wrapper.jar
set WRAPPER_PROPS=%DIRNAME%.mvn\wrapper\maven-wrapper.properties
if not exist "%WRAPPER_JAR%" (
  echo ERROR: maven-wrapper.jar not found at %WRAPPER_JAR%
  exit /b 1
)
for /f "usebackq tokens=1,* delims==" %%A in ("%WRAPPER_PROPS%") do (
  if "%%A"=="distributionUrl" set DISTRIBUTION_URL=%%B
)
set MAVEN_HOME=%USERPROFILE%\.m2\wrapper\dists\apache-maven-3.9.9
if not exist "%MAVEN_HOME%\bin\mvn.cmd" (
  echo Downloading Maven 3.9.9 ...
  powershell -Command "Invoke-WebRequest -Uri '%DISTRIBUTION_URL%' -OutFile \"$env:TEMP\maven.zip\" -UseBasicParsing; Expand-Archive \"$env:TEMP\maven.zip\" -DestinationPath \"$env:USERPROFILE\.m2\wrapper\dists\" -Force"
)
set MVN_CMD=%MAVEN_HOME%\bin\mvn.cmd
if not exist "%MVN_CMD%" (
  echo ERROR: Maven installation failed
  exit /b 1
)
"%MVN_CMD%" %*