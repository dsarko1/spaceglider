import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

const DURACION_CACHE_MS = 24 * 60 * 60 * 1000;
const ARCHIVO_CACHE = 'champions-cache.json';
const RAIZ_DDRAGON = 'https://ddragon.leagueoflegends.com';

type Objeto = Record<string, unknown>;
type Campeon = { championId: number; identificador: string };
type CacheCampeones = {
  guardadoEn: number;
  version: string;
  campeones: Record<string, Campeon>;
};

let cacheEnMemoria: CacheCampeones | undefined;

function esObjeto(valor: unknown): valor is Objeto {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function esTexto(valor: unknown): valor is string {
  return typeof valor === 'string' && valor.length > 0;
}

function esNumero(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isInteger(valor);
}

function rutaCache(): string {
  return path.join(app.getPath('userData'), ARCHIVO_CACHE);
}

function leerCacheDisco(): CacheCampeones | undefined {
  try {
    const valor: unknown = JSON.parse(fs.readFileSync(rutaCache(), 'utf8'));
    if (
      !esObjeto(valor) ||
      !esNumero(valor.guardadoEn) ||
      !esTexto(valor.version) ||
      !esObjeto(valor.campeones)
    ) {
      return undefined;
    }
    const campeones: Record<string, Campeon> = {};
    for (const [nombre, datos] of Object.entries(valor.campeones)) {
      if (
        !esTexto(nombre) ||
        !esObjeto(datos) ||
        !esNumero(datos.championId) ||
        !esTexto(datos.identificador)
      ) {
        return undefined;
      }
      campeones[nombre] = {
        championId: datos.championId,
        identificador: datos.identificador,
      };
    }
    return {
      guardadoEn: valor.guardadoEn,
      version: valor.version,
      campeones,
    };
  } catch {
    return undefined;
  }
}

function guardarCache(cache: CacheCampeones): void {
  try {
    const ruta = rutaCache();
    const temporal = `${ruta}.${process.pid}.tmp`;
    fs.mkdirSync(path.dirname(ruta), { recursive: true });
    fs.writeFileSync(temporal, JSON.stringify(cache), 'utf8');
    fs.renameSync(temporal, ruta);
  } catch {
    // La caché de disco es opcional; el mapeo sigue disponible en memoria.
  }
}

async function pedirJson(direccion: string): Promise<unknown> {
  let respuesta: Response;
  try {
    respuesta = await fetch(direccion, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new Error('ERROR_RED');
  }
  if (!respuesta.ok) throw new Error('ERROR_RIOT');
  try {
    return await respuesta.json();
  } catch {
    throw new Error('RESPUESTA_INVALIDA');
  }
}

function leerVersiones(valor: unknown): string | undefined {
  if (!Array.isArray(valor)) return undefined;
  return valor.find(esTexto);
}

function leerCampeones(valor: unknown): Record<string, Campeon> | undefined {
  if (!esObjeto(valor) || !esObjeto(valor.data)) return undefined;
  const campeones: Record<string, Campeon> = {};
  for (const [nombre, valorCampeon] of Object.entries(valor.data)) {
    if (
      !esObjeto(valorCampeon) ||
      !esTexto(valorCampeon.id) ||
      !esTexto(valorCampeon.key) ||
      !/^\d+$/.test(valorCampeon.key)
    ) {
      continue;
    }
    const campeon = {
      championId: Number(valorCampeon.key),
      identificador: valorCampeon.id,
    };
    campeones[nombre.toLocaleLowerCase('en-US')] = campeon;
    campeones[valorCampeon.id.toLocaleLowerCase('en-US')] = campeon;
  }
  return Object.keys(campeones).length > 0 ? campeones : undefined;
}

export async function obtenerDatosCampeones(): Promise<{
  version: string;
  campeones: Record<string, Campeon>;
}> {
  if (!cacheEnMemoria) cacheEnMemoria = leerCacheDisco();
  const cache = cacheEnMemoria;
  const edadCache = cache ? Date.now() - cache.guardadoEn : -1;
  if (cache && edadCache >= 0 && edadCache < DURACION_CACHE_MS) {
    return { version: cache.version, campeones: cache.campeones };
  }

  const versiones = leerVersiones(
    await pedirJson(`${RAIZ_DDRAGON}/api/versions.json`),
  );
  if (!versiones) throw new Error('RESPUESTA_INVALIDA');
  const campeones = leerCampeones(
    await pedirJson(
      `${RAIZ_DDRAGON}/cdn/${versiones}/data/es_ES/champion.json`,
    ),
  );
  if (!campeones) throw new Error('RESPUESTA_INVALIDA');
  cacheEnMemoria = {
    guardadoEn: Date.now(),
    version: versiones,
    campeones,
  };
  guardarCache(cacheEnMemoria);
  return { version: versiones, campeones };
}

export function buscarCampeon(
  campeones: Record<string, Campeon>,
  nombre: string,
): Campeon | undefined {
  return campeones[nombre.toLocaleLowerCase('en-US')];
}

export function urlIconoCampeon(
  version: string,
  identificador: string,
): string {
  return `${RAIZ_DDRAGON}/cdn/${version}/img/champion/${encodeURIComponent(identificador)}.png`;
}
