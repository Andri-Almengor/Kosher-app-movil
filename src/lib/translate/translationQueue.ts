import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Simple translation request queue:
 * - Dedupes same (text, lang) inflight requests
 * - Limits concurrency to avoid freezing the UI and spamming the endpoint
 * - Optionally delays between requests (rate-limit friendly)
 *
 * Used by translateText().
 */

type Lang = "es" | "en";

type Job = {
  key: string;
  text: string;
  target: Lang;
  resolve: (v: string) => void;
  reject: (e: any) => void;
};

const inflight = new Map<string, Promise<string>>();
const queue: Job[] = [];

let running = 0;

const CONCURRENCY = 2;
// Small delay to avoid hammering the translator service
const DELAY_MS = 150;

// Global toggle to quickly short-circuit if needed
let enabled = true;
export function setTranslationEnabled(v: boolean) {
  enabled = v;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function enqueueTranslate(
  key: string,
  run: () => Promise<string>
): Promise<string> {
  if (!enabled) return run();

  const existing = inflight.get(key);
  if (existing) return existing;

  const p = new Promise<string>((resolve, reject) => {
    queue.push({
      key,
      text: "",
      target: "en",
      resolve,
      reject,
    });
  });

  // Replace placeholder job with executable closure data
  const job = queue[queue.length - 1]!;
  (job as any).run = run;

  inflight.set(key, p);

  void pump();

  return p.finally(() => {
    inflight.delete(key);
  });
}

async function pump() {
  if (running >= CONCURRENCY) return;
  const job = queue.shift();
  if (!job) return;

  running += 1;
  try {
    // @ts-ignore
    const out = await job.run();
    job.resolve(out);
  } catch (e) {
    job.reject(e);
  } finally {
    running -= 1;
    if (DELAY_MS) await sleep(DELAY_MS);
    void pump();
  }
}
