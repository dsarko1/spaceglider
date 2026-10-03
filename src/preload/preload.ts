import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS, type SpaceGliderApi } from '../shared/ipc';

// Anotar el tipo hace que TypeScript avise si la implementación
// no coincide con el contrato (por ejemplo, si falta una función).
const api: SpaceGliderApi = {
  // invoke() manda el mensaje al main y devuelve una promesa
  // con lo que responda ipcMain.handle().
  ping: () => ipcRenderer.invoke(IPC_CHANNELS.ping),
};

// Publica el objeto en el renderer como window.spaceglider.
// OJO: se expone "api", nunca "ipcRenderer" completo.
contextBridge.exposeInMainWorld('spaceglider', api);
