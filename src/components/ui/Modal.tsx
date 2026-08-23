"use client";

import {
  useEffect,
  useId,
  useRef,
  type MouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type ModalProps = {
  /** The heading, and the dialog's accessible name. */
  title: string;
  /** The line under it, saying what the dialog is for. */
  subtitle?: string;
  /** Names the close buttons, e.g. "Close settings". */
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

    /*
     * Any other route to closed — so the state above cannot fall out of step
     * with an element that has already gone.
     *
     * Guarded on the element's own state, because `close()` does not announce
     * itself on the spot: it queues a task, and the event arrives whenever the
     * browser gets to it. The teardown below closes and the setup immediately
     * reopens — StrictMode in development does that pair on every mount, and a
     * Fast Refresh does it again on every edit — so a close asked for by a
     * previous life can land here after the panel has already been reopened,
     * and shut a dialog the reader has only just asked for. Chromium currently
     * drops that event when the pair happens inside one task; that is a
     * courtesy, not a promise, and it is not one every build makes.
     *
     * An open dialog is therefore evidence that this event is about a life
     * that has already ended, and the state above should be left alone.
     */
    const handleClose = () => {
      if (dialog.open) return;
      onCloseRef.current();
    };

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
     * Where the keyboard starts.
     *
     * The caller's choice first, if it marked one. After `showModal` rather
     * than before, and by hand rather than through React's `autoFocus`: that
     * prop is applied as the child mounts, which is before this effect runs,
     * and `showModal` then puts the focus on the first thing in the panel
     * regardless — landing the keyboard on the close button of a dialog whose
     * whole top row is a search field.
     *
     * Failing that, the first thing that will take it. `showModal` is supposed
     * to see to this by itself and mostly does, but a dialog opened while
     * nothing on the page was focused — from a keyboard shortcut rather than
     * from a button — can come up with the focus still on the body, inside a
     * modal that will not let it back out to anything else.
     */
    const marked = dialog.querySelector<HTMLElement>("[data-autofocus]");
    if (marked) {
      marked.focus();
    } else if (!dialog.contains(document.activeElement)) {
      dialog.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
    }

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
   * Whether the press that is currently in flight started on the surround.
   *
   * A `click` is reported against the nearest common ancestor of where the
   * button went down and where it came up, so a drag that begins on a word
   * inside the panel and releases past its edge — the ordinary way anyone
   * selects a line of text — arrives here indistinguishable from a press on
   * the backdrop. Dismissing on the release alone throws the dialog away
   * mid-sentence. The press is what carries the intent, so it is the press
   * that is remembered.
   */
  const pressedOnBackdropRef = useRef(false);

  const handlePointerDown = (event: MouseEvent<HTMLDialogElement>) => {
    pressedOnBackdropRef.current = event.target === dialogRef.current;
  };

  /**
   * A click on the dimmed surround. The backdrop belongs to the dialog rather
   * than being an element of its own, so a press on it lands on the dialog
   * itself — which nothing else can do, since the panel inside covers every
   * pixel of it.
   *
   * Both ends of the press have to have been out there: a release on the
   * surround only dismisses if that is where the finger went down, so a stray
   * click arriving on a panel that has just opened cannot take it straight
   * back off the screen.
   */
  const handleClick = (event: MouseEvent<HTMLDialogElement>) => {
    const pressedOnBackdrop = pressedOnBackdropRef.current;
    pressedOnBackdropRef.current = false;

    if (pressedOnBackdrop && event.target === dialogRef.current) onClose();
  };

  /*
   * Rendered into the body rather than where it was written.
   *
   * The top layer decides what paints over what, but it does not exempt an
   * element from its ancestors: a `<dialog>` still inherits their `display`,
   * and every caller of this sits inside a rail that is `display: none`
   * whenever its page is not the one showing below `xl`. Left in place, the
   * panel opened from the `?` key on the Main page took the top layer and made
   * the document inert for real — while painting nothing, because a hidden
   * ancestor had already collapsed it to nothing. An invisible modal with the
   * whole app dead behind it, and no visible way back out.
   *
   * The body is the one parent that can never be hidden out from under it, and
   * a dialog owes nothing to where it was declared: it is positioned by the
   * viewport and painted in the top layer either way.
   */
  const panel = (
    <dialog
      ref={dialogRef}
      onPointerDown={handlePointerDown}
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

  // Guarded for the server, where there is no body to portal into. Nothing
  // renders a Modal until something has been clicked, so this only ever holds
  // on a prerender that could not have shown one anyway.
  if (typeof document === "undefined") return null;

  return createPortal(panel, document.body);
}
