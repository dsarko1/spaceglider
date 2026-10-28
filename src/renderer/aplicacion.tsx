import { useEffect, useState, type FormEvent, type JSX } from 'react';
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
const duracionCacheVersion = 24 * 60 * 60 * 1000;

let solicitudVersionDataDragon: Promise<string | null> | null = null;

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

function IconoPerfil({
  profileIconId,
  gameName,
}: {
  profileIconId: number;
  gameName: string;
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
    <div className="perfil__marco-icono">
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
          className="perfil__icono-cargando"
          role="img"
          aria-label={`Cargando icono de perfil de ${gameName}`}
        />
      )}
    </div>
  );
}

function TarjetaPerfil({ perfil }: { perfil: PerfilInvocador }): JSX.Element {
  return (
    <section className="perfil" aria-labelledby="titulo-perfil">
      <div className="perfil__encabezado">
        <IconoPerfil
          key={perfil.profileIconId}
          profileIconId={perfil.profileIconId}
          gameName={perfil.gameName}
        />
        <div className="perfil__identidad">
          <p className="perfil__ceja">PERFIL DE INVOCADOR</p>
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
        {perfil.rangos.length > 0 ? (
          <ul className="rangos__lista">
            {perfil.rangos.map((rango) => (
              <li className="rango" key={rango.queueType}>
                <div>
                  <p className="rango__cola">{nombreDeCola(rango.queueType)}</p>
                  <p className="rango__division">
                    {nombreDeRango(rango.tier)}
                    {rango.rank ? ` ${rango.rank}` : ''}
                  </p>
                </div>
                <div className="rango__puntos">
                  <strong>
                    {new Intl.NumberFormat('es-AR').format(rango.leaguePoints)}
                  </strong>
                  <span>LP</span>
                </div>
              </li>
            ))}
          </ul>
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
  const [riotId, setRiotId] = useState('');
  const [estado, setEstado] = useState<EstadoBusqueda>({ tipo: 'inicial' });
  const [seccion, setSeccion] = useState<'perfil' | 'historial'>('perfil');

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

  return (
    <div className="pagina">
      <header className="barra-superior">
        <div className="marca">
          <span className="marca__simbolo" aria-hidden="true">
            S
          </span>
          <span>SPACEGLIDER</span>
        </div>
        <span className="etiqueta-region">LA2 · LAS</span>
      </header>

      <nav className="navegacion" aria-label="Secciones principales">
        <button
          className="navegacion__boton"
          type="button"
          aria-current={seccion === 'perfil' ? 'page' : undefined}
          aria-controls="contenido-principal"
          onClick={() => setSeccion('perfil')}
        >
          Perfil
        </button>
        <button
          className="navegacion__boton"
          type="button"
          aria-current={seccion === 'historial' ? 'page' : undefined}
          aria-controls="contenido-principal"
          onClick={() => setSeccion('historial')}
        >
          Historial
        </button>
      </nav>

      <main className="contenido" id="contenido-principal">
        {seccion === 'perfil' ? (
          <section className="presentacion" aria-labelledby="titulo-principal">
            <p className="ceja">LEAGUE OF LEGENDS · COMPANION</p>
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
                      <span className="busqueda__spinner" aria-hidden="true" />
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
              <TarjetaPerfil perfil={estado.perfil} />
            ) : (
              !hayError &&
              !estaCargando && (
                <p className="estado-inicial" role="status" aria-live="polite">
                  Ingresá un Riot ID para ver el perfil.
                </p>
              )
            )}
          </section>
        ) : (
          <section className="historial" aria-labelledby="titulo-principal">
            <p className="ceja">LEAGUE OF LEGENDS · PARTIDAS</p>
            <h1 id="titulo-principal">Historial de partidas</h1>
            <p className="descripcion">
              Tus partidas recientes van a aparecer en esta sección.
            </p>
            <div className="historial__vacio" role="status" aria-live="polite">
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
  );
}
