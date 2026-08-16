"use client";

import type { ReactNode } from "react";

type AccordionProps = {
  title: string;
  children: ReactNode;
  /** Whether the section starts open. Uncontrolled after that — the browser
   * owns the open state, same as it would for any other `<details>`. */
  defaultOpen?: boolean;
};

/**
 * A labelled, collapsible section built on `<details>` rather than tracked
 * state: opening one is not a fact anything else on the page needs to react
 * to, so there is nothing to gain from lifting it.
 */
export default function Accordion({
  title,
  children,
  defaultOpen = true,
}: AccordionProps) {
  return (
    <details className="border-line group rounded-md border" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm font-semibold select-none marker:content-none [&::-webkit-details-marker]:hidden">
        {title}

        <span className="text-muted transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>

      <div className="border-line flex flex-col gap-4 border-t p-3">
        {children}
      </div>
    </details>
  );
}
