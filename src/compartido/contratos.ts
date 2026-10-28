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

export interface ResumenPartida {
  matchId: string;
  campeon: string;
  championId: number;
  imagenCampeon?: string;
  resultado: 'victoria' | 'derrota';
  asesinatos: number;
  muertes: number;
  asistencias: number;
  duracionEnSegundos: number;
  queueId: number;
  gameStartTimestamp: number;
}

export type ResultadoHistorialInvocador =
  | { ok: true; partidas: ResumenPartida[]; hayMas: boolean }
  | { ok: false; codigo: CodigoErrorBusqueda; mensaje: string };

export interface MaestriaCampeon {
  campeonId: number;
  campeon: string;
  nivel: number;
  puntos: number;
  ultimoJuego: number;
  fichas: number;
}

export type ResultadoMaestriasInvocador =
  | { ok: true; maestrias: MaestriaCampeon[] }
  | { ok: false; codigo: CodigoErrorBusqueda; mensaje: string };

export interface APIEnlaceSpaceglider {
  buscarInvocadorPorRiotId(riotId: string): Promise<ResultadoBusquedaInvocador>;
  buscarHistorialInvocador(
    riotId: string,
    inicio?: number,
    cantidad?: number,
  ): Promise<ResultadoHistorialInvocador>;
  buscarMaestriasInvocador(
    riotId: string,
  ): Promise<ResultadoMaestriasInvocador>;
}

declare global {
  interface Window {
    spaceglider: APIEnlaceSpaceglider;
  }
}
