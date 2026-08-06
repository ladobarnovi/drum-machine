"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

import {
  formatSeconds,
  isSampleTrimmed,
  sampleSpanSeconds,
  type SampleState,
} from "@/lib/sequencer";

type WaveformProps = {
  sample: SampleState;
  /** Where playback starts, as a fraction of the whole file. */
  start: number;
  /** Where playback stops, as a fraction of the whole file. */
  end: number;
  /** Both arrive raw: the caller clamps each edge against the other. */
  onStartChange: (fraction: number) => void;
  onEndChange: (fraction: number) => void;
  /** Whether the region between the handles is read back to front. */
  reversed: boolean;
  onReversedChange: (reversed: boolean) => void;
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
 * How far one press of an arrow key moves a handle, as a fraction of the file.
 *
 * A hundredth of the sample per press, so a handle crosses the strip in a
 * hundred presses rather than a thousand; the modifier below is what a
 * transient is actually placed with, and is offered for the same reason the
 * step grid offers Shift — a control reachable only by dragging is not one
 * every input device can work.
 */
const KEY_STEP = 0.01;
const FINE_KEY_STEP = 0.001;

/**
 * A fraction of the file as a fraction of the strip, and back again — the same
 * flip either way, which is why one function does both directions.
 *
 * Reversing turns the picture round without touching the trim: `start` and
 * `end` go on meaning the same two points of the file they always did, and the
 * same audio goes on playing. It is only where those points *are shown* that
 * moves, and everything drawn on the strip goes through here so that the shape,
 * the handles and the line following the hit can never be mirrored
 * independently of one another.
 */
function onStrip(fraction: number, reversed: boolean): number {
  return reversed ? 1 - fraction : fraction;
}

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

type TrimHandleProps = {
  edge: "start" | "end";
  /**
   * Where this handle sits, as a fraction of the strip — which is the file read
   * left to right, or the file read backwards once it has been reversed.
   */
  position: number;
  /** How far into the strip that is, for the readout a screen reader speaks. */
  seconds: number;
  onChange: (fraction: number) => void;
  /** Where a pointer at `clientX` falls along the strip, as a fraction. */
  fractionAt: (clientX: number) => number;
};

/**
 * One edge of the played region, dragged along the strip.
 *
 * A div rather than an input: a range slider cannot be laid over a waveform at
 * an arbitrary height, and two of them side by side cannot express a pair of
 * edges that may not cross. So it carries the slider role by hand, which is
 * also what gets it the arrow keys — the drag is the gesture this is for, but
 * it must not be the only way in.
 */
function TrimHandle({
  edge,
  position,
  seconds,
  onChange,
  fractionAt,
}: TrimHandleProps) {
  /**
   * How far the handle sat from the pointer when it was grabbed. Dragging moves
   * it by that much less, so the edge tracks the pointer's own travel rather
   * than jumping under it — the grab area is wider than the line it draws, and
   * without this every press would first snap the edge to the middle of it.
   */
  const grabOffsetRef = useRef(0);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    // Anything but the primary button is somebody else's gesture.
    if (event.button !== 0) return;

    // Captured so a drag that runs off the strip — or off the card — keeps
    // reporting here, and focused by hand, which a press on a div does not do.
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.focus();
    grabOffsetRef.current = position - fractionAt(event.clientX);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    onChange(fractionAt(event.clientX) + grabOffsetRef.current);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const distance = event.shiftKey ? FINE_KEY_STEP : KEY_STEP;

    switch (event.key) {
      case "ArrowLeft":
      case "ArrowDown":
        onChange(position - distance);
        break;
      case "ArrowRight":
      case "ArrowUp":
        onChange(position + distance);
        break;
      // The far ends, which is also how a handle is put back on its own.
      case "Home":
        onChange(0);
        break;
      case "End":
        onChange(1);
        break;
      default:
        return;
    }

    // Only for the keys handled above, so nothing else on the page is swallowed.
    event.preventDefault();
  };

  const label = edge === "start" ? "Sample start" : "Sample end";

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(position * 100)}
      aria-valuetext={`${seconds.toFixed(2)} seconds`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onKeyDown={handleKeyDown}
      // `touch-none` keeps the browser from claiming the drag for scrolling,
      // which would swallow it before it arrived — the same reason the step
      // grid sets it. The strip is short, so the page still scrolls from
      // anywhere either side of the two handles.
      className="group absolute inset-y-0 flex w-4 -translate-x-1/2 cursor-ew-resize touch-none flex-col items-center outline-none select-none"
      style={{ left: `${position * 100}%` }}
    >
      {/*
        `--select`, the colour of whatever is being looked at, rather than the
        accent the waveform itself is drawn in: an edge marker has to read
        against the shape it is cutting, not blend into it.
      */}
      {/* A cap at either end, so the line reads as something to take hold of
          rather than as a mark drawn on the waveform. */}
      <span aria-hidden className="bg-select size-1.5 shrink-0 rounded-sm" />
      <span
        aria-hidden
        className="bg-select w-0.5 flex-1 transition-[width] group-hover:w-1 group-focus-visible:w-1"
      />
      <span aria-hidden className="bg-select size-1.5 shrink-0 rounded-sm" />
    </div>
  );
}

