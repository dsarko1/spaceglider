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