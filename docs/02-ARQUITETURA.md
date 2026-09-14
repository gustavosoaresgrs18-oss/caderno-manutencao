# 02 — Arquitetura

**Classificação deste documento:** PÚBLICO.
**Objetivo:** visão de arquitetura de alto nível do Copiloto — como as peças se encaixam.
Não entra aqui: nome de função e linha (mapa do código), regra de cálculo financeiro, schema de
tabelas, ou registro de risco/bug — esses vivem na documentação privada do projeto. Taxonomia
conforme `docs/00-CONSTITUICAO.md`.

## 1. Visão geral das camadas

**Classificação: `ESTADO ATUAL DO CÓDIGO`.**

O Copiloto tem quatro camadas principais:

- **Base web** (`index.html`, `script.js`, `style.css`, `supabase-service.js`) — HTML/CSS/JS
  escritos à mão, sem framework nem bundler.
- **Capacitor** — empacota exatamente os mesmos arquivos da base web dentro de um projeto
  Android nativo, dando acesso a recursos do dispositivo (câmera, notificações, etc.).
- **Supabase** — backend (autenticação, banco Postgres, proteção por RLS).
- **GitHub Pages** — hospeda a base web diretamente da raiz do repositório.

## 2. Produto final e papel da base web

**Classificação: `DECISÃO APROVADA`** — confirmada explicitamente pelo proprietário do projeto;
detalhamento completo vive na documentação privada do projeto, não repetido aqui.

O produto final do Copiloto é um aplicativo mobile, com foco inicial em Android. A base web não
é o produto final — é a arquitetura/interface compartilhada e o ambiente de desenvolvimento e
teste, empacotada para Android via Capacitor. A experiência principal do produto é orientada
para aplicativo mobile, utilizando a base web como camada compartilhada de desenvolvimento e
execução.

## 3. Modelo de dados: local primeiro, sincronização depois

**Classificação: `ESTADO ATUAL DO CÓDIGO`** (visão conceitual; detalhe de tabelas, chaves e fila
de sincronização vive na documentação privada do projeto, não repetido aqui).

Toda gravação acontece primeiro no armazenamento local do dispositivo — a interface nunca
espera rede para responder. Só depois, se houver conexão, o app tenta sincronizar com o
Supabase de forma assíncrona. Falha de sincronização não bloqueia o registro local.

## 4. Sem framework, sem bundler

**Classificação: `ESTADO ATUAL DO CÓDIGO`.**

Não há processo de build para a base web em si — os arquivos são servidos como estão. O único
"build" do projeto é o script que monta uma cópia limpa desses mesmos arquivos numa pasta
própria para o Capacitor empacotar no Android (a raiz do repositório continua sendo a fonte de
verdade, tanto para o GitHub Pages quanto para o app).

## 5. Regra crítica: versionamento de cache

**Classificação: `ESTADO ATUAL DO CÓDIGO`.**

O arquivo principal carrega os demais arquivos da base web com um número de versão na URL
(`?v=NNN`). Qualquer edição em `script.js`, `style.css` ou `supabase-service.js` exige subir
esse número — caso contrário, o cache do navegador ou do service worker pode continuar servindo
a versão antiga, e a correção não chega a quem já tem o app aberto ou instalado.

## 6. Separação entre navegador e aplicativo instalado

**Classificação: `ESTADO ATUAL DO CÓDIGO`.**

O código detecta se está rodando dentro do app nativo ou num navegador comum, e ajusta
comportamento de acordo — por exemplo, o service worker (cache para uso offline no navegador)
só é registrado na versão web; dentro do app, os arquivos já são locais por natureza do
empacotamento, então um segundo cache seria redundante e arriscaria servir uma versão
desatualizada.

## 7. Fora do escopo deste documento

Regras de cálculo financeiro, schema de banco de dados, mapa de funções do código, riscos e
bugs conhecidos, e processos internos de governança, agentes auxiliares e fluxos operacionais
futuros — tudo isso tem documentação própria, privada, fora deste repositório público.

---

**Fontes:** `docs/00-CONSTITUICAO.md` (taxonomia); `CLAUDE.md` (regras já públicas de build e
versionamento); código atual (`index.html`, `script.js`, `supabase-service.js`, `sw.js`,
`capacitor.config.json`, `copiar-para-www.js`) como prova principal.
