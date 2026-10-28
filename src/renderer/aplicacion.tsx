import { useEffect, useRef, useState, type FormEvent, type JSX } from 'react';
import type {
  CodigoErrorBusqueda,
  PerfilInvocador,
} from '../compartido/contratos';

type EstadoBusqueda =
  | { tipo: 'inicial' }
  | { tipo: 'cargando' }
  | { tipo: 'error'; mensaje: string; origen: 'validacion' | 'busqueda' }
  | { tipo: 'exito'; perfil: PerfilInvocador };

const nombresCola: Record<string, string> = {
  RANKED_SOLO_5x5: 'Solo/Dúo',
  RANKED_FLEX_SR: 'Flexible',
  RANKED_FLEX_TT: 'Flexible (Bosque Retorcido)',
};

const nombresRango: Record<string, string> = {
  IRON: 'Hierro',
  BRONZE: 'Bronce',
  SILVER: 'Plata',
  GOLD: 'Oro',
  PLATINUM: 'Platino',
  EMERALD: 'Esmeralda',
  DIAMOND: 'Diamante',
  MASTER: 'Maestro',
  GRANDMASTER: 'Gran maestro',
  CHALLENGER: 'Retador',
};

const claveVersionDataDragon = 'spaceglider-version-data-dragon';
const claveInvocadorRecordado = 'spaceglider-invocador-recordado';
const claveSidebarExpandida = 'spaceglider-sidebar-expandida';
const duracionCacheVersion = 24 * 60 * 60 * 1000;
const ordenElo = [
  'IRON',
  'BRONZE',
  'SILVER',
  'GOLD',
  'PLATINUM',
  'EMERALD',
  'DIAMOND',
  'MASTER',
  'GRANDMASTER',
  'CHALLENGER',
];
const clasesMarco: Record<string, string> = {
  IRON: 'marco--hierro',
  BRONZE: 'marco--bronce',
  SILVER: 'marco--plata',
  GOLD: 'marco--oro',
  PLATINUM: 'marco--platino',
  EMERALD: 'marco--esmeralda',
  DIAMOND: 'marco--diamante',
  MASTER: 'marco--maestro',
  GRANDMASTER: 'marco--gran-maestro',
  CHALLENGER: 'marco--retador',
};
const slugsEmblema: Record<string, string> = {
  IRON: 'iron',
  BRONZE: 'bronze',
  SILVER: 'silver',
  GOLD: 'gold',
  PLATINUM: 'platinum',
  EMERALD: 'emerald',
  DIAMOND: 'diamond',
  MASTER: 'master',
  GRANDMASTER: 'grandmaster',
  CHALLENGER: 'challenger',
};

let solicitudVersionDataDragon: Promise<string | null> | null = null;

interface InvocadorRecordado {
  riotId: string;
  perfil: PerfilInvocador;
}

function esPerfilInvocador(valor: unknown): valor is PerfilInvocador {
  if (typeof valor !== 'object' || valor === null) return false;
  if (
    !('gameName' in valor) ||
    !('tagLine' in valor) ||
    !('summonerLevel' in valor) ||
    !('profileIconId' in valor) ||
    !('rangosDisponibles' in valor) ||
    !('rangos' in valor)
  ) {
    return false;
  }

  return (
    typeof valor.gameName === 'string' &&
    typeof valor.tagLine === 'string' &&
    typeof valor.summonerLevel === 'number' &&
    typeof valor.profileIconId === 'number' &&
    typeof valor.rangosDisponibles === 'boolean' &&
    Array.isArray(valor.rangos) &&
    valor.rangos.every(
      (rango) =>
        typeof rango === 'object' &&
        rango !== null &&
        typeof rango.queueType === 'string' &&
        typeof rango.tier === 'string' &&
        typeof rango.rank === 'string' &&
        typeof rango.leaguePoints === 'number' &&
        typeof rango.wins === 'number' &&
        typeof rango.losses === 'number',
    )
  );
}

function leerInvocadorRecordado(): InvocadorRecordado | null {
  try {
    const valorGuardado = localStorage.getItem(claveInvocadorRecordado);
    if (!valorGuardado) return null;

    const datos: unknown = JSON.parse(valorGuardado);
    if (
      typeof datos !== 'object' ||
      datos === null ||
      !('riotId' in datos) ||
      !('perfil' in datos) ||
      typeof datos.riotId !== 'string' ||
      !esPerfilInvocador(datos.perfil)
    ) {
      return null;
    }

    return { riotId: datos.riotId, perfil: datos.perfil };
  } catch {
    return null;
  }
}

