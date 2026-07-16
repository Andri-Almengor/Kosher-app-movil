export type AppTabKey = "Inicio" | "Productos" | "Novedades" | "Restaurantes" | "Donaciones";

type Listener = (tab: AppTabKey) => void;

const listeners = new Set<Listener>();

export function subscribeTabReset(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitTabReset(tab: AppTabKey) {
  for (const listener of Array.from(listeners)) {
    try {
      listener(tab);
    } catch {}
  }
}
