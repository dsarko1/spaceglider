# Tickets

Convención: `SG-NNN`. Tamaños: chico / mediano / grande.
Un ticket se cierra solo cuando se cumplen todos sus criterios de aceptación.

## 🔄 En progreso

## 📋 Pendientes

| ID     | Título                                                               | Tamaño  | Depende de |
| ------ | -------------------------------------------------------------------- | ------- | ---------- |
| SG-004 | Configuración de `.env` y cliente base de Riot (fetch, errores, 429) | mediano | SG-003     |
| SG-005 | Buscar Riot ID (nombre#tag) y obtener PUUID                          | mediano | SG-004     |
| SG-006 | UI de búsqueda y perfil básico (ícono, nivel)                        | mediano | SG-005     |
| SG-007 | Mostrar elo/rango (ranked)                                           | chico   | SG-006     |
| SG-008 | Mostrar maestría de campeones                                        | chico   | SG-006     |
| SG-009 | Lista de partidas recientes                                          | grande  | SG-006     |
| SG-010 | Filtros de partidas (cola, campeón, resultado)                       | mediano | SG-009     |
| SG-011 | Configurar Content Security Policy en la ventana                     | chico   | SG-003     |

## ✅ Completados

## SG-001: Repositorio Git, `.gitignore` y documentación base

**Objetivo:** dejar el repo listo para trabajar, con secretos protegidos y documentación desde el primer commit.

**Criterios de aceptación:**

- [x] Repositorio inicializado en `main` con remote `origin`
- [x] `.gitignore` protege `.env`, `node_modules/`, `out/`, `dist/`
- [x] `.env.example` creado sin valores reales
- [x] `README.md`, `CHANGELOG.md` y `docs/DECISIONES.md` creados
- [x] `docs/TICKETS.md` con el backlog
- [x] Commits hechos y subidos a `origin`

## SG-002: Crear proyecto Electron + TypeScript con Forge

**Criterios de aceptación:**

- [x] Proyecto Electron Forge con TypeScript funcionando en el repo
- [x] `npm start` abre una ventana de la app
- [x] `.env`, `.env.example` y `.gitignore` intactos; `.env` sigue ignorado
- [x] `package.json` con nombre `spaceglider` y descripción correcta
- [x] README con instrucciones de instalación y ejecución
- [x] `CHANGELOG.md` y `docs/TICKETS.md` actualizados
- [x] Commits hechos y subidos a `origin`

---

## SG-003: Estructura de carpetas y comunicación IPC de prueba

**Criterios de aceptación:**

- [x] Código movido a `src/main`, `src/preload` y `src/renderer`
- [x] Existen `src/shared`, `src/services/riot` y `src/config`
- [x] `npm start` sigue abriendo la ventana
- [x] Un botón "Ping" pide una respuesta al main y la muestra
- [x] El renderer no tiene acceso directo a Node ni a `ipcRenderer`
- [x] `npm run typecheck` y `npm run lint` pasan
- [x] README y `DECISIONES.md` actualizados
- [x] Commits hechos y subidos
