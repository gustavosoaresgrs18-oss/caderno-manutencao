# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Copiloto** ("o caderninho do motorista de app") — a mobile app for Brazilian rideshare/delivery
drivers (Uber/99/iFood-style) to track km, fuel, maintenance, and real take-home pay per hour,
with initial focus on Android. The web HTML/CSS/JS base is the shared architecture/interface and
the development/test environment, packaged for Android via Capacitor — it is not the final
product, and the web/PWA version should not drive UX decisions as if it were the primary target.
The app, all UI copy, comments, commit messages, and internal docs are in **pt-BR**. Keep new
code comments and user-facing strings in pt-BR, matching the existing voice (informal, direct,
second person "você"/"ele" addressing "o motorista").

No frontend framework, no bundler, no npm build step for the web base itself — it's hand-written
`index.html` / `script.js` / `style.css` / `supabase-service.js`, loaded directly by the browser
and served as-is by GitHub Pages for development/testing. Capacitor packages the same files into
the Android app.

## Commands

There is no test suite, linter, or type checker in this repo — don't invent one unless asked.

```
npm run build     # runs copiar-para-www.js: assembles a clean www/ folder for Capacitor
npm run sync      # build + npx cap sync android
npm run android   # build + cap sync + opens Android Studio
```

`npm run build`/`sync` only matter when touching the Android wrapper. For web-only changes,
editing the root files is the entire deploy (GitHub Pages serves the repo root directly).

## Critical workflow rule: the `?v=NNN` cache-buster

`index.html` loads `style.css`, `supabase-service.js`, and `script.js` with a shared
`?v=NNN` query string (search for `?v=` in `index.html`). **Any edit to `script.js`,
`style.css`, or `supabase-service.js` must bump this number in `index.html`**, or the
service worker / browser cache will keep serving the old file and the fix won't reach anyone.
This is the single most common way a change silently fails to ship in this project.

`sw.js` (network-first with cache fallback) explicitly never caches `index.html` itself,
specifically so the `?v=` bump always gets seen — don't change that.

## Git workflow

Commit message style is consistent across history — read `git log` before writing one:
- pt-BR, **lowercase, no accents** (ASCII only — e.g. "nao", "e", "nível" → "nivel")
- format: `vX.XX - descrição curta; outra mudança; outra`
- the `vX.XX` is a project-wide release counter tracked in commit messages and in
  `RETOMADA*.md`/`STATUS_LANCAMENTO.md` — it is **not** the same number as
  `package.json`'s `version` field (that one is stale/unrelated) and not the same as the
  `?v=NNN` cache-buster (a separate, purely-technical counter that increases far more often
  than the release number).
- one logical change per commit; the flow described in project notes is
  `git add . && git commit -m "..." && git push`, one command at a time (not chained).

## Repo is public — mind what gets committed

The GitHub repo is public (required for free GitHub Pages). `.gitignore` deliberately excludes
files with competitive/business-sensitive content or schema details even though they live in
the working directory day to day:
- `RETOMADA*.md`, `CAPACITOR.md` — planning notes, competitor analysis, open bug lists
- `*.sql` — Supabase schema/migration files (RLS is the real protection, but no reason to expose the design)
- `.jks`/`.keystore`/`key.properties` — Android signing keys; losing or leaking these is unrecoverable

Never suggest un-ignoring these or committing their contents. `STATUS_LANCAMENTO.md` and
`PESQUISA_MONETIZACAO.md`, by contrast, *are* tracked/public — don't assume every root `.md`
file is private.

## Deeper documentation

A more detailed knowledge base lives in `docs/` (public, tracked here) — start at
`docs/00-CONSTITUICAO.md` for the classification system used across it. A separate,
gitignored `docs-private/` directory holds business strategy, financial rules, data/schema
detail, risk tracking, and multi-agent governance docs — not covered by this file and not
part of this repository.

## Architecture

