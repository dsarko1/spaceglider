import { useEffect, useRef, useState, type JSX } from 'react';
import type {
  CodigoErrorBusqueda,
  MaestriaCampeon,
} from '../compartido/contratos';

const cacheMaestrias = new Map<string, MaestriaCampeon[]>();

function fechaRelativa(timestamp: number): string {
  if (!timestamp) return 'sin partidas registradas';
  const fechaEnMs =
    timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp;
  const segundos = Math.round((fechaEnMs - Date.now()) / 1000);
  const formato = new Intl.RelativeTimeFormat('es', {
    numeric: 'auto',
    style: 'long',
  });

  if (Math.abs(segundos) < 60) return formato.format(segundos, 'second');
  const minutos = Math.round(segundos / 60);
  if (Math.abs(minutos) < 60) return formato.format(minutos, 'minute');
  const horas = Math.round(minutos / 60);
  if (Math.abs(horas) < 24) return formato.format(horas, 'hour');
  const dias = Math.round(horas / 24);
  if (Math.abs(dias) < 30) return formato.format(dias, 'day');
  return formato.format(Math.round(dias / 30), 'month');
}

function esPrestigio(nivel: number): boolean {
  return nivel > 7;
}

export function Maestrias({
  riotId,
  nombreInvocador,
  formatearError,
}: {
  riotId: string | null;
  nombreInvocador: string | null;
  formatearError: (codigo: CodigoErrorBusqueda, mensaje: string) => string;
}): JSX.Element {
  const claveInicial = riotId?.toLocaleLowerCase('es-AR') ?? '';
  const datosIniciales = riotId ? cacheMaestrias.get(claveInicial) : undefined;
  const [maestrias, setMaestrias] = useState<MaestriaCampeon[]>(
    () => datosIniciales ?? [],
  );
  const [cargando, setCargando] = useState(() =>
    Boolean(riotId && !datosIniciales),
  );
  const [error, setError] = useState('');
  const [intento, setIntento] = useState(0);
  const solicitud = useRef(0);

  useEffect(() => {
    const numeroSolicitud = ++solicitud.current;
    setError('');

    if (!riotId) {
      setMaestrias([]);
      setCargando(false);
      return;
    }

    const clave = riotId.toLocaleLowerCase('es-AR');
    const datosGuardados = cacheMaestrias.get(clave);
    if (datosGuardados) {
      setMaestrias(datosGuardados);
      setCargando(false);
      return;
    }

    setMaestrias([]);
    setCargando(true);
    void window.spaceglider
      .buscarMaestriasInvocador(riotId)
      .then((respuesta) => {
        if (numeroSolicitud !== solicitud.current) return;
        if (!respuesta.ok) {
          setError(formatearError(respuesta.codigo, respuesta.mensaje));
          return;
        }
        cacheMaestrias.set(clave, respuesta.maestrias);
        setMaestrias(respuesta.maestrias);
      })
      .catch(() => {
        if (numeroSolicitud === solicitud.current) {
          setError(
            'No se pudieron cargar las maestrías. Revisá tu conexión e intentá de nuevo.',
          );
        }
      })
      .finally(() => {
        if (numeroSolicitud === solicitud.current) setCargando(false);
      });

    return () => {
      solicitud.current += 1;
    };
  }, [riotId, intento, formatearError]);

  return (
    <section className="maestrias__vista" aria-labelledby="titulo-maestrias">
      <h1 id="titulo-maestrias">Maestrías de campeón</h1>
      {nombreInvocador && (
        <p className="maestrias__invocador">{nombreInvocador}</p>
      )}

      <div
        className="maestrias__contenido"
        aria-live="polite"
        aria-busy={cargando}
      >
        {cargando && (
          <p className="maestrias__estado" role="status">
            <span className="maestrias__spinner" aria-hidden="true" />
            Cargando maestrías…
          </p>
        )}
        {!cargando && !riotId && (
          <p className="maestrias__vacio" role="status">
            Buscá un invocador para ver sus maestrías de campeón.
          </p>
        )}
        {error && (
          <div
            className="maestrias__estado maestrias__estado--error"
            role="alert"
          >
            <p>{error}</p>
            <button
              className="maestrias__boton"
              type="button"
              onClick={() => setIntento((actual) => actual + 1)}
            >
              Reintentar
            </button>
          </div>
        )}
        {!cargando && !error && riotId && maestrias.length === 0 && (
          <p className="maestrias__vacio" role="status">
            Este invocador todavía no tiene maestrías registradas.
          </p>
        )}
        {!cargando && maestrias.length > 0 && (
          <ul className="maestrias__lista">
            {maestrias.map((maestria, posicion) => (
              <li className="maestrias__item" key={maestria.campeonId}>
                <span className="maestrias__puesto" aria-hidden="true">
                  {posicion + 1}
                </span>
                <div className="maestrias__datos">
                  <strong className="maestrias__campeon">
                    {maestria.campeon}
                  </strong>
                  <span className="maestrias__puntos">
                    {new Intl.NumberFormat('es-AR').format(maestria.puntos)}{' '}
                    puntos
                  </span>
                  <span className="maestrias__detalle">
                    Último juego {fechaRelativa(maestria.ultimoJuego)}
                    {maestria.nivel >= 5 &&
                      maestria.nivel <= 7 &&
                      maestria.fichas > 0 &&
                      ` · ${maestria.fichas} fichas`}
                  </span>
                </div>
                <span
                  className={`maestrias__nivel${
                    esPrestigio(maestria.nivel)
                      ? ' maestrias__nivel--prestigio'
                      : ''
                  }`}
                >
                  {esPrestigio(maestria.nivel) ? 'Prestigio' : 'Nivel'}{' '}
                  <strong>{maestria.nivel}</strong>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
