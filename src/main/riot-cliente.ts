import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

const TIEMPO_LIMITE_PETICION_MS = 15_000;
const MAX_REINTENTOS_429 = 2;
const MAX_ESPERA_RETRY_AFTER_MS = 30_000;

type ResultadoRetryAfter =
  | { valido: false }
  | { valido: true; esperaMs: number };

function esArchivoInexistente(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  );
}

export function leerClave(): string | undefined {
  const desdeEntorno = process.env.RIOT_API_KEY?.trim();
  if (desdeEntorno) return desdeEntorno;

  try {
    const contenido = fs.readFileSync(
      path.join(
        app.isPackaged ? app.getPath('userData') : app.getAppPath(),
        '.env',
      ),
      'utf8',
    );
    const linea = contenido
      .split(/\r?\n/)
      .find((item) => /^\s*RIOT_API_KEY\s*=/.test(item));
    if (!linea) return undefined;
    const valor = linea.slice(linea.indexOf('=') + 1).trim();
    return valor.replace(/^(['"])(.*)\1$/, '$2').trim() || undefined;
  } catch (error) {
    if (esArchivoInexistente(error)) return undefined;
    throw new Error('ERROR_CONFIGURACION');
  }
}

function esperaRetryAfter(valor: string | null): ResultadoRetryAfter {
  if (!valor?.trim()) return { valido: false };
  const segundos = /^\d+(?:\.\d+)?$/.test(valor.trim())
    ? Number(valor)
    : undefined;
  const espera =
    segundos === undefined ? Date.parse(valor) - Date.now() : segundos * 1000;
  if (!Number.isFinite(espera) || espera < 0) return { valido: false };
  return { valido: true, esperaMs: espera };
}

function dormir(milisegundos: number): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver, milisegundos));
}

export async function pedirConReintentos(
  direccion: string,
  clave: string,
  reintentos: number,
): Promise<unknown> {
  const respuesta = await fetch(direccion, {
    headers: { 'X-Riot-Token': clave, Accept: 'application/json' },
    signal: AbortSignal.timeout(TIEMPO_LIMITE_PETICION_MS),
  });
  if (!respuesta.ok) {
    if (respuesta.status === 401) throw new Error('API_KEY_INVALIDA');
    if (respuesta.status === 403) throw new Error('ACCESO_DENEGADO');
    if (respuesta.status === 404) throw new Error('NO_ENCONTRADO');
    if (respuesta.status === 429) {
      if (reintentos < MAX_REINTENTOS_429) {
        const retryAfter = esperaRetryAfter(
          respuesta.headers.get('Retry-After'),
        );
        if (retryAfter.valido) {
          if (retryAfter.esperaMs > MAX_ESPERA_RETRY_AFTER_MS)
            throw new Error('LIMITE_PETICIONES');
          await dormir(retryAfter.esperaMs);
        } else {
          await dormir(1000 * 2 ** reintentos);
        }
        return pedirConReintentos(direccion, clave, reintentos + 1);
      }
      throw new Error('LIMITE_PETICIONES');
    }
    if (respuesta.status >= 500) throw new Error('ERROR_RIOT');
    throw new Error('ERROR_RIOT');
  }
  try {
    return await respuesta.json();
  } catch {
    throw new Error('RESPUESTA_INVALIDA');
  }
}
