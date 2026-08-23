/* ============================================================
   COPILOTO — Service Worker
   Estrategia: REDE PRIMEIRO, cache so como reserva.
   Por que: enquanto o app esta sendo ajustado toda semana, o
   motorista TEM que receber a versao nova assim que abre.
   O cache aqui serve so pra ele nao ficar na mao sem sinal.
   ============================================================ */

const CACHE = 'copiloto-v6';

const ESSENCIAIS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './supabase-service.js',
  './manifest.json',
  './icone-192.png',
  './icone-512.png'
];

// Instala: guarda uma copia de reserva pro offline
self.addEventListener('install', evento => {
  evento.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ESSENCIAIS))
      .then(() => self.skipWaiting())
  );
});

// Ativa: limpa versoes antigas do cache
self.addEventListener('activate', evento => {
  evento.waitUntil(
    caches.keys()
      .then(nomes => Promise.all(
        nomes.filter(nome => nome !== CACHE).map(nome => caches.delete(nome))
      ))
      .then(() => self.clients.claim())
  );
});

// Busca: tenta a rede primeiro; se falhar (sem sinal), usa o cache
self.addEventListener('fetch', evento => {
  const req = evento.request;

  // so lida com GET da propria origem
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  // ⚠️ O index.html NUNCA pode vir do cache do navegador. É ele que diz qual
  // versao do script.js/style.css carregar (?v=NNN). Se o HTML vier velho, ele
  // pede a versao velha dos arquivos e NENHUMA correcao chega no motorista —
  // foi o que travou varios testes.
  const ehHTML = req.mode === 'navigate' ||
                 (req.headers.get('accept') || '').includes('text/html');
  const pedido = ehHTML ? new Request(req.url, { cache: 'no-store' }) : req;

  evento.respondWith(
    fetch(pedido)
      .then(resposta => {
        // deu certo na rede: atualiza a reserva e entrega
        const copia = resposta.clone();
        caches.open(CACHE).then(cache => cache.put(req, copia));
        return resposta;
      })
      .catch(() => {
        // sem sinal: entrega o que tiver guardado
        return caches.match(req).then(guardado => {
          return guardado || caches.match('./index.html');
        });
      })
  );
});
