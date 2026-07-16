export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}
