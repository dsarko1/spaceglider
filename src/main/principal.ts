import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { buscarInvocadorPorRiotId } from './riot';
import { obtenerHistorialInvocador } from './historial';

ipcMain.handle('riot:buscar-invocador', (_evento, riotId: unknown) =>
  buscarInvocadorPorRiotId(riotId),
);

ipcMain.handle(
  'historial:buscar',
  (_evento, riotId: unknown, cantidad: unknown) =>
    obtenerHistorialInvocador(
      riotId as string,
      cantidad === undefined ? undefined : (cantidad as number),
    ),
);

function crearVentana(): void {
  const ventanaPrincipal = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 760,
    minHeight: 560,
    backgroundColor: '#12263A',
    webPreferences: {
      preload: path.join(__dirname, 'puente.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    void ventanaPrincipal.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    void ventanaPrincipal.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }
}

void app.whenReady().then(() => {
  crearVentana();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      crearVentana();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
