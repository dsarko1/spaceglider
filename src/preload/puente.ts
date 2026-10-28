import { contextBridge, ipcRenderer } from 'electron';
import type { APIEnlaceSpaceglider } from '../compartido/contratos';

const api: APIEnlaceSpaceglider = Object.freeze({
  buscarInvocadorPorRiotId: (riotId: string) =>
    ipcRenderer.invoke('riot:buscar-invocador', riotId),
  buscarHistorialInvocador: (
    riotId: string,
    inicio?: number,
    cantidad?: number,
  ) => ipcRenderer.invoke('historial:buscar', riotId, inicio, cantidad),
  buscarMaestriasInvocador: (riotId: string) =>
    ipcRenderer.invoke('maestrias:buscar', riotId),
});

contextBridge.exposeInMainWorld('spaceglider', api);
