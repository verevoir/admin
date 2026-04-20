import { useEffect, useMemo, useRef } from 'react';
import type { Document } from '@verevoir/storage';
import {
  useAdminBasePath,
  useAdminCurrentPath,
  useAdminFilter,
  useExpandedTypes,
  useFilteredGroups,
  useSidebarOpen,
} from '../context/hooks.js';
import type { AdminGroup } from '../types.js';

export interface AdminSidebarProps {
  /**
   * Function returning a display name for a document. Defaults to
   * `data.title` → `data.headerTitle` → `data.name` → "(untitled)".
   */
  displayName?: (doc: Document) => string;
  /**
   * Label for the sidebar's "no matches" empty state.
   * Default: "No matches".
   */
  emptyLabel?: string;
  /**
   * Placeholder for the filter search input.
   * Default: "Filter…".
   */
  filterPlaceholder?: string;
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

const DEFAULT_CATEGORY = 'Other';

interface CategorisedGroups {
  category: string;
  groups: AdminGroup[];
}

/**
 * Group block types by their `entry.category` (preserving the order
 * categories first appear in the registry). Used so the sidebar can
 * render a divider between content types and config singletons
 * without the consumer having to do the bucketing.
 */
function categoriseGroups(groups: AdminGroup[]): CategorisedGroups[] {
  const order: string[] = [];
  const buckets = new Map<string, AdminGroup[]>();
  for (const group of groups) {
    const category = group.category ?? DEFAULT_CATEGORY;
    if (!buckets.has(category)) {
      buckets.set(category, []);
      order.push(category);
    }
    buckets.get(category)!.push(group);
  }
  return order.map((category) => ({
    category,
    groups: buckets.get(category)!,
  }));
}

/**
 * Collapsible left sidebar listing every block type and its
 * documents, with a debounced filter, expand/collapse per group,
 * and category dividers.
 *
 * All state lives in the surrounding `AdminProvider` /
 * `AdminPreferencesProvider`, so this component is purely a view.
 */
export function AdminSidebar({
  displayName = DEFAULT_DISPLAY_NAME,
  emptyLabel = 'No matches',
  filterPlaceholder = 'Filter…',
}: AdminSidebarProps) {
  const basePath = useAdminBasePath();
  const currentPath = useAdminCurrentPath();
  const groups = useFilteredGroups();
  const { filter, setFilter, clearFilter } = useAdminFilter();
  const [open, setOpen] = useSidebarOpen();
  const { expanded, toggle, setExpanded } = useExpandedTypes();

  const categorised = useMemo(() => categoriseGroups(groups), [groups]);

  // First time the sidebar mounts with no expanded types remembered,
  // pre-expand every group so the user sees the full tree. Once they
  // collapse anything, that becomes the source of truth.
  const didSeed = useRef(false);
  useEffect(() => {
    if (didSeed.current) return;
    if (expanded.size > 0) {
      didSeed.current = true;
      return;
    }
    if (groups.length === 0) return;
    didSeed.current = true;
    setExpanded(new Set(groups.map((g) => g.blockType)));
  }, [groups, expanded, setExpanded]);

  return (
    <aside data-admin-sidebar data-admin-sidebar-open={open ? 'true' : 'false'}>
      <div data-admin-sidebar-header>
        <button
          type="button"
          data-admin-sidebar-toggle
          aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? '«' : '»'}
        </button>
        {open && (
          <div data-admin-sidebar-search>
            <input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={filterPlaceholder}
              data-admin-sidebar-search-input
              aria-label="Filter documents"
            />
            {filter && (
              <button
                type="button"
                onClick={clearFilter}
                data-admin-sidebar-search-clear
                aria-label="Clear filter"
              >
                ×
              </button>
            )}
          </div>
        )}
      </div>

      {open && (
        <nav data-admin-sidebar-nav aria-label="Admin documents">
          {categorised.length === 0 ? (
            <p data-admin-sidebar-empty>{emptyLabel}</p>
          ) : (
            categorised.map(({ category, groups: bucket }) => (
              <div key={category} data-admin-sidebar-category>
                {category !== DEFAULT_CATEGORY && (
                  <h3 data-admin-sidebar-category-title>{category}</h3>
                )}
                <ul data-admin-sidebar-types>
                  {bucket.map((group) => (
                    <SidebarGroup
                      key={group.blockType}
                      group={group}
                      basePath={basePath}
                      currentPath={currentPath}
                      expanded={expanded.has(group.blockType)}
                      onToggle={() => toggle(group.blockType)}
                      displayName={displayName}
                    />
                  ))}
                </ul>
              </div>
            ))
          )}
        </nav>
      )}
    </aside>
  );
}

interface SidebarGroupProps {
  group: AdminGroup;
  basePath: string;
  currentPath?: string;
  expanded: boolean;
  onToggle: () => void;
  displayName: (doc: Document) => string;
}

function SidebarGroup({
  group,
  basePath,
  currentPath,
  expanded,
  onToggle,
  displayName,
}: SidebarGroupProps) {
  const label = group.label;
  const isSingleton = group.singleton;
  const count = group.documents.length;

  // Singletons collapse the disclosure: jump straight to the doc
  // since there's only ever one. The label itself becomes the link.
  if (isSingleton && count > 0) {
    const doc = group.documents[0];
    const href = `${basePath}/${group.blockType}/${doc.id}`;
    const isCurrent = currentPath === href;
    return (
      <li data-admin-sidebar-type data-singleton="true">
        <a
          href={href}
          data-admin-sidebar-singleton-link
          data-current={isCurrent ? 'true' : undefined}
        >
          {label}
        </a>
      </li>
    );
  }

  return (
    <li data-admin-sidebar-type data-expanded={expanded ? 'true' : 'false'}>
      <button
        type="button"
        data-admin-sidebar-type-toggle
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <span data-admin-sidebar-type-caret>{expanded ? '▾' : '▸'}</span>
        <span data-admin-sidebar-type-label>{label}</span>
        <span data-admin-sidebar-type-count>{count}</span>
      </button>
      {expanded && count > 0 && (
        <ul data-admin-sidebar-docs>
          {group.documents.map((doc) => {
            const href = `${basePath}/${group.blockType}/${doc.id}`;
            const isCurrent = currentPath === href;
            return (
              <li key={doc.id} data-admin-sidebar-doc>
                <a
                  href={href}
                  data-admin-sidebar-doc-link
                  data-current={isCurrent ? 'true' : undefined}
                >
                  {displayName(doc)}
                </a>
              </li>
            );
          })}
        </ul>
      )}
      {expanded && count === 0 && (
        <p data-admin-sidebar-doc-empty>No documents</p>
      )}
    </li>
  );
}
