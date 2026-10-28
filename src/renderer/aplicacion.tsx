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
const clavePerfilFijado = 'spaceglider-perfil-fijado';
const claveFavoritos = 'spaceglider-favoritos';
const claveRecientes = 'spaceglider-recientes';
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

interface PerfilFijado {
  riotId: string;
  perfil: PerfilInvocador;
}

interface InvocadorGuardado {
  riotId: string;
  gameName: string;
  tagLine: string;
  profileIconId: number;
}

interface InvocadorReciente extends InvocadorGuardado {
  fecha: number;
}

function esInvocadorGuardado(valor: unknown): valor is InvocadorGuardado {
  if (typeof valor !== 'object' || valor === null) return false;
  if (
    !('riotId' in valor) ||
    !('gameName' in valor) ||
    !('tagLine' in valor) ||
    !('profileIconId' in valor)
  ) {
    return false;
  }

  return (
    typeof valor.riotId === 'string' &&
    typeof valor.gameName === 'string' &&
    typeof valor.tagLine === 'string' &&
    typeof valor.profileIconId === 'number' &&
    Number.isInteger(valor.profileIconId) &&
    valor.profileIconId >= 0
  );
}

function leerPerfilFijado(): PerfilFijado | null {
  try {
    const valorGuardado = localStorage.getItem(clavePerfilFijado);
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

function leerFavoritos(): InvocadorGuardado[] {
  try {
    const valorGuardado = localStorage.getItem(claveFavoritos);
    if (!valorGuardado) return [];

    const datos: unknown = JSON.parse(valorGuardado);
    if (!Array.isArray(datos)) return [];

    const vistos = new Set<string>();
    return datos
      .filter(esInvocadorGuardado)
      .filter((invocador) => {
        const clave = invocador.riotId.toLocaleLowerCase('es-AR');
        if (vistos.has(clave)) return false;
        vistos.add(clave);
        return true;
      })
      .slice(0, 20);
  } catch {
    return [];
  }
}

function leerRecientes(): InvocadorReciente[] {
  try {
    const valorGuardado = localStorage.getItem(claveRecientes);
    if (!valorGuardado) return [];

    const datos: unknown = JSON.parse(valorGuardado);
    if (!Array.isArray(datos)) return [];

    const vistos = new Set<string>();
    return datos
      .filter(
        (elemento): elemento is InvocadorReciente =>
          esInvocadorGuardado(elemento) &&
          'fecha' in elemento &&
          typeof elemento.fecha === 'number' &&
          Number.isFinite(elemento.fecha),
      )
      .sort((a, b) => b.fecha - a.fecha)
      .filter((invocador) => {
        const clave = invocador.riotId.toLocaleLowerCase('es-AR');
        if (vistos.has(clave)) return false;
        vistos.add(clave);
        return true;
      })
      .slice(0, 8);
  } catch {
    return [];
  }
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

function guardarPerfilFijado(perfil: PerfilFijado | null): void {
  try {
    if (perfil) {
      localStorage.setItem(clavePerfilFijado, JSON.stringify(perfil));
    } else {
      localStorage.removeItem(clavePerfilFijado);
    }
  } catch {
    // La selección sigue disponible durante esta sesión si falla el almacenamiento.
  }
}

function guardarFavoritos(favoritos: InvocadorGuardado[]): void {
  try {
    localStorage.setItem(claveFavoritos, JSON.stringify(favoritos));
  } catch {
    // Los favoritos siguen disponibles durante esta sesión.
  }
}

function guardarRecientes(recientes: InvocadorReciente[]): void {
  try {
    localStorage.setItem(claveRecientes, JSON.stringify(recientes));
  } catch {
    // Los recientes siguen disponibles durante esta sesión.
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
  favorito,
  fijado,
  colaSeleccionada,
  onCambiarCola,
  onAlternarFavorito,
  onAlternarFijado,
}: {
  perfil: PerfilInvocador;
  favorito: boolean;
  fijado: boolean;
  colaSeleccionada: string;
  onCambiarCola: (queueType: string) => void;
  onAlternarFavorito: () => void;
  onAlternarFijado: () => void;
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

      <div className="perfil__acciones">
        <button
          className="perfil__accion perfil__favorito"
          type="button"
          aria-label={
            favorito
              ? `Quitar a ${perfil.gameName}#${perfil.tagLine} de favoritos`
              : `Agregar a ${perfil.gameName}#${perfil.tagLine} a favoritos`
          }
          aria-pressed={favorito}
          onClick={onAlternarFavorito}
        >
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="m10 2.5 2.3 4.7 5.2.8-3.8 3.7.9 5.3-4.6-2.5-4.6 2.5.9-5.3-3.8-3.7 5.2-.8z" />
          </svg>
          {favorito ? 'En favoritos' : 'Agregar a favoritos'}
        </button>
        <button
          className="perfil__accion"
          type="button"
          aria-pressed={fijado}
          onClick={onAlternarFijado}
        >
          {fijado ? 'Quitar de mi perfil' : 'Fijar como mi perfil'}
        </button>
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
  const [perfilFijado, setPerfilFijado] = useState(leerPerfilFijado);
  const [favoritos, setFavoritos] = useState(leerFavoritos);
  const [recientes, setRecientes] = useState(leerRecientes);
  const [riotId, setRiotId] = useState('');
  const [estado, setEstado] = useState<EstadoBusqueda>(() =>
    perfilFijado
      ? { tipo: 'exito', perfil: perfilFijado.perfil }
      : { tipo: 'inicial' },
  );
  const [seccion, setSeccion] = useState<'perfil' | 'historial'>('perfil');
  const [colaSeleccionada, setColaSeleccionada] = useState('');
  const [sidebarExpandida, setSidebarExpandida] =
    useState(leerSidebarExpandida);
  const [mostrarSelectorPerfil, setMostrarSelectorPerfil] = useState(false);
  const [riotIdParaFijar, setRiotIdParaFijar] = useState('');
  const [errorAlFijar, setErrorAlFijar] = useState('');
  const [buscandoPerfilParaFijar, setBuscandoPerfilParaFijar] = useState(false);
  const solicitudesPrincipal = useRef(0);
  const solicitudPerfilFijado = useRef(0);

  useEffect(() => {
    if (!perfilFijado) return;

    let componenteActivo = true;
    const numeroSolicitud = ++solicitudPerfilFijado.current;
    void window.spaceglider
      .buscarInvocadorPorRiotId(perfilFijado.riotId)
      .then((resultado) => {
        if (
          !componenteActivo ||
          numeroSolicitud !== solicitudPerfilFijado.current ||
          !resultado.ok
        ) {
          return;
        }

        const perfilActualizado = {
          riotId: perfilFijado.riotId,
          perfil: resultado.perfil,
        };
        guardarPerfilFijado(perfilActualizado);
        setPerfilFijado(perfilActualizado);
        setEstado((estadoActual) =>
          estadoActual.tipo === 'exito' &&
          estadoActual.perfil.gameName === perfilFijado.perfil.gameName &&
          estadoActual.perfil.tagLine === perfilFijado.perfil.tagLine
            ? { tipo: 'exito', perfil: resultado.perfil }
            : estadoActual,
        );
      })
      .catch(() => {
        // Si el refresco falla, se mantiene el perfil guardado.
      });

    return () => {
      componenteActivo = false;
    };
  }, []);

  function normalizarRiotId(valor: string): string | null {
    const riotIdNormalizado = valor.trim();
    const separador = riotIdNormalizado.indexOf('#');
    if (
      separador <= 0 ||
      separador !== riotIdNormalizado.lastIndexOf('#') ||
      separador === riotIdNormalizado.length - 1
    ) {
      return null;
    }

    const gameName = riotIdNormalizado.slice(0, separador).trim();
    const tagLine = riotIdNormalizado.slice(separador + 1).trim();
    return gameName && tagLine ? `${gameName}#${tagLine}` : null;
  }

  function crearResumen(
    riotIdBuscado: string,
    perfil: PerfilInvocador,
  ): InvocadorGuardado {
    return {
      riotId: riotIdBuscado,
      gameName: perfil.gameName,
      tagLine: perfil.tagLine,
      profileIconId: perfil.profileIconId,
    };
  }

  function actualizarFavoritos(invocador: InvocadorGuardado): void {
    const clave = invocador.riotId.toLocaleLowerCase('es-AR');
    const yaEsFavorito = favoritos.some(
      (favorito) => favorito.riotId.toLocaleLowerCase('es-AR') === clave,
    );
    const nuevosFavoritos = yaEsFavorito
      ? favoritos.filter(
          (favorito) => favorito.riotId.toLocaleLowerCase('es-AR') !== clave,
        )
      : [
          invocador,
          ...favoritos.filter(
            (favorito) => favorito.riotId.toLocaleLowerCase('es-AR') !== clave,
          ),
        ].slice(0, 20);
    setFavoritos(nuevosFavoritos);
    guardarFavoritos(nuevosFavoritos);
  }

  function alternarFavoritoActual(perfil: PerfilInvocador): void {
    actualizarFavoritos(
      crearResumen(`${perfil.gameName}#${perfil.tagLine}`, perfil),
    );
  }

  function alternarPerfilFijado(perfil: PerfilInvocador): void {
    solicitudPerfilFijado.current += 1;
    const riotIdPerfil = `${perfil.gameName}#${perfil.tagLine}`;
    const esElPerfilFijado =
      perfilFijado?.riotId.toLocaleLowerCase('es-AR') ===
      riotIdPerfil.toLocaleLowerCase('es-AR');
    const nuevoPerfilFijado = esElPerfilFijado
      ? null
      : { riotId: riotIdPerfil, perfil };
    guardarPerfilFijado(nuevoPerfilFijado);
    setPerfilFijado(nuevoPerfilFijado);
  }

  function guardarReciente(
    riotIdBuscado: string,
    perfil: PerfilInvocador,
  ): void {
    const resumen: InvocadorReciente = {
      ...crearResumen(riotIdBuscado, perfil),
      fecha: Date.now(),
    };
    const clave = riotIdBuscado.toLocaleLowerCase('es-AR');
    const nuevosRecientes = [
      resumen,
      ...recientes.filter(
        (reciente) => reciente.riotId.toLocaleLowerCase('es-AR') !== clave,
      ),
    ].slice(0, 8);
    setRecientes(nuevosRecientes);
    guardarRecientes(nuevosRecientes);
  }

  async function buscarPerfilGuardado(riotIdBuscado: string): Promise<void> {
    const riotIdNormalizado = normalizarRiotId(riotIdBuscado);
    if (!riotIdNormalizado) return;

    const numeroSolicitud = ++solicitudesPrincipal.current;
    setRiotId(riotIdNormalizado);
    setEstado({ tipo: 'cargando' });
    try {
      const resultado =
        await window.spaceglider.buscarInvocadorPorRiotId(riotIdNormalizado);
      if (numeroSolicitud !== solicitudesPrincipal.current) return;
      if (resultado.ok) {
        setColaSeleccionada(colaConMayorElo(resultado.perfil));
        setEstado({ tipo: 'exito', perfil: resultado.perfil });
      } else {
        setEstado({
          tipo: 'error',
          origen: 'busqueda',
          mensaje: formatearError(resultado.codigo, resultado.mensaje),
        });
      }
    } catch {
      if (numeroSolicitud !== solicitudesPrincipal.current) return;
      setEstado({
        tipo: 'error',
        origen: 'busqueda',
        mensaje:
          'No se pudo completar la búsqueda. Revisá tu conexión e intentá de nuevo.',
      });
    }
  }

  async function fijarPerfilDesdeSidebar(
    evento: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    evento.preventDefault();
    const riotIdNormalizado = normalizarRiotId(riotIdParaFijar);
    if (!riotIdNormalizado) {
      setErrorAlFijar('Ingresá el Riot ID con el formato nombre#etiqueta.');
      return;
    }

    setErrorAlFijar('');
    solicitudPerfilFijado.current += 1;
    setBuscandoPerfilParaFijar(true);
    try {
      const resultado =
        await window.spaceglider.buscarInvocadorPorRiotId(riotIdNormalizado);
      if (resultado.ok) {
        const nuevoPerfilFijado = {
          riotId: riotIdNormalizado,
          perfil: resultado.perfil,
        };
        guardarPerfilFijado(nuevoPerfilFijado);
        setPerfilFijado(nuevoPerfilFijado);
        setMostrarSelectorPerfil(false);
        setRiotIdParaFijar('');
      } else {
        setErrorAlFijar(formatearError(resultado.codigo, resultado.mensaje));
      }
    } catch {
      setErrorAlFijar(
        'No se pudo completar la búsqueda. Revisá tu conexión e intentá de nuevo.',
      );
    } finally {
      setBuscandoPerfilParaFijar(false);
    }
  }

  async function manejarBusqueda(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const riotIdNormalizado = normalizarRiotId(riotId);
    if (!riotIdNormalizado) {
      setEstado({
        tipo: 'error',
        origen: 'validacion',
        mensaje: 'Ingresá el Riot ID con el formato gameName#tagLine.',
      });
      return;
    }

    const numeroSolicitud = ++solicitudesPrincipal.current;
    setEstado({ tipo: 'cargando' });

    try {
      const resultado =
        await window.spaceglider.buscarInvocadorPorRiotId(riotIdNormalizado);

      if (resultado.ok) {
        if (numeroSolicitud !== solicitudesPrincipal.current) return;
        guardarReciente(riotIdNormalizado, resultado.perfil);
        setColaSeleccionada(colaConMayorElo(resultado.perfil));
        setEstado({ tipo: 'exito', perfil: resultado.perfil });
      } else {
        if (numeroSolicitud !== solicitudesPrincipal.current) return;
        setEstado({
          tipo: 'error',
          origen: 'busqueda',
          mensaje: formatearError(resultado.codigo, resultado.mensaje),
        });
      }
    } catch {
      if (numeroSolicitud !== solicitudesPrincipal.current) return;
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
  const perfilActual = estado.tipo === 'exito' ? estado.perfil : null;
  const riotIdActual = perfilActual
    ? `${perfilActual.gameName}#${perfilActual.tagLine}`
    : '';
  const esFavoritoActual = favoritos.some(
    (favorito) =>
      favorito.riotId.toLocaleLowerCase('es-AR') ===
      riotIdActual.toLocaleLowerCase('es-AR'),
  );
  const estaFijadoActual =
    !!perfilActual &&
    perfilFijado?.riotId.toLocaleLowerCase('es-AR') ===
      riotIdActual.toLocaleLowerCase('es-AR');

  function cambiarSeccion(nuevaSeccion: 'perfil' | 'historial'): void {
    setSeccion(nuevaSeccion);
  }

  function mostrarPerfilFijado(): void {
    if (!perfilFijado) return;
    solicitudesPrincipal.current += 1;
    setColaSeleccionada(colaConMayorElo(perfilFijado.perfil));
    setEstado({ tipo: 'exito', perfil: perfilFijado.perfil });
    setSeccion('perfil');
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
          {sidebarExpandida &&
            (perfilFijado ? (
              <div className="sidebar__fijado">
                <button
                  className="sidebar__invocador"
                  type="button"
                  onClick={mostrarPerfilFijado}
                  aria-label={`Mostrar el perfil fijado de ${perfilFijado.perfil.gameName}#${perfilFijado.perfil.tagLine}`}
                >
                  <IconoPerfil
                    key={perfilFijado.perfil.profileIconId}
                    profileIconId={perfilFijado.perfil.profileIconId}
                    gameName={perfilFijado.perfil.gameName}
                    claseMarco={`sidebar__icono ${claseMarcoDeRango(
                      perfilFijado.perfil.rangos.find(
                        (rango) =>
                          rango.queueType ===
                          colaConMayorElo(perfilFijado.perfil),
                      )?.tier,
                    )}`}
                  />
                  <span className="sidebar__invocador-texto">
                    <strong>
                      {perfilFijado.perfil.gameName}#
                      {perfilFijado.perfil.tagLine}
                    </strong>
                    <span>Nivel {perfilFijado.perfil.summonerLevel}</span>
                  </span>
                </button>
                <button
                  className="sidebar__cambiar"
                  type="button"
                  onClick={() =>
                    setMostrarSelectorPerfil((mostrar) => !mostrar)
                  }
                  aria-expanded={mostrarSelectorPerfil}
                  aria-controls="formulario-perfil-fijado"
                >
                  {mostrarSelectorPerfil ? 'Cancelar' : 'Cambiar perfil'}
                </button>
              </div>
            ) : (
              <div className="sidebar__sin-fijar">
                <span className="sidebar__invocador-vacio">
                  <strong>Sin perfil fijado</strong>
                  <span>Elegí tu invocador</span>
                </span>
                <button
                  className="sidebar__elegir"
                  type="button"
                  onClick={() =>
                    setMostrarSelectorPerfil((mostrar) => !mostrar)
                  }
                  aria-expanded={mostrarSelectorPerfil}
                  aria-controls="formulario-perfil-fijado"
                >
                  Elegir mi perfil
                </button>
              </div>
            ))}
          {sidebarExpandida && mostrarSelectorPerfil && (
            <form
              className="sidebar__formulario"
              id="formulario-perfil-fijado"
              onSubmit={fijarPerfilDesdeSidebar}
              noValidate
            >
              <label htmlFor="riot-id-fijado">Tu Riot ID</label>
              <input
                id="riot-id-fijado"
                type="text"
                value={riotIdParaFijar}
                onChange={(evento) => {
                  setRiotIdParaFijar(evento.target.value);
                  setErrorAlFijar('');
                }}
                placeholder="Nombre#Etiqueta"
                autoComplete="off"
                maxLength={64}
                aria-describedby={
                  errorAlFijar ? 'error-perfil-fijado' : undefined
                }
                aria-invalid={errorAlFijar ? 'true' : undefined}
                disabled={buscandoPerfilParaFijar}
              />
              <button
                className="sidebar__elegir"
                type="submit"
                disabled={buscandoPerfilParaFijar}
              >
                {buscandoPerfilParaFijar ? 'Buscando…' : 'Confirmar'}
              </button>
              {errorAlFijar && (
                <p
                  className="sidebar__error"
                  id="error-perfil-fijado"
                  role="alert"
                >
                  {errorAlFijar}
                </p>
              )}
            </form>
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
        {sidebarExpandida && favoritos.length > 0 && (
          <section
            className="sidebar__favoritos"
            aria-labelledby="titulo-favoritos"
          >
            <h2 id="titulo-favoritos">Favoritos</h2>
            <ul className="sidebar__favoritos-lista">
              {favoritos.map((favorito) => (
                <li key={favorito.riotId}>
                  <button
                    className="sidebar__favorito"
                    type="button"
                    onClick={() => {
                      setSeccion('perfil');
                      void buscarPerfilGuardado(favorito.riotId);
                    }}
                    aria-label={`Buscar ${favorito.gameName}#${favorito.tagLine}`}
                  >
                    <IconoPerfil
                      key={favorito.profileIconId}
                      profileIconId={favorito.profileIconId}
                      gameName={favorito.gameName}
                      claseMarco="sidebar__icono marco--neutro"
                    />
                    <span>
                      {favorito.gameName}#{favorito.tagLine}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
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

              {recientes.length > 0 && (
                <section className="recientes" aria-label="Búsquedas recientes">
                  <h2>Recientes</h2>
                  <div className="recientes__lista">
                    {recientes.map((reciente) => (
                      <button
                        className="recientes__chip"
                        key={reciente.riotId}
                        type="button"
                        onClick={() =>
                          void buscarPerfilGuardado(reciente.riotId)
                        }
                      >
                        {reciente.gameName}#{reciente.tagLine}
                      </button>
                    ))}
                  </div>
                </section>
              )}

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
                  favorito={esFavoritoActual}
                  fijado={estaFijadoActual}
                  colaSeleccionada={colaSeleccionada}
                  onCambiarCola={setColaSeleccionada}
                  onAlternarFavorito={() =>
                    alternarFavoritoActual(estado.perfil)
                  }
                  onAlternarFijado={() => alternarPerfilFijado(estado.perfil)}
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
