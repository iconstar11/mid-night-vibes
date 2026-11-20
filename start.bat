@echo off
cd /d "%~dp0"
if not exist .git (
  git init
  git add .
  git commit -m "Initial commit: After Dark game app"
)
start "" http://localhost:5500
python -m http.server 5500
