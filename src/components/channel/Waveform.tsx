"use client";

import {
  useCallback,
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

/** Builds a filled, centre-mirrored outline: left-to-right on top, back along the bottom. */
function buildPath(peaks: number[]): string {
  const half = VIEWBOX_HEIGHT / 2;
  const top = peaks.map((peak, index) => `L ${index} ${half - peak * half}`);
  const bottom = [];
  for (let index = peaks.length - 1; index >= 0; index--) {
    bottom.push(`L ${index} ${half + peaks[index] * half}`);
  }
  return `M 0 ${half} ${top.join(" ")} ${bottom.join(" ")} Z`;
}

type TrimHandleProps = {
  edge: "start" | "end";
  /** Where this handle sits, as a fraction of the whole file. */
  position: number;
  /** How far into the file that is, for the readout a screen reader speaks. */
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

export default function Waveform({
  sample,
  start,
  end,
  onStartChange,
  onEndChange,
  reversed,
  onReversedChange,
  onReset,
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

  return (
    <div className="flex flex-col gap-1.5">
      {/*
        Above the strip rather than in the row under it: that row is a readout
        of where the handles are and only appears once they have been moved,
        where the direction the file is read in applies to every sample and has
        to be reachable — and visible — without trimming one first.

        Lit while it is on, like every other toggle in the machine. It has to
        be: the waveform is drawn from the file, so nothing in the shape below
        says which way it is about to be played.
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
            aria-label={`Waveform for ${sample.name}`}
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
            <path d={buildPath(sample.peaks)} fill="currentColor" />
          </svg>

          {/*
            What is trimmed away is washed out rather than hidden, so the shape
            of the whole file stays readable behind the handles — which is what
            makes it possible to see the transient you are cutting towards.
          */}
          <div
            aria-hidden
            className="bg-surface/70 pointer-events-none absolute inset-y-0 left-0"
            style={{ width: `${start * 100}%` }}
          />
          <div
            aria-hidden
            className="bg-surface/70 pointer-events-none absolute inset-y-0 right-0"
            style={{ width: `${(1 - end) * 100}%` }}
          />

          {/* How long the channel now plays for, which is the trimmed span
              rather than the file's own length. Never in the way of a handle:
              nothing here takes the pointer. Read in the same unit as the
              envelope times, so a hit cut to a few milliseconds says so rather
              than rounding away to nothing. */}
          <span className="bg-surface/70 text-muted pointer-events-none absolute right-1.5 bottom-1 rounded px-1 text-[10px] tabular-nums">
            {formatSeconds(spanSeconds)}
          </span>
        </div>

        <TrimHandle
          edge="start"
          position={start}
          seconds={start * sample.durationSeconds}
          onChange={onStartChange}
          fractionAt={fractionAt}
        />

        <TrimHandle
          edge="end"
          position={end}
          seconds={end * sample.durationSeconds}
          onChange={onEndChange}
          fractionAt={fractionAt}
        />
      </div>

      {/* Only once something has been trimmed: an untrimmed channel has nothing
          to put back, and the row would be a line of chrome under every sample
          saying so. */}
      {trimmed && (
        <div className="flex items-center gap-2 text-[10px]">
          <span className="text-muted tabular-nums">
            {formatSeconds(start * sample.durationSeconds)} –{" "}
            {formatSeconds(end * sample.durationSeconds)} of{" "}
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
