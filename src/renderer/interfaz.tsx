import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Aplicacion } from './aplicacion';
import './estilos.css';

const elementoRaiz = document.getElementById('root');

if (!elementoRaiz) {
  throw new Error('No se encontró el elemento raíz de la aplicación.');
}

createRoot(elementoRaiz).render(
  <StrictMode>
    <Aplicacion />
  </StrictMode>,
);
