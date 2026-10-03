import type { RiotClient } from './riotClient';

// Solo los campos de la respuesta de Riot que usamos.
interface PlatformDataDto {
  id: string;
  name: string;
}

// Estado de la plataforma LoL. Sirve para comprobar que la key funciona.
// Convención: un archivo por área de la API de Riot (status, account, league...).
export async function getPlatformStatus(
  client: RiotClient,
): Promise<PlatformDataDto> {
  return client.get<PlatformDataDto>(
    'platform',
    '/lol/status/v4/platform-data',
  );
}
