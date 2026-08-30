"use client";

import {
  channelDisplayName,
  clampLength,
  isDownbeat,
  STEPS_PER_BEAT,
  type Channel,
} from "@/lib/sequencer";

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
 * Columns are steps, not proportions: a row of 32 gets narrower cells than a
 * row of 16, sharing the panel's own scale, rather than every row being
 * stretched to fill the same width — position stays comparable between rows
 * only if step 5 sits at the same offset in both, which stretching would
 * break. Rows shorter than the longest one on screen run out of steps before
 * the panel's own width does; what is left is blank rather than a fifth
 * colour, since it is not a step at all, just a cycle that has already
 * wrapped back to its start.
 *
 * The playhead is marked per row rather than as one line down the panel, for
 * the same reason: it stands at `currentTick` modulo *that row's own* length,
 * which is a different column from a row of another length at the same
 * instant. The two only walk together when every loaded channel shares one
 * length, which is the common case and is exactly when a single shared line
 * would have been indistinguishable from this anyway.
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

  const maxLength = Math.max(
    ...loaded.map((channel) => clampLength(channel.length)),
  );

  return (
    <div role="group" aria-label="All channel patterns" className="flex flex-col gap-1">
      {loaded.map((channel) => {
        const length = clampLength(channel.length);
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
            className={`flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1 text-left transition-colors ${
              isSelected
                ? "border-select bg-select-soft"
                : "border-transparent hover:bg-raised"
            }`}
          >
            <span className="w-16 shrink-0 truncate text-xs font-medium">
              {displayName}
            </span>

            <span className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
              {Array.from({ length: maxLength }, (_, index) => {
                // A beat boundary gets a touch more room on its left, the same
                // grouping `StepBeat` draws with a wider gap between beats.
                const beatGap =
                  index > 0 && index % STEPS_PER_BEAT === 0 ? "ml-1" : "";

                if (index >= length) {
                  return (
                    <span
                      key={index}
                      aria-hidden
                      className={`h-3.5 min-w-[3px] flex-1 ${beatGap}`}
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
                    key={index}
                    aria-hidden
                    className={`h-3.5 min-w-[3px] flex-1 rounded-sm border ${surface} ${border} ${fill} ${playhead} ${beatGap}`}
                  />
                );
              })}
            </span>
          </button>
        );
      })}
    </div>
  );
}
