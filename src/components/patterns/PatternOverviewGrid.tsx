"use client";

import {
  channelDisplayName,
  clampLength,
  isDownbeat,
  STEPS_PER_BEAT,
  type Channel,
} from "@/lib/sequencer";

/**
 * Columns per row from `sm` up, and where a longer pattern wraps onto the
 * next one. Fixed rather than sized to the busiest channel on screen: a
 * shared cap is what lets every cell be the same physical width regardless of
 * which channels happen to be loaded, which is what keeps step 5 of one row
 * under step 5 of another. Sixteen because it is the machine's own default
 * length, so the common case is one unbroken row.
 */
const OVERVIEW_COLUMNS = 16;

/**
 * The same cap below `sm`, where a sixteen-wide row would divide a phone's
 * width into cells too small to aim a fingertip at. Half of `OVERVIEW_COLUMNS`
 * rather than some other number narrow enough to fit: both are multiples of
 * `STEPS_PER_BEAT`, which is what keeps a beat boundary a beat boundary at
 * either width — see the wrap math below.
 */
const OVERVIEW_COLUMNS_MOBILE = OVERVIEW_COLUMNS / 2;

type PatternOverviewGridProps = {
  /** All sixteen channel slots; only the loaded ones get a row. */
  channels: Channel[];
  selectedChannelId: string;
  /**
   * The transport's absolute tick, or null while stopped. Absolute rather than
   * wrapped, the same reason `useSequencer` counts it that way: two channels
   * with different lengths reach the same wall-clock moment at different
   * points in their own cycle, and only an absolute count lets each row work
   * out its own from it.
   */
  currentTick: number | null;
  onSelectChannel: (channelId: string) => void;
  /** A step click, scoped to whichever row's channel it landed on. */
  onToggleStep: (channelId: string, stepIndex: number) => void;
};

/**
 * Every loaded channel's pattern, one row apiece, so a snare can be read
 * against the kick it plays over instead of held in memory across two clicks
 * of the channel strip. Every step is its own button, so a pattern can be
 * shaped here directly rather than only read — a fill needs to see the kick
 * and the hat at once, and this is the one place that shows them both.
 *
 * A step click writes only that step, on whichever channel its row belongs
 * to, and leaves selection alone: reaching across the panel to fix a stray
 * hit shouldn't also drag the editor over to a different channel. The
 * channel name stays the way to select a row, the same click it always was.
 *
 * Every channel's steps sit in one CSS grid apiece — `repeat(OVERVIEW_COLUMNS,
 * minmax(0, 1fr))` from `sm` up, `repeat(OVERVIEW_COLUMNS_MOBILE, …)` below it
 * — rather than a JS-computed row per some fixed chunk: the grid's own
 * auto-flow is what wraps a channel past the column count onto the next row,
 * so a 20-step channel is simply handed 20 buttons and left to lay itself
 * out. A shared *column count* rather than a shared column *width* is what
 * keeps step 5 of an 8-step channel under step 5 of a 16-step one at the same
 * width — both grids divide the same tracks across the same lane, so both
 * land on the same offset, each cell free to stretch to fill whatever that
 * lane's width turns out to be.
 *
 * Sixteen columns divides a phone-width lane into cells too small to aim a
 * fingertip at, which is why the mobile count is half that: the row simply
 * wraps a step sooner rather than shrinking every cell to fit, or scrolling a
 * lane out from under the channel name beside it. Fixed-pixel cells
 * throughout were tried first and rejected for the opposite reason — they
 * read as small on a panel with room to spare, which is most of them, most of
 * the time.
 *
 * The beat-boundary gap below has to know, per cell, whether it is about to
 * become the first column of a row — which differs by breakpoint, since row
 * width does. A boundary that starts every row at both widths (index a
 * multiple of `OVERVIEW_COLUMNS`) never gets the gap; one that starts a row
 * only on the narrower grid (a multiple of `OVERVIEW_COLUMNS_MOBILE` but not
 * of `OVERVIEW_COLUMNS`) gets it only from `sm` up; every other boundary gets
 * it unconditionally. Both counts being multiples of `STEPS_PER_BEAT` is what
 * keeps that classification exhaustive — a boundary is never split across the
 * two in some other way.
 *
 * The playhead is marked per row rather than as one line down the panel, for
 * the same reason the grid is drawn per row and not shared: it stands at
 * `currentTick` modulo *that row's own* length, which is a different column
 * from a row of another length at the same instant. The two only walk
 * together when every loaded channel shares one length, which is the common
 * case and is exactly when a single shared line would have been
 * indistinguishable from this anyway.
 */
