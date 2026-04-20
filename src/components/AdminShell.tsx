import type { ReactNode } from 'react';
import type { AdminIdentity } from '../types.js';

export interface BreadcrumbCrumb {
  label: string;
  href?: string;
}

export interface AdminShellProps {
  /**
   * Path back to the admin home — clicked when the title in the
   * header is clicked. Default: `/admin`.
   */
  homePath?: string;
  /** Title or logo shown in the header. Pass a string for text,
   * or a ReactNode (e.g. `<img>` or inline SVG) for a logo. */
  title?: ReactNode;
  /** Breadcrumbs shown after the title */
  breadcrumbs?: BreadcrumbCrumb[];
  /** Currently signed-in user, shown in the header right side */
  identity?: AdminIdentity;
  /** Optional nav links shown in the header */
  navLinks?: Array<{ label: string; href: string }>;
  /**
   * If true, the body fills the viewport (no max-width container).
   * Use for editor screens with side-by-side preview.
   */
  wide?: boolean;
  /**
   * Optional content rendered in the header's right slot, after
   * identity and nav. Use for actions like "View site →".
   */
  headerActions?: ReactNode;
  /**
   * Optional sidebar slot rendered to the left of the main content.
   * Typically `<AdminSidebar />`, but the slot is generic — anything
   * you pass shows up there. When omitted, the body fills the
   * available width as before.
   *
   * The shell expects the sidebar to manage its own collapse/expand
   * state via the preferences provider, so the layout doesn't need
   * to know whether the sidebar is currently open.
   */
  sidebar?: ReactNode;
  children: ReactNode;
}

/**
 * Top-level chrome for the Verevoir admin. Provides the header,
 * breadcrumb, identity display, and a body container.
 *
 * The shell is opinionated about layout but unopinionated about
 * routing — consumers wire each route to a body. The body is
 * rendered as `children`.
 *
 * Theming: all colours, spacing, and fonts are controlled by CSS
 * custom properties (see `dist/styles/admin.css`). Override any
 * property at the `:root` or `.verevoir-admin` selector to retheme.
 *
 * Selectors: every element exposes a `data-*` attribute, no class
 * names that consumers need to lock onto. The included default
 * theme uses these attributes; consumers can write their own theme
 * the same way.
 */
export function AdminShell({
  homePath = '/admin',
  title = 'Admin',
  breadcrumbs,
  identity,
  navLinks,
  wide = false,
  headerActions,
  sidebar,
  children,
}: AdminShellProps) {
  return (
    <div
      className="verevoir-admin"
      data-admin-shell
      data-admin-wide={wide ? 'true' : undefined}
      data-admin-has-sidebar={sidebar ? 'true' : undefined}
    >
      <header data-admin-header>
        <div data-admin-header-inner>
          <div data-admin-header-left>
            <a href={homePath} data-admin-title>
              {title}
            </a>
            {breadcrumbs && breadcrumbs.length > 0 && (
              <nav aria-label="Breadcrumb" data-admin-breadcrumbs>
                {breadcrumbs.map((crumb, i) => (
                  <span key={i}>
                    <span data-admin-breadcrumb-divider>/</span>
                    {crumb.href ? (
                      <a href={crumb.href} data-admin-breadcrumb>
                        {crumb.label}
                      </a>
                    ) : (
                      <span data-admin-breadcrumb data-admin-breadcrumb-current>
                        {crumb.label}
                      </span>
                    )}
                  </span>
                ))}
              </nav>
            )}
          </div>

          <div data-admin-header-right>
            {navLinks && navLinks.length > 0 && (
              <nav aria-label="Admin sections" data-admin-nav>
                {navLinks.map((link) => (
                  <a key={link.href} href={link.href} data-admin-nav-link>
                    {link.label}
                  </a>
                ))}
              </nav>
            )}
            {headerActions && (
              <div data-admin-header-actions>{headerActions}</div>
            )}
            {identity && (
              <div data-admin-identity>
                <span data-admin-identity-name>
                  {identity.name ?? identity.email ?? identity.id}
                </span>
                {identity.roles && identity.roles.length > 0 && (
                  <span data-admin-identity-roles>
                    {identity.roles.join(', ')}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <div data-admin-body>
        {sidebar && <div data-admin-sidebar-slot>{sidebar}</div>}
        <main data-admin-main>{children}</main>
      </div>
    </div>
  );
}
