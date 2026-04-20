/**
 * Drag-handle "grip" icon — two columns of five dots, the conventional
 * affordance for a drag-to-reorder control. Inherits `currentColor` so
 * it tints to the surrounding text colour and can be themed via the
 * wrapper's `color`.
 */
export function GripIcon() {
  return (
    <svg
      viewBox="0 0 12 20"
      width="12"
      height="20"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="3" cy="3" r="1.2" />
      <circle cx="9" cy="3" r="1.2" />
      <circle cx="3" cy="7" r="1.2" />
      <circle cx="9" cy="7" r="1.2" />
      <circle cx="3" cy="11" r="1.2" />
      <circle cx="9" cy="11" r="1.2" />
      <circle cx="3" cy="15" r="1.2" />
      <circle cx="9" cy="15" r="1.2" />
      <circle cx="3" cy="19" r="1.2" />
      <circle cx="9" cy="19" r="1.2" />
    </svg>
  );
}
