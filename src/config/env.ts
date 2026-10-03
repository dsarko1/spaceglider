import dotenv from 'dotenv';

// Configuración que necesita la app, ya validada.
export interface AppConfig {
  riotApiKey: string;
  riotPlatform: string; // servidor del jugador, ej: la2
  riotRegion: string; // región de enrutamiento, ej: americas
}

// Lee una variable obligatoria. Los mensajes de error mencionan el NOMBRE
// de la variable, nunca su valor (para no filtrar la key en logs).
function requireVar(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Falta la variable ${name} en el archivo .env (mirá .env.example).`,
    );
  }
  return value;
}

// Carga el .env y devuelve la configuración. Si algo está mal, lanza un error
// claro apenas arranca la app, y no a mitad de una búsqueda.
export function loadConfig(): AppConfig {
  // Lee ".env" desde la carpeta desde donde se ejecuta la app.
  dotenv.config({ quiet: true });

  const riotApiKey = requireVar('RIOT_API_KEY');
  if (riotApiKey.includes('completar')) {
    throw new Error('RIOT_API_KEY todavía tiene el valor de ejemplo.');
  }
  if (!riotApiKey.startsWith('RGAPI-')) {
    throw new Error(
      'RIOT_API_KEY no parece válida: debería empezar con RGAPI-.',
    );
  }

  return {
    riotApiKey,
    riotPlatform: requireVar('RIOT_PLATFORM').toLowerCase(),
    riotRegion: requireVar('RIOT_REGION').toLowerCase(),
  };
}
