import type { TagSummary } from '../server/load-tags.js';

export interface TagListProps {
  tags: TagSummary[];
  /** Base path for links, e.g. "/admin/tags". Defaults to "/admin/tags". */
  basePath?: string;
}

/**
 * Listing of every tag in use across the registered block types,
 * with counts. Click-through lands on the tag's detail page
 * (`{basePath}/{tag}`) where the TagScheduler lives.
 *
 * Server-rendered — the `tags` prop comes from loadTagsSummary and
 * this component is stateless.
 */
export function TagList({ tags, basePath = '/admin/tags' }: TagListProps) {
  if (tags.length === 0) {
    return (
      <div data-tag-list-empty>
        <p>
          No tags in use yet. Add a tag to any document via its editor,
          then come back here to schedule them as a group.
        </p>
      </div>
    );
  }

  return (
    <ul data-tag-list>
      {tags.map((tag) => (
        <li key={tag.name} data-tag-list-item>
          <a
            href={`${basePath}/${encodeURIComponent(tag.name)}`}
            data-tag-list-link
          >
            <span data-tag-list-name>{tag.name}</span>
            <span data-tag-list-count>
              {tag.count} document{tag.count === 1 ? '' : 's'}
            </span>
            <span data-tag-list-types>{tag.blockTypes.join(', ')}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
