import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AdminGroup } from '../types.js';

/**
 * Per-session admin state — the loaded groups, the current filter
 * query, and the currently active route. None of this is persisted
 * across reloads (see `AdminPreferencesProvider` for that).
 *
 * The provider is intentionally a thin wrapper over `useState`. We
 * derive `filteredGroups` lazily inside the hook so consumers that
 * don't need filtering pay nothing for it.
 */
interface AdminContextValue {
  groups: AdminGroup[];
  basePath: string;
  currentPath?: string;
  filter: string;
  setFilter: (value: string) => void;
  clearFilter: () => void;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export interface AdminProviderProps {
  /** Loaded groups (block type + registry entry + documents). */
  groups: AdminGroup[];
  /** Base path for admin routes. Default `/admin`. */
  basePath?: string;
  /**
   * Path of the currently active admin route — used by the sidebar
   * to highlight the current document. Pass `Astro.url.pathname`
   * (or the equivalent) from the host route.
   */
  currentPath?: string;
  /** Initial filter query. Defaults to empty. */
  initialFilter?: string;
  children: ReactNode;
}

export function AdminProvider({
  groups,
  basePath = '/admin',
  currentPath,
  initialFilter = '',
  children,
}: AdminProviderProps) {
  const [filter, setFilter] = useState(initialFilter);

  const clearFilter = useCallback(() => setFilter(''), []);

  const value = useMemo<AdminContextValue>(
    () => ({ groups, basePath, currentPath, filter, setFilter, clearFilter }),
    [groups, basePath, currentPath, filter, clearFilter],
  );

  return (
    <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
  );
}

function useAdminContext(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) {
    throw new Error(
      '@verevoir/admin: hook used outside <AdminProvider>. Wrap your admin route in an AdminProvider.',
    );
  }
  return ctx;
}

/** All groups, unfiltered. */
export function useAdminGroups(): AdminGroup[] {
  return useAdminContext().groups;
}

/** The base path for admin routes (e.g. `/admin`). */
export function useAdminBasePath(): string {
  return useAdminContext().basePath;
}

/** The currently active admin route, if the host passed it in. */
export function useAdminCurrentPath(): string | undefined {
  return useAdminContext().currentPath;
}

/**
 * The current filter query and setter. The filter is plain text;
 * matching is case-insensitive and applied across document title,
 * slug, and id.
 */
export function useAdminFilter() {
  const ctx = useAdminContext();
  return {
    filter: ctx.filter,
    setFilter: ctx.setFilter,
    clearFilter: ctx.clearFilter,
  };
}

/**
 * Filter the loaded groups against the active query. A group with
 * zero matches is dropped entirely so the sidebar can collapse it.
 *
 * Matching looks at: document title (or fallback display fields),
 * slug, id, and the block type label. Singletons always pass through
 * if their block label or slug matches.
 */
export function useFilteredGroups(): AdminGroup[] {
  const { groups, filter } = useAdminContext();
  return useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return groups;
    const filtered: AdminGroup[] = [];
    for (const group of groups) {
      const labelMatch = group.label.toLowerCase().includes(q);
      const matchedDocs = group.documents.filter((doc) =>
        documentMatches(doc, q),
      );
      if (labelMatch || matchedDocs.length > 0) {
        filtered.push({
          ...group,
          documents: labelMatch ? group.documents : matchedDocs,
        });
      }
    }
    return filtered;
  }, [groups, filter]);
}

function documentMatches(
  doc: { id: string; data: unknown },
  query: string,
): boolean {
  if (doc.id.toLowerCase().includes(query)) return true;
  if (!doc.data || typeof doc.data !== 'object') return false;
  const data = doc.data as Record<string, unknown>;
  for (const key of ['title', 'headerTitle', 'name', 'slug']) {
    const value = data[key];
    if (typeof value === 'string' && value.toLowerCase().includes(query)) {
      return true;
    }
  }
  return false;
}
