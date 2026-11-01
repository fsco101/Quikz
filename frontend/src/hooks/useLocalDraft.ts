import { useEffect, useRef, useState } from "react";
import { api } from "../services/api.js";
import { apiUrl } from "../services/apiUrl.js";

type StoredDraft<T> = { format: 1; revision: string; savedAt: number; data: T; cloudVersion?: number };
type DraftResponse<T> = { version: number; draft: StoredDraft<T> | null };
type Session = {
  key: string; endpoint: string; token: string | null; baseline: string; revision: string;
  enabled: boolean; loaded: boolean; disposed: boolean; ended: boolean;
  localSaved?: string; remoteSaved?: string; remoteVersion?: number;
  queue: Promise<void>; timer?: ReturnType<typeof setTimeout>;
};
class DraftError extends Error { constructor(public status: number, message: string) { super(message); } }

/** Account drafts in MongoDB, with a browser fallback for interrupted connections. */
export function useLocalDraft<T>({ ownerId, scope, revision, ready = true, value, validate, restore }: {
  ownerId?: string; scope: string; revision: string; ready?: boolean; value: T;
  validate: (value: unknown) => value is T; restore: (value: T) => void;
}) {
  const key = ownerId ? `quikz:draft:v1:${ownerId}:${scope}` : "";
  const serialized = JSON.stringify(value);
  const latest = useRef({ key, serialized }); latest.current = { key, serialized };
  const callbacks = useRef({ validate, restore }); callbacks.current = { validate, restore };
  const session = useRef<Session>();
  const [message, setMessage] = useState("Loading your saved draft...");
  const [loading, setLoading] = useState(!!ownerId);
  const [working, setWorking] = useState(false);
  const [conflict, setConflict] = useState<StoredDraft<T> | null>(null);
  const [paused, setPaused] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const valid = (draft: any): draft is StoredDraft<T> => !!draft && draft.format === 1 && typeof draft.revision === "string" && Number.isFinite(draft.savedAt) && callbacks.current.validate(draft.data);
  const notify = (active: Session, text: string) => { if (!active.disposed) setMessage(text); };

  async function request(active: Session, method = "GET", body?: any, unloading = false): Promise<DraftResponse<T>> {
    const payload = body ? JSON.stringify(body) : undefined;
    const response = await fetch(apiUrl(active.endpoint), {
      method, headers: { Authorization: `Bearer ${active.token}`, "Content-Type": "application/json" },
      body: payload, signal: AbortSignal.timeout(20000),
      keepalive: unloading && !!payload && new TextEncoder().encode(payload).length < 60000,
    });
    const result = await response.json();
    if (!response.ok) throw new DraftError(response.status, result.message || "Draft sync failed.");
    if (!Number.isSafeInteger(result.version) || result.version < 0 || (result.draft !== null && !valid(result.draft))) throw new Error("Invalid draft response.");
    return result;
  }
  function cache(active: Session, data: string) {
    try {
      localStorage.setItem(active.key, JSON.stringify({ format: 1, revision: active.revision, savedAt: Date.now(), cloudVersion: active.remoteVersion, data: JSON.parse(data) }));
      active.localSaved = data; return true;
    } catch { return false; }
  }
  function pause(active: Session, saved: StoredDraft<T> | null) {
    active.enabled = false;
    if (!active.disposed) { setConflict(saved); setPaused(true); setHasDraft(true); }
  }
  function enqueue(active: Session, data: string, unloading = false) {
    active.queue = active.queue.catch(() => {}).then(async () => {
      if (!active.enabled || active.ended || active.remoteVersion === undefined || data === active.remoteSaved) return;
      try {
        const result = await request(active, "PUT", { version: active.remoteVersion, revision: active.revision, data: JSON.parse(data) }, unloading);
        active.remoteVersion = result.version; active.remoteSaved = data;
        if (latest.current.key === active.key && latest.current.serialized === data) {
          cache(active, data); notify(active, "Draft synced to your account. Available on your other devices.");
        }
      } catch (error) {
        if (error instanceof DraftError && error.status === 409) {
          try {
            const result = await request(active);
            active.remoteVersion = result.version; active.remoteSaved = result.draft ? JSON.stringify(result.draft.data) : undefined;
            pause(active, result.draft);
          } catch { active.remoteVersion = undefined; }
        }
        if (error instanceof DraftError && [400, 413].includes(error.status)) {
          notify(active, `${active.localSaved === data ? "Draft saved on this device. " : ""}Account sync rejected this draft: ${error.message}`);
        } else {
          notify(active, active.localSaved === data ? "Draft saved on this device. Account sync is unavailable; retry when connected." : "Could not save this draft. Keep the editor open and retry, or publish to save your work.");
        }
      }
    });
  }
  function persist(unloading = false) {
    const active = session.current;
    if (!active?.enabled || !active.loaded || active.ended || latest.current.key !== active.key) return;
    const data = latest.current.serialized;
    if (data === active.baseline && !active.localSaved && !active.remoteSaved) return;
    const cached = data === active.localSaved || cache(active, data);
    if (!active.disposed) setHasDraft(true);
    if (data === active.remoteSaved) return;
    notify(active, cached ? "Draft saved on this device. Syncing to your account..." : "Syncing draft to your account...");
    enqueue(active, data, unloading);
    if (active.remoteVersion === undefined) notify(active, cached ? "Draft saved on this device. Account sync is unavailable; retry when connected." : "Could not save this draft. Keep the editor open and retry, or publish to save your work.");
  }

  useEffect(() => {
    if (!ready || !key || session.current?.key === key) return;
    const active: Session = { key, endpoint: `/api/drafts/${encodeURIComponent(scope)}`, token: api.getToken(), baseline: serialized, revision, enabled: false, loaded: false, disposed: false, ended: false, queue: Promise.resolve() };
    session.current = active;
    let local: StoredDraft<T> | null = null;
    try {
      const raw = localStorage.getItem(key);
      if (raw) { const parsed = JSON.parse(raw); if (valid(parsed)) local = parsed; else localStorage.removeItem(key); }
    } catch { notify(active, "Could not read this device's draft. Checking your account..."); }
    void (async () => {
      let remote: StoredDraft<T> | null = null;
      let connected = false;
      try {
        const result = await request(active);
        active.remoteVersion = result.version; remote = result.draft;
        active.remoteSaved = remote ? JSON.stringify(remote.data) : undefined; connected = true;
      } catch { /* Keep editing with local storage when the API cannot be reached. */ }
      if (active.disposed) return;
      active.loaded = true; active.enabled = true;
      const equalCopies = local && remote && JSON.stringify(local.data) === JSON.stringify(remote.data);
      const chosen = equalCopies ? remote : local || remote;
      if (local && remote && !equalCopies && local.cloudVersion !== active.remoteVersion) {
        callbacks.current.restore(local.data);
        latest.current = { key, serialized: JSON.stringify(local.data) }; active.localSaved = latest.current.serialized;
        pause(active, remote);
      } else if (chosen && (chosen.revision !== revision || (local && !remote && connected && active.remoteVersion! > (local.cloudVersion ?? 0)))) {
        pause(active, chosen);
      } else if (chosen) {
        const data = JSON.stringify(chosen.data);
        latest.current = { key, serialized: data }; callbacks.current.restore(chosen.data); cache(active, data); setHasDraft(true);
        notify(active, connected && data === active.remoteSaved ? "Draft restored from your account." : "Draft restored from this device. Syncing when connected.");
        if (connected && data !== active.remoteSaved) enqueue(active, data);
      } else notify(active, connected ? "Changes autosave to your account as you edit." : "Account sync is unavailable. Changes will save on this device.");
      setLoading(false);
    })();
  }, [key, ready, revision, serialized]);

  useEffect(() => {
    const active = session.current;
    if (!ready || !active?.loaded || !active.enabled || active.key !== key || paused || serialized !== latest.current.serialized) return;
    if (serialized === active.localSaved && (serialized === active.remoteSaved || active.remoteVersion === undefined)) return;
    if (serialized === active.baseline && !active.localSaved && !active.remoteSaved) return;
    active.timer = setTimeout(() => persist(), 500);
    return () => clearTimeout(active.timer);
  }, [key, ready, serialized, paused, loading]);

  async function retry() {
    const active = session.current;
    if (!active?.loaded || !active.enabled || active.ended) return;
    setWorking(true); await active.queue;
    try {
      const result = await request(active);
      const remote = result.draft ? JSON.stringify(result.draft.data) : undefined;
      const changed = active.remoteVersion !== result.version;
      active.remoteVersion = result.version;
      if (changed && ((remote && remote !== latest.current.serialized) || (!remote && result.version > 0))) pause(active, result.draft);
      else { active.remoteSaved = remote; persist(); await active.queue; }
    } catch { notify(active, "Account sync is still unavailable. Keep this device's saved copy and retry later."); }
    if (!active.disposed) setWorking(false);
  }
  useEffect(() => {
    if (session.current) session.current.disposed = false;
    const flush = () => persist(true);
    const onVisibility = () => { if (document.visibilityState === "hidden") flush(); };
    const onOnline = () => { void retry(); };
    window.addEventListener("pagehide", flush); window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearTimeout(session.current?.timer); flush();
      if (session.current) session.current.disposed = true;
      window.removeEventListener("pagehide", flush); window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [key]);

  async function clear(completed: boolean) {
    const active = session.current;
    if (!active || working) return;
    clearTimeout(active.timer); active.enabled = false; setWorking(true); await active.queue;
    try {
      if (active.remoteVersion === undefined) active.remoteVersion = (await request(active)).version;
      const result = await request(active, "DELETE", { version: active.remoteVersion });
      active.remoteVersion = result.version; active.remoteSaved = undefined;
    } catch {
      if (!completed) { active.enabled = !paused; notify(active, "Could not discard the account draft. Retry when connected."); setWorking(false); return; }
    }
    try { localStorage.removeItem(active.key); } catch { /* Old source revisions require explicit recovery. */ }
    active.ended = completed; active.enabled = !completed; active.localSaved = undefined;
    if (!completed) { latest.current = { key, serialized: active.baseline }; callbacks.current.restore(JSON.parse(active.baseline)); }
    setConflict(null); setPaused(false); setHasDraft(false); setWorking(false);
    notify(active, "Draft discarded. The editor has been reset.");
  }
  function choose(data: T) {
    const active = session.current;
    if (!active) return;
    active.enabled = true; latest.current = { key, serialized: JSON.stringify(data) };
    callbacks.current.restore(data); setConflict(null); setPaused(false);
    notify(active, "Draft restored. Review your copy before publishing.");
    persist();
  }
  return { message, loading, working, conflict: paused, hasSavedCopy: !!conflict, hasDraft,
    discard: () => { void clear(false); }, restoreConflict: () => { if (conflict) choose(conflict.data); },
    keepCurrent: () => choose(JSON.parse(latest.current.serialized)), retry, complete: () => clear(true) };
}
