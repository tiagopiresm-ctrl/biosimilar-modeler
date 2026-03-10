import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from './Layout';
import { useStore } from '../store';
import {
  isFileSystemAccessSupported,
  pickDirectory,
  restoreDirectory,
  listProjectFiles,
  readProjectFile,
  saveProjectFile,
  deleteProjectFile,
  sanitizeFileName,
  type ProjectFileMeta,
} from '../projectLibrary';
import {
  FolderOpen, Upload, Download, Trash2, RefreshCw, HardDrive,
  AlertTriangle, FileText, Globe2, BarChart3, Calendar,
} from 'lucide-react';

// ─────────────────── Unsupported browser ───────────────────

function UnsupportedBanner() {
  return (
    <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-6 text-center max-w-lg mx-auto">
      <AlertTriangle className="mx-auto mb-3 text-amber-500" size={32} />
      <h3 className="text-sm font-bold text-amber-800 mb-2">Browser Not Supported</h3>
      <p className="text-xs text-amber-700 leading-relaxed">
        Folder access requires <strong>Microsoft Edge</strong> or <strong>Google Chrome</strong>.
        <br />
        You can still use the <strong>Save / Load Project</strong> buttons in the sidebar to export and import files manually.
      </p>
    </div>
  );
}

// ─────────────────── Connect prompt ───────────────────

function ConnectPrompt({ onConnect, loading }: { onConnect: () => void; loading: boolean }) {
  return (
    <div className="mt-8 rounded-lg border border-gray-200 bg-white p-8 text-center max-w-lg mx-auto shadow-sm">
      <FolderOpen className="mx-auto mb-4 text-gray-400" size={40} />
      <h3 className="text-sm font-bold text-gray-800 mb-2">Connect a Project Folder</h3>
      <p className="text-xs text-gray-500 leading-relaxed mb-5">
        Select your OneDrive, SharePoint, or Teams shared folder.
        <br />
        Project files stay on your company server — nothing is stored in the browser.
      </p>
      <button
        onClick={onConnect}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        <FolderOpen size={16} />
        {loading ? 'Connecting…' : 'Connect Folder'}
      </button>
    </div>
  );
}

// ─────────────────── Project card ───────────────────

function ProjectCard({
  project,
  onLoad,
  onOverwrite,
  onDelete,
}: {
  project: ProjectFileMeta;
  onLoad: () => void;
  onOverwrite: () => void;
  onDelete: () => void;
}) {
  const dateStr = project.lastModified.getTime() > 0
    ? project.lastModified.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-bold text-gray-900 truncate" title={project.fileName}>
            {project.fileName.replace(/\.json$/i, '')}
          </h4>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
              <FileText size={11} />
              {project.moleculeName}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
              <Globe2 size={11} />
              {project.countriesCount} {project.countriesCount === 1 ? 'country' : 'countries'}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
              <BarChart3 size={11} />
              {project.scenarioMode === 'three_scenario' ? '3-Scenario' : 'Base Only'}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
              <Calendar size={11} />
              {dateStr}
            </span>
            <span className="text-[11px] text-gray-400">
              {project.sizeKB} KB
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
        <button
          onClick={onLoad}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          <Upload size={12} />
          Load
        </button>
        <button
          onClick={onOverwrite}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
        >
          <Download size={12} />
          Overwrite
        </button>
        <button
          onClick={onDelete}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium text-red-600 bg-white border border-red-200 rounded hover:bg-red-50 transition-colors ml-auto"
        >
          <Trash2 size={12} />
          Delete
        </button>
      </div>
    </div>
  );
}

// ─────────────────── Save form (inline) ───────────────────

function SaveForm({
  defaultName,
  onSave,
  onCancel,
  saving,
}: {
  defaultName: string;
  onSave: (name: string) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [name, setName] = useState(defaultName);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        autoFocus
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Project name"
        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
      <button
        type="submit"
        disabled={saving || !name.trim()}
        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        <Download size={14} />
        {saving ? 'Saving…' : 'Save'}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        Cancel
      </button>
    </form>
  );
}

// ─────────────────── Main page ───────────────────

