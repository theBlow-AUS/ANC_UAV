import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { RFS_PACK } from '../data/rfs-pack';
import type {
  AgencyContentPack,
  AppData,
  IncidentFrequency,
  LocalDocument,
  VaultProvider,
} from '../data/types';

const STORAGE_KEY = 'anc-uav.app-data.v1';

const initialData: AppData = {
  packs: [RFS_PACK],
  activePackId: RFS_PACK.id,
  localDocuments: [],
  incidentFrequencies: [],
  savedVaultProviders: [],
};

type AppDataContextValue = AppData & {
  hydrated: boolean;
  storageError: string | null;
  activePack: AgencyContentPack;
  selectPack: (packId: string) => Promise<void>;
  addPack: (pack: AgencyContentPack) => Promise<void>;
  addLocalDocument: (document: LocalDocument) => Promise<void>;
  removeLocalDocument: (id: string) => Promise<void>;
  addIncidentFrequency: (frequency: IncidentFrequency) => Promise<void>;
  removeIncidentFrequency: (id: string) => Promise<void>;
  setVaultProviderSaved: (provider: VaultProvider, saved: boolean) => Promise<void>;
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(initialData);
  const [hydrated, setHydrated] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const dataRef = useRef<AppData>(initialData);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!mounted) return;
        if (raw) {
          const saved = JSON.parse(raw) as Partial<AppData>;
          const savedPacks = Array.isArray(saved.packs) ? saved.packs : [];
          const packs = [
            RFS_PACK,
            ...savedPacks.filter(
              (pack): pack is AgencyContentPack =>
                Boolean(pack?.id) && pack.id !== RFS_PACK.id && !pack.isBuiltIn,
            ),
          ];
          const candidate: AppData = {
            packs,
            activePackId: packs.some((pack) => pack.id === saved.activePackId)
              ? (saved.activePackId as string)
              : RFS_PACK.id,
            localDocuments: Array.isArray(saved.localDocuments) ? saved.localDocuments : [],
            incidentFrequencies: Array.isArray(saved.incidentFrequencies)
              ? saved.incidentFrequencies
              : [],
            savedVaultProviders: Array.isArray(saved.savedVaultProviders)
              ? saved.savedVaultProviders
              : [],
          };
          dataRef.current = candidate;
          setData(candidate);
        }
      })
      .catch(() => {
        if (mounted) setStorageError('Local saved data could not be opened.');
      })
      .finally(() => {
        if (mounted) setHydrated(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const commit = useCallback(async (update: (current: AppData) => AppData) => {
    const next = update(dataRef.current);
    dataRef.current = next;
    setData(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setStorageError(null);
    } catch {
      setStorageError('This change could not be saved to device storage.');
    }
  }, []);

  const selectPack = useCallback(
    async (packId: string) => {
      await commit((current) =>
        current.packs.some((pack) => pack.id === packId)
          ? { ...current, activePackId: packId }
          : current,
      );
    },
    [commit],
  );

  const addPack = useCallback(
    async (pack: AgencyContentPack) => {
      await commit((current) => ({
        ...current,
        packs: [...current.packs.filter((item) => item.id !== pack.id), pack],
        activePackId: pack.id,
      }));
    },
    [commit],
  );

  const addLocalDocument = useCallback(
    async (document: LocalDocument) => {
      await commit((current) => ({
        ...current,
        localDocuments: [
          document,
          ...current.localDocuments.filter((item) => item.id !== document.id),
        ],
      }));
    },
    [commit],
  );

  const removeLocalDocument = useCallback(
    async (id: string) => {
      await commit((current) => ({
        ...current,
        localDocuments: current.localDocuments.filter((item) => item.id !== id),
      }));
    },
    [commit],
  );

  const addIncidentFrequency = useCallback(
    async (frequency: IncidentFrequency) => {
      await commit((current) => ({
        ...current,
        incidentFrequencies: [frequency, ...current.incidentFrequencies],
      }));
    },
    [commit],
  );

  const removeIncidentFrequency = useCallback(
    async (id: string) => {
      await commit((current) => ({
        ...current,
        incidentFrequencies: current.incidentFrequencies.filter((item) => item.id !== id),
      }));
    },
    [commit],
  );

  const setVaultProviderSaved = useCallback(
    async (provider: VaultProvider, saved: boolean) => {
      await commit((current) => ({
        ...current,
        savedVaultProviders: saved
          ? Array.from(new Set([...current.savedVaultProviders, provider]))
          : current.savedVaultProviders.filter((item) => item !== provider),
      }));
    },
    [commit],
  );

  const activePack =
    data.packs.find((pack) => pack.id === data.activePackId) ?? RFS_PACK;
  const value = useMemo<AppDataContextValue>(
    () => ({
      ...data,
      activePack,
      hydrated,
      storageError,
      selectPack,
      addPack,
      addLocalDocument,
      removeLocalDocument,
      addIncidentFrequency,
      removeIncidentFrequency,
      setVaultProviderSaved,
    }),
    [
      data,
      activePack,
      hydrated,
      storageError,
      selectPack,
      addPack,
      addLocalDocument,
      removeLocalDocument,
      addIncidentFrequency,
      removeIncidentFrequency,
      setVaultProviderSaved,
    ],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) throw new Error('useAppData must be used inside AppDataProvider.');
  return context;
}
