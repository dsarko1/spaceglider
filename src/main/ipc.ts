import { ipcMain } from 'electron';
import { IPC_CHANNELS, type PingResponse } from '../shared/ipc';

// Registra los "oyentes" de mensajes que vienen del renderer.
// Cuando lleguen más canales (buscar invocador, etc.) se suman acá.
export function registerIpcHandlers(): void {
  // handle() = "cuando llegue un mensaje por este canal, ejecutá esta función
  // y devolvé su resultado". Del lado del renderer, siempre llega como promesa.
  ipcMain.handle(IPC_CHANNELS.ping, (): PingResponse => {
    return {
      message: 'pong desde el proceso main',
      timestamp: Date.now(),
    };
  });
}
