"use client";

import MasterFxSection from "./MasterFxSection";
import RailSlider from "@/components/ui/RailSlider";
import {
  MAX_PHASER_DEPTH,
  MAX_PHASER_FEEDBACK,
  MAX_VOLUME,
  MIN_PHASER_DEPTH,
  MIN_PHASER_FEEDBACK,
  MIN_VOLUME,
  PHASER_STAGE_COUNTS,
  PHASER_STAGE_LABELS,
  clampPhaserDepth,
  clampPhaserFeedback,
  clampPhaserStages,
  clampVolume,
  formatPhaserRate,
  phaserRateToSlider,
  sliderToPhaserRate,
  type MasterPhaser,
} from "@/lib/sequencer";

type MasterPhaserControlsProps = {
  phaser: MasterPhaser;
  onChange: (phaser: MasterPhaser) => void;
};

/**
 * The phaser bus, fed by the channel sends and by the reverb's own send.
 *
 * Last of the three send stages, because that is the order they feed each
 * other in: the delay can be sent to the reverb, and the reverb can be sent to
 * here, so a repeat can end up in a space that is itself sweeping.
 *
 * Worth knowing while setting it: what comes back from an allpass chain is the
 * same signal with its phase turned, so the notches are made where the return
 * meets the dry mix rather than inside the bus. A channel sent wide open
 * against a return at 100% is where they are deepest; below that they shallow
 * out, which is the setting to reach for when the sweep should be felt rather
 * than heard.
 */
export default function MasterPhaserControls({
  phaser,
  onChange,
}: MasterPhaserControlsProps) {
  return (
    <MasterFxSection
      title="Phaser"
      toggleLabel="Master phaser"
      enabled={phaser.enabled}
      onToggle={() => onChange({ ...phaser, enabled: !phaser.enabled })}
    >
      {/*
        First, because it is the one choice here rather than an amount: how many
        notches there are is what the stage sounds like, and everything below
        moves the notches it puts in.
      */}
      <label className="flex flex-col gap-1 text-xs">
        <span>Stages</span>
        <select
          value={phaser.stages}
          onChange={(event) =>
            onChange({
              ...phaser,
              stages: clampPhaserStages(event.target.value),
            })
          }
          aria-label="Master phaser stages"
          className="border-edge bg-field w-full rounded border px-2 py-1"
        >
          {PHASER_STAGE_COUNTS.map((stages) => (
            <option key={stages} value={stages}>
              {PHASER_STAGE_LABELS[stages]}
            </option>
          ))}
        </select>
      </label>

      {/* Log scale, like the channel LFO's rate: the slow end is where a phaser
          spends most of its life, and reads as a period rather than a rate. */}
      <RailSlider
        label="Rate"
        ariaLabel="Master phaser rate"
        min={0}
        max={1}
        step={0.001}
        value={phaserRateToSlider(phaser.rateHz)}
        readout={formatPhaserRate(phaser.rateHz)}
        onChange={(position) =>
          onChange({ ...phaser, rateHz: sliderToPhaserRate(position) })
        }
        midiMapId="master:phaser:rate"
      />

      <RailSlider
        label="Depth"
        ariaLabel="Master phaser depth"
        min={MIN_PHASER_DEPTH}
        max={MAX_PHASER_DEPTH}
        step={0.01}
        value={phaser.depth}
        readout={`${Math.round(phaser.depth * 100)}%`}
        onChange={(value) =>
          onChange({ ...phaser, depth: clampPhaserDepth(value) })
        }
        midiMapId="master:phaser:depth"
      />

      {/* Resonance, in the sense the delay's feedback is: it wraps the allpass
          chain, so it sharpens the notches rather than repeating anything. */}
      <RailSlider
        label="Feedback"
        ariaLabel="Master phaser feedback"
        min={MIN_PHASER_FEEDBACK}
        max={MAX_PHASER_FEEDBACK}
        step={0.01}
        value={phaser.feedback}
        readout={`${Math.round(phaser.feedback * 100)}%`}
        onChange={(value) =>
          onChange({ ...phaser, feedback: clampPhaserFeedback(value) })
        }
        midiMapId="master:phaser:feedback"
      />

      <RailSlider
        label="Level"
        ariaLabel="Master phaser level"
        min={MIN_VOLUME}
        max={MAX_VOLUME}
        step={0.01}
        value={phaser.level}
        readout={`${Math.round(phaser.level * 100)}%`}
        onChange={(value) => onChange({ ...phaser, level: clampVolume(value) })}
        midiMapId="master:phaser:level"
      />
    </MasterFxSection>
  );
}
