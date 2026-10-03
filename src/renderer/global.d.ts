import type { SpaceGliderApi } from '../shared/ipc';

// Le avisa a TypeScript que window tiene esta propiedad extra.
// Sin esto, el renderer marcaría error al escribir window.spaceglider.
declare global {
  interface Window {
    spaceglider: SpaceGliderApi;
  }
}

// Este archivo necesita al menos un import/export para ser tratado
// como módulo (y que "declare global" funcione).
export {};