export default function PatternOverviewGrid({
  channels,
  selectedChannelId,
  currentTick,
  onSelectChannel,
  onToggleStep,
}: PatternOverviewGridProps) {
  const loaded = channels.filter(
    (channel) => channel.sample.status === "loaded",
  );

  if (loaded.length === 0) {
    return (
      <p className="text-muted text-xs">
        Load a sample on any channel to see its pattern here.
      </p>
    );
  }

  return (
    <div
      role="group"
      aria-label="All channel patterns"
      className="flex flex-col gap-2"
    >
      {loaded.map((channel) => {
        const length = clampLength(channel.length);
        const isSelected = channel.id === selectedChannelId;
        const displayName = channelDisplayName(channel);
        const playheadStep =
          currentTick === null ? null : currentTick % length;

        return (
          <div
            key={channel.id}
            className={`flex items-start gap-3 rounded-md border px-2 py-1.5 transition-colors ${
              isSelected
                ? "border-select bg-select-soft"
                : "border-transparent hover:bg-raised"
            }`}
          >
            <button
              type="button"
              onClick={() => onSelectChannel(channel.id)}
              aria-pressed={isSelected}
              aria-label={`Select channel ${displayName}`}
              title={displayName}
              className="w-16 shrink-0 cursor-pointer truncate pt-0.5 text-left text-xs font-medium"
            >
              {displayName}
            </button>

            {/*
              A flat grid rather than a JS-chunked one: `grid-auto-flow`
              wraps a channel past the column count on its own, so the column
              count is the only thing that needs to change per breakpoint —
              eight below `sm`, sixteen from there up. The channel name above
              is outside this span, so a wrapped row never carries it along.
            */}
            <span className="grid min-w-0 flex-1 grid-cols-[repeat(8,minmax(0,1fr))] content-start gap-1 sm:grid-cols-[repeat(16,minmax(0,1fr))]">
              {Array.from({ length }, (_, index) => {
                const step = channel.steps[index];
                const downbeat = isDownbeat(index);

                // See the class comment above for why this needs both counts:
                // a boundary that starts a row at both widths never gets the
                // gap, one that starts a row only on the narrower grid gets
                // it only from `sm` up, and every other boundary gets it
                // unconditionally.
                const beatBoundary = index % STEPS_PER_BEAT === 0;
                const startsRowAtEveryWidth = index % OVERVIEW_COLUMNS === 0;
                const startsRowOnMobileOnly =
                  index % OVERVIEW_COLUMNS_MOBILE === 0 &&
                  !startsRowAtEveryWidth;
                const beatGap = !beatBoundary
                  ? ""
                  : startsRowAtEveryWidth
                    ? ""
                    : startsRowOnMobileOnly
                      ? "sm:ml-1.5"
                      : "ml-1.5";

                const surface = downbeat
                  ? "bg-step-beat hover:bg-step-beat-hover"
                  : "bg-step hover:bg-step-hover";
                const border = step.on
                  ? "border-accent-soft"
                  : downbeat
                    ? "border-step-beat-edge"
                    : "border-step-edge";
                const fill = step.on ? "bg-accent" : "";
                const playhead =
                  playheadStep === index
                    ? "ring-select ring-2 ring-offset-1 ring-offset-surface"
                    : "";

                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => onToggleStep(channel.id, index)}
                    aria-pressed={step.on}
                    aria-label={`Step ${index + 1} of ${displayName}, ${
                      step.on ? "on" : "off"
                    }`}
                    className={`h-6 cursor-pointer rounded border transition-colors ${surface} ${border} ${fill} ${playhead} ${beatGap}`}
                  />
                );
              })}
            </span>
          </div>
        );
      })}
    </div>
  );
}
