# Registro de cambios

## Hito 0

- Inicializada la aplicación con Electron Forge, Vite y TypeScript.
- Añadida la base de React y una pantalla inicial en español.
- Aislados los contextos de Electron y excluido `.env` del empaquetado.
- Documentados los comandos, la arquitectura y las convenciones del proyecto.

## Hito 1

- Añadida la búsqueda de invocadores por Riot ID para LA2 y la vista de perfil.
- Integradas ACCOUNT-V1, SUMMONER-V4 y LEAGUE-V4 mediante IPC seguro.
- Añadidas caché en memoria y JSON, expiración de 10 minutos y reintentos HTTP 429.
- Documentados la configuración local de la clave y los límites de Riot API.
- El perfil básico se conserva cuando Riot deniega la consulta de clasificatorias.

## Hito 2

- Corregida la búsqueda con LEAGUE-V4 por puuid; SUMMONER-V4 ya no devuelve id.
- Añadidos los iconos de perfil con Data Dragon y la navegación Perfil/Historial.
- Integrado MATCH-V5 para las últimas partidas, con cachés y paginación por inicio y cantidad.
- Añadidas las chapas de rango de CommunityDragon en la tarjeta y en los chips.
- Barra lateral colapsable con perfil fijado, favoritos y búsquedas recientes en localStorage.
- Vista de historial con filtros por cola y resultado, y botón para cargar más.
