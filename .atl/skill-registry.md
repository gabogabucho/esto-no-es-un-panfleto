# Skill Registry

**Project**: esto-no-es-un-panfleto
**Generated**: 2026-08-07 (sdd-init)
**Updated**: 2026-08-07 (requisitos hard del cliente)
**Mode**: engram

## Compact Rules (inject into EVERY sub-agent prompt as `## Project Standards (auto-resolved)`)

### R1 — Registro lingüístico venezolano (CHEQUEO HARD, no negociable)

Regla del entregable C-acto3 §"Registro lingüístico — regla para los tres actos". Verificación automatizable + revisión humana obligatoria. Cualquier texto del juego (escenas, UI, strings) debe pasar este chequeo:

1. **Narración y UI**: tuteo venezolano neutro — "haces", "tienes", "aquí". NUNCA "acá".
2. **Acto 1 (San Cristóbal)**: diálogo andino/gocho — "usted" constante, incluso entre amigos/familia.
3. **Acto 2 (Caracas)**: tuteo caraqueño — "tú tienes", "tú sabes".
4. **Acto 3 (Maracaibo)**: voseo maracucho — "vos tenéis", "vos sois", "vos podéis", "vos sabéis", "vos queréis". Conserva el diptongo plural. NO es voseo rioplatense.
5. **PROHIBIDO (rioplatense)**: tenés, sos, podés, querés, sabés, hacés, publicás, salís, elegís, pasás, empezás, encontrás, abrís, señalás, mirá, vení, dejá. Los imperativos rioplatenses ("mirá/vení/dejá") coinciden con el maracucho — permitidos solo en Acto 3 diálogo, prohibidos en narración.
6. **PROHIBIDO léxico**: "acá" (→ "aquí"), "chico"=pequeño (→ "pequeño"; "chamo" es el venezolano correcto), "básquet" (→ "baloncesto"), "colectivo"=vehículo (en Venezuela "colectivo" = grupo armado afín al gobierno; NUNCA autobús).
7. **Falsos positivos permitidos**: estás, después, además, demás, nomás, país, autobús.
8. Léxico venezolano confirmado (no tocar): bus, cuadra, carro, franela, cancha, morral, chamo, mijo, alcabala, redoma, guaya, perdigón, lacrimógena, ballena.
9. Texto original del cliente (poemas/relatos citados) se mantiene EXACTO, sin "correcciones".
10. Todo diálogo atribuible a persona real: solo cita textual documentada con fuente. Nunca diálogo inventado.

**Implementación técnica del chequeo**: script `scripts/check-locale.mjs` (Node) que escanee todos los archivos de contenido del juego (`src/content/**`) y falle si encuentra formas prohibidas de la lista R1.5/R1.6. Se ejecuta en `npm test` como gate de CI y en pre-commit. Se puede anclar por acto (cada escena tiene metadata de acto para saber qué registro aplicar).

### R2 — Estética visual jugable (mobile-first NO es texto-first)

Referencia de control/estética: https://puntero.ar ("La calle manda" — juego de decisiones Next.js/PWA: decisiones, rosca, poder). El juego debe ser VISUALMENTE jugable, no un muro de texto:

