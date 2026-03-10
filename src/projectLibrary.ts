// ──────────────────────────────────────────────────────────────
// Project Library — File System Access API utilities
// Reads/writes .json project files directly to a user-selected
// folder (OneDrive / SharePoint / Teams shared folder).
// No project data is stored in the browser.
// ──────────────────────────────────────────────────────────────

// ---- Types ----

export interface ProjectFileMeta {
  fileName: string;
  moleculeName: string;
  countriesCount: number;
  scenarioMode: string;
  modelVersion: number;
  sizeKB: number;
  lastModified: Date;
}

// ---- Feature detection ----

export function isFileSystemAccessSupported(): boolean {
  return 'showDirectoryPicker' in window;
}

// ---- IndexedDB helpers (persist directory handle between sessions) ----

const IDB_NAME = 'biosimilar-fs';
const IDB_STORE = 'handles';
const IDB_KEY = 'workspaceDir';

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(IDB_STORE)) {
        req.result.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveHandleToIDB(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(handle, IDB_KEY);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function loadHandleFromIDB(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = () => { db.close(); resolve(req.result ?? null); };
      req.onerror = () => { db.close(); reject(req.error); };
    });
  } catch {
    return null;
  }
}

// ---- Directory access ----

/** Opens the native folder picker. Saves handle to IndexedDB for next session. */
export async function pickDirectory(): Promise<FileSystemDirectoryHandle> {
  const handle = await (window as unknown as { showDirectoryPicker: (opts?: object) => Promise<FileSystemDirectoryHandle> })
    .showDirectoryPicker({ mode: 'readwrite', id: 'biosimilar-projects' });
  await saveHandleToIDB(handle);
  return handle;
}

/** Tries to restore a previously selected folder. Returns null if none or permission denied. */
export async function restoreDirectory(): Promise<FileSystemDirectoryHandle | null> {
  const handle = await loadHandleFromIDB();
  if (!handle) return null;

  // Check / request permission (may show a prompt in the browser)
  const opts = { mode: 'readwrite' as const };
  if ((await (handle as unknown as { queryPermission: (o: object) => Promise<string> }).queryPermission(opts)) === 'granted') {
    return handle;
  }
  try {
    if ((await (handle as unknown as { requestPermission: (o: object) => Promise<string> }).requestPermission(opts)) === 'granted') {
      return handle;
    }
  } catch {
    // User denied or browser blocked
  }
  return null;
}

// ---- File operations ----

/** Lists all .json files in the directory with metadata extracted from file contents. */
export async function listProjectFiles(dirHandle: FileSystemDirectoryHandle): Promise<ProjectFileMeta[]> {
  const results: ProjectFileMeta[] = [];

  // Use entries() via cast — TS DOM lib may not expose values() directly
  const iter = (dirHandle as unknown as AsyncIterable<[string, FileSystemHandle]>)[Symbol.asyncIterator]();
  for (let result = await iter.next(); !result.done; result = await iter.next()) {
    const [, entry] = result.value;
    if (entry.kind !== 'file') continue;
    const fileHandle = entry as FileSystemFileHandle;
    if (!fileHandle.name.endsWith('.json')) continue;

    try {
      const file = await fileHandle.getFile();
      const text = await file.text();
      const parsed = JSON.parse(text);

      results.push({
        fileName: fileHandle.name,
        moleculeName: parsed?.config?.moleculeName ?? '(unnamed)',
        countriesCount: Array.isArray(parsed?.countries) ? parsed.countries.length : 0,
        scenarioMode: parsed?.config?.scenarioMode ?? 'base_only',
        modelVersion: parsed?.config?.modelVersion ?? 0,
        sizeKB: Math.round(file.size / 1024),
        lastModified: new Date(file.lastModified),
      });
    } catch {
      // Unreadable or non-project JSON — skip
      results.push({
        fileName: fileHandle.name,
        moleculeName: '(unreadable)',
        countriesCount: 0,
        scenarioMode: '',
        modelVersion: 0,
        sizeKB: 0,
        lastModified: new Date(0),
      });
    }
  }

  // Sort by most recently modified first
  results.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
  return results;
}

/** Reads a project file and returns its raw JSON string. */
export async function readProjectFile(dirHandle: FileSystemDirectoryHandle, fileName: string): Promise<string> {
  const fileHandle = await dirHandle.getFileHandle(fileName);
  const file = await fileHandle.getFile();
  return file.text();
}

/** Saves (creates or overwrites) a project file. */
export async function saveProjectFile(dirHandle: FileSystemDirectoryHandle, fileName: string, json: string): Promise<void> {
  const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(json);
  await writable.close();
}

/** Deletes a project file from the directory. */
export async function deleteProjectFile(dirHandle: FileSystemDirectoryHandle, fileName: string): Promise<void> {
  await dirHandle.removeEntry(fileName);
}

// ---- Helpers ----

/** Sanitises a project name into a valid filename (no extension). */
export function sanitizeFileName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s\-_]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80) || 'untitled';
}
