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
   → nivel e icono.
3. `puuid` → LEAGUE-V4
   `GET https://la2.api.riotgames.com/lol/league/v4/entries/by-puuid/{puuid}`
   → rango y `leaguePoints`.

ACCOUNT-V1 usa el enrutamiento regional Americas. SUMMONER-V4 y LEAGUE-V4 usan
la plataforma LA2. LEAGUE-V4 se consulta por `puuid`.

Los DTO de Riot se verifican al recibirlos mediante validaciones TypeScript; no
se usa Zod en este hito. La clave va en el encabezado `X-Riot-Token`.

## Historial de partidas

Con el `puuid` del perfil se consultan las últimas partidas con MATCH-V5:

1. `GET https://americas.api.riotgames.com/lol/match/v5/matches/by-puuid/{puuid}/ids?start={inicio}&count={cantidad}`
   → ids de partida, de la más reciente a la más antigua.
2. `GET https://americas.api.riotgames.com/lol/match/v5/matches/{matchId}`
   → una consulta por partida; una partida fallida no cancela las demás.

Cada partida se resume con campeón, resultado, KDA, duración, cola y fecha. Los
ids se cachean por índice durante 5 minutos y solo se piden los tramos que
faltan; los resúmenes duran 10 minutos. El historial se pide de a 10 partidas
(o menos) usando `inicio` y `cantidad`.

## Recursos visuales

Los iconos de perfil vienen de Data Dragon: la versión vigente se cachea 24 horas
en el renderer y los iconos se piden a `/cdn/{version}/img/profileicon/{id}.png`.
Las chapas de rango vienen de CommunityDragon (ruta `ranked-emblem`) y llevan
`onError` para ocultarse si no cargan. Ambas cosas son cosméticas: un fallo de
red no impide mostrar el perfil.

## Estado del renderer

El proceso principal no guarda preferencias de interfaz. El renderer usa
`localStorage` con estas claves, validadas al leer y con límites propios:

- `spaceglider-perfil-fijado`: el invocador elegido explícitamente para la barra
  lateral (Riot ID y último perfil conocido). Es independiente del buscador
  principal; al abrir la app se muestra lo guardado y se refresca en segundo
  plano.
- `spaceglider-favoritos`: hasta 20 invocadores guardados con la estrella.
- `spaceglider-recientes`: hasta 8 búsquedas exitosas del buscador principal.
- `spaceglider-sidebar-expandida`: si la barra lateral está abierta.

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
`LeagueEntryDTO`, `puuid`, `leaguePoints` y `queueType`).

Verbos canónicos:

- `obtener*`: leer datos existentes, como `obtenerPerfil`.
- `buscar*`: buscar con datos ingresados por la persona, como
  `buscarInvocadorPorRiotId`.
- `guardar*`: escribir en caché o disco, como `guardarEnCache`.
- `leer*`: leer caché o disco, como `leerDeCache`.
- `formatear*`: preparar datos para la interfaz, como `formatearRango`.
- `limitar*`: controlar el límite de peticiones, como `limitarPeticiones`.

Todo verbo fuera de esta lista requiere justificación.

## Fuera del Hito 2

- Filtros del historial, maestrías y más regiones.
- Zod: Fase 2 / opcional; no se instala ni se usa en el MVP.
- SQLite: Fase 2.
- Integración con LCU y Champion Select: futuro, no implementada.
