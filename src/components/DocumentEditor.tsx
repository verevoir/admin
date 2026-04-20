import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  BlockEditor,
  LinkSearchProvider,
  PreviewFrame,
  type LinkSearchResult,
  type FieldOverrides,
} from '@verevoir/editor';
import type {
  BlockDefinition,
  FieldRecord,
  FieldDefinition,
} from '@verevoir/schema';
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
   * if there's no preview. When set, the Versions and Content tabs
   * render an iframe pointing at this URL on the right.
   */
  previewUrl?: string;
  /**
   * Polymorphic section types — when present, the document is
   * treated as a "content document" and the editor renders the
   * tabbed Document/Versions/Content layout. When omitted, the
   * editor renders a single-column form for the doc's fields
   * (the contentless case, e.g. site config singletons).
   */
  sectionTypes?: SectionEntry[];
  /** Initial sections array (for documents with section editing) */
  initialSections?: Section[];
  /** Pages the LinkField picker can search */
  linkablePages?: LinkablePage[];
  /** Field component overrides forwarded to BlockEditor */
  overrides?: FieldOverrides;
  /**
   * Optional version container component, rendered into the
   * Versions tab's left column. Defaults to a placeholder telling
   * the user no versioning provider is configured.
   */
  versions?: VersionContainer;
  /** Currently signed-in user, available for client-side gating */
  identity?: AdminIdentity;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
type Tab = 'document' | 'versions' | 'content';

