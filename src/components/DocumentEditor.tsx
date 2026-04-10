import { useState, useCallback } from 'react';
import {
  BlockEditor,
  LinkSearchProvider,
  PreviewFrame,
  type LinkSearchResult,
  type FieldOverrides,
} from '@verevoir/editor';
import type { BlockDefinition, FieldRecord } from '@verevoir/schema';
import { SectionsEditor } from './SectionsEditor.js';
import type {
  SectionEntry,
  VersionContainer,
  AdminIdentity,
} from '../types.js';

interface Section {
  _type: string;
  [key: string]: unknown;
}

export interface LinkablePage {
  id: string;
  title: string;
  url: string;
  blockType: string;
}

export interface DocumentEditorProps {
  /** Document id */
  id: string;
  /** Block type discriminator */
  blockType: string;
  /** Initial form values from the document's data */
  initialData: Record<string, unknown>;
  /** Block definition for the form fields */
  block: BlockDefinition<FieldRecord>;
  /**
   * Where to POST changes. Default: `/api/admin/save`. The endpoint
   * receives `{ id, blockType, data }` and is expected to merge with
   * the existing document.
   */
  saveEndpoint?: string;
  /**
   * URL string with the public URL for this document, or undefined
   * if there's no preview. When set, the editor renders a two-pane
   * layout with the iframe on the right.
   */
  previewUrl?: string;
  /**
   * Polymorphic section types — when present, the editor adds a
   * SectionsEditor below the metadata form for the document's
   * `sections` field.
   */
  sectionTypes?: SectionEntry[];
  /** Initial sections array (for documents with section editing) */
  initialSections?: Section[];
  /** Pages the LinkField picker can search */
  linkablePages?: LinkablePage[];
  /** Field component overrides forwarded to BlockEditor */
  overrides?: FieldOverrides;
  /**
   * Optional version container component. The admin reserves a slot
   * above the form for this; if omitted, the slot stays empty.
   * The component receives `{ documentId, blockType }` props.
   */
  versions?: VersionContainer;
  /** Currently signed-in user, available for client-side gating */
  identity?: AdminIdentity;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * The full document editor — metadata form + optional sections +
 * optional live preview + optional version controls.
 *
 * Loaded as a React island in admin routes (Astro `client:only`,
 * Next dynamic import, etc.).
 */
export function DocumentEditor({
  id,
  blockType,
  initialData,
  block,
  saveEndpoint = '/api/admin/save',
  previewUrl,
  sectionTypes,
  initialSections = [],
  linkablePages = [],
  overrides,
  versions: VersionsContainer,
  identity: _identity,
}: DocumentEditorProps) {
  const [data, setData] = useState<Record<string, unknown>>(initialData);
  const [sections, setSections] = useState<Section[]>(initialSections);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [previewVersion, setPreviewVersion] = useState(0);

  const hasSections = (sectionTypes?.length ?? 0) > 0;

  const linkSearch = useCallback(
    async (query: string): Promise<LinkSearchResult[]> => {
      const q = query.trim().toLowerCase();
      const matches = q
        ? linkablePages.filter(
            (p) =>
              p.title.toLowerCase().includes(q) ||
              p.url.toLowerCase().includes(q),
          )
        : linkablePages;
      return matches.slice(0, 20);
    },
    [linkablePages],
  );

  const handleSave = async () => {
    setStatus('saving');
    setError(null);
    try {
      const payload: Record<string, unknown> = { ...data };
      if (hasSections) payload.sections = sections;

      const res = await fetch(saveEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, blockType, data: payload }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
      if (previewUrl) setPreviewVersion((v) => v + 1);
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const editor = (
    <div data-document-editor>
      {VersionsContainer && (
        <div data-document-editor-versions>
          <VersionsContainer documentId={id} blockType={blockType} />
        </div>
      )}

      <section data-document-editor-section>
        <h2 data-document-editor-section-title>Details</h2>
        <BlockEditor
          block={block}
          value={data}
          onChange={setData}
          overrides={overrides}
        />
      </section>

      {hasSections && sectionTypes && (
        <section data-document-editor-section>
          <SectionsEditor
            sections={sectionTypes}
            value={sections}
            onChange={setSections}
          />
        </section>
      )}

      <div data-document-editor-actions>
        <button
          type="button"
          onClick={handleSave}
          disabled={status === 'saving'}
          data-document-editor-save
        >
          {status === 'saving' ? 'Saving…' : 'Save'}
        </button>
        {status === 'saved' && (
          <span data-document-editor-status data-status="success">
            Saved
          </span>
        )}
        {status === 'error' && (
          <span data-document-editor-status data-status="error">
            Error: {error}
          </span>
        )}
      </div>
    </div>
  );

  if (!previewUrl) {
    return (
      <LinkSearchProvider search={linkSearch}>{editor}</LinkSearchProvider>
    );
  }

  return (
    <LinkSearchProvider search={linkSearch}>
      <div data-document-editor-with-preview>
        <div data-document-editor-pane>{editor}</div>
        <div data-document-editor-preview-pane>
          <PreviewFrame defaultViewport="Desktop">
            <iframe
              key={previewVersion}
              src={previewUrl}
              title="Live preview"
              data-document-editor-preview-iframe
            />
          </PreviewFrame>
        </div>
      </div>
    </LinkSearchProvider>
  );
}
