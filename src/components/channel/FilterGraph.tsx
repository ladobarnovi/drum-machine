"use client";

import {
  filterResponseCurve,
  responseDbAt,
  responseDepth,
} from "@/lib/filterResponse";
import {
  formatFrequency,
  frequencyToSlider,
  isHighCutBypassed,
  isLowCutBypassed,
} from "@/lib/sequencer";

type FilterGraphProps = {
  lowCutHz: number;
  lowCutResonance: number;
  highCutHz: number;
  highCutResonance: number;
  /** How steeply both cuts roll off, in dB per octave. */
  filterSlope: number;
};

/** The plot's own coordinate space. Stretched to fill whatever width it gets. */
const VIEWBOX_WIDTH = 1000;
const VIEWBOX_HEIGHT = 400;

/**
 * Where the vertical rules fall. Decades and their halves, which is how a
 * frequency axis is read — and only the decades are labelled, since a strip
 * this short cannot carry eight numbers without them running together.
 */
const GRID_HZ = [50, 100, 200, 500, 1000, 2000, 5000, 10000];
const LABELLED_HZ = [100, 1000, 10000];

/** One end of the filter, as something to mark on the plot. */
type Marker = {
  id: "low" | "high";
  /** The two letters printed at the top of its line. */
  tag: string;
  hz: number;
  /** True while this cut is parked where it does nothing on its own. */
  bypassed: boolean;
};

/**
 * The shape of the selected channel's two cuts, with the corners marked.
 *
 * A picture rather than a second set of numbers: the knobs beside it already
 * say what the cutoffs and the resonances are, and what they cannot say is what
 * the four of them come to together — where the band actually sits, how steeply
 * it falls away either side, and how far the corners are peaking.
 */
export default function FilterGraph({
  lowCutHz,
  lowCutResonance,
  highCutHz,
  highCutResonance,
  filterSlope,
}: FilterGraphProps) {
  const curve = filterResponseCurve(
    lowCutHz,
    lowCutResonance,
    highCutHz,
    highCutResonance,
    filterSlope,
  );

  const toX = (position: number) => position * VIEWBOX_WIDTH;
  const toY = (db: number) => responseDepth(db) * VIEWBOX_HEIGHT;

  const line = curve
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${toX(point.position)} ${toY(point.db)}`,
    )
    .join(" ");

  // The same outline closed along the bottom of the frame, so what the filter
  // passes reads as a band with weight rather than as a line with two sides.
  const area = `${line} L ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT} L 0 ${VIEWBOX_HEIGHT} Z`;

  const markers: Marker[] = [
    {
      id: "low",
      tag: "HP",
      hz: lowCutHz,
      bypassed: isLowCutBypassed(lowCutHz),
    },
    {
      id: "high",
      tag: "LP",
      hz: highCutHz,
      bypassed: isHighCutBypassed(highCutHz),
    },
  ];

  // Where each corner sits on the plot: along the axis by its frequency, and up
  // it by how loud the pair of filters actually is there — so a marker rides the
  // curve, resonant peak included, rather than floating at a fixed height.
  const placed = markers.map((marker) => ({
    ...marker,
    position: frequencyToSlider(marker.hz),
    depth: responseDepth(
      responseDbAt(
        marker.hz,
        lowCutHz,
        lowCutResonance,
        highCutHz,
        highCutResonance,
        filterSlope,
      ),
    ),
  }));

  return (
    <div className="border-line bg-panel relative h-16 md:h-24 overflow-hidden rounded border">
      <svg
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        // Stretch freely: this is a shape overview like the waveform strip, not
        // a plot anyone is going to measure a slope off. Every stroke below is
        // non-scaling, so nothing comes out thicker in one direction than the
        // other for it.
        preserveAspectRatio="none"
        role="img"
        aria-label={`Filter response at ${filterSlope} decibels per octave. Low cut ${
          isLowCutBypassed(lowCutHz) ? "off" : formatFrequency(lowCutHz)
        }, high cut ${
          isHighCutBypassed(highCutHz) ? "off" : formatFrequency(highCutHz)
        }.`}
        className="text-accent size-full"
      >
        {GRID_HZ.map((hz) => (
          <line
            key={hz}
            x1={toX(frequencyToSlider(hz))}
            y1={0}
            x2={toX(frequencyToSlider(hz))}
            y2={VIEWBOX_HEIGHT}
            stroke="var(--fg)"
            strokeWidth={1}
            opacity={LABELLED_HZ.includes(hz) ? 0.16 : 0.08}
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* Unity, so a resonant peak is visibly *above* something rather than
            just high up in the frame. */}
        <line
          x1={0}
          y1={toY(0)}
          x2={VIEWBOX_WIDTH}
          y2={toY(0)}
          stroke="var(--fg)"
          strokeWidth={1}
          opacity={0.16}
          vectorEffect="non-scaling-stroke"
        />

        <path d={area} fill="currentColor" opacity={0.18} />
        <path
          d={line}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* Where each cut currently sits. In `--select`, the colour of whatever
            is being looked at, rather than the accent the curve is drawn in: a
            corner marker has to read against the shape it is marking. */}
        {placed.map((marker) => (
          <line
            key={marker.id}
            x1={toX(marker.position)}
            y1={0}
            x2={toX(marker.position)}
            y2={VIEWBOX_HEIGHT}
            stroke="var(--select)"
            strokeWidth={1}
            opacity={marker.bypassed ? 0.3 : 0.8}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      {/*
        The dots and the tags are HTML over the plot rather than shapes in it,
        because the plot is stretched to whatever width the card gives it and a
        circle drawn in there would come out an ellipse — and a letter, a
        smeared one.
      */}
      {placed.map((marker) => (
        <span
          key={marker.id}
          aria-hidden
          className="bg-select pointer-events-none absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            left: `${marker.position * 100}%`,
            top: `${marker.depth * 100}%`,
            opacity: marker.bypassed ? 0.4 : 1,
          }}
        />
      ))}

      {placed.map((marker) => (
        <span
          key={marker.id}
          aria-hidden
          className="text-select pointer-events-none absolute top-0.5 text-[9px] font-semibold"
          style={{
            // Nudged inwards at the very ends of the axis, where a centred tag
            // would sit half outside the frame and be clipped by it.
            left: `${marker.position * 100}%`,
            transform:
              marker.position < 0.05
                ? "translateX(0)"
                : marker.position > 0.95
                  ? "translateX(-100%)"
                  : "translateX(-50%)",
            opacity: marker.bypassed ? 0.45 : 1,
          }}
        >
          {marker.tag}
        </span>
      ))}

      {/* The axis, read along the bottom. Decades only; the rules between them
          are there to be counted against rather than named. */}
      {LABELLED_HZ.map((hz) => (
        <span
          key={hz}
          aria-hidden
          className="text-muted pointer-events-none absolute bottom-0.5 -translate-x-1/2 text-[9px] tabular-nums"
          style={{ left: `${frequencyToSlider(hz) * 100}%` }}
        >
          {formatFrequency(hz)}
        </span>
      ))}
    </div>
  );
}
