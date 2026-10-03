# Spaceglider

Companion app de escritorio para League of Legends, similar a páginas como OP.GG o U.GG, pero de uso local. Busca invocadores y muestra su rango, maestría y partidas recientes usando la API de Riot Games.

> 🚧 **Estado:** en desarrollo temprano. Todavía no hay una app ejecutable.

## Stack

- [Electron](https://www.electronjs.org/) (app de escritorio)
- TypeScript + Node.js
- HTML y CSS en la interfaz
- API de Riot Games (más adelante: LCU API para datos en vivo)

## Requisitos

- Node.js 18 o superior
- Git
- Una API key de Riot Games ([developer.riotgames.com](https://developer.riotgames.com))

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