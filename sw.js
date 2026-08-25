/* ============================================================
   COPILOTO — Service Worker
   Estrategia: REDE PRIMEIRO, cache so como reserva.
   Por que: enquanto o app esta sendo ajustado toda semana, o
   motorista TEM que receber a versao nova assim que abre.
   O cache aqui serve so pra ele nao ficar na mao sem sinal.
   ============================================================ */

const CACHE = 'copiloto-v7';

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

// Instala: guarda uma copia de reserva pro offline.
// ⚠️ Era cache.addAll(), que e TUDO OU NADA: se UM arquivo da lista falhasse
// (404, ou uma oscilacao de rede no meio da instalacao), a instalacao inteira
// era rejeitada e o motorista ficava com o cache VAZIO — sem aviso nenhum,
// descobrindo so quando perdesse o sinal. Agora cada arquivo e guardado por
// conta propria: o que falhar fica de fora, o resto entra.
self.addEventListener('install', evento => {
  evento.waitUntil(
    caches.open(CACHE)
      .then(cache => Promise.all(
        ESSENCIAIS.map(url =>
          fetch(url, { cache: 'reload' })
            .then(resposta => resposta.ok ? cache.put(url, resposta) : null)
            .catch(() => null)   // esse arquivo fica sem reserva; os outros seguem
        )
      ))
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
        // ⚠️ DOIS PROBLEMAS ARRUMADOS AQUI:
        //
        // 1) ignoreSearch. Os arquivos sao pedidos com ?v=NNN
        //    (script.js?v=359), mas o install guarda sem a query
        //    (./script.js). O caches.match compara a URL INTEIRA por padrao —
        //    entao NADA da lista ESSENCIAIS era encontrado, e a reserva de
        //    offline so funcionava por acidente, gracas ao cache.put que roda
        //    a cada carregamento online. Na PRIMEIRA vez sem sinal, o
        //    motorista ficava sem app.
        //
        // 2) O fallback pro index.html valia pra QUALQUER pedido. Um pedido de
        //    script.js que nao estivesse no cache recebia HTML de volta, o
        //    navegador tentava executar aquilo como JavaScript, e o app
        //    quebrava com erro de sintaxe em vez de so nao carregar.
        //    Agora o index.html so responde a pedido de PAGINA.
        return caches.match(req, { ignoreSearch: true }).then(guardado => {
          if (guardado) return guardado;
          if (ehHTML) return caches.match('./index.html', { ignoreSearch: true });
          return Response.error();
        });
      })
  );
});
