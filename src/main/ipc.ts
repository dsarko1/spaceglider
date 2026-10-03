import { ipcMain } from 'electron';
import {
  IPC_CHANNELS,
  type IpcErrorInfo,
  type IpcResult,
  type PingResponse,
  type RiotConnectionInfo,
} from '../shared/ipc';
import { RiotApiError } from '../services/riot/errors';
import type { RiotClient } from '../services/riot/riotClient';
import { getPlatformStatus } from '../services/riot/status';

// Convierte cualquier error en un objeto simple que sí puede viajar por IPC.
function toIpcError(error: unknown): IpcErrorInfo {
  if (error instanceof RiotApiError) {
    return {
      kind: error.kind,
      message: error.message,
      status: error.status,
      retryAfterSeconds: error.retryAfterSeconds,
    };
  }
  // Error que no esperábamos (un bug nuestro): se registra en la terminal
  // y a la interfaz solo le llega un mensaje genérico.
  console.error('[ipc] error inesperado:', error);
  return {
    kind: 'unknown',
    message:
      'Ocurrió un error inesperado. Revisá la terminal del proceso main.',
  };
}

// Ejecuta una acción y siempre devuelve un IpcResult, sin lanzar errores.
// Los handlers que sumemos más adelante van a reutilizar este mismo envoltorio.
async function toResult<T>(action: () => Promise<T>): Promise<IpcResult<T>> {
  try {
    return { ok: true, data: await action() };
  } catch (error) {
    return { ok: false, error: toIpcError(error) };
  }
}

// Registra los "oyentes" de mensajes que vienen del renderer.
// Recibe el cliente de Riot ya armado: la key vive solo en el main.
export function registerIpcHandlers(riot: RiotClient): void {
  ipcMain.handle(IPC_CHANNELS.ping, (): PingResponse => {
    return {
      message: 'pong desde el proceso main',
      timestamp: Date.now(),
    };
  });

  ipcMain.handle(IPC_CHANNELS.riotCheckConnection, () =>
    toResult<RiotConnectionInfo>(async () => {
      const status = await getPlatformStatus(riot);
      return { platformId: status.id, name: status.name };
    }),
  );
}
