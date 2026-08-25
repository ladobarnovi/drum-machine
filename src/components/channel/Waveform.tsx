"use client";

import { useCallback, useRef } from "react";

import { anchorFromEvent, type SampleSourceAnchor } from "./SampleSourceMenu";
import TrimHandle from "./TrimHandle";
import WaveformPlayhead from "./WaveformPlayhead";
import {
  formatSeconds,
  isSampleTrimmed,
  isSliced,
  sampleSpanSeconds,
  sliceBoundaries,
  sliceRegion,
  type SampleMode,
  type SampleState,
  type SliceCount,
} from "@/lib/sequencer";
import { onStrip } from "@/lib/waveform";

type WaveformProps = {
  sample: SampleState;
  /** Named on the strip's own control, which is only there while it is empty. */
  channelLabel: string;
  /** Raises the source menu from the empty strip. */
  onLoadRequest: (anchor: SampleSourceAnchor) => void;
  /** Whether that menu is up, and was raised from here. */
  menuOpen: boolean;
  /** Where playback starts, as a fraction of the whole file. */
  start: number;
  /** Where playback stops, as a fraction of the whole file. */
  end: number;
  /** Both arrive raw: the caller clamps each edge against the other. */
  onStartChange: (fraction: number) => void;
  onEndChange: (fraction: number) => void;
  /** Whether the region between the handles is read back to front. */
  reversed: boolean;
  /** Whether a hit plays the whole trimmed region or one slice of it. */
  mode: SampleMode;
  /** How many parts the region is divided into while slicing. */
  sliceCount: SliceCount;
  /**
   * The slice the step open for editing fires, or null while no step is open —
   * which is also every moment the channel is a one shot.
   */
  highlightSlice: number | null;
  /** Puts both edges back to the ends of the file. */
  onReset: () => void;
  /**
   * Reads how far into the file this channel is being heard, as a fraction of
   * the whole file, or null while it is silent. Called once a frame.
   */
  getPlayhead: () => number | null;
};

const VIEWBOX_HEIGHT = 100;

/**
 * Builds a filled, centre-mirrored outline: left-to-right on top, back along
 * the bottom.
 *
 * `reversed` reads the buckets from the far end instead of copying the array
 * round, since this already walks every one of them twice and a mirrored shape
 * is the same walk from the other side.
 */
function buildPath(peaks: number[], reversed: boolean): string {
  const half = VIEWBOX_HEIGHT / 2;
  const last = peaks.length - 1;
  const peakAt = (index: number) => peaks[reversed ? last - index : index];

  const top = peaks.map(
    (_, index) => `L ${index} ${half - peakAt(index) * half}`,
  );
  const bottom = [];
  for (let index = last; index >= 0; index--) {
    bottom.push(`L ${index} ${half + peakAt(index) * half}`);
  }
  return `M 0 ${half} ${top.join(" ")} ${bottom.join(" ")} Z`;
}

