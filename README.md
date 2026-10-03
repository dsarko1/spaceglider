# Spaceglider

Companion app de escritorio para League of Legends, similar a páginas como OP.GG o U.GG, pero de uso local. Busca invocadores y muestra su rango, maestría y partidas recientes usando la API de Riot Games.

> 🚧 **Estado:** en desarrollo temprano. Todavía no hay una app ejecutable.
> 🚧 **Estado:** en desarrollo temprano. La app base de Electron abre una ventana, pero todavía no tiene funciones.

## Stack

- [Electron](https://www.electronjs.org/) + [Electron Forge](https://www.electronforge.io/) con Vite
- TypeScript + Node.js
- HTML y CSS en la interfaz
- API de Riot Games (más adelante: LCU API para datos en vivo)

## Requisitos

- Node.js y npm (probado con Node 24 y npm 11)
- Git
- Una API key de Riot Games ([developer.riotgames.com](https://developer.riotgames.com))

## Instalación y ejecución

```bash
git clone <url-del-repo>
cd spaceglider
npm install
```

Copiá la plantilla de variables de entorno y completá tu key (en PowerShell: `Copy-Item .env.example .env`):

```bash
cp .env.example .env
```

> **Nunca subas el archivo `.env`.** Está en `.gitignore`.

Iniciá la app:

```bash
npm start
```

## Scripts

| Comando             | Qué hace                                       |
| ------------------- | ---------------------------------------------- |
| `npm start`         | Abre la app en modo desarrollo                 |
| `npm run typecheck` | Revisa errores de tipos con TypeScript         |
| `npm run lint`      | Revisa el código y el formato (oxlint + oxfmt) |
| `npm run lint:fix`  | Corrige automáticamente lo que pueda           |
| `npm run package`   | Empaqueta la app                               |
| `npm run make`      | Genera instaladores                            |

## Estructura actual

```
src/
├── main.ts       # Proceso main (crea la ventana)
├── preload.ts    # Puente entre main y renderer
├── renderer.ts   # Código de la interfaz
└── index.css     # Estilos
```

> Esta estructura es provisoria: se reorganiza en `src/main`, `src/preload` y `src/renderer` en SG-003.

## Configuración

1. Cloná el repositorio.
2. Copiá `.env.example` como `.env`.
3. Completá `RIOT_API_KEY` con tu key. **Nunca subas el archivo `.env`.**

> Los pasos de instalación y ejecución se agregan cuando exista el proyecto Electron (SG-002).

## Documentación

- [Decisiones técnicas](docs/DECISIONES.md)
- [Tickets y backlog](docs/TICKETS.md)
- [Changelog](CHANGELOG.md)

## Convención de commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/es/): `feat`, `fix`, `docs`, `style`, `refactor`, `chore`, `test`.

Ejemplo: `feat(search): agregar búsqueda de invocador por nombre y tag`
