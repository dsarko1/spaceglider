import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import type {
  PerfilInvocador,
  ResultadoBusquedaInvocador,
  LeagueEntryDTO,
} from '../compartido/contratos';

const MENSAJES = {
  API_KEY_FALTANTE: 'Falta configurar RIOT_API_KEY en el archivo .env.',
  ERROR_CONFIGURACION: 'No se pudo leer la configuración local de Spaceglider.',
  ENTRADA_INVALIDA: 'Ingresá un Riot ID válido con el formato Nombre#Etiqueta.',
  NO_ENCONTRADO: 'No se encontró ese Riot ID.',
  API_KEY_INVALIDA: 'La clave de Riot no es válida o no tiene acceso.',
  LIMITE_PETICIONES:
    'Riot limitó temporalmente las consultas. Probá más tarde.',
  ERROR_RIOT: 'Riot no pudo completar la consulta. Probá más tarde.',
  ERROR_RED:
    'No se pudo conectar con Riot. Revisá la conexión e intentá de nuevo.',
  RESPUESTA_INVALIDA: 'Riot devolvió una respuesta que no se pudo interpretar.',
} as const;
const DURACION_CACHE_MS = 10 * 60 * 1000;
const MAX_LONGITUD_RIOT_ID = 64;
const TIEMPO_LIMITE_PETICION_MS = 15_000;
const MAX_REINTENTOS_429 = 2;
const MAX_ESPERA_RETRY_AFTER_MS = 30_000;
const MAX_PERFILES_CACHE = 1000;
const ARCHIVO_CACHE = 'riot-cache.json';

type Codigo = keyof typeof MENSAJES;
type Objeto = Record<string, unknown>;
type EntradaCache = { guardadoEn: number; perfil: PerfilInvocador };
type CachePerfiles = Record<string, EntradaCache>;
type ResultadoRetryAfter =
  | { valido: false }
  | { valido: true; esperaMs: number };

const cacheEnMemoria = new Map<string, EntradaCache>();
let cacheEnMemoriaInicializada = false;

interface AccountDTO {
  gameName: string;
  tagLine: string;
  puuid: string;
}

interface SummonerDTO {
  summonerLevel: number;
  profileIconId: number;
}

function esArchivoInexistente(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  );
}

function esCodigo(valor: string): valor is Codigo {
  return Object.hasOwn(MENSAJES, valor);
}

function fallo(codigo: Codigo): ResultadoBusquedaInvocador {
  return { ok: false, codigo, mensaje: MENSAJES[codigo] };
}

