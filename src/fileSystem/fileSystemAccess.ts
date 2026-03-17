// ──────────────────────────────────────────────────────────────
// File System Access API — Save/Open to OneDrive/Teams/local
// ──────────────────────────────────────────────────────────────
// Uses the File System Access API (Chrome/Edge) for native file
// picker that works with synced OneDrive/Teams folders.
// Falls back to download/upload for unsupported browsers.

/** Check if File System Access API is supported */
export function isFileSystemAccessSupported(): boolean {
  return 'showSaveFilePicker' in window && 'showOpenFilePicker' in window;
}

/**
 * Save JSON string to a user-chosen location via native file picker.
 * Works with OneDrive/Teams synced folders in Edge/Chrome.
 * Falls back to standard download if API not available.
 */
export async function saveJsonToFileSystem(
  jsonString: string,
  suggestedName: string,
): Promise<{ saved: boolean; fileName?: string }> {
  if (isFileSystemAccessSupported()) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: `${suggestedName}.json`,
        types: [
          {
            description: 'Business Case Model',
            accept: { 'application/json': ['.json'] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(jsonString);
      await writable.close();
      return { saved: true, fileName: handle.name };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        // User cancelled the picker
        return { saved: false };
      }
      throw err;
    }
  }

  // Fallback: standard download
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${suggestedName}.json`;
  a.click();
  URL.revokeObjectURL(url);
  return { saved: true, fileName: `${suggestedName}.json` };
}

/**
 * Open a JSON file from a user-chosen location via native file picker.
 * Works with OneDrive/Teams synced folders in Edge/Chrome.
 * Falls back to standard file input for unsupported browsers.
 */
export async function openJsonFromFileSystem(): Promise<{ content: string; fileName: string } | null> {
  if (isFileSystemAccessSupported()) {
    try {
      const [handle] = await (window as any).showOpenFilePicker({
        types: [
          {
            description: 'Business Case Model',
            accept: { 'application/json': ['.json'] },
          },
        ],
        multiple: false,
      });
      const file = await handle.getFile();
      const content = await file.text();
      return { content, fileName: file.name };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return null; // User cancelled
      }
      throw err;
    }
  }

  // Fallback: hidden file input
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const content = await file.text();
      resolve({ content, fileName: file.name });
    };
    input.click();
  });
}
