// Contrato IPC: lo comparten main, preload y renderer.

// Nombres de canales. "as const" hace que TypeScript los trate como
// valores exactos y no como un string cualquiera.
export const IPC_CHANNELS = {
  ping: 'app:ping',
  riotCheckConnection: 'riot:check-connection',
} as const;

// Forma de la respuesta del ping.
export interface PingResponse {
  message: string;
  timestamp: number;
}

// --- Operaciones que pueden fallar ---
// Un error lanzado en el main llega al renderer sin sus campos (kind, status...).
// Por eso estas operaciones devuelven un objeto: o salió bien, o trae el error.
export interface IpcErrorInfo {
  kind: string; // ej: "invalid_key", "not_found", "rate_limited"
  message: string; // texto listo para mostrarle al usuario
  status?: number;
  retryAfterSeconds?: number;
}

export type IpcResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: IpcErrorInfo };

export interface RiotConnectionInfo {
  platformId: string;
  name: string;
}

// Forma de la API que el preload expone al renderer como window.spaceglider.
// Cada función nueva que sumemos al puente se declara acá primero.
export interface SpaceGliderApi {
  ping: () => Promise<PingResponse>;
  checkRiotConnection: () => Promise<IpcResult<RiotConnectionInfo>>;
}