function guardarInvocadorRecordado(invocador: InvocadorRecordado): void {
  try {
    localStorage.setItem(claveInvocadorRecordado, JSON.stringify(invocador));
  } catch {
    // El perfil sigue disponible durante esta sesión aunque falle el almacenamiento.
  }
}

function leerSidebarExpandida(): boolean {
  if (window.innerWidth <= 760) return false;
  try {
    const estadoGuardado = localStorage.getItem(claveSidebarExpandida);
    return estadoGuardado === null || estadoGuardado === 'true';
  } catch {
    return true;
  }
}

function leerVersionGuardada(): { version: string; fecha: number } | null {
  try {
    const valorGuardado = localStorage.getItem(claveVersionDataDragon);
    if (!valorGuardado) return null;

    const datos: unknown = JSON.parse(valorGuardado);
    if (
      typeof datos !== 'object' ||
      datos === null ||
      !('version' in datos) ||
      !('fecha' in datos) ||
      typeof datos.version !== 'string' ||
      !/^\d+\.\d+\.\d+$/.test(datos.version) ||
      typeof datos.fecha !== 'number' ||
      !Number.isFinite(datos.fecha)
    ) {
      return null;
    }

    return { version: datos.version, fecha: datos.fecha };
  } catch {
    return null;
  }
}

function guardarVersion(version: string): void {
  try {
    localStorage.setItem(
      claveVersionDataDragon,
      JSON.stringify({ version, fecha: Date.now() }),
    );
  } catch {
    // La imagen sigue disponible aunque el almacenamiento local esté bloqueado.
  }
}

function obtenerVersionDataDragon(): Promise<string | null> {
  if (!solicitudVersionDataDragon) {
    solicitudVersionDataDragon = (async () => {
      const versionGuardada = leerVersionGuardada();
      if (
        versionGuardada &&
        Date.now() - versionGuardada.fecha < duracionCacheVersion
      ) {
        return versionGuardada.version;
      }

      try {
        const respuesta = await fetch(
          'https://ddragon.leagueoflegends.com/api/versions.json',
        );
        if (!respuesta.ok) {
          throw new Error('No se pudo obtener la versión de Data Dragon.');
        }

        const versiones: unknown = await respuesta.json();
        const version = Array.isArray(versiones) ? versiones[0] : null;
        if (typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version)) {
          throw new Error('Data Dragon devolvió una versión inválida.');
        }

        guardarVersion(version);
        return version;
      } catch {
        return versionGuardada?.version ?? null;
      }
    })();
  }

  return solicitudVersionDataDragon;
}

function obtenerIniciales(nombre: string): string {
  return (
    nombre
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((parte) => parte.charAt(0).toLocaleUpperCase('es-AR'))
      .join('') || '?'
  );
}

function formatearError(codigo: CodigoErrorBusqueda, mensaje: string): string {
  switch (codigo) {
    case 'API_KEY_FALTANTE':
      return 'La búsqueda no está disponible porque falta configurar el servicio.';
    case 'ENTRADA_INVALIDA':
      return 'Revisá el formato del Riot ID e intentá de nuevo.';
    case 'NO_ENCONTRADO':
      return 'Riot no encontró ese Riot ID. Revisá que el nombre y la etiqueta estén escritos exactamente como en tu cuenta.';
    case 'API_KEY_INVALIDA':
      return 'El servicio de búsqueda no está configurado correctamente.';
    case 'LIMITE_PETICIONES':
      return 'Hay muchas búsquedas en este momento. Esperá un momento e intentá de nuevo.';
    case 'ERROR_RIOT':
      return 'Riot no pudo completar la búsqueda. Intentá de nuevo más tarde.';
    case 'ERROR_RED':
      return 'No pudimos conectar con el servicio. Revisá tu conexión e intentá de nuevo.';
    case 'RESPUESTA_INVALIDA':
      return 'El servicio devolvió una respuesta inesperada. Intentá de nuevo más tarde.';
    default:
      return mensaje;
  }
}

function nombreDeCola(queueType: string): string {
  return nombresCola[queueType] ?? queueType.replaceAll('_', ' ');
}

function nombreDeRango(tier: string): string {
  return nombresRango[tier] ?? tier;
}

