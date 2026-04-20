import type { StorageAdapter } from '@verevoir/storage';
import type { AdminGroup, BlockRegistry } from '../types.js';

export interface LoadAdminGroupsOptions {
  storage: StorageAdapter;
  blocks: BlockRegistry;
}

/**
 * Load every block type's documents from storage and pair them with
 * their registry entry, ready to feed into `<AdminProvider groups={...}>`.
 *
 * Server-only — call from your route's loader (e.g. an Astro
 * `.astro` frontmatter, a Next server component, or any handler
 * that already has access to a connected `StorageAdapter`).
 *
 * Singletons are returned with whatever documents currently exist
 * in storage; this helper does not seed missing singleton rows. Run
 * your seed step first if you need that guarantee.
 */
export async function loadAdminGroups({
  storage,
  blocks,
}: LoadAdminGroupsOptions): Promise<AdminGroup[]> {
  const blockTypes = Object.keys(blocks);
  const lists = await Promise.all(
    blockTypes.map((blockType) => storage.list(blockType)),
  );
  return blockTypes.map((blockType, i) => {
    const entry = blocks[blockType];
    return {
      blockType,
      label: entry.label ?? entry.block.name,
      singleton: !!entry.singleton,
      category: entry.category,
      documents: lists[i],
    };
  });
}
