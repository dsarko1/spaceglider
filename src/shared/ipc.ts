// Contrato IPC: lo comparten main, preload y renderer.

// Nombres de canales. "as const" hace que TypeScript los trate como
// valores exactos y no como un string cualquiera.
export const IPC_CHANNELS = {
  ping: 'app:ping',
} as const;

// Forma de la respuesta del ping.
export interface PingResponse {
  message: string;
  timestamp: number;
}

// Forma de la API que el preload expone al renderer como window.spaceglider.
// Cada función nueva que sumemos al puente se declara acá primero.
export interface SpaceGliderApi {
  ping: () => Promise<PingResponse>;
}
