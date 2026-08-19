"use client";

import {
  useEffect,
  useId,
  useRef,
  type MouseEvent,
  type ReactNode,
} from "react";

type ModalProps = {
  /** The heading, and the dialog's accessible name. */
  title: string;
  /** The line under it, saying what the dialog is for. */
  subtitle?: string;
  /** Names the close buttons, e.g. "Close device settings". */
  closeLabel: string;
  onClose: () => void;
  /** The bar along the bottom — a Done button, a note, or both. */
  footer?: ReactNode;
  children: ReactNode;
};

/**
 * The shell both of the machine's dialogs are built from: a panel over a
 * dimmed page, with a titled header, a scrolling body, and a bar underneath.
 *
 * A real `<dialog>` opened with `showModal`, rather than the fixed-position
 * div with an `aria-modal` attribute on it that this replaced. That attribute
 * only ever told a screen reader the page behind was out of reach; nothing
 * made it true, so Tab walked straight out of the panel into a page the
 * listener's software was insisting did not exist — a dialog that announced
 * modality it did not have. `showModal` puts the element in the top layer,
 * where the browser makes the rest of the document inert for real, sends
 * Escape here, restores focus to whatever opened it on the way out, and paints
 * the backdrop itself. All of which is why the old dimming button is gone: it
 * was standing in for a `::backdrop` that now exists.
 */
export default function Modal({
  title,
  subtitle,
  closeLabel,
  onClose,
  footer,
  children,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  /**
   * The latest `onClose`, for the listeners below to call.
   *
   * They are hung once, on open, and must not be rebound afterwards — their
   * cleanup closes the dialog, so an effect that re-ran whenever the callers'
   * inline arrow got a new identity would shut the panel on the next render.
   */
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    /**
     * Escape, which the browser now routes to this element rather than to the
     * window. The default is prevented so the dialog stays open and React does
     * the closing, in that order: letting the browser close it first would
     * leave a hidden dialog that the state above still believes is on screen.
     */
    const handleCancel = (event: Event) => {
      event.preventDefault();
      onCloseRef.current();
    };

    /** Any other route to closed — so the state above cannot fall out of step
     *  with an element that has already gone. */
    const handleClose = () => onCloseRef.current();

    // Bound natively rather than through React's `onCancel`/`onClose` props:
    // neither event bubbles, which is exactly the case React's delegated
    // listeners are least reliable for, and there is nothing to gain by
    // routing a dialog's own events through the synthetic system.
    dialog.addEventListener("cancel", handleCancel);
    dialog.addEventListener("close", handleClose);

    /*
     * Noted before opening, because `showModal` is about to take the focus
     * away from it.
     *
     * A dialog closed by hand hands focus back to whatever opened it, and this
     * has to do that itself rather than leaning on it: React takes the element
     * out of the document as the state that renders it goes away, and the
     * `close()` below then runs against a node already detached — too late for
     * the browser to give the focus to anyone. Left alone it lands on the body,
     * and the keyboard is back at the top of the page.
     */
    const trigger = document.activeElement;

    // Opened here rather than through the `open` attribute, which would show
    // the panel without any of the modality: only `showModal` reaches the top
    // layer, and the top layer is the whole of what makes the page behind it
    // inert.
    dialog.showModal();

    /*
     * Where the caller wants the keyboard to start, if it says.
     *
     * After `showModal` rather than before, and by hand rather than through
     * React's `autoFocus`: that prop is applied as the child mounts, which is
     * before this effect runs, and `showModal` then puts the focus on the
     * first thing in the panel regardless — landing the keyboard on the close
     * button of a dialog whose whole top row is a search field.
     */
    dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();

    return () => {
      // Unhooked before closing, so the `close` this is about to fire cannot
      // run back into state that is already on its way out.
      dialog.removeEventListener("cancel", handleCancel);
      dialog.removeEventListener("close", handleClose);
      dialog.close();

      // Guarded for the opener that has gone in the meantime — the sample
      // library is raised from a slot that a pick can rebuild underneath it.
      if (trigger instanceof HTMLElement && trigger.isConnected) {
        trigger.focus();
      }
    };
  }, []);

  /**
   * A click on the dimmed surround. The backdrop belongs to the dialog rather
   * than being an element of its own, so a press on it lands on the dialog
   * itself — which nothing else can do, since the panel inside covers every
   * pixel of it.
   */
  const handleClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === dialogRef.current) onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      onClick={handleClick}
      aria-labelledby={titleId}
      // `p-0` matters: the padding a dialog carries by default would be part
      // of the element itself, and a click landing on it would read as a click
      // on the backdrop and shut the panel from just inside its own edge.
      className="bg-surface border-line text-fg m-auto max-h-[80vh] w-[calc(100%-2rem)] max-w-md flex-col overflow-hidden rounded-lg border p-0 shadow-lg open:flex"
    >
      <div className="border-line flex items-start gap-3 border-b p-4">
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="text-sm font-semibold">
            {title}
          </h2>
          {subtitle && (
            <p className="text-muted mt-0.5 truncate text-xs">{subtitle}</p>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="text-muted hover:bg-raised hover:text-fg -mt-1 shrink-0 cursor-pointer rounded px-2 py-1 text-lg leading-none"
        >
          ×
        </button>
      </div>

      <div className="quiet-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
        {children}
      </div>

      {footer && (
        <div className="border-line flex items-center justify-between gap-3 border-t p-3">
          {footer}
        </div>
      )}
    </dialog>
  );
}
