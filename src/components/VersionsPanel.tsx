import type { VersionRecord, VersionStatus } from '@verevoir/editor/version-store';

export interface VersionsPanelProps<TData = Record<string, unknown>> {
  /** All versions for this document's slug, newest version first. */
  versions: VersionRecord<TData>[];
  /** The currently-open version's id — highlighted in the list. */
  currentVersionId: string;
  /**
   * Caller supplies a path for a given version id (e.g.
   * `(id) => '/admin/pages/' + id`). Used both for the Edit link
   * and as the navigation target after Duplicate.
   */
  versionPath: (id: string) => string;
  /**
   * Called when the user duplicates a non-current version. The
   * caller branches a new draft from the source id and navigates
   * to it. Returning a Promise lets callers await before any
   * follow-on UI work.
   */
  onDuplicate: (sourceId: string) => void | Promise<void>;
}

/**
 * Renders the version list that sits inside DocumentEditor's
 * Versions tab when a `versioning` prop is passed. Pure
 * presentation — all actions (publish, navigate, duplicate) are
 * caller-supplied.
 *
 * Markup uses `data-versions-*` attributes for CSS targeting; no
 * class names. Style hooks live in `src/styles/admin.css`.
 */
export function VersionsPanel<TData = Record<string, unknown>>({
  versions,
  currentVersionId,
  versionPath,
  onDuplicate,
}: VersionsPanelProps<TData>) {
  if (versions.length === 0) {
    return (
      <div data-versions-panel>
        <p data-versions-empty>
          This is the only version. Use <strong>New version</strong> on a
          published document to branch a new draft.
        </p>
      </div>
    );
  }

  return (
    <div data-versions-panel>
      <ol data-versions-list>
        {versions.map((v) => {
          const isCurrent = v.id === currentVersionId;
          return (
            <li
              key={v.id}
              data-versions-item
              data-current={isCurrent ? 'true' : undefined}
              data-status={v.status}
            >
              <span data-versions-meta>
                <StatusBadge status={v.status} />
                <span data-versions-version-number>v{v.version}</span>
                <span data-versions-date>
                  {formatDate(v.updatedAt)}
                </span>
              </span>
              <span data-versions-actions>
                {isCurrent ? (
                  <span data-versions-current-label>Current</span>
                ) : (
                  <>
                    <a href={versionPath(v.id)} data-versions-link>
                      Edit
                    </a>
                    <button
                      type="button"
                      data-versions-link
                      onClick={() => void onDuplicate(v.id)}
                    >
                      Duplicate
                    </button>
                  </>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function StatusBadge({ status }: { status: VersionStatus }) {
  return (
    <span data-version-badge data-status={status}>
      {status}
    </span>
  );
}

function formatDate(timestamp: number): string {
  if (!Number.isFinite(timestamp)) return '';
  const d = new Date(timestamp);
  return d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
