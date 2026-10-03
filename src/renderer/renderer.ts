import './styles/index.css';

// querySelector busca un elemento por su selector CSS.
// Devuelve null si no existe, por eso el tipo incluye esa posibilidad.
const pingButton = document.querySelector<HTMLButtonElement>('#ping-button');
const pingResult = document.querySelector<HTMLParagraphElement>('#ping-result');

// Si el HTML y el TS se desincronizan, preferimos enterarnos acá con un
// mensaje claro, y no con un error confuso más adelante.
if (!pingButton || !pingResult) {
  throw new Error('No se encontraron los elementos del ping en index.html');
}

pingButton.addEventListener('click', async () => {
  pingButton.disabled = true; // evita varios clics mientras se espera la respuesta

  try {
    // window.spaceglider lo publica el preload (src/preload/preload.ts)
    const response = await window.spaceglider.ping();
    const hora = new Date(response.timestamp).toLocaleTimeString();
    // textContent trata el valor como texto plano. Nunca uses innerHTML
    // con datos externos (como los que lleguen de Riot): permite inyectar HTML.
    pingResult.textContent = `${response.message} (${hora})`;
  } catch (error) {
    pingResult.textContent = 'Error al hacer ping. Revisá la consola.';
    console.error(error);
  } finally {
    pingButton.disabled = false; // se ejecuta siempre, haya error o no
  }
});
