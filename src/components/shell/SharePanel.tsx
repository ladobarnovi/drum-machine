"use client";

import { useEffect, useRef, useState } from "react";

import RailGroup from "@/components/ui/RailGroup";

/** How long Copy confirms for, matching `SnapshotControls`' own Save. */
const COPIED_LABEL_MS = 1200;

type SharePanelProps = {
  /** Builds the link for whatever the machine is playing right now. */
  onBuildLink: () => Promise<string>;
  /** Hands a pasted link to the machine to load. */
  onImportLink: (value: string) => void;
  /**
   * False while there is nothing worth sending — no sample loaded anywhere and
   * no step switched on. A link to silence is a link nobody wants to receive.
   */
  canShare: boolean;
  /** Why the last pasted link didn't load, or null after one that did. */
  importError: string | null;
};

/**
 * Sending a beat to someone, and opening one they sent.
 *
 * In the controls rail rather than beside the pattern slots, because what
 * travels is the machine as it stands — the kit, the tempo and the swing along
 * with the steps — and this rail is already where everything that acts on the
 * whole machine lives. A slot in a bank is the wrong unit: it holds no kit of
 * its own (see `lib/patterns.ts`), so a link built from one would arrive
 * playing whatever the receiving machine happened to have loaded.
 *
 * Both directions in one band, because they are the same feature seen from
 * either end, and because the paste field is the answer to the one failure the
 * link itself cannot prevent: something in the middle — a chat client wrapping
 * a line, a forum eating a fragment — handing over a URL that no longer opens.
 */
export default function SharePanel({
  onBuildLink,
  onImportLink,
  canShare,
  importError,
}: SharePanelProps) {
  const [copied, setCopied] = useState(false);
  const [building, setBuilding] = useState(false);
  /** The link itself, shown only when the clipboard refused it. */
  const [fallbackLink, setFallbackLink] = useState<string | null>(null);
  const [pasted, setPasted] = useState("");

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackRef = useRef<HTMLInputElement>(null);

  // Dropped on unmount, so a pending confirmation can't set state on a button
  // that has gone — the same guard `SnapshotControls` keeps over its own.
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Selected as it appears, so a reader who has just been told to copy it by
  // hand only has to press one chord rather than drag across a long string.
  useEffect(() => {
    if (fallbackLink) fallbackRef.current?.select();
  }, [fallbackLink]);

  const handleCopy = async () => {
    setBuilding(true);
    setFallbackLink(null);

    try {
      const url = await onBuildLink();

      /*
       * The clipboard can refuse for reasons that have nothing to do with this
       * app — an insecure origin, a permission the browser declined, a platform
       * with no clipboard to write to. None of them mean the link is bad, so a
       * refusal falls back to showing it rather than reporting a failure.
       */
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        setFallbackLink(url);
        return;
      }

      setCopied(true);
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), COPIED_LABEL_MS);
    } finally {
      setBuilding(false);
    }
  };

  const handleImport = () => {
    const value = pasted.trim();
    if (!value) return;

    onImportLink(value);
    setPasted("");
  };

  return (
    <RailGroup title="Share">
      <button
        type="button"
        onClick={handleCopy}
        disabled={!canShare || building}
        className="border-edge hover:bg-raised w-full cursor-pointer rounded-md border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      >
        {building ? "Building…" : copied ? "Copied" : "Copy link"}
      </button>

      <p className="text-muted text-xs">
        {canShare
          ? "Steps, kit, tempo and swing. Uploaded samples can't travel — those slots arrive empty."
          : "Load a sample or write a step to have something to share."}
      </p>

      {fallbackLink && (
        <div className="flex flex-col gap-1">
          {/* Not an error: the link is fine, the clipboard just wouldn't take
              it. Said as an instruction rather than a failure, because copying
              it by hand is all that is left to do. */}
          <label className="text-muted flex flex-col gap-1 text-xs">
            Copy this link
            <input
              ref={fallbackRef}
              type="text"
              readOnly
              value={fallbackLink}
              onFocus={(event) => event.currentTarget.select()}
              className="border-edge bg-field w-full rounded border px-2 py-1 text-xs"
            />
          </label>
        </div>
      )}

      <label className="text-muted flex flex-col gap-1 text-xs">
        Or open one
        <input
          type="text"
          value={pasted}
          onChange={(event) => setPasted(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            // Only Enter, so nothing else typed into the field is swallowed —
            // the rule every key handler in the machine follows.
            event.preventDefault();
            handleImport();
          }}
          placeholder="Paste a beat link"
          aria-label="Paste a beat link"
          aria-describedby={importError ? "share-import-error" : undefined}
          aria-invalid={importError ? true : undefined}
          className="border-edge bg-field w-full rounded border px-2 py-1 text-xs"
        />
      </label>

      <button
        type="button"
        onClick={handleImport}
        disabled={pasted.trim() === ""}
        className="border-edge hover:bg-raised w-full cursor-pointer rounded-md border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      >
        Load beat
      </button>

      {importError && (
        <p
          id="share-import-error"
          role="status"
          className="text-danger text-xs"
        >
          {importError}
        </p>
      )}
    </RailGroup>
  );
}
