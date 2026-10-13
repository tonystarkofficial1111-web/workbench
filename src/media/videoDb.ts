import { Emitter } from "../core/store";

/** Offline video library in IndexedDB 'wbVideos' / store 'videos' (same schema as the original). */
export interface VideoRec {
  id: number;
  name: string;
  size: number;
  type: string;
  blob: Blob;
  added: number;
}
export const videoEvents = new Emitter();
let vdb: IDBDatabase | null = null;

function open(): Promise<IDBDatabase> {
  if (vdb) return Promise.resolve(vdb);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("wbVideos", 1);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains("videos")) d.createObjectStore("videos", { keyPath: "id", autoIncrement: true });
    };
    req.onsuccess = () => {
      vdb = req.result;
      resolve(vdb);
    };
    req.onerror = () => reject(req.error);
  });
}
const tx = (mode: IDBTransactionMode) => open().then((d) => d.transaction("videos", mode).objectStore("videos"));
const wrap = <T,>(r: IDBRequest<T>) => new Promise<T>((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

export async function vAdd(file: File | Blob & { name?: string }): Promise<number> {
  const store = await tx("readwrite");
  const f = file as File;
  const id = (await wrap(store.add({ name: f.name, size: f.size, type: f.type || "video/mp4", blob: f, added: Date.now() }))) as number;
  videoEvents.emit();
  return id;
}
export async function vGetAll(): Promise<VideoRec[]> {
  return ((await wrap((await tx("readonly")).getAll())) as VideoRec[]) || [];
}
export async function vGet(id: number): Promise<VideoRec | undefined> {
  return (await wrap((await tx("readonly")).get(id))) as VideoRec | undefined;
}
export async function vDel(id: number): Promise<void> {
  await wrap((await tx("readwrite")).delete(id));
  videoEvents.emit();
}
export function vFmt(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + " MB";
  return (bytes / 1073741824).toFixed(2) + " GB";
}
