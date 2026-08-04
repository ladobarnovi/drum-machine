"use client";

/**
 * Says why the machine won't start, at the top of the page where the answer is
 * wanted before anything below it is worth touching.
 *
 * The transport already greys its own button out and explains itself in the
 * rail, but below `lg` that rail is a closed drawer — so on a phone the only
 * clue would be a round button that quietly does nothing when pressed. This
 * states it once, in the flow of the page, at every width.
 *
 * `role="status"` rather than `alert`: nothing has gone wrong, and an empty kit
 * is simply where the machine starts, so interrupting a screen reader over it
 * would overstate the case. Polite still catches the moment that matters — the
 * last sample being removed while the page is open.
 */
export default function LoadSamplesNotice() {
  return (
    <div
      role="status"
      className="border-danger text-danger flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
    >
      <svg
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="size-5 shrink-0"
      >
        <path d="M10 3.5 L17.5 16.5 L2.5 16.5 Z" />
        <path d="M10 8.5 v3" />
        <circle cx="10" cy="14.25" r="0.1" fill="currentColor" />
      </svg>

      <span>No samples loaded. Load one on any channel to start playing.</span>
    </div>
  );
}
