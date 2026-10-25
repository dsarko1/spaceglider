# Spaceglider

Aplicación de escritorio para consultar perfiles de League of Legends en la
región LA2. Permite buscar por Riot ID y muestra icono, nivel y clasificatorias.

## Requisitos

- Windows
- Node.js y npm

## Comandos

Desde la carpeta del proyecto:

```bash
npm install
npm start
```

`npm start` inicia la aplicación en modo desarrollo con Electron Forge y Vite.

```bash
npm run lint
npm run typecheck
npm run package
npm run make
```

- `npm run lint`: revisa formato y reglas estáticas.
- `npm run typecheck`: ejecuta TypeScript sin emitir archivos.
- `npm run package`: empaqueta la aplicación sin crear un instalador.
- `npm run make`: genera un archivo ZIP portable para Windows.

## Clave de Riot

Para desarrollo, creá `.env` en la raíz del proyecto usando `.env.example` como
referencia:

```dotenv
RIOT_API_KEY=tu_clave_de_riot
```

No compartas la clave por el chat ni la guardes en el código. `.env` está
excluido de Git y del paquete `.asar`. En una aplicación empaquetada, el proceso
principal busca `.env` dentro de `app.getPath('userData')` (en Windows,
normalmente `%APPDATA%\Spaceglider\.env`).

## Alcance actual

El historial de partidas, maestrías, filtros, SQLite y la integración con LCU
no forman parte de este hito.
La arquitectura acordada está en [ARCHITECTURE.md](ARCHITECTURE.md).
