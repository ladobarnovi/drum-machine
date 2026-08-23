"use client";

/**
 * What became of a beat that arrived by link: the machine now playing it, or
 * the reason it could not.
 */
export type SharedBeatStatus =
  | {
      kind: "loaded";
      /** How many channels the link filled. */
      channelCount: number;
      bpm: number;
      /**
       * Names of the samples that could not travel — uploads, which live only
       * as decoded audio in the page that decoded them. Empty for the ordinary
       * case of a beat built entirely from the bundled kits.
       */
      missingSamples: string[];
    }
  | { kind: "failed"; reason: string };

type SharedBeatNoticeProps = {
  status: SharedBeatStatus;
  onDismiss: () => void;
};

/**
 * Says that the machine is playing someone else's beat, and what didn't survive
 * the trip.
 *
 * Worth saying at all because opening a link replaces everything: the steps,
 * the kit and the tempo, on every channel including the ones the beat never
 * mentioned. That is the right behaviour — a link is the whole of what was
 * sent, and leaving the last kit running underneath it would be someone else's
 * samples in this beat's shape — but it is a large thing to happen without a
 * word, especially to a reader who followed a link expecting a drum machine
 * rather than a drum machine already loaded.
 *
 * Its own band between the header and the scrolling pane, the placement
 * `StepEditBanner` uses and for the same reason: a link is opened on the Main
 * page, and the panel that could otherwise report this is on Settings, which
 * is a page away on a phone and easy to miss on a desktop.
 *
 * `role="status"` rather than `alert` even for the failure: nothing is broken
 * and nothing is waiting on an answer — a link that would not open leaves the
 * machine exactly as it was, which is a working drum machine.
 */
export default function SharedBeatNotice({
  status,
  onDismiss,
}: SharedBeatNoticeProps) {
  const failed = status.kind === "failed";

  return (
    <div
      role="status"
      className={`bg-surface shrink-0 border-b ${
        failed ? "border-danger" : "border-select"
      }`}
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 md:px-6">
        <span
          aria-hidden
          className={`size-1.5 shrink-0 rounded-full ${
            failed ? "bg-danger" : "bg-select"
          }`}
        />

        <p className="min-w-0 flex-1 text-xs">
          {status.kind === "failed" ? (
            <>
              <span className="text-danger font-semibold">
                Couldn&rsquo;t open that beat
              </span>{" "}
              <span className="text-muted">— {status.reason}</span>
            </>
          ) : (
            <>
              <span className="text-select font-semibold">
                Shared beat loaded
              </span>{" "}
              <span className="text-muted">
                — {status.channelCount} channel
                {status.channelCount === 1 ? "" : "s"} at{" "}
                {Math.round(status.bpm)} BPM.
                {status.missingSamples.length > 0 && (
                  <>
                    {" "}
                    {status.missingSamples.length === 1
                      ? "One channel used an uploaded sample"
                      : `${status.missingSamples.length} channels used uploaded samples`}{" "}
                    that couldn&rsquo;t travel (
                    {status.missingSamples.join(", ")}) — those slots are empty,
                    with their steps intact.
                  </>
                )}
              </span>
            </>
          )}
        </p>

        <button
          type="button"
          onClick={onDismiss}
          className="border-edge hover:bg-raised shrink-0 cursor-pointer rounded border px-2.5 py-1 text-xs font-medium transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
