import { readJSON, writeJSON } from "@/lib/storage/jsonStore";

const KEY = "products-deleted"; // string[]

export async function getDeletedSet(): Promise<Set<string>> {
  const arr = await readJSON<string[]>(KEY, []);
  return new Set(arr);
}

export async function markDeleted(id: string): Promise<void> {
  const set = await getDeletedSet();
  set.add(id);
  await writeJSON(KEY, Array.from(set));
}
