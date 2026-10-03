import { RiotApiError } from './errors';

// Si Riot no dice cuánto esperar, usamos este valor.
const DEFAULT_RETRY_AFTER_SECONDS = 2;
// Esperas más largas no se hacen "en silencio": se informa al usuario.
const MAX_AUTO_WAIT_SECONDS = 10;
const REQUEST_TIMEOUT_MS = 10_000;

export interface RiotClientOptions {
  apiKey: string;
  platform: string; // ej: la2
  region: string; // ej: americas
  maxRetries?: number; // reintentos ante un 429 (por defecto 2)
}

// Riot usa dos tipos de servidor:
//  - "platform": datos de un servidor (ranked, maestría, invocador...)
//  - "region":   cuenta (Riot ID -> PUUID) y partidas
export type RiotHost = 'platform' | 'region';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Retry-After viene en segundos. Si falta o es inválido, usamos el valor por defecto.
function parseRetryAfter(header: string | null): number {
  if (!header) return DEFAULT_RETRY_AFTER_SECONDS;
  const seconds = Number(header);
  return Number.isFinite(seconds) && seconds >= 0
    ? seconds
    : DEFAULT_RETRY_AFTER_SECONDS;
}

// Traduce una respuesta con error a un RiotApiError con mensaje en español.
function errorFromResponse(response: Response): RiotApiError {
  const { status } = response;

  if (status === 401 || status === 403) {
    return new RiotApiError(
      'invalid_key',
      `Riot rechazó la API key (error ${status}). Puede estar vencida, mal copiada o sin permiso para esta API.`,
      { status },
    );
  }
  if (status === 404) {
    return new RiotApiError(
      'not_found',
      'Riot no encontró lo que se pidió (error 404).',
      { status },
    );
  }
  if (status === 400) {
    return new RiotApiError(
      'bad_request',
      'El pedido a Riot es inválido (error 400).',
      { status },
    );
  }
  if (status === 429) {
    const retryAfterSeconds = parseRetryAfter(
      response.headers.get('Retry-After'),
    );
    return new RiotApiError(
      'rate_limited',
      `Se alcanzó el límite de peticiones de Riot. Esperá ${retryAfterSeconds} segundos y probá de nuevo.`,
      { status, retryAfterSeconds },
    );
  }
  if (status >= 500) {
    return new RiotApiError(
      'server',
      `Los servidores de Riot tienen problemas (error ${status}). Probá más tarde.`,
      { status },
    );
  }
  return new RiotApiError(
    'unknown',
    `Riot respondió con un error inesperado (${status}).`,
    { status },
  );
}

export class RiotClient {
  // "private readonly": solo se usan dentro de la clase y no se reasignan.
  // La key vive acá y nunca se expone ni se escribe en logs.
  private readonly apiKey: string;
  private readonly platform: string;
  private readonly region: string;
  private readonly maxRetries: number;

  constructor(options: RiotClientOptions) {
    this.apiKey = options.apiKey;
    this.platform = options.platform;
    this.region = options.region;
    this.maxRetries = options.maxRetries ?? 2;
  }

  // Hace un GET a Riot y devuelve el JSON. <T> es el tipo que esperamos recibir.
  async get<T>(host: RiotHost, path: string): Promise<T> {
    const subdomain = host === 'platform' ? this.platform : this.region;
    const url = `https://${subdomain}.api.riotgames.com${path}`;

    for (let attempt = 0; ; attempt++) {
      const response = await this.send(url);

      if (response.ok) {
        return this.parseJson<T>(response);
      }

      // Límite de peticiones: respetamos el Retry-After de Riot.
      // Reintentamos solo pocas veces y solo si la espera es corta.
      if (response.status === 429) {
        const waitSeconds = parseRetryAfter(
          response.headers.get('Retry-After'),
        );
        if (attempt < this.maxRetries && waitSeconds <= MAX_AUTO_WAIT_SECONDS) {
          await sleep(Math.max(waitSeconds, 1) * 1000);
          continue;
        }
      }

      throw errorFromResponse(response);
    }
  }

  // Envía el pedido. Solo falla acá si no hay red o se agota el tiempo.
  private async send(url: string): Promise<Response> {
    try {
      return await fetch(url, {
        // La key viaja en un header, nunca en la URL.
        headers: { 'X-Riot-Token': this.apiKey },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      const timedOut = error instanceof Error && error.name === 'TimeoutError';
      throw new RiotApiError(
        'network',
        timedOut
          ? 'Riot tardó demasiado en responder. Probá de nuevo.'
          : 'No se pudo conectar con Riot. Revisá tu conexión a internet.',
        { cause: error },
      );
    }
  }

  private async parseJson<T>(response: Response): Promise<T> {
    try {
      return (await response.json()) as T;
    } catch (error) {
      throw new RiotApiError(
        'unknown',
        'Riot devolvió una respuesta que no se pudo leer.',
        {
          status: response.status,
          cause: error,
        },
      );
    }
  }
}
