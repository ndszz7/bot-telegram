const TelegramBot = require('node-telegram-bot-api');
const { exec } = require('child_process');
const fs = require('fs');

// COLOQUE O TOKEN DO SEU BOT AQUI
const token = '8995772558:AAFb8dmgIymDue5b_okh_0N3bMI1onuScCk';

const bot = new TelegramBot(token, {
  polling: true
});

console.log('✅ Bot online...');

bot.on('message', async (msg) => {

  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text) return;

  // verifica se é link do TikTok
  if (
    text.includes('tiktok.com') ||
    text.includes('vm.tiktok.com')
  ) {

    bot.sendMessage(chatId, '📥 Baixando vídeo em HD...');

    const fileName = `video_${Date.now()}.mp4`;

    const command =
      `yt-dlp -f "bestvideo+bestaudio/best" ` +
      `--merge-output-format mp4 ` +
      `-o "${fileName}" "${text}"`;

    exec(command, async (error) => {

      if (error) {
        console.log(error);

        bot.sendMessage(
          chatId,
          '❌ Erro ao baixar vídeo.'
        );

        return;
      }

      try {

        await bot.sendVideo(
          chatId,
          fileName,
          {
            caption: '✅ Vídeo baixado em HD'
          }
        );

        // remove arquivo após envio
        fs.unlinkSync(fileName);

      } catch (err) {

        console.log(err);

        bot.sendMessage(
          chatId,
          '❌ Erro ao enviar vídeo.'
        );

      }

    });

  } else {

    bot.sendMessage(
      chatId,
      '📎 Envie um link do TikTok.'
    );

  }

});
