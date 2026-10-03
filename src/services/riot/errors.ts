// Tipos de problema que puede dar la API de Riot.
// La interfaz usa "kind" para decidir qué mostrar.
export type RiotErrorKind =
  | 'invalid_key' // 401 / 403: key vencida, mal copiada o sin permiso
  | 'not_found' // 404
  | 'rate_limited' // 429: límite de peticiones
  | 'bad_request' // 400
  | 'server' // 5xx: problema del lado de Riot
  | 'network' // sin internet o timeout
  | 'unknown';

interface RiotApiErrorOptions {
  status?: number;
  retryAfterSeconds?: number;
  cause?: unknown;
}

export class RiotApiError extends Error {
  readonly kind: RiotErrorKind;
  readonly status?: number;
  readonly retryAfterSeconds?: number;

  constructor(
    kind: RiotErrorKind,
    message: string,
    options: RiotApiErrorOptions = {},
  ) {
    // "cause" guarda el error original para poder depurar
    super(message, { cause: options.cause });
    this.name = 'RiotApiError';
    this.kind = kind;
    this.status = options.status;
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}
