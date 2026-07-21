@echo off
echo Starting Texture Scraper Backend...
echo.
echo 1. Checking Python dependencies...
python -m pip install -r python\requirements.txt --quiet
echo    Done!
echo.
echo 2. Starting API server on http://localhost:3456...
echo    (Keep this window open)
echo.
python python\api_server.py
