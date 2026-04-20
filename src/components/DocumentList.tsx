import type { Document } from '@verevoir/storage';
import {
  useAdminBasePath,
  useAdminFilter,
  useFilteredGroups,
} from '../context/hooks.js';

export interface DocumentListProps {
  /**
   * Function returning a display name for a document. By default
   * the admin tries `data.title`, then `data.headerTitle`, then
   * `data.name`, then falls back to "(untitled)".
   */
  displayName?: (doc: Document) => string;
  /**
   * Label shown when the active filter excludes every group.
   * Default: "No documents match your filter."
   */
  emptyLabel?: string;
}

const DEFAULT_DISPLAY_NAME = (doc: Document): string => {
  const data = doc.data as Record<string, unknown>;
  return (
    (data.title as string | undefined) ??
    (data.headerTitle as string | undefined) ??
    (data.name as string | undefined) ??
    '(untitled)'
  );
};

/**
 * Lists documents grouped by block type, sourced from
 * `useFilteredGroups()` so the rendered list automatically reflects
 * the active sidebar filter.
 *
 * Must be rendered inside an `<AdminProvider>`.
 */
export function DocumentList({
  displayName = DEFAULT_DISPLAY_NAME,
  emptyLabel = 'No documents match your filter.',
}: DocumentListProps = {}) {
  const groups = useFilteredGroups();
  const basePath = useAdminBasePath();
  const { filter, clearFilter } = useAdminFilter();

  if (groups.length === 0) {
    return (
      <div data-document-list data-document-list-empty-state>
        <p>{emptyLabel}</p>
        {filter && (
          <button
            type="button"
            onClick={clearFilter}
            data-document-list-clear-filter
          >
            Clear filter
          </button>
        )}
      </div>
    );
  }

  return (
    <div data-document-list>
      {groups.map((group) => (
        <section key={group.blockType} data-document-list-group>
          <h2 data-document-list-group-title>{group.label}</h2>
          {group.documents.length === 0 ? (
            <p data-document-list-empty>No documents.</p>
          ) : (
            <ul data-document-list-items>
              {group.documents.map((doc) => {
                const data = doc.data as { slug?: string };
                return (
                  <li key={doc.id} data-document-list-item>
                    <a
                      href={`${basePath}/${group.blockType}/${doc.id}`}
                      data-document-list-link
                    >
                      <span data-document-list-link-title>
                        {displayName(doc)}
                      </span>
                      <span data-document-list-link-meta>
                        {data.slug ?? (group.singleton ? 'singleton' : doc.id)}
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