### Files and their roles
- `index.html` — all screen markup (one big DOM with sections toggled via `display`), the SVG icon sprite, loads Supabase CDN + `supabase-service.js` + `script.js`.
- `script.js` (~10k lines) — the entire app logic, organized into banner-commented sections (search for `═══` to jump between them): robustness helpers (`lerLS`/`salvarLS`/`numBR`/`numKm`/`fmtBRL`), the patente/gamification system, vehicle model, screen navigation (`mostrarTela`), the dashboard/painel widgets, maintenance state machine (`estadoManutencao`), extratos (statements) by month/week, OCR-by-photo for odometer/receipt, the monthly closing "carta do Isaac", the bug-detector "Sentinela", Android back-button handling, and "Cadê" (the daily-closing screen/flow, shown as cards — narrated in text by Isaac, the app's one assistant character; a text-to-speech feature once existed for it but was removed, so section comments/helper names in the code still mentioning "voice" are historical/dead code, not current behavior).
- `supabase-service.js` — Supabase client init, auth/session handling, and the **hybrid write layer**: writes go to `localStorage` immediately (UI never blocks), then async to Supabase if online, else queued in an offline queue (`filaOffline`) and retried later. Handles the case where Postgres rejects a row for an unknown column by stripping that column and retrying rather than losing the write.
- `style.css` — all styling, plain CSS custom properties, no preprocessor.
- `sw.js` — service worker for the GitHub Pages (browser) build only; explicitly disabled inside the Capacitor app (see comments in `CAPACITOR.md` and `sw.js`) since files there are already local.
- `copiar-para-www.js` — the only "build step": copies an explicit file list into `www/` for Capacitor. **Any new top-level file the app needs at runtime must be added to the `ARQUIVOS`/`PASTAS` list here**, or it silently won't ship in the APK (the script does fail loudly on missing files, but only for files already in the list).
- `android/` — generated by `npx cap add android`, but is version-controlled (not gitignored) because it also holds hand-authored native assets (e.g. notification icon). Only `android/build/`, `android/.gradle/`, etc. are ignored.

### Data model conventions worth knowing before touching persistence code
- Money strings use pt-BR formatting (`,` decimal, `.` thousands) — parse with `numBR`, never
  `parseFloat` directly, and note that km values use a *different* parser (`numKm`) with
  different disambiguation rules (a comma followed by exactly 3 digits is a thousands
  separator, not a decimal).
- `lerLS`/`salvarLS` wrap `localStorage` with JSON serialization and defensive fallbacks —
  use them instead of raw `localStorage.getItem/setItem` for anything the app depends on.
- Each vehicle has its own "caderninho" (km/fuel/maintenance history is scoped per-vehicle).
- Supabase tables don't all key on `id` — `financas` uses `(usuario_id, data_iso)` and
  `documentos` uses `(usuario_id, tipo_id)`; `salvarRegistroHibrido` takes an explicit
  `onConflict` per caller and dedups the offline queue accordingly. Don't assume every table
  has an `id` column.
- Native/Capacitor plugin access always goes through `plugNativo(nome)` (checks
  `window.Capacitor` and registers the plugin lazily) rather than touching
  `Capacitor.Plugins` directly — this is what makes the same `script.js` run unmodified in a
  plain browser (no plugins available → feature just doesn't show) and inside the APK.
- A demo/simulation mode (`emDemo()`) plants fictional data for onboarding; hybrid writes
  check this flag and skip both Supabase and the offline queue while demoing, so fake data
  never reaches a real account.

### "Regras Sagradas" (sacred rules) referenced throughout the code
Comments across `script.js`/`style.css`/`index.html` cite numbered product invariants (e.g.
"Regra Sagrada nº 2", "nº 4", "nº 6", "nº 10") as the reason behind specific defensive code.
Grep for `[Rr]egra [Ss]agrada` before changing logic they're attached to — they encode
non-obvious product decisions (e.g. nº 2: never let the app guess/invent a number when data is
missing, always say what's missing instead; nº 4: red/orange only ever means a real alert,
never decoration; nº 10: the driver's local record must keep working fully offline and must
never be blocked by account/sync state). The rule numbers aren't enumerated in one place in
tracked files — infer intent from the surrounding comment when the number alone isn't enough
context.
