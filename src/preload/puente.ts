import { contextBridge, ipcRenderer } from 'electron';
import type { APIEnlaceSpaceglider } from '../compartido/contratos';

const api: APIEnlaceSpaceglider = Object.freeze({
  buscarInvocadorPorRiotId: (riotId: string) =>
    ipcRenderer.invoke('riot:buscar-invocador', riotId),
});

contextBridge.exposeInMainWorld('spaceglider', api);
