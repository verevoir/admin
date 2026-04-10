import type { Document } from '@verevoir/storage';
import type { BlockEntry } from '../types.js';

export interface DocumentListGroup {
  blockType: string;
  entry: BlockEntry;
  documents: Document[];
}

export interface DocumentListProps {
  /**
   * Groups of documents to display, one per registered block type.
   * Each group is rendered as its own section with a heading.
   */
  groups: DocumentListGroup[];
  /**
   * Base path for editor links. Default: `/admin`. Each link is
   * built as `${basePath}/${blockType}/${documentId}`.
   */
  basePath?: string;
  /**
   * Function returning a display name for a document. By default
   * the admin tries `data.title`, then `data.headerTitle`, then
   * `data.name`, then falls back to "(untitled)".
   */
  displayName?: (doc: Document) => string;
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
 * Lists documents grouped by block type. Each group has a heading
 * and a list of edit links.
 *
 * The data fetching is delegated to the host route — pass the
 * loaded groups in. This keeps the component framework-agnostic
 * (Astro can fetch on the server, Next can fetch in a server
 * component, etc.).
 */
export function DocumentList({
  groups,
  basePath = '/admin',
  displayName = DEFAULT_DISPLAY_NAME,
}: DocumentListProps) {
  return (
    <div data-document-list>
      {groups.map((group) => (
        <section key={group.blockType} data-document-list-group>
          <h2 data-document-list-group-title>
            {group.entry.label ?? group.entry.block.name}
          </h2>
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
                        {data.slug ??
                          (group.entry.singleton ? 'singleton' : doc.id)}
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
