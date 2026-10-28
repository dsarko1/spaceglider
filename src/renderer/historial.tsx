import { useEffect, useRef, useState, type JSX } from 'react';
import type {
  CodigoErrorBusqueda,
  ResumenPartida,
} from '../compartido/contratos';
import { HistorialItem } from './componentes/HistorialItem';

interface DatosHistorial {
  partidas: ResumenPartida[];
  hayMas: boolean;
}

const cantidadPorPagina = 10;
const cacheHistorial = new Map<string, DatosHistorial>();

const nombresCola: Record<number, string> = {
  400: 'Normal',
  420: 'Solo/Dúo',
  430: 'Normal',
  440: 'Flexible',
  450: 'ARAM',
  490: 'Normal',
};

function nombreDeCola(queueId: number): string {
  return nombresCola[queueId] ?? 'Otra';
}

function duracionPartida(segundos: number): string {
  const minutos = Math.floor(segundos / 60);
  const resto = Math.floor(segundos % 60);
  return `${minutos}:${String(resto).padStart(2, '0')}`;
}

function fechaRelativa(timestamp: number): string {
  const fechaEnMs =
    timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp;
  const diferencia = fechaEnMs - Date.now();
  const segundos = Math.round(diferencia / 1000);
  const formato = new Intl.RelativeTimeFormat('es', {
    numeric: 'auto',
    style: 'short',
  });

  if (Math.abs(segundos) < 60) return formato.format(segundos, 'second');
  const minutos = Math.round(segundos / 60);
  if (Math.abs(minutos) < 60) return formato.format(minutos, 'minute');
  const horas = Math.round(minutos / 60);
  if (Math.abs(horas) < 24) return formato.format(horas, 'hour');
  return formato.format(Math.round(horas / 24), 'day');
}

