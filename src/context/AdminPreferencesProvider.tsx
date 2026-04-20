import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/**
 * Cross-session UI state for the admin — sidebar open/closed,
 * which type groups are expanded, and any other small bits of
 * preference the user expects to persist across reloads.
 *
 * This is deliberately split from `AdminProvider` so server-rendered
 * route data can stay simple while the persistent UI shell lives
 * one level higher in the tree.
 *
 * Storage strategy: lazy hydration from `localStorage` after mount,
 * to avoid SSR mismatches and to keep the bundle SSR-safe.
 */
type Preferences = Record<string, unknown>;

interface PreferencesContextValue {
  ready: boolean;
  get<T>(key: string, defaultValue: T): T;
  set<T>(key: string, value: T): void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export interface AdminPreferencesProviderProps {
  /**
   * Key under which preferences are stored in `localStorage`.
   * Default: `verevoir-admin-prefs`. Override to scope multiple
   * admins on the same domain.
   */
  storageKey?: string;
  children: ReactNode;
}

export function AdminPreferencesProvider({
  storageKey = 'verevoir-admin-prefs',
  children,
}: AdminPreferencesProviderProps) {
  const [prefs, setPrefs] = useState<Preferences>({});
  const [ready, setReady] = useState(false);

  // Hydrate after mount — keeps SSR output deterministic. The
  // setPrefs/setReady calls below are exactly the "synchronise an
  // external system into React" case the rule doc carves out for:
  // localStorage is the external system, and we cannot read it
  // during render without breaking SSR.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Preferences;
        if (parsed && typeof parsed === 'object') {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setPrefs(parsed);
        }
      }
    } catch {
      // Bad JSON or storage disabled — fall back to defaults silently.
    }
    setReady(true);
  }, [storageKey]);

  // Persist on every change once we've hydrated.
  useEffect(() => {
    if (!ready) return;
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(prefs));
    } catch {
      // Quota exceeded or storage disabled — non-fatal.
    }
  }, [prefs, ready, storageKey]);

  const get = useCallback(
    function get<T>(key: string, defaultValue: T): T {
      if (!(key in prefs)) return defaultValue;
      return prefs[key] as T;
    },
    [prefs],
  );

  const set = useCallback(function set<T>(key: string, value: T) {
    setPrefs((prev) => {
      if (prev[key] === value) return prev;
      return { ...prev, [key]: value };
    });
  }, []);

  const value = useMemo<PreferencesContextValue>(
    () => ({ ready, get, set }),
    [ready, get, set],
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

function usePreferencesContext(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error(
      '@verevoir/admin: preference hook used outside <AdminPreferencesProvider>.',
    );
  }
  return ctx;
}

/**
 * Generic typed preference accessor. Returns `[value, setValue]`
 * with the same shape as `useState`. Until the provider has
 * hydrated from localStorage the value is `defaultValue`.
 */
export function useAdminPreference<T>(
  key: string,
  defaultValue: T,
): [T, (value: T) => void] {
  const ctx = usePreferencesContext();
  const value = ctx.get(key, defaultValue);
  const setValue = useCallback((next: T) => ctx.set(key, next), [ctx, key]);
  return [value, setValue];
}

/**
 * Whether the sidebar is currently open. Defaults to true on first
 * load — the user has to actively collapse it to lose it.
 */
export function useSidebarOpen(): [boolean, (open: boolean) => void] {
  return useAdminPreference<boolean>('sidebarOpen', true);
}

/**
 * Set of block types currently expanded in the sidebar. Stored as
 * an array because Set isn't JSON-serializable.
 */
export function useExpandedTypes(): {
  expanded: ReadonlySet<string>;
  toggle: (blockType: string) => void;
  setExpanded: (next: ReadonlySet<string>) => void;
} {
  const [list, setList] = useAdminPreference<string[]>('expandedTypes', []);
  const expanded = useMemo(() => new Set(list), [list]);
  const toggle = useCallback(
    (blockType: string) => {
      const next = new Set(expanded);
      if (next.has(blockType)) next.delete(blockType);
      else next.add(blockType);
      setList(Array.from(next));
    },
    [expanded, setList],
  );
  const setExpanded = useCallback(
    (next: ReadonlySet<string>) => setList(Array.from(next)),
    [setList],
  );
  return { expanded, toggle, setExpanded };
}

/** Whether the preferences provider has finished hydrating. */
export function useAdminPreferencesReady(): boolean {
  return usePreferencesContext().ready;
}