function leerClave(): string | undefined {
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

function esObjeto(valor: unknown): valor is Objeto {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function texto(valor: unknown): valor is string {
  return typeof valor === 'string' && valor.length > 0;
}

function numero(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isFinite(valor);
}

function leerCuenta(valor: unknown): AccountDTO | undefined {
  if (
    !esObjeto(valor) ||
    !texto(valor.gameName) ||
    !texto(valor.tagLine) ||
    !texto(valor.puuid)
  ) {
    return undefined;
  }
  return {
    gameName: valor.gameName,
    tagLine: valor.tagLine,
    puuid: valor.puuid,
  };
}

function leerInvocador(valor: unknown): SummonerDTO | undefined {
  if (
    !esObjeto(valor) ||
    !numero(valor.summonerLevel) ||
    !numero(valor.profileIconId)
  ) {
    return undefined;
  }
  return {
    summonerLevel: valor.summonerLevel,
    profileIconId: valor.profileIconId,
  };
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

async function pedirConReintentos(
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

function perfilValido(valor: unknown): valor is PerfilInvocador {
  return (
    esObjeto(valor) &&
    texto(valor.gameName) &&
    texto(valor.tagLine) &&
    numero(valor.summonerLevel) &&
    numero(valor.profileIconId) &&
    typeof valor.rangosDisponibles === 'boolean' &&
    leerRangos(valor.rangos) !== undefined
  );
}

function rutaCache(): string {
  return path.join(app.getPath('userData'), ARCHIVO_CACHE);
}

function leerCache(): CachePerfiles {
  try {
    const contenido: unknown = JSON.parse(fs.readFileSync(rutaCache(), 'utf8'));
    if (!esObjeto(contenido)) throw new Error('Formato de caché inválido');
    const cache = Object.create(null) as CachePerfiles;
    for (const [clave, valor] of Object.entries(contenido)) {
      if (
        !/^[^#\s]+#[^#\s]+$/.test(clave) ||
        !esObjeto(valor) ||
        !numero(valor.guardadoEn) ||
        !perfilValido(valor.perfil)
      ) {
        throw new Error('Entrada de caché inválida');
      }
      if (
        Date.now() - valor.guardadoEn >= 0 &&
        Date.now() - valor.guardadoEn < DURACION_CACHE_MS
      ) {
        cache[clave] = { guardadoEn: valor.guardadoEn, perfil: valor.perfil };
      }
    }
    return limitarCantidadCache(cache);
  } catch (error) {
    if (esArchivoInexistente(error)) return {};
    console.error('No se pudo leer la caché de Riot:', error);
    return {};
  }
}

function limitarCantidadCache(cache: CachePerfiles): CachePerfiles {
  const recientes = Object.entries(cache)
    .sort(
      ([, entradaA], [, entradaB]) => entradaB.guardadoEn - entradaA.guardadoEn,
    )
    .slice(0, MAX_PERFILES_CACHE);
  const limitado = Object.create(null) as CachePerfiles;
  for (const [clave, entrada] of recientes) limitado[clave] = entrada;
  return limitado;
}

function inicializarCacheMemoria(): void {
  if (cacheEnMemoriaInicializada) return;
  cacheEnMemoriaInicializada = true;
  for (const [clave, entrada] of Object.entries(leerCache())) {
    cacheEnMemoria.set(clave, entrada);
  }
}

function obtenerCacheVigente(clave: string): EntradaCache | undefined {
  inicializarCacheMemoria();
  const entrada = cacheEnMemoria.get(clave);
  if (!entrada) return undefined;
  const edad = Date.now() - entrada.guardadoEn;
  if (edad < 0 || edad >= DURACION_CACHE_MS) {
    cacheEnMemoria.delete(clave);
    return undefined;
  }
  return entrada;
}

function guardarCache(cache: CachePerfiles): void {
  try {
    const ruta = rutaCache();
    const rutaTemporal = `${ruta}.${process.pid}.tmp`;
    fs.mkdirSync(path.dirname(ruta), { recursive: true });
    fs.writeFileSync(rutaTemporal, JSON.stringify(cache), 'utf8');
    fs.renameSync(rutaTemporal, ruta);
  } catch (error) {
    console.error('No se pudo guardar la caché de Riot:', error);
  }
}

function persistirCacheMemoria(): void {
  const cacheLimitada = limitarCantidadCache(
    Object.fromEntries(cacheEnMemoria.entries()),
  );
  cacheEnMemoria.clear();
  for (const [clave, entrada] of Object.entries(cacheLimitada)) {
    cacheEnMemoria.set(clave, entrada);
  }
  guardarCache(cacheLimitada);
}

function normalizarRiotId(gameName: string, tagLine: string): string {
  return `${gameName.normalize('NFKC').trim().toLocaleLowerCase('en-US')}#${tagLine
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('en-US')}`;
}

function leerRangos(valor: unknown): LeagueEntryDTO[] | undefined {
  if (!Array.isArray(valor)) return undefined;
  const rangos: LeagueEntryDTO[] = [];
  for (const item of valor) {
    if (
      !esObjeto(item) ||
      !texto(item.queueType) ||
      !texto(item.tier) ||
      !texto(item.rank) ||
      !numero(item.leaguePoints) ||
      !numero(item.wins) ||
      !numero(item.losses)
    )
      return undefined;
    rangos.push({
      queueType: item.queueType,
      tier: item.tier,
      rank: item.rank,
      leaguePoints: item.leaguePoints,
      wins: item.wins,
      losses: item.losses,
    });
  }
  return rangos;
}

export async function buscarInvocadorPorRiotId(
  entrada: unknown,
): Promise<ResultadoBusquedaInvocador> {
  if (typeof entrada !== 'string' || entrada.length > MAX_LONGITUD_RIOT_ID) {
    return fallo('ENTRADA_INVALIDA');
  }
  const coincidencia = /^\s*([^#\s][^#]*)#([^#\s][^#]*)\s*$/.exec(entrada);
  if (!coincidencia) return fallo('ENTRADA_INVALIDA');
  const gameName = coincidencia[1].trim();
  const tagLine = coincidencia[2].trim();
  if (!gameName || !tagLine) return fallo('ENTRADA_INVALIDA');

  try {
    const claveCache = normalizarRiotId(gameName, tagLine);
    const almacenado = obtenerCacheVigente(claveCache);
    if (almacenado) {
      return { ok: true, perfil: almacenado.perfil };
    }

    const clave = leerClave();
    if (!clave) return fallo('API_KEY_FALTANTE');

    const raizAmericas = 'https://americas.api.riotgames.com';
    const cuenta = leerCuenta(
      await pedirConReintentos(
        `${raizAmericas}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
        clave,
        0,
      ),
    );
    if (!cuenta) throw new Error('RESPUESTA_INVALIDA');

    const raizLA2 = 'https://la2.api.riotgames.com';
    const invocador = leerInvocador(
      await pedirConReintentos(
        `${raizLA2}/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(cuenta.puuid)}`,
        clave,
        0,
      ),
    );
    if (!invocador) throw new Error('RESPUESTA_INVALIDA');
    let rangos: LeagueEntryDTO[] = [];
    let rangosDisponibles = true;
    try {
      const rangosSinProcesar = await pedirConReintentos(
        `${raizLA2}/lol/league/v4/entries/by-puuid/${encodeURIComponent(cuenta.puuid)}`,
        clave,
        0,
      );
      const rangosLeidos = leerRangos(rangosSinProcesar);
      if (!rangosLeidos) throw new Error('RESPUESTA_INVALIDA');
      rangos = rangosLeidos;
    } catch (error) {
      if (!(error instanceof Error) || error.message !== 'ACCESO_DENEGADO') {
        throw error;
      }
      rangosDisponibles = false;
    }

    const perfil: PerfilInvocador = {
      gameName: cuenta.gameName,
      tagLine: cuenta.tagLine,
      summonerLevel: invocador.summonerLevel,
      profileIconId: invocador.profileIconId,
      rangosDisponibles,
      rangos,
    };
    cacheEnMemoria.set(claveCache, { guardadoEn: Date.now(), perfil });
    persistirCacheMemoria();
    return { ok: true, perfil };
  } catch (error) {
    if (
      error instanceof TypeError ||
      (error instanceof Error && error.name === 'TimeoutError')
    ) {
      return fallo('ERROR_RED');
    }
    const codigo = error instanceof Error ? error.message : '';
    if (esCodigo(codigo)) return fallo(codigo);
    return fallo('ERROR_RIOT');
  }
}
