# Arquitectura

## Capas

- `src/main/`: proceso principal de Electron; crea ventanas, consulta Riot y
  mantiene la caché de perfiles.
- `src/preload/`: puente mínimo entre Electron y la interfaz. Solo expondrá
  la operación IPC explícita y tipada para buscar un invocador.
- `src/renderer/`: interfaz React y estilos CSS; no accede directamente a
  Node.js ni a claves privadas.
- `src/compartido/`: contratos TypeScript compartidos entre procesos.

La ventana usa `contextIsolation`, `sandbox` y `nodeIntegration: false`. La
clave Riot se lee solo desde el proceso principal y nunca se expone por IPC ni
se incluye en el renderer. En desarrollo, se lee desde `.env` en la raíz del
proyecto; en una app empaquetada, desde `.env` en `app.getPath('userData')`.
Electron Forge excluye `.env` del paquete.

## Flujo de datos Riot implementado

La búsqueda por Riot ID ejecuta estas consultas en orden:

1. Riot ID (`gameName#tagLine`) → ACCOUNT-V1
   `GET https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}`
   → `puuid`.
2. `puuid` → SUMMONER-V4
   `GET https://la2.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/{puuid}`
   → `summonerId`, nivel e icono.
3. `summonerId` → LEAGUE-V4
   `GET https://la2.api.riotgames.com/lol/league/v4/entries/by-summoner/{summonerId}`
   → rango y `leaguePoints`.

ACCOUNT-V1 usa el enrutamiento regional Americas. SUMMONER-V4 y LEAGUE-V4 usan
la plataforma LA2. La consulta LEAGUE-V4 se hace por `summonerId`, no por
`puuid`.

Los DTO de Riot se verifican al recibirlos mediante validaciones TypeScript; no
se usa Zod en este hito. La clave va en el encabezado `X-Riot-Token`.

## Caché y límites

Los perfiles encontrados se guardan en memoria y en `riot-cache.json` dentro de
`app.getPath('userData')`. La caché dura 10 minutos y conserva hasta 1.000
perfiles.

Ante HTTP 429 se respetan hasta dos reintentos. Se usa `Retry-After` si la espera
es de hasta 30 segundos; si falta o no es válido, se aplica backoff exponencial.
Si Riot indica una espera mayor, la búsqueda devuelve un error de límite en vez
de reintentar antes de tiempo. Cada petición vence a los 15 segundos.

Si LEAGUE-V4 responde HTTP 403, la interfaz conserva el perfil básico y señala
que la consulta de rangos no está autorizada; no lo presenta como una cuenta
sin clasificar.

## Convenciones de nombres

El código propio usa español para nombres de archivos, funciones, variables y
constantes. Los tipos y campos que representan datos oficiales de Riot conservan
los nombres documentados en inglés (por ejemplo, `AccountDTO`, `SummonerDTO`,
`LeagueEntryDTO`, `puuid`, `summonerId`, `leaguePoints` y `queueType`).

Verbos canónicos:

- `obtener*`: leer datos existentes, como `obtenerPerfil`.
- `buscar*`: buscar con datos ingresados por la persona, como
  `buscarInvocadorPorRiotId`.
- `guardar*`: escribir en caché o disco, como `guardarEnCache`.
- `leer*`: leer caché o disco, como `leerDeCache`.
- `formatear*`: preparar datos para la interfaz, como `formatearRango`.
- `limitar*`: controlar el límite de peticiones, como `limitarPeticiones`.

Todo verbo fuera de esta lista requiere justificación.

## Fuera del Hito 1

- Historial de partidas, maestrías, filtros y más regiones.
- Zod: Fase 2 / opcional; no se instala ni se usa en el MVP.
- SQLite: Fase 2.
- Integración con LCU y Champion Select: futuro, no implementada.