function urlEmblemaRango(tier?: string): string | null {
  const slug = tier ? slugsEmblema[tier] : undefined;
  return slug
    ? `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/emblem-${slug}.png`
    : null;
}

function EmblemaRango({
  tier,
  pequeno = false,
}: {
  tier?: string;
  pequeno?: boolean;
}): JSX.Element | null {
  const [imagenFallida, setImagenFallida] = useState(false);
  const url = urlEmblemaRango(tier);

  if (!url || imagenFallida) return null;

  return (
    <img
      className={`emblema-rango${pequeno ? ' emblema-rango--pequeno' : ''}`}
      src={url}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      onError={() => setImagenFallida(true)}
    />
  );
}

function claseMarcoDeRango(tier?: string): string {
  return tier ? (clasesMarco[tier] ?? 'marco--neutro') : 'marco--neutro';
}

function colasDisponibles(perfil: PerfilInvocador) {
  return perfil.rangos.filter((rango) =>
    ['RANKED_SOLO_5x5', 'RANKED_FLEX_SR'].includes(rango.queueType),
  );
}

function colaConMayorElo(perfil: PerfilInvocador): string {
  return (
    [...colasDisponibles(perfil)].sort(
      (a, b) => ordenElo.indexOf(b.tier) - ordenElo.indexOf(a.tier),
    )[0]?.queueType ?? ''
  );
}

