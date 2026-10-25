export interface LeagueEntryDTO {
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
}

export interface PerfilInvocador {
  gameName: string;
  tagLine: string;
  summonerLevel: number;
  profileIconId: number;
  rangosDisponibles: boolean;
  rangos: LeagueEntryDTO[];
}

export type CodigoErrorBusqueda =
  | 'API_KEY_FALTANTE'
  | 'ERROR_CONFIGURACION'
  | 'ENTRADA_INVALIDA'
  | 'NO_ENCONTRADO'
  | 'API_KEY_INVALIDA'
  | 'LIMITE_PETICIONES'
  | 'ERROR_RIOT'
  | 'ERROR_RED'
  | 'RESPUESTA_INVALIDA';

export type ResultadoBusquedaInvocador =
  | { ok: true; perfil: PerfilInvocador }
  | { ok: false; codigo: CodigoErrorBusqueda; mensaje: string };

export interface APIEnlaceSpaceglider {
  buscarInvocadorPorRiotId(riotId: string): Promise<ResultadoBusquedaInvocador>;
}

declare global {
  interface Window {
    spaceglider: APIEnlaceSpaceglider;
  }
}
