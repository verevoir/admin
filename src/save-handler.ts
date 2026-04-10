import type { StorageAdapter } from '@verevoir/storage';
import type { BlockRegistry } from './types.js';

export interface SaveRequestBody {
  id: string;
  blockType: string;
  data: Record<string, unknown>;
}

export interface SaveResult {
  status: number;
  body: Record<string, unknown>;
}

export interface CreateSaveHandlerOptions {
  storage: StorageAdapter;
  blocks: BlockRegistry;
}

/**
 * Pure save handler — takes a parsed request body, validates it
 * against the block registry, merges the new fields with the
 * existing document, and writes through the StorageAdapter.
 *
 * Framework-agnostic: each framework gets a thin adapter (e.g.
 * `@verevoir/admin/astro`) that wires this function to the
 * framework's request/response shape.
 *
 * Returns `{ status, body }` so the adapter can convert to a
 * Response. No exceptions thrown for expected error states (404,
 * validation, etc.) — only unexpected errors propagate.
 */
export function createSaveHandler({
  storage,
  blocks,
}: CreateSaveHandlerOptions) {
  return async function save(body: unknown): Promise<SaveResult> {
    if (!isSaveRequest(body)) {
      return {
        status: 400,
        body: {
          error: 'Invalid request body — expected { id, blockType, data }',
        },
      };
    }

    const entry = blocks[body.blockType];
    if (!entry) {
      return {
        status: 400,
        body: { error: `Unknown block type: ${body.blockType}` },
      };
    }

    // Load existing so we can preserve fields not modeled in the
    // schema (e.g. polymorphic `sections` arrays).
    const existing = await storage.get(body.id);
    if (!existing) {
      return {
        status: 404,
        body: { error: `Document not found: ${body.id}` },
      };
    }

    // Validate the schema-modeled fields. Unknown fields pass through
    // unchanged via the merge below.
    try {
      entry.block.validate(body.data);
    } catch (err) {
      return {
        status: 422,
        body: {
          error: 'Validation failed',
          details: err instanceof Error ? err.message : String(err),
        },
      };
    }

    const merged = {
      ...(existing.data as Record<string, unknown>),
      ...body.data,
    };

    const updated = await storage.update(body.id, merged);

    return {
      status: 200,
      body: { id: updated.id, updatedAt: updated.updatedAt.toISOString() },
    };
  };
}

function isSaveRequest(value: unknown): value is SaveRequestBody {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.blockType === 'string' &&
    !!v.data &&
    typeof v.data === 'object'
  );
}
