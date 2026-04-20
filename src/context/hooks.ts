/**
 * Single import surface for every admin context hook. Components
 * inside @verevoir/admin should pull from here so the component
 * code stays decoupled from which provider owns which piece of
 * state.
 */
export {
  AdminProvider,
  useAdminGroups,
  useAdminBasePath,
  useAdminCurrentPath,
  useAdminFilter,
  useFilteredGroups,
} from './AdminProvider.js';
export type { AdminProviderProps } from './AdminProvider.js';

export {
  AdminPreferencesProvider,
  useAdminPreference,
  useAdminPreferencesReady,
  useSidebarOpen,
  useExpandedTypes,
} from './AdminPreferencesProvider.js';
export type { AdminPreferencesProviderProps } from './AdminPreferencesProvider.js';
