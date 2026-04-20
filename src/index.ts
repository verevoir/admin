// Components
export { AdminLayout } from './components/AdminLayout.js';
export type { AdminLayoutProps } from './components/AdminLayout.js';

export { AdminShell } from './components/AdminShell.js';
export type {
  AdminShellProps,
  BreadcrumbCrumb,
} from './components/AdminShell.js';

export { DocumentEditor } from './components/DocumentEditor.js';
export type {
  DocumentEditorProps,
  LinkablePage,
} from './components/DocumentEditor.js';

export { DocumentList } from './components/DocumentList.js';
export type { DocumentListProps } from './components/DocumentList.js';

export { AdminSidebar } from './components/AdminSidebar.js';
export type { AdminSidebarProps } from './components/AdminSidebar.js';

export { SectionsEditor } from './components/SectionsEditor.js';
export type { SectionsEditorProps } from './components/SectionsEditor.js';

// Context + hooks
export {
  AdminProvider,
  useAdminGroups,
  useAdminBasePath,
  useAdminCurrentPath,
  useAdminFilter,
  useFilteredGroups,
  AdminPreferencesProvider,
  useAdminPreference,
  useAdminPreferencesReady,
  useSidebarOpen,
  useExpandedTypes,
} from './context/hooks.js';
export type {
  AdminProviderProps,
  AdminPreferencesProviderProps,
} from './context/hooks.js';

// Save handler
export { createSaveHandler } from './save-handler.js';
export type {
  SaveRequestBody,
  SaveResult,
  CreateSaveHandlerOptions,
} from './save-handler.js';

// Types
export type {
  BlockEntry,
  BlockRegistry,
  AdminGroup,
  SectionEntry,
  AdminIdentity,
  AdminConfig,
  VersionContainer,
  VersionContainerProps,
  UsersContainer,
  UsersContainerProps,
} from './types.js';