export function Historial({
  riotId,
  nombreInvocador,
  formatearError,
}: {
  riotId: string | null;
  nombreInvocador: string | null;
  formatearError: (codigo: CodigoErrorBusqueda, mensaje: string) => string;
}): JSX.Element {
  const claveInicial = riotId?.toLocaleLowerCase('es-AR') ?? '';
  const datosIniciales = riotId ? cacheHistorial.get(claveInicial) : undefined;
  const [datos, setDatos] = useState<DatosHistorial>(
    () => datosIniciales ?? { partidas: [], hayMas: false },
  );
  const [cargando, setCargando] = useState(() =>
    Boolean(riotId && !datosIniciales),
  );
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState('');
  const [errorMas, setErrorMas] = useState('');
  const [filtroCola, setFiltroCola] = useState('Todas');
  const [filtroResultado, setFiltroResultado] = useState('Todas');
  const [intento, setIntento] = useState(0);
  const solicitud = useRef(0);
  const riotIdAnterior = useRef<string | null>(null);

  useEffect(() => {
    const numeroSolicitud = ++solicitud.current;
    setDatos({ partidas: [], hayMas: false });
    setError('');
    setErrorMas('');
    setCargandoMas(false);
    if (riotIdAnterior.current !== riotId) {
      setFiltroCola('Todas');
      setFiltroResultado('Todas');
      riotIdAnterior.current = riotId;
    }

    if (!riotId) {
      setCargando(false);
      setCargandoMas(false);
      return;
    }

    const clave = riotId.toLocaleLowerCase('es-AR');
    const datosGuardados = cacheHistorial.get(clave);
    if (datosGuardados) {
      setDatos(datosGuardados);
      setCargando(false);
      return;
    }

    setCargando(true);
    void window.spaceglider
      .buscarHistorialInvocador(riotId, 0, cantidadPorPagina)
      .then((respuesta) => {
        if (numeroSolicitud !== solicitud.current) return;
        if (!respuesta.ok) {
          setError(formatearError(respuesta.codigo, respuesta.mensaje));
          return;
        }

        const nuevosDatos = {
          partidas: respuesta.partidas,
          hayMas: respuesta.hayMas,
        };
        cacheHistorial.set(clave, nuevosDatos);
        setDatos(nuevosDatos);
      })
      .catch(() => {
        if (numeroSolicitud === solicitud.current) {
          setError(
            'No se pudo cargar el historial. Revisá tu conexión e intentá de nuevo.',
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

  async function cargarMas(): Promise<void> {
    if (!riotId || cargandoMas || !datos.hayMas) return;
    const numeroSolicitud = ++solicitud.current;
    const clave = riotId.toLocaleLowerCase('es-AR');
    const inicio = datos.partidas.length;
    setCargandoMas(true);
    setErrorMas('');

    try {
      const respuesta = await window.spaceglider.buscarHistorialInvocador(
        riotId,
        inicio,
        cantidadPorPagina,
      );
      if (numeroSolicitud !== solicitud.current) return;

      if (!respuesta.ok) {
        setErrorMas(formatearError(respuesta.codigo, respuesta.mensaje));
        return;
      }

      const partidasExistentes = new Set(
        datos.partidas.map((partida) => partida.matchId),
      );
      const nuevasPartidas = respuesta.partidas.filter(
        (partida) => !partidasExistentes.has(partida.matchId),
      );
      const nuevoEstado: DatosHistorial = {
        partidas: [...datos.partidas, ...nuevasPartidas],
        hayMas: respuesta.hayMas,
      };
      cacheHistorial.set(clave, nuevoEstado);
      setDatos(nuevoEstado);
    } catch {
      if (numeroSolicitud === solicitud.current) {
        setErrorMas(
          'No se pudo cargar más historial. Revisá tu conexión e intentá de nuevo.',
        );
      }
    } finally {
      if (numeroSolicitud === solicitud.current) setCargandoMas(false);
    }
  }

  if (!riotId) {
    return (
      <section className="historial__vista" aria-labelledby="titulo-historial">
        <h1 id="titulo-historial">Historial de partidas</h1>
        <p className="historial__vacio" role="status">
          Buscá un invocador para ver sus partidas recientes.
        </p>
      </section>
    );
  }

  const colasPresentes = Array.from(
    new Set(datos.partidas.map((partida) => nombreDeCola(partida.queueId))),
  );
  const resultadoBuscado =
    filtroResultado === 'Victorias'
      ? 'victoria'
      : filtroResultado === 'Derrotas'
        ? 'derrota'
        : null;
  const partidasFiltradas = datos.partidas.filter(
    (partida) =>
      (filtroCola === 'Todas' ||
        nombreDeCola(partida.queueId) === filtroCola) &&
      (!resultadoBuscado || partida.resultado === resultadoBuscado),
  );

  return (
    <section className="historial__vista" aria-labelledby="titulo-historial">
      <h1 id="titulo-historial">Historial de partidas</h1>
      {nombreInvocador && (
        <p className="historial__invocador">{nombreInvocador}</p>
      )}

      {!cargando && datos.partidas.length > 0 && (
        <div className="historial__filtros">
          <div
            className="historial__filtro-grupo"
            role="group"
            aria-label="Filtrar por cola"
          >
            {['Todas', ...colasPresentes].map((cola) => (
              <button
                className="historial__filtro"
                key={cola}
                type="button"
                aria-pressed={filtroCola === cola}
                onClick={() => setFiltroCola(cola)}
              >
                {cola}
              </button>
            ))}
          </div>
          <div
            className="historial__filtro-grupo"
            role="group"
            aria-label="Filtrar por resultado"
          >
            {['Todas', 'Victorias', 'Derrotas'].map((resultado) => (
              <button
                className="historial__filtro"
                key={resultado}
                type="button"
                aria-pressed={filtroResultado === resultado}
                onClick={() => setFiltroResultado(resultado)}
              >
                {resultado}
              </button>
            ))}
          </div>
        </div>
      )}

      <div
        className="historial__contenido"
        aria-live="polite"
        aria-busy={cargando || cargandoMas}
      >
        {cargando && (
          <p className="historial__estado" role="status">
            <span className="historial__spinner" aria-hidden="true" />
            Cargando historial…
          </p>
        )}
        {error && (
          <div
            className="historial__estado historial__estado--error"
            role="alert"
          >
            <p>{error}</p>
            <button
              className="historial__boton"
              type="button"
              onClick={() => setIntento((actual) => actual + 1)}
            >
              Reintentar
            </button>
          </div>
        )}
        {!cargando && !error && datos.partidas.length === 0 && (
          <p className="historial__vacio" role="status">
            Todavía no hay partidas para mostrar.
          </p>
        )}
        {!cargando &&
          !error &&
          datos.partidas.length > 0 &&
          partidasFiltradas.length === 0 && (
            <p className="historial__vacio" role="status">
              No hay partidas con estos filtros.
            </p>
          )}
        {!cargando && partidasFiltradas.length > 0 && (
          <ul className="historial__lista">
            {partidasFiltradas.map((partida) => (
              <HistorialItem
                key={partida.matchId}
                partida={partida}
                nombreCola={nombreDeCola(partida.queueId)}
                duracion={duracionPartida(partida.duracionEnSegundos)}
                fecha={fechaRelativa(partida.gameStartTimestamp)}
              />
            ))}
          </ul>
        )}
      </div>

      {errorMas && (
        <div
          className="historial__estado historial__estado--error"
          role="alert"
        >
          <p>{errorMas}</p>
          <button
            className="historial__boton"
            type="button"
            onClick={() => void cargarMas()}
          >
            Reintentar
          </button>
        </div>
      )}
      {datos.hayMas && datos.partidas.length > 0 && (
        <button
          className="historial__boton historial__cargar-mas"
          type="button"
          onClick={() => void cargarMas()}
          disabled={cargandoMas}
        >
          {cargandoMas ? 'Cargando...' : 'Cargar más'}
        </button>
      )}
    </section>
  );
}
