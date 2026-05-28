const TelegramBot = require('node-telegram-bot-api');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const express = require('express');

// SERVIDOR WEB PRA RENDER + UPTIMEROBOT
const app = express();

app.get('/', (req, res) => {
  res.send('BOT ONLINE');
});

app.listen(process.env.PORT || 3000, () => {
  console.log('🌐 Web server online');
});

// TOKEN DO BOT
const token = '8995772558:AAFb8dmgIymDue5b_okh_0N3bMI1onuScCk';

const bot = new TelegramBot(token, {
  polling: true
});

console.log('🤖 Bot online...');

bot.on('message', async (msg) => {

  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text) return;

  // VERIFICA LINKS
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

  // MENSAGEM LOADING
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

  // NOME DO ARQUIVO
  const fileName =
    path.join(
      downloadsDir,
      `video_${Date.now()}.mp4`
    );

  // COMANDO YT-DLP
  const command =
    `yt-dlp -f mp4 ` +
    `--no-playlist ` +
    `--force-overwrites ` +
    `-o "${fileName}" "${text}"`;

  // EXECUTA DOWNLOAD
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

      // VERIFICA SE EXISTE
      if (!fs.existsSync(fileName)) {

        bot.editMessageText(
          '❌ Arquivo não encontrado.',
          {
            chat_id: chatId,
            message_id: loading.message_id
          }
        );

        return;
      }

      // ALTERA MENSAGEM
      await bot.editMessageText(
        '🚀 Enviando vídeo...',
        {
          chat_id: chatId,
          message_id: loading.message_id
        }
      );

      // ENVIA VIDEO
      await bot.sendVideo(
        chatId,
        fileName,
        {
          caption: '✅ Vídeo baixado em HD',
          supports_streaming: true
        }
      );

      // REMOVE VIDEO
      fs.unlinkSync(fileName);

    } catch (err) {

      console.log(err);

      bot.sendMessage(
        chatId,
        '❌ Erro ao enviar vídeo.'
      );

    }

  });

});