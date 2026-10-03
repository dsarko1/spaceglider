# Spaceglider

Companion app de escritorio para League of Legends, similar a páginas como OP.GG o U.GG, pero de uso local. Busca invocadores y muestra su rango, maestría y partidas recientes usando la API de Riot Games.

> 🚧 **Estado:** en desarrollo temprano. La app abre una ventana, se conecta a la API de Riot con tu key y puede probar esa conexión. Todavía no busca invocadores.

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

## Variables de entorno

Se definen en `.env` (copia de `.env.example`). La app las valida al arrancar y, si falta alguna, falla con un mensaje claro.

| Variable        | Qué es                                         | Ejemplo                  |
| --------------- | ---------------------------------------------- | ------------------------ |
| `RIOT_API_KEY`  | Tu API key de Riot (empieza con `RGAPI-`)      | `RGAPI-...`              |
| `RIOT_PLATFORM` | Servidor de tu cuenta                          | `la2` (LAS), `la1` (LAN) |
| `RIOT_REGION`   | Región de enrutamiento para cuentas y partidas | `americas`               |

Sin comillas ni espacios alrededor del `=`. Para comprobar que la key funciona, usá el botón **Probar conexión con Riot** de la ventana.

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
│   └── ipc.ts           # Handlers IPC (usan toResult para devolver éxito o error)
├── preload/
│   └── preload.ts       # Puente seguro: expone window.spaceglider
├── renderer/
│   ├── renderer.ts      # Lógica de la interfaz
│   ├── global.d.ts      # Tipos de window.spaceglider
│   └── styles/index.css
├── services/riot/
│   ├── riotClient.ts    # Cliente HTTP: key, timeout, reintentos ante 429
│   ├── errors.ts        # RiotApiError con "kind" (invalid_key, not_found...)
│   └── status.ts        # Estado del servidor (prueba de conexión)
├── config/
│   └── env.ts           # Lee y valida el .env
├── shared/
│   └── ipc.ts           # Contrato IPC: canales y tipos compartidos
└── declarations.d.ts
```

`index.html` queda en la raíz del proyecto.

## Cómo se comunican las partes

La interfaz (renderer) no tiene acceso a Node ni a la API key. Para pedir datos usa el puente del preload:

```
Renderer (botón) → Preload (window.spaceglider) → IPC → Main → Cliente Riot → API de Riot
```

Para sumar una función nueva:

1. Declararla en `src/shared/ipc.ts` (si puede fallar, que devuelva `IpcResult<T>`).
2. Si usa Riot, escribir el servicio en `src/services/riot/`.
3. Implementar el handler en `src/main/ipc.ts`, envuelto en `toResult`.
4. Exponerla en `src/preload/preload.ts`.

## Documentación

- [Decisiones técnicas](docs/DECISIONES.md)
- [Tickets y backlog](docs/TICKETS.md)
- [Changelog](CHANGELOG.md)

## Convención de commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/es/): `feat`, `fix`, `docs`, `style`, `refactor`, `chore`, `test`.

Ejemplo: `feat(search): agregar búsqueda de invocador por nombre y tag`
