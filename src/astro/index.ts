/**
 * Astro adapter for @verevoir/admin.
 *
 * Provides a thin wrapper around `createSaveHandler` that exposes
 * an Astro-shaped `APIRoute`. Use it in your Astro API endpoint:
 *
 *   // src/pages/api/admin/save.ts
 *   import { createAstroSaveRoute } from '@verevoir/admin/astro';
 *   import { storage } from '../../../storage';
 *   import { blocks } from '../../../schema/registry';
 *
 *   export const prerender = false;
 *   export const POST = createAstroSaveRoute({ storage, blocks });
 *
 * The exported route handles request parsing, calls the pure save
 * handler, and converts the result to a `Response`.
 */

import { createSaveHandler } from '../save-handler.js';
import type { CreateSaveHandlerOptions } from '../save-handler.js';

interface AstroAPIContext {
  request: Request;
}

export function createAstroSaveRoute(options: CreateSaveHandlerOptions) {
  const save = createSaveHandler(options);

  return async function POST(context: AstroAPIContext): Promise<Response> {
    let body: unknown;
    try {
      body = await context.request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await save(body);
    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers: { 'Content-Type': 'application/json' },
    });
  };
}
