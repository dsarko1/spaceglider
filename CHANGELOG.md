# Changelog

Todos los cambios importantes del proyecto se documentan acá.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [Unreleased]

### Added

- Repositorio inicial con `.gitignore`, `.env.example` y documentación base (SG-001).
- Proyecto base con Electron Forge, Vite y TypeScript; `npm start` abre una ventana (SG-002).
- Linter y formateador con oxlint y oxfmt, y script de typecheck (SG-002).
- Comunicación IPC de prueba: botón Ping en la interfaz que consulta al proceso main (SG-003).
- Contrato IPC compartido en `src/shared/ipc.ts` (SG-003).

### Changed

- `.gitignore` ampliado con cachés de herramientas (SG-002).
- `src/` reorganizado en `main`, `preload`, `renderer`, `shared`, `services` y `config` (SG-003).
