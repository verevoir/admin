import { useMemo, useState } from 'react';
import { DateTimeField } from '@verevoir/editor';
import type { TagDocument } from '../server/load-tags.js';

export interface TagSchedulerProps {
  tag: string;
  documents: TagDocument[];
  /**
   * Predicate: can the current user apply a state change to this
   * document? Called once per doc at render. Denied docs are still
   * listed (with a lock indicator) so the user knows why the set
   * they're editing is smaller than the set carrying the tag.
   *
   * Defaults to always-allow so the starter can ship without wiring
   * up access from day one. Consumers with auth should pass a real
   * predicate, typically wrapping `access.can(identity, 'update',
   * doc)` or similar.
   */
  canEdit?: (doc: TagDocument) => boolean;
  /**
   * Commit the bulk schedule. Called with the ids that passed the
   * access check and the new start / end window (either or both may
   * be undefined if the user cleared them). The consumer owns the
   * storage call, the toast/notification, and any post-save
   * refetch.
   */
  onSave: (args: {
    documentIds: string[];
    publishFrom: string | undefined;
    publishTo: string | undefined;
  }) => Promise<void> | void;
}

/**
 * Bulk schedule every document carrying a tag onto the same publish
 * window. A thin form: two `DateTimeField` inputs for start/end and
 * an Apply button. Denied documents (where `canEdit` returns false)
 * are listed greyed out with a lock glyph so the user sees the full
 * picture rather than wondering why the tag had more docs than the
 * editor showed.
 *
 * The component doesn't touch storage — the consumer wires `onSave`
 * to whatever persistence + auth flow it needs. Same pattern as the
 * existing DocumentEditor: the admin stays UI-only.
 */
export function TagScheduler({
  tag,
  documents,
  canEdit = () => true,
  onSave,
}: TagSchedulerProps) {
  const [publishFrom, setPublishFrom] = useState<string>('');
  const [publishTo, setPublishTo] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [lastSavedCount, setLastSavedCount] = useState<number | null>(null);

  const { editable, locked } = useMemo(() => {
    const editable: TagDocument[] = [];
    const locked: TagDocument[] = [];
    for (const doc of documents) {
      if (canEdit(doc)) editable.push(doc);
      else locked.push(doc);
    }
    return { editable, locked };
  }, [documents, canEdit]);

  const handleApply = async () => {
    if (editable.length === 0) return;
    setSaving(true);
    setLastSavedCount(null);
    try {
      await onSave({
        documentIds: editable.map((d) => d.id),
        publishFrom: publishFrom || undefined,
        publishTo: publishTo || undefined,
      });
      setLastSavedCount(editable.length);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div data-tag-scheduler>
      <header data-tag-scheduler-header>
        <h2>
          Tag: <code>{tag}</code>
        </h2>
        <p data-tag-scheduler-count>
          {documents.length} document{documents.length === 1 ? '' : 's'}
          {locked.length > 0 && (
            <>
              {' '}
              ({locked.length} not editable by you)
            </>
          )}
        </p>
      </header>

      <div data-tag-scheduler-form>
        <div data-tag-scheduler-field>
          <label>Publish from</label>
          <DateTimeField
            name={`${tag}-publish-from`}
            value={publishFrom}
            onChange={(v: unknown) => setPublishFrom((v as string) ?? '')}
            field={{
              schema: null as never,
              meta: {
                label: 'Publish from',
                ui: 'datetime' as 'text',
                required: false,
              },
            }}
          />
        </div>
        <div data-tag-scheduler-field>
          <label>Publish to</label>
          <DateTimeField
            name={`${tag}-publish-to`}
            value={publishTo}
            onChange={(v: unknown) => setPublishTo((v as string) ?? '')}
            field={{
              schema: null as never,
              meta: {
                label: 'Publish to',
                ui: 'datetime' as 'text',
                required: false,
              },
            }}
          />
        </div>
        <div data-tag-scheduler-actions>
          <button
            type="button"
            onClick={handleApply}
            disabled={
              saving ||
              editable.length === 0 ||
              (!publishFrom && !publishTo)
            }
            data-tag-scheduler-apply
          >
            {saving
              ? 'Applying…'
              : `Apply to ${editable.length} document${editable.length === 1 ? '' : 's'}`}
          </button>
          {lastSavedCount !== null && (
            <span data-tag-scheduler-saved>
              Applied to {lastSavedCount} document
              {lastSavedCount === 1 ? '' : 's'}
            </span>
          )}
        </div>
      </div>

      <ul data-tag-scheduler-list>
        {documents.map((doc) => {
          const isLocked = !canEdit(doc);
          return (
            <li
              key={doc.id}
              data-tag-scheduler-item
              data-tag-scheduler-locked={isLocked ? 'true' : undefined}
            >
              <span data-tag-scheduler-type>{doc.blockType}</span>
              <span data-tag-scheduler-title>{doc.title}</span>
              <span data-tag-scheduler-window>
                {doc.publishFrom ? formatIso(doc.publishFrom) : '—'}
                {' → '}
                {doc.publishTo ? formatIso(doc.publishTo) : '∞'}
              </span>
              {isLocked && (
                <span
                  data-tag-scheduler-lock
                  aria-label="Not editable by you"
                  title="You don't have permission to change this document's publish state"
                >
                  🔒
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function formatIso(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
