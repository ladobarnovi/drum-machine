"use client";

type PlayButtonProps = {
  isPlaying: boolean;
  /** False when no channel has a sample loaded yet. */
  canPlay: boolean;
  onTogglePlay: () => void;
};

/**
 * The transport's play control as a single round button, for the header below
 * `xl` — where the left rail, and the Play button on it, is a closed drawer.
 * Without it, starting the machine on a phone means opening a drawer first to
 * reach the one control the machine is useless without.
 *
 * Hidden from `xl` up, like `SidebarTab`, rather than left to the page to hide:
 * it exists for the breakpoint where the rail is away, so it carries that fact
 * itself instead of every use site having to remember it.
 *
 * Icon-only, because a third label beside Save and Recall is more than a phone
 * header has room for, and because play and pause need no reading. The
 * accessible name says what a press will do rather than what the machine is
 * currently doing, which is the question a button answers.
 */
export default function PlayButton({
  isPlaying,
  canPlay,
  onTogglePlay,
}: PlayButtonProps) {
  const label = isPlaying ? "Stop" : "Play";

  return (
    <button
      type="button"
      onClick={onTogglePlay}
      // Stay enabled while playing so the transport can always be stopped —
      // the same rule the rail's own button follows.
      disabled={!isPlaying && !canPlay}
      aria-label={label}
      title={
        !isPlaying && !canPlay
          ? "Load a sample on any channel to start."
          : label
      }
      className="bg-invert text-on-invert flex size-10 shrink-0 items-center justify-center rounded-full transition-opacity disabled:cursor-not-allowed disabled:opacity-40 xl:hidden"
    >
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
        className="size-4"
      >
        {isPlaying ? (
          <>
            <rect x="5" y="4" width="3.5" height="12" rx="1" />
            <rect x="11.5" y="4" width="3.5" height="12" rx="1" />
          </>
        ) : (
          // Balanced on the triangle's centroid rather than its bounding box:
          // centring the box leaves a triangle looking like it leans left.
          <path d="M7 4.5 L16 10 L7 15.5 Z" />
        )}
      </svg>
    </button>
  );
}