/**
 * The full document editor.
 *
 * **Content documents** (those with `sectionTypes`) render a tabbed
 * three-pane layout:
 *
 * - **Document** — meta fields (title, slug, SEO) on the left,
 *   non-meta block fields on the right. Both columns scroll
 *   independently.
 * - **Versions** — version list (left, currently a stub) and live
 *   preview iframe (right).
 * - **Content** — sections editor (left) and live preview (right).
 *
 * The default tab is **Content**, on the assumption that there's
 * exactly one editable draft version. When real versioning lands
 * the default switches to whichever tab matches the version's
 * status.
 *
 * **Contentless documents** (no `sectionTypes`) render the original
 * single-column form — these are config-like singletons where the
 * tabs would just be noise.
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
  const [tab, setTab] = useState<Tab>('content');
  /** Ref to the live-preview iframe so we can refresh it in place. */
  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  /**
   * Set when the user adds, removes, or reorders a section. The
   * effect below picks it up after `sections` updates and triggers
   * a debounced auto-save — so reorder/delete feel "committed" and
   * the preview iframe refreshes without an explicit Save click.
   * Field edits within a section don't set this flag; those use the
   * Save button as before.
   */
  const structuralSavePending = useRef(false);

  const hasSections = (sectionTypes?.length ?? 0) > 0;

  // Split the block's fields into the metadata and body buckets
  // based on the `isMeta` marker set by `defineContentBlock` in
  // @verevoir/schema. Memoised so the synthetic blocks below stay
  // referentially stable across renders.
  const { metaBlock, bodyBlock, hasBodyFields } = useMemo(() => {
    const metaFields: FieldRecord = {};
    const bodyFields: FieldRecord = {};
    for (const [name, field] of Object.entries(block.fields)) {
      if ((field as FieldDefinition).meta.isMeta) {
        metaFields[name] = field;
      } else {
        bodyFields[name] = field;
      }
    }
    return {
      metaBlock: { ...block, fields: metaFields },
      bodyBlock: { ...block, fields: bodyFields },
      hasBodyFields: Object.keys(bodyFields).length > 0,
    };
  }, [block]);

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

  const refreshPreview = () => {
    // In-place iframe reload — keeps the element mounted and its
    // chrome (toolbar, scroll position) intact. Replacing the
    // iframe via a `key` flashes the whole pane.
    try {
      previewIframeRef.current?.contentWindow?.location.reload();
    } catch {
      // Cross-origin guard — preview URL might be on a different
      // origin in some setups. Fall back to swapping `src`, which
      // forces navigation but doesn't re-mount the element.
      const iframe = previewIframeRef.current;
      if (iframe) {
        const src = iframe.src;
        iframe.src = '';
        iframe.src = src;
      }
    }
  };

  const handleSave = async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setStatus('saving');
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
      if (!opts?.silent) {
        setStatus('saved');
        setTimeout(() => setStatus('idle'), 2000);
      }
      if (previewUrl) refreshPreview();
    } catch (err) {
      // Errors always surface, even on a silent save — a silent
      // failure is the worst kind of failure.
      setStatus('error');
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  /**
   * Auto-save when a structural section change (add / remove /
   * reorder) lands in state. The flag is set inside the SectionsEditor
   * callbacks; the effect picks it up after React commits the new
   * `sections` and runs the save with a short debounce so several
   * rapid moves coalesce into one POST.
   */
  useEffect(() => {
    if (!structuralSavePending.current) return;
    structuralSavePending.current = false;
    const timer = setTimeout(() => {
      void handleSave({ silent: true });
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections]);

  const saveBar = (
    <div data-document-editor-actions>
      <button
        type="button"
        onClick={() => void handleSave()}
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
  );

  // ----- contentless: single-column form -----------------------------
  if (!hasSections) {
    return (
      <LinkSearchProvider search={linkSearch}>
        <div data-document-editor data-document-editor-mode="contentless">
          <BlockEditor
            block={block}
            value={data}
            onChange={setData}
            overrides={overrides}
          />
          {saveBar}
        </div>
      </LinkSearchProvider>
    );
  }

  // ----- content document: tabbed layout -----------------------------
  const previewIframe = previewUrl ? (
    <PreviewFrame defaultViewport="Desktop" defaultZoom={50}>
      <iframe
        ref={previewIframeRef}
        src={previewUrl}
        title="Live preview"
        data-document-editor-preview-iframe
      />
    </PreviewFrame>
  ) : (
    <div data-document-editor-no-preview>
      No preview URL configured for this block type.
    </div>
  );

  return (
    <LinkSearchProvider search={linkSearch}>
      <div data-document-editor data-document-editor-mode="tabbed">
        <div data-document-editor-tabs role="tablist">
          <TabButton
            active={tab === 'document'}
            onClick={() => setTab('document')}
          >
            Document
          </TabButton>
          <TabButton
            active={tab === 'versions'}
            onClick={() => setTab('versions')}
          >
            Versions
          </TabButton>
          <TabButton
            active={tab === 'content'}
            onClick={() => setTab('content')}
          >
            Content
          </TabButton>
          <div data-document-editor-tab-spacer />
        </div>

        {tab === 'document' && (
          <div data-document-editor-tab-body data-tab="document">
            <div data-document-editor-col data-col="left">
              <BlockEditor
                block={metaBlock}
                value={data}
                onChange={setData}
                overrides={overrides}
              />
              {saveBar}
            </div>
            {hasBodyFields ? (
              <div data-document-editor-col data-col="right">
                <BlockEditor
                  block={bodyBlock}
                  value={data}
                  onChange={setData}
                  overrides={overrides}
                />
              </div>
            ) : (
              <div data-document-editor-col data-col="right" data-preview>
                {previewIframe}
              </div>
            )}
          </div>
        )}

        {tab === 'versions' && (
          <div data-document-editor-tab-body data-tab="versions">
            <div data-document-editor-col data-col="left">
              {VersionsContainer ? (
                <VersionsContainer documentId={id} blockType={blockType} />
              ) : (
                <div data-document-editor-versions-stub>
                  <h3>Versions</h3>
                  <p>
                    No versioning provider is configured. When you wire one up
                    via the <code>versions</code> prop, the version list will
                    appear here.
                  </p>
                </div>
              )}
            </div>
            <div data-document-editor-col data-col="right" data-preview>
              {previewIframe}
            </div>
          </div>
        )}

        {tab === 'content' && (
          <div data-document-editor-tab-body data-tab="content">
            <div data-document-editor-col data-col="left">
              {sectionTypes && (
                <SectionsEditor
                  sections={sectionTypes}
                  value={sections}
                  onChange={setSections}
                  onStructuralChange={() => {
                    structuralSavePending.current = true;
                  }}
                />
              )}
              {saveBar}
            </div>
            <div data-document-editor-col data-col="right" data-preview>
              {previewIframe}
            </div>
          </div>
        )}
      </div>
    </LinkSearchProvider>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function TabButton({ active, onClick, children }: TabButtonProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      data-document-editor-tab
      data-active={active ? 'true' : undefined}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