type WaveformPlayheadProps = {
  getPlayhead: () => number | null;
  reversed: boolean;
};

/**
 * The line that walks the strip with the hit, from one handle to the other.
 *
 * Nothing here goes through React state, for the same reason the gain reduction
 * meter keeps out of it: the position moves with the audio clock, and putting it
 * through a `useState` would re-render the whole sample card — the name, the
 * slot, the shape and both handles — sixty times a second to move one line.
 *
 * So the position is pulled once a frame and written straight to the node, and
 * only when it has actually changed: a channel sitting silent between hits is a
 * map lookup that misses and nothing else.
 */
function WaveformPlayhead({ getPlayhead, reversed }: WaveformPlayheadProps) {
  const lineRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let frame = 0;
    let shown: string | null = null;

    const tick = () => {
      frame = requestAnimationFrame(tick);

      const line = lineRef.current;
      if (!line) return;

      const position = getPlayhead();
      // The empty string stands for silence, which is also what makes the two
      // writes below one decision: the line is put where the hit has reached and
      // shown, or it is cleared and hidden, and it can never be left visible at
      // wherever the last hit happened to stop.
      const left =
        position === null ? "" : `${onStrip(position, reversed) * 100}%`;
      if (left === shown) return;

      shown = left;
      line.style.left = left;
      line.style.opacity = position === null ? "0" : "1";
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [getPlayhead, reversed]);

  return (
    // Hidden from assistive technology: it is a picture of a sound already
    // playing, and there is nothing here to read out or to operate.
    //
    // `--fg`, which is the one colour in a theme guaranteed to carry against
    // the panel behind the strip: the accent is what the shape is drawn in and
    // `--select` is already both handles, so a line taking either would have to
    // be read against the very thing it is crossing.
    <span
      ref={lineRef}
      aria-hidden
      className="bg-fg pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 opacity-0"
    />
  );
}

export default function Waveform({
  sample,
  start,
  end,
  onStartChange,
  onEndChange,
  reversed,
  onReversedChange,
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
    "border-line bg-panel flex h-20 items-center justify-center overflow-hidden rounded border";
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

  if (sample.status === "empty" || sample.peaks.length === 0) {
    return (
      <div className={frame}>
        <span className={message}>
          {sample.status === "empty" ? "No sample loaded" : "No waveform"}
        </span>
      </div>
    );
  }

  const trimmed = isSampleTrimmed(start, end);
  const spanSeconds = sampleSpanSeconds(start, end, sample.durationSeconds);

  /** This strip's flip, since every call below is for the same picture. */
  const onThisStrip = (fraction: number) => onStrip(fraction, reversed);

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
        Above the strip rather than in the row under it: that row is a readout
        of where the handles are and only appears once they have been moved,
        where the direction the file is read in applies to every sample and has
        to be reachable — and visible — without trimming one first.

        Lit while it is on, like every other toggle in the machine. The strip
        turns round with it, but a shape alone cannot say which way round it
        was to begin with — the light is what makes that readable at a glance.
      */}
      <div className="flex items-center text-[10px]">
        <button
          type="button"
          onClick={() => onReversedChange(!reversed)}
          aria-pressed={reversed}
          aria-label="Play sample in reverse"
          className={`rounded border px-2 py-0.5 font-medium transition-colors ${
            reversed
              ? "border-accent bg-accent text-on-accent"
              : "border-edge hover:bg-raised"
          }`}
        >
          Reverse
        </button>
      </div>

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

          {/* After the wash, so the line stays at full strength as it crosses
              the region — and inside the strip, which clips it: unlike a handle
              it never sits at the very edge, since it only exists between the
              two of them. */}
          <WaveformPlayhead getPlayhead={getPlayhead} reversed={reversed} />

          {/* How long the channel now plays for, which is the trimmed span
              rather than the file's own length. Never in the way of a handle:
              nothing here takes the pointer. Read in the same unit as the
              envelope times, so a hit cut to a few milliseconds says so rather
              than rounding away to nothing. */}
          <span className="bg-surface/70 text-muted pointer-events-none absolute right-1.5 bottom-1 rounded px-1 text-[10px] tabular-nums">
            {formatSeconds(spanSeconds)}
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

      {/* Only once something has been trimmed: an untrimmed channel has nothing
          to put back, and the row would be a line of chrome under every sample
          saying so. */}
      {trimmed && (
        <div className="flex items-center gap-2 text-[10px]">
          {/* Where the handles are on the strip, so the pair reads left to
              right the way they sit — which on a reversed sample is the file
              counted from its far end. */}
          <span className="text-muted tabular-nums">
            {formatSeconds(onThisStrip(leading) * sample.durationSeconds)} –{" "}
            {formatSeconds(onThisStrip(trailing) * sample.durationSeconds)} of{" "}
            {formatSeconds(sample.durationSeconds)}
          </span>

          <button
            type="button"
            onClick={onReset}
            className="border-edge hover:bg-raised ml-auto rounded border px-2 py-0.5 font-medium transition-colors"
          >
            Reset trim
          </button>
        </div>
      )}
    </div>
  );
}
