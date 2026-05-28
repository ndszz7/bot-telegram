const TelegramBot = require('node-telegram-bot-api');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const express = require('express');

// EXPRESS
const app = express();

app.get('/', (req, res) => {
  res.send('BOT ONLINE');
});

app.listen(process.env.PORT || 3000, () => {
  console.log('🌐 Web server online');
});

// TOKEN
const token = '8995772558:AAFRI3HbYzX1axKGRkEo2seMbLZ5LItrGgU';

// BOT
const bot = new TelegramBot(token, {
  polling: {
    interval: 300,
    autoStart: true,
    params: {
      timeout: 10
    }
  }
});

console.log('🤖 Bot online...');

// ERROS
bot.on('polling_error', (error) => {
  console.log('Polling Error:', error.message);
});

bot.on('webhook_error', (error) => {
  console.log('Webhook Error:', error.message);
});

// MENSAGENS
bot.on('message', async (msg) => {

  try {

    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text) return;

    // LINKS
    const isTikTok =
      text.includes('tiktok.com') ||
      text.includes('vm.tiktok.com') ||
      text.includes('vt.tiktok.com');

    const isInstagram =
      text.includes('instagram.com');

    if (!isTikTok && !isInstagram) {

      bot.sendMessage(
        chatId,
        '📎 Envie um link do TikTok ou Instagram.'
      );

      return;
    }

    // LOADING
    const loading = await bot.sendMessage(
      chatId,
      '📥 Baixando vídeo em HD...'
    );

    // PASTA DOWNLOADS
    const downloadsDir =
      path.join(__dirname, 'downloads');

    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir);
    }

    // NOME
    const uniqueName =
      `video_${Date.now()}`;

    const outputTemplate =
      path.join(
        downloadsDir,
        `${uniqueName}.%(ext)s`
      );

    // COMANDO
    const command =
      `yt-dlp ` +
      `-f mp4 ` +
      `--no-playlist ` +
      `--force-overwrites ` +
      `-o "${outputTemplate}" "${text}"`;

    console.log(command);

    // DOWNLOAD
    exec(command, async (error, stdout, stderr) => {

      if (error) {

        console.log(stderr);

        bot.editMessageText(
          '❌ Erro ao baixar vídeo.',
          {
            chat_id: chatId,
            message_id: loading.message_id
          }
        );

        return;
      }

      try {

        // PROCURA ARQUIVO
        const files =
          fs.readdirSync(downloadsDir);

        const foundVideo =
          files.find(file =>
            file.startsWith(uniqueName)
          );

        if (!foundVideo) {

          bot.editMessageText(
            '❌ Arquivo não encontrado.',
            {
              chat_id: chatId,
              message_id: loading.message_id
            }
          );

          return;
        }

        const videoPath =
          path.join(downloadsDir, foundVideo);

        // ENVIO
        await bot.editMessageText(
          '🚀 Enviando vídeo...',
          {
            chat_id: chatId,
            message_id: loading.message_id
          }
        );

        await bot.sendVideo(
          chatId,
          videoPath,
          {
            caption: '✅ Vídeo baixado em HD',
            supports_streaming: true
          }
        );

        // REMOVE
        fs.unlinkSync(videoPath);

      } catch (err) {

        console.log(err);

        bot.sendMessage(
          chatId,
          '❌ Erro ao enviar vídeo.'
        );

      }

    });

  } catch (err) {

    console.log(err);

  }

});
