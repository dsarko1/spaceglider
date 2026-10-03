# Decisiones técnicas

Registro de por qué elegimos cada cosa. Se agrega una entrada nueva por decisión.

## D-001: Empezar directamente con Electron (2026-10-03)

- **Contexto:** el plan original era una versión web y migrar a Electron después.
- **Decisión:** arrancar ya con Electron para aprender la herramienta y ver la app tomar forma desde el principio.
- **Consecuencia:** la lógica de Riot se separa de Electron (`src/services/riot`) para que sea fácil de probar y de reutilizar.

## D-002: Electron Forge con plantilla Vite + TypeScript (2026-10-03)

- **Alternativas:** electron-vite (comunidad), configuración manual.
- **Decisión:** Electron Forge, por ser la herramienta oficial y tener la mejor documentación.

## D-003: TypeScript en vez de JavaScript (2026-10-03)

- **Alternativas:** JavaScript, o JavaScript con JSDoc.
- **Decisión:** TypeScript, porque un integrante del equipo ya lo conoce y puede dar soporte.
- **Riesgo asumido:** curva de aprendizaje extra al combinarlo con Electron y la API de Riot.

## D-004: La API key vive solo en el proceso main (2026-10-03)

- **Decisión:** la key se lee desde `.env` únicamente en el proceso main de Electron. La interfaz (renderer) nunca la ve; pide los datos por IPC.
- **Motivo:** cualquier cosa que esté en el renderer es inspeccionable.

## D-005: Tickets en `docs/TICKETS.md` (2026-10-03)

- **Alternativas:** GitHub Issues + Project board.
- **Decisión:** empezar con un archivo versionado en el repo. Migrar a GitHub Issues si el trabajo en paralelo lo justifica.

## D-006: Prefijo de tickets `SG-` (2026-10-03)

- **Decisión:** `SG-` (Spaceglider) en lugar de `RA-`, que venía del nombre anterior (Rift Assistant).

## D-007: Versiones y plantilla del scaffold (2026-10-03)

- **Decisión:** proyecto generado con `create-electron-app` usando `--template=vite --typescript` (Forge 8, Electron 44, TypeScript 6, Vite 8).
- **Contexto:** el comando `--template=vite-typescript` de la documentación y de muchos tutoriales ya no funciona en esta versión.
- **Riesgo:** la documentación consultada marcaba el soporte de Vite como experimental desde Forge 7.5.0 (no verificamos si sigue así en la v8). No actualizamos versiones mayores sin probar, y `package-lock.json` está commiteado.

## D-008: Mantener oxlint y oxfmt (2026-10-03)

- **Decisión:** conservar el linter (oxlint) y el formateador (oxfmt) que trae la plantilla.
- **Motivo:** trabajamos dos personas; el formato automático evita discusiones de estilo. Se corren con `npm run lint` antes de cada commit.

## D-009: Licencia UNLICENSED (2026-10-03)

- **Decisión:** `"license": "UNLICENSED"` en `package.json`, en lugar del `MIT` que traía la plantilla.
- **Motivo:** no hay una decisión tomada sobre licencia. "Todos los derechos reservados" es lo más conservador y se puede abrir después, pero no al revés.

## D-010: `.gitignore` propio y compacto (2026-10-03)

- **Decisión:** mantener nuestro `.gitignore` y sumarle solo las reglas útiles del de la plantilla, que era una lista genérica de 130 líneas (Next.js, Nuxt, Gatsby...).
- **Motivo:** más fácil de leer y mantener. Las reglas de `.env` están cubiertas.
