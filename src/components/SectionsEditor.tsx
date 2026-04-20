import { useState } from 'react';
import { BlockEditor } from '@verevoir/editor';
import { GripIcon } from './GripIcon.js';
import type { SectionEntry } from '../types.js';

interface Section {
  _type: string;
  [key: string]: unknown;
}

export interface SectionsEditorProps {
  /** Available section types — usually one per visual section in the renderer */
  sections: SectionEntry[];
  /** Current sections array on the document */
  value: Section[];
  /** Called when the user edits, adds, removes, or reorders a section */
  onChange: (next: Section[]) => void;
  /**
   * Called after a STRUCTURAL change — add, remove, or reorder. Edit
   * of a field within a section does NOT trigger this. Consumers
   * typically wire it to auto-save, since those operations feel
   * committed; text edits stay manual-save.
   */
  onStructuralChange?: () => void;
}

/**
 * Polymorphic editor for an array of typed sections (e.g. page
 * sections, content blocks). Each section's `_type` discriminator
 * is used to look up the matching section entry from the registry.
 *
 * Sections can be added (via picker), removed, reordered with arrow
 * buttons, and edited inline. The schema-modeled fields render via
 * @verevoir/editor's BlockEditor; nested fields not modeled in the
 * section block (rare) pass through unchanged on save.
 *
 * Compared to the generic CardGridArrayField in @verevoir/editor,
 * this is for HETEROGENEOUS arrays — every item can have a different
 * shape. The picker offers the registered types when adding.
 */
