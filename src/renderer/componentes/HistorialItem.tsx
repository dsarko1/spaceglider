import { useState, type JSX } from 'react';
import type { ResumenPartida } from '../../compartido/contratos';

function inicialesCampeon(campeon: string): string {
  return campeon.trim().slice(0, 2).toLocaleUpperCase('es-AR') || '?';
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

  const imagenCampeon =
    Number.isInteger(partida.championId) &&
    partida.imagenCampeon &&
    !imagenFallida
      ? partida.imagenCampeon
      : null;

  return (
    <li className="historial__partida">
      <span
        className={`historial__resultado historial__resultado--${partida.resultado}`}
      >
        {partida.resultado === 'victoria' ? 'Victoria' : 'Derrota'}
      </span>
      <span className="historial__icono-campeon" aria-hidden="true">
        {imagenCampeon ? (
          <img
            src={imagenCampeon}
            alt=""
            width={32}
            height={32}
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
        <span
          className="historial__kda"
          aria-label={`KDA: ${partida.asesinatos} asesinatos, ${partida.muertes} muertes y ${partida.asistencias} asistencias`}
        >
          {partida.asesinatos} / {partida.muertes} / {partida.asistencias}
        </span>
        <span className="historial__detalle">
          {nombreCola} · {duracion} · {fecha}
        </span>
      </div>
    </li>
  );
}
