@echo off
title Telegram TikTok Bot

if not defined TELEGRAM_BOT_TOKEN (
  echo Configure a variavel de ambiente TELEGRAM_BOT_TOKEN antes de iniciar.
  echo Consulte README.txt para obter as instrucoes.
  pause
  exit /b 1
)

echo.
echo Iniciando bot...
npm start

pause
