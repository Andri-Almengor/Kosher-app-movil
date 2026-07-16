export type OfflineSyncListener = () => void | Promise<void>;

const listeners = new Set<OfflineSyncListener>();

export function subscribeOfflineSync(listener: OfflineSyncListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function emitOfflineSync() {
  await Promise.allSettled(Array.from(listeners).map((listener) => Promise.resolve(listener())));
}
