"use client";

import {
  channelDisplayName,
  clampLength,
  isDownbeat,
  STEPS_PER_BEAT,
  type Channel,
} from "@/lib/sequencer";

/**
 * Columns per line, and where a longer pattern wraps to a second one. Fixed
 * rather than sized to the busiest channel on screen: a shared cap is what
 * lets every cell be the same physical width regardless of which channels
 * happen to be loaded, which is what keeps step 5 of one row under step 5 of
 * another. Sixteen both because it is the machine's own default length and
 * because it is what a phone's width can hold at a size still worth looking
 * at — a row that instead grew to fit a 64-step channel would leave every
 * shorter one squeezed into slivers to match it.
 */
const OVERVIEW_COLUMNS = 16;

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
};

/**
 * Every loaded channel's pattern, one row apiece, so a snare can be read
 * against the kick it plays over instead of held in memory across two clicks
 * of the channel strip.
 *
 * Every line is a 16-column CSS grid, always — `repeat(OVERVIEW_COLUMNS,
 * minmax(0, 1fr))`, the same track list on every row, whatever that row's own
 * length is. Fixed-pixel cells were tried first and rejected: they read as
 * small on a panel with room to spare, and widening them just traded that for
 * a horizontal scrollbar on anything narrower than their fixed sum. A shared
 * *column count* rather than a shared column *width* is what actually keeps
 * step 5 of an 8-step row under step 5 of a 16-step one — both grids divide
 * the same 16 tracks across the same lane width, so both land on the same
 * offset, and each cell is free to stretch to fill whatever that lane's width
 * turns out to be, on a phone or a wide desktop rail alike.
 *
 * A pattern longer than `OVERVIEW_COLUMNS` wraps onto a second line under the
 * first rather than shrinking its cells to fit one — the column count is the
 * one thing not up for negotiation, so the row grows down instead of its
 * cells growing thin. Rows within `OVERVIEW_COLUMNS` show the columns they
 * don't reach as blank rather than a fifth colour, since a column past a
 * pattern's own length is not a step at all, just a cycle that has already
 * wrapped back to its start.
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
        const lineCount = Math.ceil(length / OVERVIEW_COLUMNS);
        const isSelected = channel.id === selectedChannelId;
        const displayName = channelDisplayName(channel);
        const playheadStep =
          currentTick === null ? null : currentTick % length;

        return (
          <button
            key={channel.id}
            type="button"
            onClick={() => onSelectChannel(channel.id)}
            aria-pressed={isSelected}
            aria-label={`Select channel ${displayName}`}
            title={displayName}
            className={`flex cursor-pointer items-start gap-3 rounded-md border px-2 py-1.5 text-left transition-colors ${
              isSelected
                ? "border-select bg-select-soft"
                : "border-transparent hover:bg-raised"
            }`}
          >
            <span className="w-16 shrink-0 truncate pt-0.5 text-xs font-medium">
              {displayName}
            </span>

            <span className="flex min-w-0 flex-1 flex-col gap-1">
              {Array.from({ length: lineCount }, (_, line) => {
                const lineStart = line * OVERVIEW_COLUMNS;

                return (
                  <span
                    key={line}
                    className="grid grid-cols-[repeat(16,minmax(0,1fr))] gap-1"
                  >
                    {Array.from({ length: OVERVIEW_COLUMNS }, (_, column) => {
                      const index = lineStart + column;
                      // A beat boundary gets a touch more room on its left,
                      // the same grouping `StepBeat` draws with a wider gap
                      // between beats. Counted within the line rather than
                      // from the pattern's start, though the two never
                      // disagree — a line always begins on a beat, since
                      // `OVERVIEW_COLUMNS` is itself a multiple of one.
                      const beatGap =
                        column > 0 && column % STEPS_PER_BEAT === 0
                          ? "ml-1.5"
                          : "";

                      if (index >= length) {
                        return (
                          <span
                            key={column}
                            aria-hidden
                            className={`h-4 sm:h-5 ${beatGap}`}
                          />
                        );
                      }

                      const step = channel.steps[index];
                      const downbeat = isDownbeat(index);

                      const surface = downbeat ? "bg-step-beat" : "bg-step";
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
                        <span
                          key={column}
                          aria-hidden
                          className={`h-4 rounded border sm:h-5 ${surface} ${border} ${fill} ${playhead} ${beatGap}`}
                        />
                      );
                    })}
                  </span>
                );
              })}
            </span>
          </button>
        );
      })}
    </div>
  );
}
