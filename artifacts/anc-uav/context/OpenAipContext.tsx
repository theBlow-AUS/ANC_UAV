import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { fetch as expoFetch } from 'expo/fetch';
import {
  detailsSchema, parseOpenAipSnapshot, referencesAt,
  type OpenAipDetail, type OpenAipInventory, type OpenAipRecord, type OpenAipSelection, type OpenAipSnapshot,
} from '../lib/openaip-data';
import {
  checkCancelled, downloadOpenAip, getOpenAipDetail, getOpenAipInventory, OpenAipError, sameOpenAipInventory,
  type OpenAipFetch, type OpenAipProgress,
} from '../lib/openaip-client';
import { createOpenAipRepository } from '../lib/openaip-store';
import {
  canDownloadOpenAip, OpenAipKeyError, openAipDisk, openAipKeyStatus, readOpenAipKey, removeOpenAipKey, saveOpenAipKey, shareOpenAipSnapshot,
} from '../lib/openaip-device';
import type { Coordinate } from '../lib/geo';

type KeyStatus = 'saved' | 'none' | 'unavailable' | 'unknown';
type Value = {
  snapshot: OpenAipSnapshot | null; ready: boolean; error: string; message: string; busy: boolean;
  cancellable: boolean;
  progress: OpenAipProgress | null; inventory: OpenAipInventory | null; storedBytes: number;
  canDownload: boolean; keyStatus: KeyStatus; selected: OpenAipRecord | null;
  detail: OpenAipDetail | null; hits: OpenAipRecord[]; visible: boolean; setVisible: (v: boolean) => void;
  checkUpdates: () => Promise<void>; download: () => Promise<void>; cancel: () => void;
  shareDownloaded: () => Promise<void>;
  removeDownloads: () => Promise<void>; saveKey: (key: string) => Promise<void>; removeKey: () => Promise<void>;
  refreshSelected: () => Promise<void>; selectRecord: (s: OpenAipSelection | null) => void; inspect: (p: Coordinate) => void;
};
const Context = createContext<Value | null>(null);
const fetcher = expoFetch as unknown as OpenAipFetch;

