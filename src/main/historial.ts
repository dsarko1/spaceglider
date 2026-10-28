import type {
  CodigoErrorBusqueda,
  ResumenPartida,
  ResultadoHistorialInvocador,
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
const MAX_CANTIDAD_PARTIDAS = 50;
const DURACION_CACHE_IDS_MS = 5 * 60 * 1000;
const DURACION_CACHE_PARTIDAS_MS = 10 * 60 * 1000;
const MAX_ENTRADAS_CACHE = 100;

type Objeto = Record<string, unknown>;
type EntradaIds = {
  guardadoEn: number;
  cantidadCubierta: number;
  idsPorIndice: Map<number, string>;
};
type EntradaPartida = { guardadoEn: number; resumen: ResumenPartida };

const cacheIds = new Map<string, EntradaIds>();
const cachePartidas = new Map<string, EntradaPartida>();

function esObjeto(valor: unknown): valor is Objeto {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function texto(valor: unknown): valor is string {
  return typeof valor === 'string' && valor.length > 0;
}

function numero(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isFinite(valor);
}

function error(codigo: CodigoErrorBusqueda): ResultadoHistorialInvocador {
  return { ok: false, codigo, mensaje: MENSAJES[codigo] };
}

function leerCuenta(valor: unknown): { puuid: string } | undefined {
  if (!esObjeto(valor) || !texto(valor.puuid)) return undefined;
  return { puuid: valor.puuid };
}

function leerIds(valor: unknown): string[] | undefined {
  if (!Array.isArray(valor) || !valor.every(texto)) return undefined;
  return valor;
}

function leerResumen(
  valor: unknown,
  puuid: string,
): ResumenPartida | undefined {
  if (!esObjeto(valor) || !esObjeto(valor.metadata) || !esObjeto(valor.info)) {
    return undefined;
  }
  const { metadata, info } = valor;
  if (!texto(metadata.matchId) || !Array.isArray(info.participants)) {
    return undefined;
  }
  const participante = info.participants.find(
    (item) => esObjeto(item) && item.puuid === puuid,
  );
  if (
    !esObjeto(participante) ||
    !texto(participante.championName) ||
    typeof participante.win !== 'boolean' ||
    !numero(participante.kills) ||
    !numero(participante.deaths) ||
    !numero(participante.assists) ||
    !numero(info.gameDuration) ||
    !numero(info.queueId) ||
    !numero(info.gameStartTimestamp)
  ) {
    return undefined;
  }
  return {
    matchId: metadata.matchId,
    campeon: participante.championName,
    resultado: participante.win ? 'victoria' : 'derrota',
    asesinatos: participante.kills,
    muertes: participante.deaths,
    asistencias: participante.assists,
    duracionEnSegundos: info.gameDuration,
    queueId: info.queueId,
    gameStartTimestamp: info.gameStartTimestamp,
  };
}

function estaVigente(guardadoEn: number, duracion: number): boolean {
  const edad = Date.now() - guardadoEn;
  return edad >= 0 && edad < duracion;
}

function guardarLimitado<T>(
  cache: Map<string, T>,
  clave: string,
  valor: T,
): void {
  cache.delete(clave);
  cache.set(clave, valor);
  while (cache.size > MAX_ENTRADAS_CACHE) {
    const masAntigua = cache.keys().next().value;
    if (masAntigua === undefined) break;
    cache.delete(masAntigua);
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

export async function obtenerHistorialInvocador(
  riotId: string,
  inicio = 0,
  cantidad = 10,
): Promise<ResultadoHistorialInvocador> {
  if (
    typeof riotId !== 'string' ||
    riotId.length > MAX_LONGITUD_RIOT_ID ||
    !Number.isInteger(inicio) ||
    inicio < 0 ||
    !Number.isInteger(cantidad) ||
    cantidad < 1 ||
    cantidad > MAX_CANTIDAD_PARTIDAS
  ) {
    return error('ENTRADA_INVALIDA');
  }
  const coincidencia = /^\s*([^#\s][^#]*)#([^#\s][^#]*)\s*$/.exec(riotId);
  if (!coincidencia) return error('ENTRADA_INVALIDA');
  const gameName = coincidencia[1].trim();
  const tagLine = coincidencia[2].trim();
  if (!gameName || !tagLine) return error('ENTRADA_INVALIDA');

  try {
    const clave = leerClave();
    if (!clave) return error('API_KEY_FALTANTE');
    const raiz = 'https://americas.api.riotgames.com';
    const cuenta = leerCuenta(
      await pedirConReintentos(
        `${raiz}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
        clave,
        0,
      ),
    );
    if (!cuenta) throw new Error('RESPUESTA_INVALIDA');

    const idsCacheados = cacheIds.get(cuenta.puuid);
    let entradaIds =
      idsCacheados &&
      estaVigente(idsCacheados.guardadoEn, DURACION_CACHE_IDS_MS)
        ? idsCacheados
        : { guardadoEn: 0, cantidadCubierta: 0, idsPorIndice: new Map() };
    const fin = inicio + cantidad;
    for (let indice = inicio; indice < fin;) {
      if (entradaIds.idsPorIndice.has(indice)) {
        indice += 1;
        continue;
      }
      const inicioFaltante = indice;
      while (indice < fin && !entradaIds.idsPorIndice.has(indice)) {
        indice += 1;
      }
      const cantidadFaltante = indice - inicioFaltante;
      const idsLeidos = leerIds(
        await pedirConReintentos(
          `${raiz}/lol/match/v5/matches/by-puuid/${encodeURIComponent(cuenta.puuid)}/ids?start=${inicioFaltante}&count=${cantidadFaltante}`,
          clave,
          0,
        ),
      );
      if (!idsLeidos) throw new Error('RESPUESTA_INVALIDA');
      for (let posicion = 0; posicion < idsLeidos.length; posicion += 1) {
        entradaIds.idsPorIndice.set(
          inicioFaltante + posicion,
          idsLeidos[posicion],
        );
      }
      entradaIds = {
        guardadoEn: Date.now(),
        cantidadCubierta: entradaIds.idsPorIndice.size,
        idsPorIndice: entradaIds.idsPorIndice,
      };
      if (idsLeidos.length < cantidadFaltante) break;
    }
    guardarLimitado(cacheIds, cuenta.puuid, entradaIds);
    const ids = Array.from({ length: cantidad }, (_, posicion) =>
      entradaIds.idsPorIndice.get(inicio + posicion),
    ).filter((matchId): matchId is string => matchId !== undefined);

    const partidas: ResumenPartida[] = [];
    for (const matchId of ids) {
      const clavePartida = `${cuenta.puuid}:${matchId}`;
      const partidaCacheada = cachePartidas.get(clavePartida);
      if (
        partidaCacheada &&
        estaVigente(partidaCacheada.guardadoEn, DURACION_CACHE_PARTIDAS_MS)
      ) {
        partidas.push(partidaCacheada.resumen);
        continue;
      }
      try {
        const resumen = leerResumen(
          await pedirConReintentos(
            `${raiz}/lol/match/v5/matches/${encodeURIComponent(matchId)}`,
            clave,
            0,
          ),
          cuenta.puuid,
        );
        if (!resumen) continue;
        guardarLimitado(cachePartidas, clavePartida, {
          guardadoEn: Date.now(),
          resumen,
        });
        partidas.push(resumen);
      } catch {
        continue;
      }
    }
    return { ok: true, partidas };
  } catch (errorRecibido) {
    return error(codigoError(errorRecibido));
  }
}
