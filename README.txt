BOT TELEGRAM - VIDEOS DO TIKTOK E INSTAGRAM

REQUISITOS
- Node.js 22 ou superior
- Python 3 e yt-dlp instalados e disponiveis no PATH
- ffmpeg e ffprobe instalados e disponiveis no PATH (necessarios para combinar
  formatos e comprimir videos maiores que 48 MiB)
- Um token de bot criado no Telegram pelo @BotFather

IMPORTANTE: O token que estava gravado no codigo foi exposto. Revogue-o no
@BotFather e crie um token novo antes de iniciar o bot. Nunca publique o token
nem o salve diretamente nos arquivos do projeto.

INSTALACAO NO WINDOWS
1. Instale o Node.js: https://nodejs.org/
2. Instale o Python e o ffmpeg, se ainda nao estiverem instalados.
3. Abra um terminal nesta pasta e execute:

   npm ci
   pip install --pre -U "yt-dlp[default,curl-cffi]"

4. Configure o token na sessao atual do PowerShell (substitua pelo token novo):

   $env:TELEGRAM_BOT_TOKEN = "COLE_O_TOKEN_NOVO_AQUI"
   npm start

   No Prompt de Comando, use:

   set TELEGRAM_BOT_TOKEN=COLE_O_TOKEN_NOVO_AQUI
   npm start

Para iniciar pelo start.bat, configure TELEGRAM_BOT_TOKEN antes de abrir o
arquivo. A variavel configurada apenas no terminal atual desaparece ao fechar
esse terminal.

EXECUCAO COM DOCKER / RENDER
O Dockerfile instala as dependencias de sistema e o yt-dlp. Configure a variavel
secreta TELEGRAM_BOT_TOKEN nas configuracoes do servico Render antes do deploy.
O servico responde em /health para verificacoes de disponibilidade. A
instalacao do yt-dlp usa a versao de desenvolvimento mais recente e o suporte
a impersonacao HTTP, usado como segunda tentativa quando TikTok ou Instagram
bloqueiam a requisicao normal. Depois de alterar o Dockerfile, faca um novo
deploy para atualizar essa dependencia.

USO
Envie /start ou /help ao bot e depois envie um link HTTPS publico de video do
TikTok ou Instagram. O bot nao baixa playlists, conteudo privado ou conteudo que
exija autenticacao. Videos acima de 48 MiB sao recomprimidos com ffmpeg antes do envio, para
permanecer abaixo do limite de 49 MiB aceito pelo Telegram. O tempo de
processamento pode aumentar para videos grandes.

TESTES
Execute npm test para rodar os testes locais. A inicializacao real tambem exige
um token valido do BotFather e acesso a internet.
