# Spaceglider

Companion app de escritorio para League of Legends, similar a páginas como OP.GG o U.GG, pero de uso local. Busca invocadores y muestra su rango, maestría y partidas recientes usando la API de Riot Games.

> > 🚧 **Estado:** en desarrollo temprano. La app abre una ventana con un botón de prueba de comunicación (Ping), pero todavía no tiene funciones de League of Legends.

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

## Estructura

```
src/
├── main/
│   ├── main.ts          # Crea la ventana y arranca la app
│   └── ipc.ts           # Handlers IPC: responden a los pedidos del renderer
├── preload/
│   └── preload.ts       # Puente seguro: expone window.spaceglider
├── renderer/
│   ├── renderer.ts      # Lógica de la interfaz
│   ├── global.d.ts      # Tipos de window.spaceglider
│   └── styles/index.css
├── services/riot/       # (vacío) cliente de la API de Riot
├── config/              # (vacío) lectura de variables de entorno
├── shared/
│   └── ipc.ts           # Contrato IPC: canales y tipos compartidos
└── declarations.d.ts
```

`index.html` queda en la raíz del proyecto.

## Cómo se comunican las partes

La interfaz (renderer) no tiene acceso a Node ni a la API key. Para pedir datos usa el puente del preload:

```
Renderer (botón) → Preload (window.spaceglider) → IPC → Main → respuesta
```

Para sumar una función nueva: declararla en `src/shared/ipc.ts`, implementar el handler en `src/main/ipc.ts` y exponerla en `src/preload/preload.ts`.

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
