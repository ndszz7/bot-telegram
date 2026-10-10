const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const { execFile } = require('child_process');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);
const MAX_TELEGRAM_FILE_SIZE = 49 * 1024 * 1024;
const DOWNLOAD_TIMEOUT_MS = 5 * 60 * 1000;
const VIDEO_EXTENSIONS = new Set(['.mp4', '.m4v', '.mov', '.mkv', '.webm']);

function getSupportedMediaUrl(input) {
  if (typeof input !== 'string') return null;

  let url;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }

  if (url.protocol !== 'https:' || url.username || url.password) return null;

  const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  const isTikTok =
    hostname === 'tiktok.com' || hostname.endsWith('.tiktok.com');
  const isInstagram =
    hostname === 'instagram.com' || hostname.endsWith('.instagram.com');

  return isTikTok || isInstagram ? url.toString() : null;
}

async function downloadVideo(url, directory) {
  const outputTemplate = path.join(directory, '%(id)s.%(ext)s');
  await execFileAsync(
    'yt-dlp',
    [
      '--no-playlist',
      '--no-progress',
      '--format',
      'best[filesize<49M][ext=mp4]/best[filesize_approx<49M][ext=mp4]/best[ext=mp4]/best',
      '--max-filesize',
      '49M',
      '--merge-output-format',
      'mp4',
      '--output',
      outputTemplate,
      url
    ],
    {
      timeout: DOWNLOAD_TIMEOUT_MS,
      maxBuffer: 2 * 1024 * 1024,
      windowsHide: true
    }
  );

  const files = await fs.readdir(directory);
  const videos = files.filter((file) =>
    VIDEO_EXTENSIONS.has(path.extname(file).toLowerCase())
  );
  if (videos.length === 0) {
    throw new Error('yt-dlp completed without producing a video file');
  }

  const videoPath = path.join(directory, videos[0]);
  const { size } = await fs.stat(videoPath);
  if (size > MAX_TELEGRAM_FILE_SIZE) {
    const error = new Error('The downloaded video exceeds Telegram’s upload limit');
    error.code = 'VIDEO_TOO_LARGE';
    throw error;
  }

  return videoPath;
}

function getUserError(error) {
  if (error.code === 'ENOENT') {
    return '❌ O yt-dlp não está instalado ou não está disponível no PATH.';
  }
  if (/ffmpeg|ffprobe/i.test(`${error.stderr || ''} ${error.message || ''}`)) {
    return '❌ O ffmpeg não está instalado ou não está disponível no PATH.';
  }
  if (error.code === 'VIDEO_TOO_LARGE') {
    return '❌ O vídeo excede o limite de envio do Telegram (49 MiB).';
  }
  if (error.killed) {
    return '❌ O download demorou demais e foi cancelado. Tente novamente.';
  }
  return '❌ Não consegui baixar ou enviar esse vídeo. Confirme se o link é público e tente novamente.';
}

async function sendDownloadedVideo(bot, chatId, videoPath) {
  const options = { caption: '✅ Vídeo baixado' };
  if (path.extname(videoPath).toLowerCase() === '.mp4') {
    await bot.sendVideo(chatId, videoPath, {
      ...options,
      supports_streaming: true
    });
    return;
  }

  await bot.sendDocument(chatId, videoPath, options);
}

async function handleMessage(bot, message) {
  const chatId = message.chat.id;
  const text = message.text;

  if (typeof text !== 'string') return;

  if (text === '/start' || text === '/help') {
    await bot.sendMessage(
      chatId,
      'Envie um link público de vídeo do TikTok ou Instagram para baixar.'
    );
    return;
  }

  const mediaUrl = getSupportedMediaUrl(text);
  if (!mediaUrl) {
    await bot.sendMessage(
      chatId,
      '📎 Envie um link HTTPS válido do TikTok ou Instagram.'
    );
    return;
  }

  const loading = await bot.sendMessage(chatId, '📥 Baixando vídeo...');
  let downloadDirectory;

  try {
    downloadDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), 'telegram-video-')
    );
    const videoPath = await downloadVideo(mediaUrl, downloadDirectory);
    await bot.editMessageText('🚀 Enviando vídeo...', {
      chat_id: chatId,
      message_id: loading.message_id
    });
    await sendDownloadedVideo(bot, chatId, videoPath);
  } catch (error) {
    const details = `${error.stderr || ''} ${error.message || ''}`;
    if (/max-filesize|file is larger than/i.test(details)) {
      error.code = 'VIDEO_TOO_LARGE';
    }
    console.error('Falha ao processar o vídeo:', error);
    const userMessage = getUserError(error);
    try {
      await bot.editMessageText(userMessage, {
        chat_id: chatId,
        message_id: loading.message_id
      });
    } catch (editError) {
      console.error('Falha ao atualizar a mensagem de status:', editError);
      await bot.sendMessage(chatId, userMessage);
    }
  } finally {
    if (downloadDirectory) {
      await fs.rm(downloadDirectory, { recursive: true, force: true });
    }
  }
}

function startBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !token.trim()) {
    throw new Error(
      'Configure TELEGRAM_BOT_TOKEN com o token do bot emitido pelo BotFather.'
    );
  }

  const app = express();
  app.get('/', (request, response) => {
    response.send('BOT ONLINE');
  });
  app.get('/health', (request, response) => {
    response.status(200).send('OK');
  });

  const port = Number(process.env.PORT) || 3000;
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`🌐 Web server online on port ${port}`);
  });
  server.on('error', (error) => {
    console.error('Falha ao iniciar o servidor web:', error);
    process.exitCode = 1;
  });

  const bot = new TelegramBot(token.trim(), { polling: true });
  bot.on('polling_error', (error) => {
    console.error('Erro de polling do Telegram:', error.message);
  });
  bot.on('error', (error) => {
    console.error('Erro do bot do Telegram:', error);
  });
  bot.on('message', (message) => {
    handleMessage(bot, message).catch((error) => {
      console.error('Falha ao responder à mensagem:', error);
    });
  });

  console.log('🤖 Bot online...');
  return { app, bot, server };
}

if (require.main === module) {
  try {
    startBot();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = {
  getSupportedMediaUrl,
  getUserError,
  handleMessage,
  sendDownloadedVideo,
  startBot
};
