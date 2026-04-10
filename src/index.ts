// Components
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
export type {
  DocumentListProps,
  DocumentListGroup,
} from './components/DocumentList.js';

export { SectionsEditor } from './components/SectionsEditor.js';
export type { SectionsEditorProps } from './components/SectionsEditor.js';

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
  SectionEntry,
  AdminIdentity,
  AdminConfig,
  VersionContainer,
  VersionContainerProps,
  UsersContainer,
  UsersContainerProps,
} from './types.js';
