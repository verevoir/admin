import type { StorageAdapter, Document } from '@verevoir/storage';
import type { BlockRegistry } from '../types.js';

export interface TagSummary {
  /** Tag name as stored on documents' `data.tags` array */
  name: string;
  /** Total documents carrying this tag across all block types */
  count: number;
  /** Block types that include at least one doc carrying this tag */
  blockTypes: string[];
}

export interface TagDocument {
  id: string;
  blockType: string;
  /** Pre-resolved display name — first of title/headerTitle/slug, or "(untitled)" */
  title: string;
  publishFrom?: string;
  publishTo?: string;
  status?: string;
}

export interface LoadTagsOptions {
  storage: StorageAdapter;
  blocks: BlockRegistry;
}

export interface LoadTagDetailOptions extends LoadTagsOptions {
  tag: string;
}

/**
 * Summarise every tag in use across the registered block types.
 * Counts how many docs carry each tag and which block types are
 * involved. Full-scan + in-memory aggregate — fine at starter scale;
 * swap for a storage-level `containsAny` filter when it matters.
 *
 * Server-only; call from your route loader and hand the result to an
 * admin client island for rendering.
 */
export async function loadTagsSummary({
  storage,
  blocks,
}: LoadTagsOptions): Promise<TagSummary[]> {
  const summaries = new Map<string, TagSummary>();

  for (const blockType of Object.keys(blocks)) {
    const docs = await storage.list(blockType);
    for (const doc of docs) {
      const tags = extractTags(doc);
      for (const tag of tags) {
        const existing = summaries.get(tag);
        if (existing) {
          existing.count += 1;
          if (!existing.blockTypes.includes(blockType)) {
            existing.blockTypes.push(blockType);
          }
        } else {
          summaries.set(tag, { name: tag, count: 1, blockTypes: [blockType] });
        }
      }
    }
  }

  return [...summaries.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Load every document carrying the given tag, across all registered
 * block types. Pre-resolves a display title + the current publish
 * window so the admin bulk view can render without another round
 * trip.
 */
export async function loadTagDetail({
  storage,
  blocks,
  tag,
}: LoadTagDetailOptions): Promise<TagDocument[]> {
  const results: TagDocument[] = [];

  for (const blockType of Object.keys(blocks)) {
    const docs = await storage.list(blockType);
    for (const doc of docs) {
      const tags = extractTags(doc);
      if (!tags.includes(tag)) continue;
      const data = doc.data as Record<string, unknown>;
      results.push({
        id: doc.id,
        blockType,
        title: resolveTitle(data),
        publishFrom: asString(data.publishFrom),
        publishTo: asString(data.publishTo),
        status: asString(data.status),
      });
    }
  }

  return results.sort((a, b) => a.title.localeCompare(b.title));
}

function extractTags(doc: Document): string[] {
  const data = doc.data as { tags?: unknown };
  if (!Array.isArray(data.tags)) return [];
  return data.tags.filter(
    (t): t is string => typeof t === 'string' && t.length > 0,
  );
}

function resolveTitle(data: Record<string, unknown>): string {
  const candidates = ['title', 'headerTitle', 'name', 'heading', 'slug'];
  for (const key of candidates) {
    const v = data[key];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return '(untitled)';
}

function asString(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}
