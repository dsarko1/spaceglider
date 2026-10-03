import './styles/index.css';

// Busca un elemento por su selector CSS y falla con un mensaje claro si no existe.
// <T> permite indicar qué tipo de elemento esperamos (botón, párrafo...).
function getElement<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`No se encontró el elemento ${selector} en index.html`);
  }
  return element;
}

const pingButton = getElement<HTMLButtonElement>('#ping-button');
const pingResult = getElement<HTMLParagraphElement>('#ping-result');
const riotButton = getElement<HTMLButtonElement>('#riot-button');
const riotResult = getElement<HTMLParagraphElement>('#riot-result');

// --- Ping al proceso main ---
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

// --- Prueba de conexión con Riot ---
riotButton.addEventListener('click', async () => {
  riotButton.disabled = true;
  riotResult.textContent = 'Consultando a Riot...';

  try {
    const result = await window.spaceglider.checkRiotConnection();

    // Discriminación por "ok": TypeScript sabe qué campos existen en cada rama.
    if (result.ok) {
      riotResult.textContent = `✅ Conexión correcta con Riot: ${result.data.name} (${result.data.platformId})`;
    } else {
      riotResult.textContent = `❌ ${result.error.message}`;
    }
  } catch (error) {
    // Solo llega acá si falla la comunicación interna (no un error de Riot).
    riotResult.textContent =
      'Error de comunicación interna. Revisá la consola.';
    console.error(error);
  } finally {
    riotButton.disabled = false;
  }
});