export function ProjectLibraryPage() {
  const { config, exportJSON, importJSON, setPage } = useStore();

  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [projects, setProjects] = useState<ProjectFileMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const supported = isFileSystemAccessSupported();

  // ---- Refresh project list ----
  const refreshList = useCallback(async (handle: FileSystemDirectoryHandle) => {
    try {
      setLoading(true);
      const list = await listProjectFiles(handle);
      setProjects(list);
      setError(null);
    } catch (err) {
      setError('Could not read folder contents. It may have been moved or permissions revoked.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ---- Auto-restore on mount ----
  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const handle = await restoreDirectory();
      if (cancelled) return;
      if (handle) {
        setDirHandle(handle);
        await refreshList(handle);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [supported, refreshList]);

  // ---- Connect folder ----
  const handleConnect = async () => {
    try {
      setLoading(true);
      setError(null);
      const handle = await pickDirectory();
      setDirHandle(handle);
      await refreshList(handle);
    } catch (err) {
      if ((err as DOMException).name !== 'AbortError') {
        setError('Could not connect to folder.');
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  };

  // ---- Save current project ----
  const handleSave = async (name: string) => {
    if (!dirHandle) return;
    try {
      setSaving(true);
      const fileName = sanitizeFileName(name) + '.json';
      const json = exportJSON();
      await saveProjectFile(dirHandle, fileName, json);
      setShowSaveForm(false);
      await refreshList(dirHandle);
    } catch (err) {
      alert('Failed to save project. Check folder permissions.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // ---- Load project ----
  const handleLoad = async (fileName: string) => {
    if (!dirHandle) return;
    if (!window.confirm('Loading this project will replace your current working model. Any unsaved changes will be lost.\n\nContinue?')) return;
    try {
      setLoading(true);
      const json = await readProjectFile(dirHandle, fileName);
      importJSON(json);
      setPage('setup');
    } catch (err) {
      alert('Failed to load project.');
      console.error(err);
      setLoading(false);
    }
  };

  // ---- Overwrite project ----
  const handleOverwrite = async (fileName: string) => {
    if (!dirHandle) return;
    if (!window.confirm(`Overwrite "${fileName}" with the current model?\n\nThis will replace the file contents.`)) return;
    try {
      setSaving(true);
      const json = exportJSON();
      await saveProjectFile(dirHandle, fileName, json);
      await refreshList(dirHandle);
    } catch (err) {
      alert('Failed to overwrite project.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // ---- Delete project ----
  const handleDelete = async (fileName: string) => {
    if (!dirHandle) return;
    if (!window.confirm(`Delete "${fileName}"?\n\nThis will permanently remove the file from the folder.`)) return;
    try {
      await deleteProjectFile(dirHandle, fileName);
      await refreshList(dirHandle);
    } catch (err) {
      alert('Failed to delete project.');
      console.error(err);
    }
  };

  // ─────────── Render ───────────

  return (
    <div>
      <PageHeader
        title="Project Library"
        subtitle="Save and manage business case models in your shared folder"
      />

      {!supported ? (
        <UnsupportedBanner />
      ) : !dirHandle ? (
        <ConnectPrompt onConnect={handleConnect} loading={loading} />
      ) : (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-xs text-gray-500 min-w-0">
              <HardDrive size={14} className="text-gray-400 shrink-0" />
              <span className="truncate font-medium text-gray-700" title={dirHandle.name}>
                {dirHandle.name}
              </span>
              <button
                onClick={handleConnect}
                className="text-blue-600 hover:text-blue-800 text-[11px] font-medium shrink-0"
              >
                Change
              </button>
              <button
                onClick={() => refreshList(dirHandle)}
                className="text-gray-400 hover:text-gray-600 shrink-0"
                title="Refresh"
              >
                <RefreshCw size={13} />
              </button>
            </div>

            {showSaveForm ? (
              <div className="w-full sm:w-auto sm:min-w-[400px]">
                <SaveForm
                  defaultName={config.moleculeName || 'New Project'}
                  onSave={handleSave}
                  onCancel={() => setShowSaveForm(false)}
                  saving={saving}
                />
              </div>
            ) : (
              <button
                onClick={() => setShowSaveForm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shrink-0"
              >
                <Download size={14} />
                Save Current Project
              </button>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="text-center py-8 text-xs text-gray-400">
              <RefreshCw size={20} className="mx-auto mb-2 animate-spin" />
              Reading folder…
            </div>
          )}

          {/* Project list */}
          {!loading && projects.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <FileText size={32} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium text-gray-500">No project files found</p>
              <p className="text-xs mt-1">Save your current model or add <code>.json</code> files to the folder.</p>
            </div>
          )}

          {!loading && projects.length > 0 && (
            <div className="grid gap-3">
              {projects.map((p) => (
                <ProjectCard
                  key={p.fileName}
                  project={p}
                  onLoad={() => handleLoad(p.fileName)}
                  onOverwrite={() => handleOverwrite(p.fileName)}
                  onDelete={() => handleDelete(p.fileName)}
                />
              ))}
            </div>
          )}

          <p className="text-[10px] text-gray-400 mt-4">
            {projects.length} project{projects.length !== 1 ? 's' : ''} in folder
          </p>
        </div>
      )}
    </div>
  );
}
