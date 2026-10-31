import { useState, type JSX } from 'react';
import type { ResumenPartida } from '../../compartido/contratos';

const formatoKda = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
});

function inicialesCampeon(campeon: string): string {
  return campeon.trim().slice(0, 2).toLocaleUpperCase('es-AR') || '?';
}

function ratioKda(
  asesinatos: number,
  muertes: number,
  asistencias: number,
): string {
  return formatoKda.format((asesinatos + asistencias) / Math.max(1, muertes));
}

export function HistorialItem({
  partida,
  nombreCola,
  duracion,
  fecha,
}: {
  partida: ResumenPartida;
  nombreCola: string;
  duracion: string;
  fecha: string;
}): JSX.Element {
  const [imagenFallida, setImagenFallida] = useState(false);
  const victoria = partida.resultado === 'victoria';

  const imagenCampeon =
    Number.isInteger(partida.championId) &&
    partida.imagenCampeon &&
    !imagenFallida
      ? partida.imagenCampeon
      : null;

  return (
    <li
      className={`historial__partida historial__partida--${partida.resultado}`}
    >
      <span
        className={`historial__resultado historial__resultado--${partida.resultado}`}
      >
        <span className="historial__resultado-punto" aria-hidden="true" />
        {victoria ? 'Victoria' : 'Derrota'}
      </span>
      <span className="historial__icono-campeon" aria-hidden="true">
        {imagenCampeon ? (
          <img
            src={imagenCampeon}
            alt=""
            width={46}
            height={46}
            loading="lazy"
            decoding="async"
            onError={() => setImagenFallida(true)}
          />
        ) : (
          inicialesCampeon(partida.campeon)
        )}
      </span>
      <div className="historial__datos">
        <strong className="historial__campeon">{partida.campeon}</strong>
        <span className="historial__detalle">
          <span className="historial__detalle-parte">{nombreCola}</span>
          <span className="historial__detalle-parte">{duracion}</span>
          <span className="historial__detalle-parte">{fecha}</span>
        </span>
      </div>
      <div className="historial__kda-bloque">
        <span
          className="historial__kda"
          aria-label={`KDA: ${partida.asesinatos} asesinatos, ${partida.muertes} muertes y ${partida.asistencias} asistencias`}
        >
          {partida.asesinatos} / {partida.muertes} / {partida.asistencias}
        </span>
        <span className="historial__kda-ratio">
          {ratioKda(partida.asesinatos, partida.muertes, partida.asistencias)}{' '}
          KDA
        </span>
      </div>
    </li>
  );
}
