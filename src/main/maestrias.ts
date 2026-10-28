import type {
  CodigoErrorBusqueda,
  MaestriaCampeon,
  ResultadoMaestriasInvocador,
} from '../compartido/contratos';
import { leerClave, pedirConReintentos } from './riot-cliente';

const MENSAJES: Record<CodigoErrorBusqueda, string> = {
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
};
const MAX_LONGITUD_RIOT_ID = 64;
const CANTIDAD_MAESTRIAS = 10;
const DURACION_CACHE_MAESTRIAS_MS = 10 * 60 * 1000;
const DURACION_CACHE_NOMBRES_MS = 24 * 60 * 60 * 1000;
const MAX_ENTRADAS_CACHE = 100;

type Objeto = Record<string, unknown>;
type EntradaCache = { guardadoEn: number; maestrias: MaestriaCampeon[] };

const cacheMaestrias = new Map<string, EntradaCache>();
let nombresCampeones = new Map<number, string>();
let nombresActualizadosEn = 0;
let solicitudNombres: Promise<void> | null = null;

function esObjeto(valor: unknown): valor is Objeto {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function texto(valor: unknown): valor is string {
  return typeof valor === 'string' && valor.length > 0;
}

function numero(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isFinite(valor);
}

function error(codigo: CodigoErrorBusqueda): ResultadoMaestriasInvocador {
  return { ok: false, codigo, mensaje: MENSAJES[codigo] };
}

function leerCuenta(valor: unknown): { puuid: string } | undefined {
  if (!esObjeto(valor) || !texto(valor.puuid)) return undefined;
  return { puuid: valor.puuid };
}

function leerMaestria(valor: unknown): MaestriaCampeon | undefined {
  if (
    !esObjeto(valor) ||
    !numero(valor.championId) ||
    !numero(valor.championLevel) ||
    !numero(valor.championPoints)
  ) {
    return undefined;
  }
  return {
    campeonId: valor.championId,
    campeon: `Campeón ${valor.championId}`,
    nivel: valor.championLevel,
    puntos: valor.championPoints,
    ultimoJuego: numero(valor.lastPlayTime) ? valor.lastPlayTime : 0,
    fichas: numero(valor.tokensEarned) ? valor.tokensEarned : 0,
  };
}

function leerMaestrias(valor: unknown): MaestriaCampeon[] | undefined {
  if (!Array.isArray(valor)) return undefined;
  const maestrias: MaestriaCampeon[] = [];
  for (const item of valor) {
    const maestria = leerMaestria(item);
    if (maestria) maestrias.push(maestria);
  }
  return maestrias
    .sort((a, b) => b.puntos - a.puntos)
    .slice(0, CANTIDAD_MAESTRIAS);
}

function leerNombres(valor: unknown): Map<number, string> | undefined {
  if (!esObjeto(valor) || !esObjeto(valor.data)) return undefined;
  const nombres = new Map<number, string>();
  for (const item of Object.values(valor.data)) {
    if (
      !esObjeto(item) ||
      !texto(item.key) ||
      !texto(item.name) ||
      !/^\d+$/.test(item.key)
    ) {
      continue;
    }
    nombres.set(Number(item.key), item.name);
  }
  return nombres.size > 0 ? nombres : undefined;
}

async function pedirJson(url: string): Promise<unknown> {
  const respuesta = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!respuesta.ok) throw new Error('ERROR_RIOT');
  return respuesta.json();
}

async function cargarNombresCampeones(): Promise<void> {
  if (
    nombresCampeones.size > 0 &&
    Date.now() - nombresActualizadosEn < DURACION_CACHE_NOMBRES_MS
  ) {
    return;
  }
  if (solicitudNombres) return solicitudNombres;

  solicitudNombres = (async () => {
    try {
      const versiones = await pedirJson(
        'https://ddragon.leagueoflegends.com/api/versions.json',
      );
      const version = Array.isArray(versiones) ? versiones[0] : null;
      if (typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version)) {
        throw new Error('RESPUESTA_INVALIDA');
      }
      const nombres = leerNombres(
        await pedirJson(
          `https://ddragon.leagueoflegends.com/cdn/${version}/data/es_MX/champion.json`,
        ),
      );
      if (!nombres) throw new Error('RESPUESTA_INVALIDA');
      nombresCampeones = nombres;
      nombresActualizadosEn = Date.now();
    } catch {
      // Los nombres son cosméticos: si fallan, se usa el identificador.
    } finally {
      solicitudNombres = null;
    }
  })();

  return solicitudNombres;
}

function estaVigente(guardadoEn: number): boolean {
  const edad = Date.now() - guardadoEn;
  return edad >= 0 && edad < DURACION_CACHE_MAESTRIAS_MS;
}

function guardarLimitado(clave: string, entrada: EntradaCache): void {
  cacheMaestrias.delete(clave);
  cacheMaestrias.set(clave, entrada);
  while (cacheMaestrias.size > MAX_ENTRADAS_CACHE) {
    const masAntigua = cacheMaestrias.keys().next().value;
    if (masAntigua === undefined) break;
    cacheMaestrias.delete(masAntigua);
  }
}

function codigoError(errorRecibido: unknown): CodigoErrorBusqueda {
  if (
    errorRecibido instanceof TypeError ||
    (errorRecibido instanceof Error && errorRecibido.name === 'TimeoutError')
  ) {
    return 'ERROR_RED';
  }
  if (errorRecibido instanceof Error) {
    const codigo = errorRecibido.message as CodigoErrorBusqueda;
    if (Object.hasOwn(MENSAJES, codigo)) return codigo;
  }
  return 'ERROR_RIOT';
}

export async function obtenerMaestriasInvocador(
  riotId: unknown,
): Promise<ResultadoMaestriasInvocador> {
  if (typeof riotId !== 'string' || riotId.length > MAX_LONGITUD_RIOT_ID) {
    return error('ENTRADA_INVALIDA');
  }
  const coincidencia = /^\s*([^#\s][^#]*)#([^#\s][^#]*)\s*$/.exec(riotId);
  if (!coincidencia) return error('ENTRADA_INVALIDA');
  const gameName = coincidencia[1].trim();
  const tagLine = coincidencia[2].trim();
  if (!gameName || !tagLine) return error('ENTRADA_INVALIDA');

  const claveCache = `${gameName}#${tagLine}`.toLocaleLowerCase('es-AR');
  const cacheada = cacheMaestrias.get(claveCache);
  if (cacheada && estaVigente(cacheada.guardadoEn)) {
    return { ok: true, maestrias: cacheada.maestrias };
  }

  try {
    const clave = leerClave();
    if (!clave) return error('API_KEY_FALTANTE');
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
    const maestriasLeidas = leerMaestrias(
      await pedirConReintentos(
        `${raizLA2}/lol/champion-mastery/v4/champion-masteries/by-puuid/${encodeURIComponent(cuenta.puuid)}?count=${CANTIDAD_MAESTRIAS}`,
        clave,
        0,
      ),
    );
    if (!maestriasLeidas) throw new Error('RESPUESTA_INVALIDA');

    await cargarNombresCampeones();
    const maestrias = maestriasLeidas.map((maestria) => ({
      ...maestria,
      campeon: nombresCampeones.get(maestria.campeonId) ?? maestria.campeon,
    }));

    guardarLimitado(claveCache, { guardadoEn: Date.now(), maestrias });
    return { ok: true, maestrias };
  } catch (errorRecibido) {
    return error(codigoError(errorRecibido));
  }
}