1. Cada modo (FEED/ZINE/RADIO) tiene identidad visual propia y reconocible (tokens de color de referencia-visual-y-mecanicas §3: #12130f, #e8ddc4, #8c2f1f, #c9a227, #2c4a52, #5b7a63).
2. Tipografía display condensada (Anton/Oswald) + mono (IBM Plex Mono/JetBrains Mono) — nunca system fonts para títulos.
3. Los controles/decisiones son superficies táctiles grandes y estéticas (estilo puntero.ar): el jugador "toca/elige", no "lee y decide" — micro-interacciones visuales en cada elección.
4. La Señal (mecánica unificadora) es el elemento visual firma: se degrada en los 3 modos (glitch FEED, estática RADIO, papel rasgado ZINE).
5. Cada decisión tiene peso visual: cambio de stat animado/mostrado, feedback inmediato.
6. PWA con theme-color oscuro, splash, viewport-fit=cover, mobile-web-app-capable (como puntero.ar).
7. prefers-reduced-motion: versión reducida del glitch/estática (menos movimiento, mismo mensaje por color/textura).
8. Contraste AA, focus de teclado visible, una decisión a la vez, sin scroll horizontal.

### R3 — Fotografía de archivo con atribución (obligatoria cuando exista)

1. Google está lleno de fotos de archivo del período (protestas 2014, GNB, barricadas, estudiantes). Usarlas en lo posible como capa visual — aunque sea traslúcidas sobre los modos FEED/ZINE/RADIO (fondo con opacidad, nunca compitiendo con la legibilidad del texto).
2. **Toda foto DEBE llevar su fuente/atribución visible o en pantalla de créditos**: medio, fecha, autor si se conoce, licencia (CC, prensa de la época, archivo, etc.).
3. Si no se puede verificar la fuente de una foto → NO se usa. Las escenas que no tengan foto verificada usan los tokens visuales (color, textura, tipografía) de R2.
4. Fotos de personas reales: aplicar las reglas de atribución del brief §4 — las víctimas fatales reales NO se dramatizan; su fotografía solo en memorial con datos verificados.
5. Al implementar: descargar y commitear las imágenes en `src/assets/archive/` con metadata de fuente en un `ATTRIBUTION.md` o en los metadatos de la escena. Nunca hotlink desde Google Images.
6. Prioridad de uso: (a) foto de archivo verificada, (b) composición visual con tokens/tipografía, (c) texto puro como último recurso — el objetivo R2 es "visualmente jugable, no solo texto".

## Project Conventions

No convention files detected in project root (no `CLAUDE.md`, `AGENTS.md`, `agents.md`, `GEMINI.md`, `.cursorrules`, `copilot-instructions.md`). No project-level skill directories. First SDD init for this project.

Detected conventions (from documentation-only project):
- All docs in Spanish (Venezuelan Spanish, voseo); game copy should match.
- Doc structure: `brief-investigacion-*` + `entregable-{A..H}-*` + `referencia-visual-y-mecanicas.md` + `notas-de-verificacion.md`.
- Target stack (planned): web game, HTML5 Canvas/JavaScript, mobile-first.
- No code yet → no linter/test/formatter conventions exist yet.

## Available Skills (user-level, deduped by name)

| Skill | Location | Trigger |
|-------|----------|---------|
| branch-pr | `~/.config/opencode/skills/branch-pr` | Creating a PR, opening a PR, preparing changes for review (Agent Teams Lite issue-first enforcement) |
| issue-creation | `~/.config/opencode/skills/issue-creation` | Creating a GitHub issue, reporting a bug, requesting a feature |
| go-testing | `~/.config/opencode/skills/go-testing` | Writing Go tests, teatest, adding test coverage |
| judgment-day | `~/.config/opencode/skills/judgment-day` | "judgment day", adversarial/dual review, "que lo juzguen" |
| skill-creator | `~/.config/opencode/skills/skill-creator` | Creating a new agent skill, adding agent instructions, documenting patterns for AI |
| google-ads-manage | `~/.claude/skills/google-ads-manage` | Manage Google Ads campaigns (pause/activate, RSAs, negative keywords) — preview→confirm flow |
| google-ads-ga4 | `~/.claude/skills/google-ads-ga4` | GA4 data queries, cross-referencing with Google Ads |
| google-ads-analyze | `~/.claude/skills/google-ads-analyze` | Analyze Google Ads account/campaign/ad/keyword performance |
| google-ads-setup | `~/.claude/skills/google-ads-setup` | Diagnose/configure google-ads MCP for Claude Code / Claude Desktop |
| windows-admin | `~/.claude/skills/windows-admin/Claw/clawhub` | Remote Windows administration via PowerShell (SSH/WSL2) |
| eas-app-stores | `~/.agents/skills/eas-app-stores` | Deploy Expo apps to iOS/Android stores with EAS build/submit |
| eas-hosting | `~/.agents/skills/eas-hosting` | Deploy Expo websites/API routes to EAS Hosting |
| eas-observe | `~/.agents/skills/eas-observe` | EAS Observe metrics for Expo apps |
| eas-simulator | `~/.agents/skills/eas-simulator` | Run/control app on remote EAS cloud simulator |
| eas-update-insights | `~/.agents/skills/eas-update-insights` | EAS Update health: crash rates, installs, channel split |
| eas-workflows | `~/.agents/skills/eas-workflows` | EAS workflow YAML / CI-CD for Expo |
| expo-app-clip | `~/.agents/skills/expo-app-clip` | iOS App Clip target in Expo |
| expo-brownfield | `~/.agents/skills/expo-brownfield` | Embed React Native in existing native app |
| expo-data-fetching | `~/.agents/skills/expo-data-fetching` | Network requests, API calls, data fetching in Expo |
| expo-dev-client | `~/.agents/skills/expo-dev-client` | Expo development clients, TestFlight internal testing |
| expo-dom | `~/.agents/skills/expo-dom` | Expo DOM components (web code in webview on native) |
| expo-examples | `~/.agents/skills/expo-examples` | Expo official example projects, with-* integrations |
| expo-migrate-module | `~/.agents/skills/expo-migrate-module` | Migrate Swift module to Expo Modules API 2.0 macros |
| expo-module | `~/.agents/skills/expo-module` | Create/write Expo native modules and views |
| expo-native-ui | `~/.agents/skills/expo-native-ui` | Native-feeling Expo screens (HIG, SF Symbols, media, animations) |
| expo-project-structure | `~/.agents/skills/expo-project-structure` | Folder structure for new Expo apps (new projects only) |
| expo-router | `~/.agents/skills/expo-router` | Expo Router navigation and routing |
| expo-skill-eval | `~/.agents/skills/expo-skill-eval` | Eval Expo skills end-to-end with device screenshots |
| expo-skill-feedback | `~/.agents/skills/expo-skill-feedback` | Submit feedback on Expo skills / Expo itself; telemetry control |
| expo-tailwind-setup | `~/.agents/skills/expo-tailwind-setup` | Tailwind CSS v4 in Expo (NativeWind v5 / react-native-css) |
| expo-ui | `~/.agents/skills/expo-ui` | Native UI with @expo/ui (SwiftUI / Jetpack Compose) |
| expo-upgrade | `~/.agents/skills/expo-upgrade` | Upgrade Expo SDK versions, fix dependency issues |
| expo-web-to-native | `~/.agents/skills/expo-web-to-native` | Migrate web React app to native Expo app |
| find-skills | `~/.agents/skills/find-skills` | Discover/install agent skills ("find a skill for X") |
| orchestration | `~/.agents/skills/orchestration` | Structured multi-agent coordination (DAG, tasks, gates) |
| orca-cli | `~/.agents/skills/orca-cli` | Orca CLI: worktrees, terminals, repos, browser, handoffs |

SDD skills (sdd-init, sdd-propose, sdd-spec, sdd-design, sdd-tasks, sdd-apply, sdd-verify, sdd-archive, sdd-explore) exist under `~/.config/opencode/skills/` (mirrors also in `~/.claude/skills/`, `~/.gemini/skills/`, `~/.cursor/skills/`) — excluded from registry per convention.

## Notes

- No project-level skills or convention files found.
- `customize-opencode` is built-in (not registered).
- Registry deduped by name; opencode config dir wins for mirrored skills.
- For this project (web game, HTML5 Canvas/JS), the Expo/EAS skills are NOT directly applicable — relevant future skills: none currently cover vanilla JS/Canvas game dev; may need a custom skill or the game-engine skill reference.
