/* ============================================================
   COPILOTO — Service Worker
   Estrategia: REDE PRIMEIRO, cache so como reserva.
   Por que: enquanto o app esta sendo ajustado toda semana, o
   motorista TEM que receber a versao nova assim que abre.
   O cache aqui serve so pra ele nao ficar na mao sem sinal.
   ============================================================ */

const CACHE = 'copiloto-v2';

const ESSENCIAIS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icone192.png',
  './icone512.png'
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

  evento.respondWith(
    fetch(req)
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
