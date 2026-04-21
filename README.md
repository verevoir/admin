# @verevoir/admin

Composable admin-UI building blocks. Mounts on top of [`@verevoir/storage`](https://www.npmjs.com/package/@verevoir/storage) and [`@verevoir/editor`](https://www.npmjs.com/package/@verevoir/editor) to give you a working content admin — shell, sidebar, document list, document editor, sections editor, tag scheduler — with zero opinion about routing, auth, or deployment target.

```bash
npm install @verevoir/admin @verevoir/editor @verevoir/schema @verevoir/storage
```

## What's in the box

### Layout and shell

- **`AdminLayout`** — persistent React tree that wraps every admin page. Owns the sidebar, context providers, and a slot for page content. Lets consumers compose SPA-style navigation with the sidebar mounted once.
- **`AdminShell`** — chrome (header, breadcrumbs, identity display, body container). Used by `AdminLayout` or directly if you want a simpler shell.
- **`AdminSidebar`** — categorised navigation of block types, with an inline filter, collapse state persisted via preferences context, and singleton vs collection handling.

### Context

- **`AdminProvider`** — shares groups, base path, current path, and filter text across every admin component below it.
- **`AdminPreferencesProvider`** — persists per-user admin preferences (sidebar collapsed, expanded type IDs) via localStorage.
- **`useAdminGroups`**, **`useAdminBasePath`**, **`useAdminCurrentPath`**, **`useAdminFilter`**, **`useFilteredGroups`**, **`useSidebarOpen`**, **`useExpandedTypes`** — typed hooks for everything the providers expose.

### Document UI

- **`DocumentList`** — filtered, grouped listing of documents per block type with edit links.
- **`DocumentEditor`** — the full editor: metadata form (via `@verevoir/editor`'s `BlockEditor`), polymorphic sections, optional live preview iframe, save flow, auto-save for structural changes.
- **`SectionsEditor`** — polymorphic page-section editor with drag-and-drop reordering and stacked move-up / move-down controls.

### Tag scheduling

- **`TagList`** — listing of every tag in use across the registered block types with counts.
- **`TagScheduler`** — bulk-edit form: set `publishFrom` / `publishTo` across every doc carrying a tag. Denied docs (where `canEdit` returns false) are shown greyed out with a lock indicator.

### Save handler

- **`createSaveHandler`** — framework-agnostic function. Validates the request, merges with the existing document, writes through your `StorageAdapter`.
- **`createAstroSaveRoute`** (`@verevoir/admin/astro`) — thin Astro wrapper around the save handler.

### Server helpers (`@verevoir/admin/server`)

- **`loadAdminGroups({ storage, blocks })`** — serialisable view model for the sidebar: one group per block type with its docs. Pass the result into `AdminLayout`'s `groups` prop.
- **`loadTagsSummary({ storage, blocks })`** — every tag in use across registered block types with counts + which types it spans.
- **`loadTagDetail({ storage, blocks, tag })`** — every doc carrying the given tag, with title + publish window.

Import only what you need; the server subpath stays out of the client bundle.

## Quick start (Astro)

```astro
---
// src/pages/admin.astro
import { loadAdminGroups } from '@verevoir/admin/server';
import '@verevoir/admin/styles/admin.css';
import { storage } from '@/storage';
import { blocks } from '@/schema/registry';
import { AdminHomeIsland } from '@/admin/AdminHomeIsland';

export const prerender = false;
const groups = await loadAdminGroups({ storage, blocks });
---

<html lang="en">
  <body>
    <AdminHomeIsland client:only="react" groups={groups} basePath="/admin" currentPath={Astro.url.pathname} />
  </body>
</html>
```

```tsx
// src/admin/AdminHomeIsland.tsx
import { AdminLayout, DocumentList } from '@verevoir/admin';
import type { AdminGroup } from '@verevoir/admin';

export function AdminHomeIsland({ groups, basePath, currentPath }) {
  return (
    <AdminLayout
      groups={groups}
      basePath={basePath}
      currentPath={currentPath}
      shell={{ title: 'My Admin' }}
    >
      <DocumentList />
    </AdminLayout>
  );
}
```

```ts
// src/pages/api/admin/save.ts
import { createAstroSaveRoute } from '@verevoir/admin/astro';
import { storage } from '@/storage';
import { blocks } from '@/schema/registry';

export const prerender = false;
export const POST = createAstroSaveRoute({ storage, blocks });
```

A full working consumer: [Verevoir starter](https://github.com/verevoir/astro-sanity-starter).

## Block registry

`AdminLayout` expects a registry of block types in a specific shape:

```ts
import type { BlockRegistry } from '@verevoir/admin';

export const blocks: BlockRegistry = {
  page: {
    block: pageBlockDefinition,
    label: 'Pages',
    category: 'Content',
    preview: (data) => `/${data.slug ?? ''}`,
  },
  siteConfig: {
    block: siteConfigBlockDefinition,
    label: 'Site config',
    category: 'Configuration',
    singleton: true,
  },
};
```

`category` groups block types in the sidebar (preserves order-of-first-appearance). `preview` returns a public URL; when set, the editor shows a side-by-side preview iframe. `singleton: true` for single-instance block types like site config.

## Theming

Fully themable via CSS custom properties. Override any of these on `:root` or the `.verevoir-admin` selector:

| Variable                | Default                  | What it controls     |
| ----------------------- | ------------------------ | -------------------- |
| `--admin-bg`            | `#f8fafc`                | Page background      |
| `--admin-surface`       | `#ffffff`                | Cards, forms         |
| `--admin-text`          | `#0f172a`                | Body text            |
| `--admin-text-muted`    | `#64748b`                | Secondary text       |
| `--admin-accent`        | `#ffae9c`                | Buttons, focus rings |
| `--admin-radius`        | `0.375rem`               | Border radius        |
| `--admin-font`          | `Mulish, system-ui, ...` | Font family          |
| `--admin-content-width` | `64rem`                  | Max content width    |

Full list in [`src/styles/admin.css`](src/styles/admin.css). Every element exposes `data-*` attributes for granular CSS targeting — no class names to lock onto.

The starter ships an alternative dark "glass" theme; see its `src/styles/admin-theme.css` for what a substantial override looks like.

## Design posture

- **Routing-agnostic.** Each admin route in your host framework (Astro, Next.js, Remix, Vite + React Router) renders an `AdminLayout` with the appropriate content. The toolkit doesn't ship its own router.
- **Auth-agnostic.** Configure auth at the route level (middleware) and pass an `identity` prop to `AdminShell`. Components like `TagScheduler` accept `canEdit` callbacks so the host owns the policy check. `@verevoir/access` pairs naturally but isn't required.
- **Storage-agnostic.** Any `StorageAdapter` works. Components take data as props and call consumer-provided save handlers; the toolkit never touches storage directly.
- **Composable.** You can use `AdminShell` + `DocumentList` alone for a minimal admin, or bolt in `DocumentEditor` + `SectionsEditor` + `TagScheduler` as your content model grows.

## See it in a real app

The [Verevoir starter](https://github.com/verevoir/astro-sanity-starter) wires every component from this package into a working Astro admin with auth, tag scheduling, and a glass theme.

## Docs

- [Getting started](https://verevoir.io/docs/getting-started)
- [Integration guide](https://verevoir.io/docs/integration)

## License

MIT