export default function Waveform({
  sample,
  channelLabel,
  onLoadRequest,
  menuOpen,
  start,
  end,
  onStartChange,
  onEndChange,
  reversed,
  mode,
  sliceCount,
  highlightSlice,
  onReset,
  getPlayhead,
}: WaveformProps) {
  /** The strip itself, which is what a pointer position is measured against. */
  const stripRef = useRef<HTMLDivElement | null>(null);

  const fractionAt = useCallback((clientX: number) => {
    const strip = stripRef.current;
    if (!strip) return 0;

    const { left, width } = strip.getBoundingClientRect();
    // Left unclamped: the edges are clamped where they are written, against
    // each other as well as against the file, and doing it twice would only
    // give the two a chance to disagree.
    return width > 0 ? (clientX - left) / width : 0;
  }, []);

  const frame =
    "border-line bg-panel flex h-16 md:h-24 items-center justify-center overflow-hidden rounded border";
  const message = "text-muted text-xs";

  if (sample.status === "loading") {
    return (
      <div className={frame}>
        <span className={message}>Loading…</span>
      </div>
    );
  }

  if (sample.status === "error") {
    return (
      <div className={frame}>
        <span className="text-danger text-xs">{sample.message}</span>
      </div>
    );
  }

  // A channel with nothing on it is the one case where the strip has nothing
  // to picture, so it becomes the way to fill it instead: this is the first
  // place anyone looks at an empty channel, and it is the largest target on
  // the card. Pressing it raises the same two choices the slot below does.
  if (sample.status === "empty") {
    return (
      <button
        type="button"
        onClick={(event) => onLoadRequest(anchorFromEvent(event, "waveform"))}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label={`Load a sample for channel ${channelLabel}`}
        className={`${frame} hover:bg-raised hover:border-edge focus-visible:outline-accent w-full cursor-pointer gap-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2`}
      >
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          aria-hidden="true"
          className="text-muted size-4"
        >
          <path d="M8 3.5 v9 M3.5 8 h9" />
        </svg>

        <span className={message}>Load a sample</span>
      </button>
    );
  }

  if (sample.peaks.length === 0) {
    return (
      <div className={frame}>
        <span className={message}>No waveform</span>
      </div>
    );
  }

  const trimmed = isSampleTrimmed(start, end);
  const spanSeconds = sampleSpanSeconds(start, end, sample.durationSeconds);
  const slicing = isSliced(mode);

  /** This strip's flip, since every call below is for the same picture. */
  const onThisStrip = (fraction: number) => onStrip(fraction, reversed);

  /**
   * A region of the file as a band on the strip. The two ends swap over when
   * the picture is mirrored, so which is the left edge is decided here rather
   * than assumed — a negative width would simply draw nothing.
   */
  const bandStyle = (from: number, to: number) => {
    const left = Math.min(onThisStrip(from), onThisStrip(to));
    const right = Math.max(onThisStrip(from), onThisStrip(to));
    return { left: `${left * 100}%`, width: `${(right - left) * 100}%` };
  };

  // The slice the open step fires, so the Position slider in the controls panel
  // has something to point at. Only ever set while slicing, but read through
  // the mode as well so a stale value can't outlive a switch back to one shot.
  const highlighted =
    slicing && highlightSlice !== null
      ? sliceRegion(start, end, sliceCount, highlightSlice)
      : null;

  // Which end of the file each end of the picture is. Reversed, the hit begins
  // at the file's later edge, so the handle on the left writes `end`: the two
  // are labelled for the sound — where it starts, where it stops — rather than
  // for the file, which is what a flipped strip is showing in the first place.
  const leading = reversed ? end : start;
  const trailing = reversed ? start : end;
  const onLeadingChange = reversed ? onEndChange : onStartChange;
  const onTrailingChange = reversed ? onStartChange : onEndChange;

  return (
    <div className="flex flex-col gap-1.5">
      {/*
        The handles sit outside the strip rather than in it, because the strip
        clips its children to its rounded corners: a handle parked at either end
        of the file would otherwise be shown as half a line.
      */}
      <div className="relative" ref={stripRef}>
        <div className={frame}>
          <svg
            viewBox={`0 0 ${sample.peaks.length} ${VIEWBOX_HEIGHT}`}
            // Stretch freely: the strip is a shape overview, not a to-scale plot.
            preserveAspectRatio="none"
            // Spelt out, because the flip is the only thing that says the
            // sample is reversed to anyone who cannot see the shape turn round.
            aria-label={`Waveform for ${sample.name}${reversed ? ", reversed" : ""}`}
            role="img"
            className="text-accent h-full w-full"
          >
            <line
              x1={0}
              y1={VIEWBOX_HEIGHT / 2}
              x2={sample.peaks.length}
              y2={VIEWBOX_HEIGHT / 2}
              stroke="currentColor"
              strokeWidth={0.5}
              opacity={0.35}
              vectorEffect="non-scaling-stroke"
            />
            <path d={buildPath(sample.peaks, reversed)} fill="currentColor" />
          </svg>

          {/*
            What is trimmed away is washed out rather than hidden, so the shape
            of the whole file stays readable behind the handles — which is what
            makes it possible to see the transient you are cutting towards.
          */}
          <div
            aria-hidden
            className="bg-surface/70 pointer-events-none absolute inset-y-0 left-0"
            style={{ width: `${onThisStrip(leading) * 100}%` }}
          />
          <div
            aria-hidden
            className="bg-surface/70 pointer-events-none absolute inset-y-0 right-0"
            style={{ width: `${(1 - onThisStrip(trailing)) * 100}%` }}
          />

          {/*
            The slice the open step fires, lit behind the shape so the Position
            slider in the controls panel has something on screen to mean. In
            `--select`, the colour of whatever is being looked at, and washed
            right down: it sits under the whole waveform rather than beside it,
            so anything stronger would recolour the shape it is meant to locate.
          */}
          {highlighted && (
            <div
              aria-hidden
              className="bg-select/20 pointer-events-none absolute inset-y-0"
              style={bandStyle(highlighted.start, highlighted.end)}
            />
          )}

          {/*
            Where the cuts fall. Hairlines in the foreground colour rather than
            in either of the two colours already on the strip: the accent is the
            waveform itself and `--select` is the handles and the band above, so
            a divider taking either would read as one of those rather than as
            the grid the slices are counted on.
          */}
          {slicing &&
            sliceBoundaries(start, end, sliceCount).map((boundary) => (
              <span
                key={boundary}
                aria-hidden
                className="bg-fg/30 pointer-events-none absolute inset-y-0 w-px"
                style={{ left: `${onThisStrip(boundary) * 100}%` }}
              />
            ))}

          {/* After the wash, so the line stays at full strength as it crosses
              the region — and inside the strip, which clips it: unlike a handle
              it never sits at the very edge, since it only exists between the
              two of them. */}
          <WaveformPlayhead getPlayhead={getPlayhead} reversed={reversed} />

          {/* How long the channel now plays for, which is the trimmed span
              rather than the file's own length — or, once it is sliced, how
              long one of those parts lasts and how many there are, since that
              is what a hit is from then on. Never in the way of a handle:
              nothing here takes the pointer. Read in the same unit as the
              envelope times, so a hit cut to a few milliseconds says so rather
              than rounding away to nothing. */}
          <span className="bg-surface/70 text-muted pointer-events-none absolute right-1.5 bottom-1 rounded px-1 text-[10px] tabular-nums">
            {slicing
              ? `${formatSeconds(spanSeconds / sliceCount)} × ${sliceCount}`
              : formatSeconds(spanSeconds)}
          </span>
        </div>

        {/* Both work in strip fractions and hand one back; the conversion at
            the boundary is what leaves the handles knowing nothing about which
            way round the file is being read. */}
        <TrimHandle
          edge="start"
          position={onThisStrip(leading)}
          seconds={onThisStrip(leading) * sample.durationSeconds}
          onChange={(fraction) => onLeadingChange(onThisStrip(fraction))}
          fractionAt={fractionAt}
        />

        <TrimHandle
          edge="end"
          position={onThisStrip(trailing)}
          seconds={onThisStrip(trailing) * sample.durationSeconds}
          onChange={(fraction) => onTrailingChange(onThisStrip(fraction))}
          fractionAt={fractionAt}
        />
      </div>
    </div>
  );
}