function IconoPerfil({
  profileIconId,
  gameName,
  claseMarco = 'marco--neutro',
}: {
  profileIconId: number;
  gameName: string;
  claseMarco?: string;
}): JSX.Element {
  const [version, setVersion] = useState<string | null>(null);
  const [imagenFallida, setImagenFallida] = useState(false);

  useEffect(() => {
    let componenteActivo = true;
    void obtenerVersionDataDragon().then((versionObtenida) => {
      if (componenteActivo) setVersion(versionObtenida);
    });

    return () => {
      componenteActivo = false;
    };
  }, []);

  return (
    <div className={`perfil__marco-icono ${claseMarco}`}>
      {imagenFallida ? (
        <span
          className="perfil__icono-respaldo"
          role="img"
          aria-label={`Iniciales de ${gameName}`}
        >
          {obtenerIniciales(gameName)}
        </span>
      ) : version ? (
        <img
          className="perfil__icono"
          src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/profileicon/${profileIconId}.png`}
          alt={`Icono de perfil de ${gameName}`}
          onError={() => setImagenFallida(true)}
        />
      ) : (
        <span
          className="perfil__icono-placeholder"
          role="img"
          aria-label={`Icono de perfil de ${gameName} no disponible`}
        />
      )}
    </div>
  );
}

function TarjetaPerfil({
  perfil,
  colaSeleccionada,
  onCambiarCola,
}: {
  perfil: PerfilInvocador;
  colaSeleccionada: string;
  onCambiarCola: (queueType: string) => void;
}): JSX.Element {
  const colas = colasDisponibles(perfil);
  const colaActiva = colas.some((rango) => rango.queueType === colaSeleccionada)
    ? colaSeleccionada
    : colaConMayorElo(perfil);
  const rangoSeleccionado = colas.find(
    (rango) => rango.queueType === colaActiva,
  );

  return (
    <section className="perfil" aria-labelledby="titulo-perfil">
      <div className="perfil__encabezado">
        <IconoPerfil
          key={perfil.profileIconId}
          profileIconId={perfil.profileIconId}
          gameName={perfil.gameName}
          claseMarco={claseMarcoDeRango(rangoSeleccionado?.tier)}
        />
        <div className="perfil__identidad">
          <h2 id="titulo-perfil">
            {perfil.gameName}
            <span className="perfil__etiqueta">#{perfil.tagLine}</span>
          </h2>
          <p className="perfil__nivel">
            Nivel <strong>{perfil.summonerLevel}</strong>
          </p>
        </div>
      </div>

      <div className="perfil__separador" />

      <div className="rangos">
        <h3>Clasificatorias</h3>
        {colas.length > 0 ? (
          <>
            <div
              className="rangos__selector"
              role="group"
              aria-label="Cola clasificatoria"
            >
              {colas.map((rango) => (
                <button
                  className="rangos__chip"
                  key={rango.queueType}
                  type="button"
                  aria-pressed={rango.queueType === colaActiva}
                  onClick={() => onCambiarCola(rango.queueType)}
                >
                  <EmblemaRango tier={rango.tier} pequeno />
                  {nombreDeCola(rango.queueType)}
                </button>
              ))}
            </div>
            <ul className="rangos__lista">
              {rangoSeleccionado && (
                <li className="rango" key={rangoSeleccionado.queueType}>
                  <div>
                    <p className="rango__cola">
                      {nombreDeCola(rangoSeleccionado.queueType)}
                    </p>
                    <p className="rango__division">
                      <EmblemaRango tier={rangoSeleccionado.tier} />
                      <span>
                        {nombreDeRango(rangoSeleccionado.tier)}
                        {rangoSeleccionado.rank
                          ? ` ${rangoSeleccionado.rank}`
                          : ''}
                      </span>
                    </p>
                  </div>
                  <div className="rango__puntos">
                    <strong>
                      {new Intl.NumberFormat('es-AR').format(
                        rangoSeleccionado.leaguePoints,
                      )}
                    </strong>
                    <span>LP</span>
                  </div>
                </li>
              )}
            </ul>
          </>
        ) : perfil.rangosDisponibles ? (
          <p className="rangos__vacio">
            Este invocador todavía no tiene rango en una cola clasificatoria.
          </p>
        ) : (
          <p className="rangos__vacio">
            Riot no autorizó la consulta de clasificatorias. El nivel y el icono
            del perfil sí están disponibles.
          </p>
        )}
      </div>
    </section>
  );
}

export function Aplicacion(): JSX.Element {
  const [invocadorRecordado, setInvocadorRecordado] = useState(
    leerInvocadorRecordado,
  );
  const [riotId, setRiotId] = useState(() => invocadorRecordado?.riotId ?? '');
  const [estado, setEstado] = useState<EstadoBusqueda>({ tipo: 'inicial' });
  const [seccion, setSeccion] = useState<'perfil' | 'historial'>('perfil');
  const [colaSeleccionada, setColaSeleccionada] = useState('');
  const [sidebarExpandida, setSidebarExpandida] =
    useState(leerSidebarExpandida);
  const restauracionIntentada = useRef(false);

  async function cargarPerfilRecordado(): Promise<void> {
    if (restauracionIntentada.current || estado.tipo === 'exito') return;
    restauracionIntentada.current = true;

    const recordado = invocadorRecordado ?? leerInvocadorRecordado();
    if (!recordado) return;

    setRiotId(recordado.riotId);
    setColaSeleccionada(colaConMayorElo(recordado.perfil));
    setEstado({ tipo: 'exito', perfil: recordado.perfil });

    try {
      const resultado = await window.spaceglider.buscarInvocadorPorRiotId(
        recordado.riotId,
      );
      if (resultado.ok) {
        const invocadorActualizado = {
          riotId: recordado.riotId,
          perfil: resultado.perfil,
        };
        guardarInvocadorRecordado(invocadorActualizado);
        setInvocadorRecordado(invocadorActualizado);
        setEstado({ tipo: 'exito', perfil: resultado.perfil });
      }
    } catch {
      // Si el refresco falla, se mantiene el perfil guardado.
    }
  }

  useEffect(() => {
    void cargarPerfilRecordado();
  }, []);

  async function manejarBusqueda(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const riotIdNormalizado = riotId.trim();
    const separador = riotIdNormalizado.indexOf('#');

    if (
      separador <= 0 ||
      separador !== riotIdNormalizado.lastIndexOf('#') ||
      separador === riotIdNormalizado.length - 1
    ) {
      setEstado({
        tipo: 'error',
        origen: 'validacion',
        mensaje: 'Ingresá el Riot ID con el formato gameName#tagLine.',
      });
      return;
    }

    const gameName = riotIdNormalizado.slice(0, separador).trim();
    const tagLine = riotIdNormalizado.slice(separador + 1).trim();

    if (!gameName || !tagLine) {
      setEstado({
        tipo: 'error',
        origen: 'validacion',
        mensaje: 'El nombre y la etiqueta deben tener contenido.',
      });
      return;
    }

    setEstado({ tipo: 'cargando' });

    try {
      const resultado = await window.spaceglider.buscarInvocadorPorRiotId(
        `${gameName}#${tagLine}`,
      );

      if (resultado.ok) {
        const invocador = {
          riotId: `${gameName}#${tagLine}`,
          perfil: resultado.perfil,
        };
        restauracionIntentada.current = false;
        setColaSeleccionada(colaConMayorElo(resultado.perfil));
        guardarInvocadorRecordado(invocador);
        setInvocadorRecordado(invocador);
        setEstado({ tipo: 'exito', perfil: resultado.perfil });
      } else {
        setEstado({
          tipo: 'error',
          origen: 'busqueda',
          mensaje: formatearError(resultado.codigo, resultado.mensaje),
        });
      }
    } catch {
      setEstado({
        tipo: 'error',
        origen: 'busqueda',
        mensaje:
          'No se pudo completar la búsqueda. Revisá tu conexión e intentá de nuevo.',
      });
    }
  }

  const estaCargando = estado.tipo === 'cargando';
  const hayError = estado.tipo === 'error';
  const perfilActual =
    estado.tipo === 'exito' ? estado.perfil : invocadorRecordado?.perfil;
  const colaActual =
    perfilActual &&
    colasDisponibles(perfilActual).some(
      (rango) => rango.queueType === colaSeleccionada,
    )
      ? colaSeleccionada
      : perfilActual
        ? colaConMayorElo(perfilActual)
        : '';
  const rangoActual = perfilActual?.rangos.find(
    (rango) => rango.queueType === colaActual,
  );

  function cambiarSeccion(nuevaSeccion: 'perfil' | 'historial'): void {
    setSeccion(nuevaSeccion);
    if (nuevaSeccion === 'perfil' && estado.tipo !== 'exito') {
      void cargarPerfilRecordado();
    }
  }

  function alternarSidebar(): void {
    setSidebarExpandida((expandida) => {
      const nuevoEstado = !expandida;
      try {
        localStorage.setItem(claveSidebarExpandida, String(nuevoEstado));
      } catch {
        // La barra lateral sigue funcionando aunque no se pueda guardar.
      }
      return nuevoEstado;
    });
  }

  return (
    <div className="pagina">
      <aside
        className={`sidebar${sidebarExpandida ? ' sidebar--expandida' : ''}`}
        data-seccion={seccion}
      >
        <div className="sidebar__arriba">
          <button
            className="sidebar__toggle"
            type="button"
            aria-label={
              sidebarExpandida
                ? 'Contraer barra lateral'
                : 'Expandir barra lateral'
            }
            aria-expanded={sidebarExpandida}
            aria-controls="navegacion-principal"
            title={
              sidebarExpandida
                ? 'Contraer barra lateral'
                : 'Expandir barra lateral'
            }
            onClick={alternarSidebar}
          >
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M3 5h14M3 10h14M3 15h14" />
            </svg>
          </button>
          {sidebarExpandida && (
            <button
              className="sidebar__invocador"
              type="button"
              onClick={() => cambiarSeccion('perfil')}
              aria-label={
                perfilActual
                  ? `Abrir el perfil de ${perfilActual.gameName}#${perfilActual.tagLine}`
                  : 'Ir a Perfil'
              }
            >
              {perfilActual ? (
                <>
                  <IconoPerfil
                    key={perfilActual.profileIconId}
                    profileIconId={perfilActual.profileIconId}
                    gameName={perfilActual.gameName}
                    claseMarco={`sidebar__icono ${claseMarcoDeRango(
                      rangoActual?.tier,
                    )}`}
                  />
                  <span className="sidebar__invocador-texto">
                    <strong>
                      {perfilActual.gameName}#{perfilActual.tagLine}
                    </strong>
                    <span>Nivel {perfilActual.summonerLevel}</span>
                  </span>
                </>
              ) : (
                <span className="sidebar__invocador-vacio">
                  <strong>Sin invocador</strong>
                  <span>Busca tu Riot ID</span>
                </span>
              )}
            </button>
          )}
        </div>

        <nav
          className="sidebar__navegacion"
          id="navegacion-principal"
          aria-label="Secciones principales"
        >
          <button
            className="sidebar__boton"
            type="button"
            aria-label="Perfil"
            aria-current={seccion === 'perfil' ? 'page' : undefined}
            aria-controls="contenido-principal"
            title={sidebarExpandida ? undefined : 'Perfil'}
            onClick={() => cambiarSeccion('perfil')}
          >
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <circle cx="10" cy="6.5" r="3" />
              <path d="M4.5 17v-1.5a5.5 5.5 0 0 1 11 0V17z" />
            </svg>
            {sidebarExpandida && <span>Perfil</span>}
          </button>
          <button
            className="sidebar__boton"
            type="button"
            aria-label="Historial"
            aria-current={seccion === 'historial' ? 'page' : undefined}
            aria-controls="contenido-principal"
            title={sidebarExpandida ? undefined : 'Historial'}
            onClick={() => cambiarSeccion('historial')}
          >
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <circle cx="10" cy="10" r="7" />
              <path d="M10 6v4l2.5 1.5" />
            </svg>
            {sidebarExpandida && <span>Historial</span>}
          </button>
        </nav>
      </aside>

      <div className="zona-principal">
        <header className="barra-superior">
          <div className="marca">
            <span className="marca__simbolo" aria-hidden="true">
              S
            </span>
            <span>SPACEGLIDER</span>
          </div>
          <span className="etiqueta-region">LA2 · LAS</span>
        </header>

        <main className="contenido" id="contenido-principal">
          {seccion === 'perfil' ? (
            <section
              className="presentacion panel"
              aria-labelledby="titulo-principal"
              key="perfil"
            >
              <h1 id="titulo-principal">
                Tu perfil,
                <br />
                <span>a un vistazo.</span>
              </h1>
              <p className="descripcion">
                Buscá un invocador por Riot ID y consultá su nivel y rango.
              </p>

              <form className="busqueda" onSubmit={manejarBusqueda} noValidate>
                <label className="busqueda__etiqueta" htmlFor="riot-id">
                  Riot ID
                </label>
                <div className="busqueda__fila">
                  <input
                    id="riot-id"
                    className="busqueda__entrada"
                    type="text"
                    value={riotId}
                    onChange={(evento) => {
                      setRiotId(evento.target.value);
                      if (hayError) setEstado({ tipo: 'inicial' });
                    }}
                    placeholder="Ejemplo: Faker#KR1"
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={64}
                    aria-describedby={
                      hayError ? 'mensaje-error' : 'ayuda-entrada'
                    }
                    aria-invalid={
                      hayError && estado.origen === 'validacion'
                        ? 'true'
                        : undefined
                    }
                    disabled={estaCargando}
                  />
                  <button
                    className="busqueda__boton"
                    type="submit"
                    disabled={estaCargando}
                  >
                    {estaCargando ? (
                      <>
                        <span
                          className="busqueda__spinner"
                          aria-hidden="true"
                        />
                        Buscando
                      </>
                    ) : (
                      'Buscar'
                    )}
                  </button>
                </div>
                <p className="busqueda__ayuda" id="ayuda-entrada">
                  Escribí el nombre y la etiqueta separados por #.
                </p>
              </form>

              {hayError && (
                <p
                  className="mensaje mensaje--error"
                  id="mensaje-error"
                  role="alert"
                >
                  {estado.mensaje}
                </p>
              )}

              {estado.tipo === 'cargando' && (
                <p
                  className="mensaje mensaje--cargando"
                  role="status"
                  aria-live="polite"
                >
                  Buscando invocador en LA2…
                </p>
              )}

              {estado.tipo === 'exito' ? (
                <TarjetaPerfil
                  key={`${estado.perfil.gameName}#${estado.perfil.tagLine}`}
                  perfil={estado.perfil}
                  colaSeleccionada={colaSeleccionada}
                  onCambiarCola={setColaSeleccionada}
                />
              ) : (
                !hayError &&
                !estaCargando && (
                  <p
                    className="estado-inicial"
                    role="status"
                    aria-live="polite"
                  >
                    Ingresá un Riot ID para ver el perfil.
                  </p>
                )
              )}
            </section>
          ) : (
            <section
              className="historial panel"
              aria-labelledby="titulo-principal"
              key="historial"
            >
              <h1 id="titulo-principal">Historial de partidas</h1>
              <p className="descripcion">
                Tus partidas recientes van a aparecer en esta sección.
              </p>
              <div
                className="historial__vacio"
                role="status"
                aria-live="polite"
              >
                <span className="historial__simbolo" aria-hidden="true">
                  —
                </span>
                <p>
                  <strong>Todavía no hay historial</strong>
                  <span>
                    Acá van a aparecer las últimas partidas del invocador que
                    busques.
                  </span>
                </p>
              </div>
            </section>
          )}
        </main>

        <footer className="pie">
          <span>SPACEGLIDER</span>
          <span>HECHO PARA LA GRIETA</span>
        </footer>
      </div>
    </div>
  );
}
