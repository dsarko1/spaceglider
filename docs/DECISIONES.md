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

## D-011: IPC con funciones específicas y contrato compartido (2026-10-03)

- **Decisión:** el preload expone con `contextBridge` solo funciones concretas (`window.spaceglider.ping()`), nunca `ipcRenderer` completo. Los nombres de canales y los tipos viven en `src/shared/ipc.ts`.
- **Motivo:** si el renderer tuviera `ipcRenderer`, cualquier script de la página podría mandar mensajes arbitrarios al main. Con un contrato compartido, TypeScript detecta errores de tipeo en los canales.
- **Relacionada con:** D-004 (la API key vive solo en el main).

## D-012: Estructura de `src/` y nombres de archivo (2026-10-03)

- **Decisión:** `src/main/main.ts`, `src/preload/preload.ts` y `src/renderer/renderer.ts`, con `index.html` en la raíz.
- **Motivo:** conservar los nombres que usa el scaffold evita cambiar las rutas compiladas (`preload.cjs`, `main.cjs`). Mover `index.html` exigiría configurar la raíz de Vite con riesgo de romper el empaquetado.
- **Alternativa descartada:** archivos `index.ts` en cada carpeta, por riesgo de colisión de nombres en la salida de Vite.

## D-013: Variables de entorno con dotenv (2026-10-03)

- **Alternativas:** `process.loadEnvFile()` de Node (sin dependencias, pero no verificamos que lo soporte el Node de Electron 44) e inyectar la key en el build con Vite (descartada: deja la key dentro del código compilado).
- **Decisión:** `dotenv`, validado en `loadConfig()` al arrancar. Los mensajes de error nombran la variable, nunca su valor.
- **Limitación conocida:** lee `.env` desde la carpeta del proyecto, así que en una app empaquetada no existe. Se resuelve en el ticket de empaquetado.

## D-014: Cliente único de Riot, independiente de Electron (2026-10-03)

- **Decisión:** todo pedido a Riot pasa por `RiotClient` (`src/services/riot`). Envía la key en el header `X-Riot-Token`, usa timeout de 10 s y traduce los errores a `RiotApiError` con un `kind`.
- **Política ante 429:** Riot pide frenar durante los segundos de `Retry-After`. Reintentamos hasta 2 veces si la espera es de 10 s o menos; con esperas mayores no insistimos e informamos cuánto esperar.
- **Limitación conocida:** el control es por pedido, sin coordinación global. Si más adelante lanzamos muchas llamadas en paralelo (por ejemplo, detalle de varias partidas), hará falta una cola con límite de concurrencia y caché.

## D-015: Resultados IPC tipados en vez de errores lanzados (2026-10-03)

- **Decisión:** las operaciones que pueden fallar devuelven `IpcResult<T>` (`{ ok: true, data }` o `{ ok: false, error }`), construido con `toResult` en `src/main/ipc.ts`.
- **Motivo:** un error lanzado en el main llega al renderer sin sus campos (`kind`, `status`), y la interfaz no puede decidir qué mostrar.
- **Pendiente menor:** `IpcErrorInfo.kind` es un `string`. Si la interfaz empieza a distinguir tipos de error, conviene tiparlo con la unión de `RiotErrorKind`.

## D-016: Endpoint de estado como prueba de conexión (2026-10-03)

- **Decisión:** el botón de prueba consulta `/lol/status/v4/platform-data` en el servidor configurado.
- **Motivo:** exige la key, así que sirve para validarla, y según la documentación de una librería de la comunidad no cuenta contra los límites de la aplicación. No lo verificamos en la documentación oficial.
