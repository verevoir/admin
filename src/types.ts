import type { ComponentType } from 'react';
import type { BlockDefinition, FieldRecord } from '@verevoir/schema';
import type { Document, StorageAdapter } from '@verevoir/storage';
import type { FieldOverrides } from '@verevoir/editor';

/**
 * A registered block type that the admin manages.
 *
 * The minimum required is the block definition itself; the optional
 * fields control how the admin treats it (e.g. as a singleton vs
 * a collection, with a custom display label, etc.).
 */
export interface BlockEntry {
  /** Verevoir block definition (from `defineBlock`) */
  block: BlockDefinition<FieldRecord>;
  /** Human-readable label for the block type. Defaults to the block name. */
  label?: string;
  /**
   * If true, treated as a singleton — the admin shows one document
   * directly rather than a list. Use for site config, feature flags,
   * theme settings, etc.
   */
  singleton?: boolean;
  /**
   * Function returning the public URL for a document of this block
   * type. When set, the editor for this block shows a live preview
   * iframe pointing at the URL.
   *
   * Example for a `page` block: `(data) => '/' + data.slug`
   */
  preview?: (data: Record<string, unknown>) => string | undefined;
}

/**
 * A polymorphic section type that can appear inside a page's
 * sections array (or any similar discriminated-union array). Used
 * by SectionsEditor.
 */
export interface SectionEntry {
  /** The discriminator value stored in `data._type` */
  type: string;
  /** Human-readable label shown in the section picker */
  label: string;
  /** Block definition for this section type's fields */
  block: BlockDefinition<FieldRecord>;
}

/**
 * Identity of the currently signed-in admin user. Provided by the
 * host's auth middleware (e.g. via Astro middleware setting
 * `context.locals.identity`). The admin uses this for display and
 * client-side gating; it does not perform authentication itself.
 */
export interface AdminIdentity {
  id: string;
  /** Display name shown in the header */
  name?: string;
  /** Email shown in the header */
  email?: string;
  /** Roles for client-side gating (server should still check) */
  roles?: string[];
  /** Arbitrary metadata from the auth provider */
  metadata?: Record<string, unknown>;
}

/**
 * Container for the page versioning UI. The admin shell reserves a
 * slot above the main editor for this; if no implementation is
 * provided, the slot stays empty.
 *
 * Versioning is opinionated — Verevoir's model is multiple versions
 * per slug with status (draft/published/archived) and auto-publish
 * on validity. A consumer running on a SanityAdapter (which has no
 * versioning concept) can pass a stub implementation that hides the
 * UI entirely.
 */
export interface VersionContainerProps {
  documentId: string;
  blockType: string;
}
export type VersionContainer = ComponentType<VersionContainerProps>;

/**
 * Container for the user management UI. Rendered as its own admin
 * route (e.g. /admin/users) when provided.
 *
 * Default implementation in @verevoir/admin is a stub showing
 * "Not configured". A real implementation would import @verevoir/access
 * and @verevoir/accounts to render the list/invite/role-assignment
 * surface.
 */
export interface UsersContainerProps {
  identity?: AdminIdentity;
}
export type UsersContainer = ComponentType<UsersContainerProps>;

/**
 * The full registry of block types the admin manages, keyed by
 * blockType string.
 */
export type BlockRegistry = Record<string, BlockEntry>;

/**
 * Configuration for the admin. Passed to the `<Admin>` umbrella
 * component or to individual composition pieces.
 */
export interface AdminConfig {
  /** Storage adapter providing the documents */
  storage: StorageAdapter;
  /** Registry of block types the admin manages */
  blocks: BlockRegistry;
  /** Polymorphic section types (for SectionsEditor inside pages) */
  sections?: SectionEntry[];
  /** Base URL path for the admin (default: `/admin`) */
  basePath?: string;
  /** Currently signed-in user, if any */
  identity?: AdminIdentity;
  /**
   * Component to render for page versioning. The admin reserves a
   * slot above the editor; if omitted, the slot stays empty.
   */
  versions?: VersionContainer;
  /**
   * Component to render for user management. Rendered as its own
   * route. If omitted, the Users link is hidden from the nav.
   */
  users?: UsersContainer;
  /**
   * Field component overrides forwarded to BlockEditor. Lets the
   * consumer plug in custom inputs for specific field names or
   * UIHints (e.g. a tag picker for a `text` field named "tags").
   */
  overrides?: FieldOverrides;
}

/** Re-exports for convenience */
export type {
  BlockDefinition,
  FieldRecord,
  Document,
  StorageAdapter,
  FieldOverrides,
};
