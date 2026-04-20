import type { ReactNode } from 'react';
import { AdminPreferencesProvider, AdminProvider } from '../context/hooks.js';
import type {
  AdminPreferencesProviderProps,
  AdminProviderProps,
} from '../context/hooks.js';
import { AdminShell, type AdminShellProps } from './AdminShell.js';
import { AdminSidebar, type AdminSidebarProps } from './AdminSidebar.js';

export interface AdminLayoutProps
  extends
    Omit<AdminProviderProps, 'children'>,
    Pick<AdminPreferencesProviderProps, 'storageKey'> {
  /**
   * Props passed through to the underlying `<AdminShell>` (header,
   * breadcrumbs, identity, etc.). The `sidebar` slot is filled
   * automatically with `<AdminSidebar />`; pass `disableSidebar` to
   * suppress it.
   */
  shell?: Omit<AdminShellProps, 'children' | 'sidebar'>;
  /** Props forwarded to the auto-rendered `<AdminSidebar />`. */
  sidebar?: AdminSidebarProps;
  /** When true, omit the sidebar entirely (rare — use for full-bleed routes). */
  disableSidebar?: boolean;
  /** Body content rendered in the shell's `main` area. */
  children: ReactNode;
}

/**
 * Convenience composition wrapper. Bundles
 * `<AdminPreferencesProvider>` + `<AdminProvider>` + `<AdminShell>`
 * + `<AdminSidebar />` so a route can hand off the chrome with one
 * component and just provide its body.
 *
 * Most consumers should use this. If you need to mix and match (e.g.
 * sharing the providers across multiple shells, or rendering the
 * sidebar somewhere unusual) drop down to the individual building
 * blocks instead — `<AdminProvider>`, `<AdminPreferencesProvider>`,
 * `<AdminShell>`, and `<AdminSidebar />` are all exported.
 */
export function AdminLayout({
  groups,
  basePath,
  currentPath,
  initialFilter,
  storageKey,
  shell,
  sidebar,
  disableSidebar,
  children,
}: AdminLayoutProps) {
  return (
    <AdminPreferencesProvider storageKey={storageKey}>
      <AdminProvider
        groups={groups}
        basePath={basePath}
        currentPath={currentPath}
        initialFilter={initialFilter}
      >
        <AdminShell
          {...shell}
          sidebar={disableSidebar ? undefined : <AdminSidebar {...sidebar} />}
        >
          {children}
        </AdminShell>
      </AdminProvider>
    </AdminPreferencesProvider>
  );
}