export function OpenAipProvider({ children }: { children: ReactNode }) {
  const repository = useRef(createOpenAipRepository(openAipDisk, 'snapshot', parseOpenAipSnapshot, 32 * 1024 * 1024)).current;
  const detailRepository = useRef(createOpenAipRepository(openAipDisk, 'details', v => detailsSchema.parse(v), 3 * 1024 * 1024)).current;
  const [snapshot, setSnapshot] = useState<OpenAipSnapshot | null>(null);
  const [details, setDetails] = useState<OpenAipDetail[]>([]);
  const [ready, setReady] = useState(false);
  const [keyStatus, setKeyStatus] = useState<KeyStatus>('unavailable');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [cancellable, setCancellable] = useState(false);
  const [storedBytes, setStoredBytes] = useState(0);
  const [detailBytes, setDetailBytes] = useState(0);
  const [inventory, setInventory] = useState<OpenAipInventory | null>(null);
  const [progress, setProgress] = useState<OpenAipProgress | null>(null);
  const [selection, setSelection] = useState<OpenAipSelection | null>(null);
  const [hitPoint, setHitPoint] = useState<Coordinate | null>(null);
  const [visible, setVisible] = useState(true);
  const lock = useRef(false), controller = useRef<AbortController | null>(null), cooldown = useRef(0);
  const alive = useRef(true), detailReadable = useRef(true);
  const selected = selection && snapshot
    ? (selection.kind === 'airport' ? snapshot.airports : snapshot.airspaces).find(r => r.id === selection.id) ?? null : null;
  const detail = selection ? details.find(d => d.record.id === selection.id && d.record.kind === selection.kind) ?? null : null;
  useEffect(() => {
    alive.current = true;
    if (!canDownloadOpenAip) { setReady(true); return; }
    void (async () => {
      try {
        const loaded = await repository.load();
        if (alive.current) {
          setSnapshot(loaded.value); setStoredBytes(loaded.bytes);
          if (loaded.recovered) setMessage('Recovered the previous validated OpenAIP snapshot. Its retrieval date is shown below.');
        }
      } catch { if (alive.current) setError('Saved OpenAIP data is unreadable and was preserved. Other navigation packs are unaffected. Remove downloaded data to reset this source.'); }
      try {
        const loaded = await detailRepository.load();
        if (alive.current) { setDetails(loaded.value ?? []); setDetailBytes(loaded.bytes); }
      } catch { detailReadable.current = false; if (alive.current) setError('OpenAIP detail cache is unreadable and was preserved. Remove downloaded data to reset it. Public snapshots are separate.'); }
      const status = await openAipKeyStatus();
      if (alive.current) { setKeyStatus(status); setReady(true); }
    })();
    return () => { alive.current = false; controller.current?.abort(); };
  }, [repository, detailRepository]);

  async function run(action: (signal: AbortSignal) => Promise<void>, network = false) {
    if (lock.current || !ready) return;
    if (network && Date.now() < cooldown.current) {
      setError(`OpenAIP asked this session to wait until ${new Date(cooldown.current).toISOString()} before another request.`); return;
    }
    lock.current = true; setBusy(true); setCancellable(network); setError(''); setMessage('');
    const ac = new AbortController(); controller.current = ac;
    // Bounded work, no launch/background networking or unbounded automatic retries.
    const timeout = setTimeout(() => ac.abort(), 180000);
    try { await action(ac.signal); }
    catch (e) {
      if (e instanceof OpenAipError && e.code === 'rate') cooldown.current = e.retryAt;
      if (alive.current) {
        if (ac.signal.aborted) setMessage('Request cancelled or timed out. Previously saved data remains available.');
        else setError(e instanceof OpenAipError || e instanceof OpenAipKeyError ? e.message : 'OpenAIP operation could not finish. Check storage or device authentication and try again. Previously saved public data is retained unless you explicitly removed it.');
      }
    } finally {
      clearTimeout(timeout);
      if (controller.current === ac) controller.current = null;
      lock.current = false;
      if (alive.current) { setBusy(false); setCancellable(false); setProgress(null); }
    }
  }
  const hits = snapshot && hitPoint ? referencesAt(snapshot, hitPoint) : [];
  return <Context.Provider value={{
    snapshot, ready, busy, cancellable, progress, inventory, storedBytes: storedBytes + detailBytes, error, message, keyStatus, selected, detail, hits, visible, setVisible,
    canDownload: canDownloadOpenAip,
    inspect: p => { setHitPoint(p); },
    selectRecord: setSelection,
    cancel: () => controller.current?.abort(),
    shareDownloaded: () => run(async () => {
      const name = repository.activeName();
      if (!name) throw new OpenAipError('source', 'No validated OpenAIP download is available to share.');
      await shareOpenAipSnapshot(name);
    }),
    checkUpdates: () => run(async signal => {
      if (!canDownloadOpenAip) throw new OpenAipError('source', 'Public export checks require the native app; no browser proxy is used.');
      const found = await getOpenAipInventory(fetcher, signal);
      if (!alive.current) return;
      setInventory(found);
      setMessage(snapshot && sameOpenAipInventory(snapshot.sources, found)
        ? 'Installed files match the currently published export versions. This does not establish operational currency.'
        : 'Public Australian exports are available. Download explicitly to save or replace this device’s copy.');
    }, true),
    download: () => run(async signal => {
      if (!canDownloadOpenAip) throw new OpenAipError('source', 'Downloads require the native app; the public host does not permit browser cross-origin downloads.');
      const next = await downloadOpenAip(fetcher, signal, p => { if (alive.current) setProgress(p); });
      checkCancelled(signal);
      setCancellable(false);
      setProgress({ phase: 'Saving validated offline snapshot', received: 0, total: null });
      const stored = await repository.save(next, signal);
      // Once the pointer is committed, finish applying its state even if Cancel is pressed.
      if (alive.current) {
        setSnapshot(stored.value); setStoredBytes(stored.bytes); setInventory(next.sources);
        setSelection(null); setHitPoint(null);
        setMessage('Australian OpenAIP reference saved offline. Effective dates and national completeness are not supplied.');
      }
    }, true),
    removeDownloads: () => run(async () => {
      await repository.clear();
      setSnapshot(null); setStoredBytes(0); setSelection(null); setHitPoint(null);
      await detailRepository.clear();
      detailReadable.current = true; setDetails([]); setDetailBytes(0); setInventory(null);
      setMessage('Downloaded OpenAIP data and detail cache removed. Personal key, bundled references and other packs are unchanged.');
    }),
    saveKey: key => run(async () => {
      try { await saveOpenAipKey(key); setKeyStatus(await openAipKeyStatus()); setMessage('Personal key saved in protected device storage. No validation request was sent.'); }
      catch (e) { setKeyStatus('unknown'); throw e; }
    }),
    removeKey: () => run(async () => {
      try { await removeOpenAipKey(); setKeyStatus(await openAipKeyStatus()); setMessage('Personal key removed. Saved public data and cached details remain available offline.'); }
      catch (e) { setKeyStatus('unknown'); throw e; }
    }),
    refreshSelected: () => run(async signal => {
      if (!selected) throw new OpenAipError('source', 'Select an airport or airspace record first.');
      if (!detailReadable.current) throw new OpenAipError('source', 'The saved detail cache is unreadable; remove downloaded OpenAIP data to reset it before saving more.');
      let key = '';
      try {
        key = await readOpenAipKey(); checkCancelled(signal);
        const next = await getOpenAipDetail(fetcher, { kind: selected.kind, id: selected.id }, key, signal);
        const combined = [...details.filter(d => d.record.id !== next.record.id || d.record.kind !== next.record.kind), next].slice(-25);
        setCancellable(false);
        const stored = await detailRepository.save(combined, signal);
        if (alive.current) { setDetails(combined); setDetailBytes(stored.bytes); setMessage('API detail saved separately. It does not replace the public map snapshot or verify operational currency.'); }
      } finally { key = ''; }
    }, true),
  }}>{children}</Context.Provider>;
}
export function useOpenAip() {
  const value = useContext(Context);
  if (!value) throw new Error('OpenAipProvider is missing.');
  return value;
}