export function SectionsEditor({
  sections: registry,
  value,
  onChange,
  onStructuralChange,
}: SectionsEditorProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  /** Index of the section currently being dragged, or null if none. */
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  /**
   * Index the dragged section would land at if dropped now. Tracked
   * separately so the row's drop indicator (CSS) can light up
   * regardless of whether dragenter fires before dragleave.
   */
  const [dropTarget, setDropTarget] = useState<number | null>(null);

  const getEntry = (type: string): SectionEntry | undefined =>
    registry.find((d) => d.type === type);

  const updateSection = (index: number, updates: Record<string, unknown>) => {
    const next = [...value];
    next[index] = { ...next[index], ...updates };
    onChange(next);
  };

  const moveSection = (from: number, to: number) => {
    if (to < 0 || to >= value.length) return;
    const next = [...value];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
    if (openIndex === from) setOpenIndex(to);
    onStructuralChange?.();
  };

  /**
   * Drop the dragged section at `targetIndex`. The target is the
   * destination POSITION in the list — if you drag from 1 to 3, the
   * dragged item ends up at index 3 in the new array. We adjust for
   * the fact that splicing the dragged item out shifts indexes that
   * were originally below it.
   */
  const dropAt = (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) return;
    const adjusted = targetIndex > dragIndex ? targetIndex - 1 : targetIndex;
    moveSection(dragIndex, adjusted);
  };

  const removeSection = (index: number) => {
    const next = value.filter((_, i) => i !== index);
    onChange(next);
    if (openIndex === index) setOpenIndex(null);
    else if (openIndex !== null && openIndex > index)
      setOpenIndex(openIndex - 1);
    onStructuralChange?.();
  };

  const addSection = (type: string) => {
    const def = getEntry(type);
    if (!def) return;
    const initial: Section = { _type: type };
    for (const [name, field] of Object.entries(def.block.fields)) {
      const ui = field.meta.ui;
      if (ui === 'text' || ui === 'rich-text' || ui === 'link')
        initial[name] = '';
      else if (ui === 'boolean') initial[name] = false;
      else if (ui === 'number') initial[name] = 0;
      else if (ui === 'select') {
        // Default to the first enum entry
        const def2 = (
          field.schema as unknown as {
            _zod?: { def?: { entries?: Record<string, string> } };
          }
        )._zod?.def;
        const entries = def2?.entries;
        if (entries) initial[name] = Object.values(entries)[0];
      }
    }
    onChange([...value, initial]);
    setOpenIndex(value.length);
    setPickerOpen(false);
    onStructuralChange?.();
  };

  return (
    <div data-sections-editor>
      <div data-sections-header>
        <h2>Sections</h2>
        <span data-sections-count>
          {value.length} section{value.length === 1 ? '' : 's'}
        </span>
      </div>

      {value.length === 0 ? (
        <div data-sections-empty>
          <p>No sections yet. Add one below.</p>
        </div>
      ) : (
        <ol data-sections-list>
          {value.map((section, index) => {
            const def = getEntry(section._type);
            const heading =
              (section.heading as string | undefined) ?? '(no heading)';
            const isOpen = openIndex === index;
            const isUnknown = !def;

            return (
              <li
                key={index}
                data-sections-item
                data-sections-item-open={isOpen ? 'true' : undefined}
                data-sections-item-unknown={isUnknown ? 'true' : undefined}
                data-sections-item-dragging={
                  dragIndex === index ? 'true' : undefined
                }
                data-sections-item-drop-target={
                  dropTarget === index && dragIndex !== index
                    ? 'true'
                    : undefined
                }
                onDragOver={(e) => {
                  if (dragIndex === null) return;
                  e.preventDefault();
                  // Allow dropping; tell the browser this is a "move".
                  e.dataTransfer.dropEffect = 'move';
                  if (dropTarget !== index) setDropTarget(index);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  dropAt(index);
                  setDragIndex(null);
                  setDropTarget(null);
                }}
                onDragLeave={(e) => {
                  // Only clear the drop target when we leave the row
                  // itself (not when we move between its children).
                  if (e.currentTarget.contains(e.relatedTarget as Node | null))
                    return;
                  if (dropTarget === index) setDropTarget(null);
                }}
              >
                <header data-sections-item-header>
                  <span
                    data-sections-item-grip
                    aria-label="Drag to reorder"
                    title="Drag to reorder"
                    role="button"
                    tabIndex={-1}
                    draggable
                    onDragStart={(e) => {
                      setDragIndex(index);
                      e.dataTransfer.effectAllowed = 'move';
                      // Setting any data is required for Firefox to
                      // actually start a drag operation.
                      e.dataTransfer.setData('text/plain', String(index));
                    }}
                    onDragEnd={() => {
                      setDragIndex(null);
                      setDropTarget(null);
                    }}
                  >
                    <GripIcon />
                  </span>
                  <button
                    type="button"
                    data-sections-item-toggle
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    disabled={isUnknown}
                  >
                    {def?.iconSrc && (
                      <img
                        data-sections-item-icon
                        src={def.iconSrc}
                        alt=""
                        aria-hidden="true"
                      />
                    )}
                    <span data-sections-item-text>
                      <span data-sections-item-type>
                        {def?.label ?? `Unknown: ${section._type}`}
                      </span>
                      <span data-sections-item-heading>{heading}</span>
                    </span>
                  </button>
                  <div data-sections-item-controls>
                    <button
                      type="button"
                      onClick={() => moveSection(index, index - 1)}
                      disabled={index === 0}
                      aria-label="Move up"
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSection(index, index + 1)}
                      disabled={index === value.length - 1}
                      aria-label="Move down"
                      title="Move down"
                    >
                      ↓
                    </button>
                  </div>
                </header>

                {isOpen && def && (
                  <div data-sections-item-body>
                    <BlockEditor
                      block={def.block}
                      value={section}
                      onChange={(updated) => updateSection(index, updated)}
                    />
                    <div data-sections-item-body-actions>
                      <button
                        type="button"
                        data-sections-item-delete
                        onClick={() => {
                          if (
                            confirm(
                              `Delete this ${def?.label ?? section._type} section?`,
                            )
                          ) {
                            removeSection(index);
                          }
                        }}
                      >
                        Delete this section
                      </button>
                    </div>
                  </div>
                )}

                {isUnknown && (
                  <div data-sections-item-body>
                    <p>
                      This section type isn&apos;t registered. It will still
                      render on the public site if a matching component exists,
                      but can&apos;t be edited here. Define it in your section
                      registry to enable editing.
                    </p>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      <div data-sections-add>
        {pickerOpen ? (
          <div data-sections-picker>
            <div data-sections-picker-header>
              <strong>Add a section</strong>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <ul data-sections-picker-list>
              {registry.map((def) => (
                <li key={def.type}>
                  <button type="button" onClick={() => addSection(def.type)}>
                    {def.iconSrc && (
                      <img
                        data-sections-picker-icon
                        src={def.iconSrc}
                        alt=""
                        aria-hidden="true"
                      />
                    )}
                    <span data-sections-picker-label>{def.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            data-sections-add-button
          >
            + Add section
          </button>
        )}
      </div>
    </div>
  );
}
