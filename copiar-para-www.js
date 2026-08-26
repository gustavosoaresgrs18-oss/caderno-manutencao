/* ============================================================
   COPILOTO — prepara a pasta www/ para o Capacitor
   ============================================================
   Por que este arquivo existe:

   O GitHub Pages serve o app a partir da RAIZ do repositório. O
   Capacitor, por outro lado, quer uma pasta só com o app dentro
   (a `webDir`). Se apontássemos a webDir para a raiz, ele copiaria
   .git, node_modules e a pasta android/ inteira para dentro do APK.

   Então: a raiz continua sendo a verdade (nada muda no seu fluxo de
   git push), e este script monta uma cópia limpa em www/ na hora
   do build.

   Rodar:  npm run build
   ============================================================ */

const fs = require('fs');
const path = require('path');

// Só isto entra no APK. Se criar um arquivo novo do app, adicione aqui.
const ARQUIVOS = [
  'index.html',
  'script.js',
  'style.css',
  'supabase-service.js',
  'manifest.json',
  'icone-192.png',
  'icone-512.png',
  // as páginas públicas vão junto: se o motorista abrir o link de
  // privacidade sem internet, ainda funciona
  'privacidade.html',
  'excluir-conta.html'
];

// ⚠️ O service worker NÃO vai para o APK. Dentro do app os arquivos já
// são locais — um SW só criaria uma segunda cópia dos mesmos arquivos e
// poderia servir uma versão velha depois de uma atualização.
// (O sw.js continua no GitHub Pages, onde ele é necessário.)

const raiz = __dirname;
const www  = path.join(raiz, 'www');

fs.rmSync(www, { recursive: true, force: true });
fs.mkdirSync(www, { recursive: true });

let copiados = 0, faltando = [];
for (const nome of ARQUIVOS) {
  const origem = path.join(raiz, nome);
  if (!fs.existsSync(origem)) { faltando.push(nome); continue; }
  fs.copyFileSync(origem, path.join(www, nome));
  copiados++;
}

console.log(`www/ montada — ${copiados} arquivos.`);
if (faltando.length) {
  console.warn('⚠️  NÃO ENCONTRADOS (o app pode quebrar):', faltando.join(', '));
  process.exit(1);
}
