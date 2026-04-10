# @verevoir/admin

Composable building blocks for a Verevoir-powered admin site. Mounts on top of [`@verevoir/storage`](https://www.npmjs.com/package/@verevoir/storage) and [`@verevoir/editor`](https://www.npmjs.com/package/@verevoir/editor) to give you a working admin in `npm install` minutes — with first-class slots for **page versioning**, **live preview**, and **user management**.

## What's in the box

- **`AdminShell`** — chrome (header, breadcrumbs, identity display, body container). Theming via CSS custom properties; selectors via data attributes — no class names you have to lock onto.
- **`DocumentList`** — grouped lists of documents per block type, with edit links.
- **`DocumentEditor`** — full editor: metadata form (`@verevoir/editor`'s `BlockEditor`), optional polymorphic sections, optional live preview iframe, save flow.
- **`SectionsEditor`** — polymorphic array editor for page sections (heterogeneous arrays where each item has a different shape).
- **`createSaveHandler`** — pure function. Validates the request, merges with the existing document, writes through your `StorageAdapter`. Framework-agnostic.
- **`createAstroSaveRoute`** (`@verevoir/admin/astro`) — Astro adapter for the save handler.

Plus first-class **slots** for features that aren't built into the toolkit but are reserved for the consumer to plug in:

- **`versions`** — a `VersionContainer` component rendered above the editor. Use it to wire up Verevoir's page versioning workflow (draft / published / archived, new version, publish, unpublish). The toolkit reserves the slot but doesn't ship an implementation — versioning is opinionated and depends on your storage shape.
- **`users`** — a `UsersContainer` component rendered as its own admin route. Use it to render user management on top of `@verevoir/access` + `@verevoir/accounts`.
- **`preview`** — function returning the public URL for a document. The editor renders a live preview iframe pointing at it.

## Quick start

```bash
npm install @verevoir/admin @verevoir/editor @verevoir/schema @verevoir/storage
```

```ts
// src/storage.ts
import { MemoryAdapter } from '@verevoir/storage';
export const storage = new MemoryAdapter();

// src/schema/index.ts
import { defineBlock, text } from '@verevoir/schema';
export const page = defineBlock({
  name: 'page',
  fields: { title: text('Title'), slug: text('Slug') },
});

// src/admin/config.ts — used by every admin route
import { storage } from '../storage';
import { page } from '../schema';

export const adminConfig = {
  storage,
  blocks: {
    page: {
      block: page,
      label: 'Pages',
      preview: (data) => '/' + (data.slug as string),
    },
  },
};
```

### Astro example

```astro
---
// src/pages/admin.astro
import { storage } from '@/storage';
import { page } from '@/schema';
import { AdminShell, DocumentList } from '@verevoir/admin';
import '@verevoir/admin/styles/admin.css';

export const prerender = false;

const docs = await storage.list('page');
---

<AdminShell title="My Site" client:only="react">
  <DocumentList
    groups={[{ blockType: 'page', entry: { block: page, label: 'Pages' }, documents: docs }]}
  />
</AdminShell>
```

```ts
// src/pages/api/admin/save.ts
import { createAstroSaveRoute } from '@verevoir/admin/astro';
import { storage } from '@/storage';
import { page } from '@/schema';

export const prerender = false;
export const POST = createAstroSaveRoute({
  storage,
  blocks: { page: { block: page } },
});
```

## Theming

`@verevoir/admin` is fully themable via CSS custom properties. Override any of these on `:root` or the `.verevoir-admin` selector:

| Variable | Default | What it controls |
|---|---|---|
| `--admin-bg` | `#f8fafc` | Page background |
| `--admin-surface` | `#ffffff` | Cards, forms |
| `--admin-text` | `#0f172a` | Body text |
| `--admin-text-muted` | `#64748b` | Secondary text |
| `--admin-accent` | `#ffae9c` | Buttons, focus rings |
| `--admin-radius` | `0.375rem` | Border radius |
| `--admin-font` | `Mulish, system-ui, ...` | Font family |
| `--admin-content-width` | `64rem` | Max content width |

The full list is in [`src/styles/admin.css`](src/styles/admin.css).

All elements expose `data-*` attributes for granular CSS targeting — no class names that consumers must learn or lock onto.

## Routing

The toolkit is **routing-agnostic**. Each admin route in your host framework (Astro, Next.js, Remix, Vite + React Router) renders an `AdminShell` with the appropriate component inside. There's no internal client-side router.

The conventional URL structure:

- `/admin` — `<DocumentList>` showing all block types
- `/admin/[blockType]/[id]` — `<DocumentEditor>` for one document
- `/api/admin/save` — POST endpoint that calls `createSaveHandler`

But you're free to use any structure you want — the components don't hardcode URLs.

## Auth

The toolkit is **auth-agnostic**. You configure auth at the route level (Astro middleware, Next middleware, etc.) and pass an `identity` prop to `AdminShell` so it can show the user in the header. See `@verevoir/access` for ready-made auth adapters.

## License

MIT
