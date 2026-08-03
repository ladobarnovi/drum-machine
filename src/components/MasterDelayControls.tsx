"use client";

import MasterFxSection from "./MasterFxSection";
import RailSlider from "./RailSlider";
import {
  MAX_DELAY_SECONDS,
  MAX_FEEDBACK,
  MAX_VOLUME,
  MIN_DELAY_SECONDS,
  MIN_FEEDBACK,
  MIN_VOLUME,
  clampDelaySeconds,
  clampFeedback,
  clampVolume,
  formatSeconds,
  type MasterDelay,
} from "@/lib/sequencer";

type MasterDelayControlsProps = {
  delay: MasterDelay;
  onChange: (delay: MasterDelay) => void;
};

/**
 * The delay bus. This is a send, not an insert: channels decide how much of
 * themselves to feed it from their own Delay control, and what is set here is
 * only what the bus does with whatever arrives.
 *
 * So the toggle silences the return rather than bypassing a path — with every
 * channel send closed this section is inaudible no matter how it is set.
 */
export default function MasterDelayControls({
  delay,
  onChange,
}: MasterDelayControlsProps) {
  return (
    <MasterFxSection
      title="Delay"
      toggleLabel="Master delay"
      enabled={delay.enabled}
      onToggle={() => onChange({ ...delay, enabled: !delay.enabled })}
    >
      <RailSlider
        label="Time"
        ariaLabel="Master delay time"
        min={MIN_DELAY_SECONDS}
        max={MAX_DELAY_SECONDS}
        step={0.005}
        value={delay.timeSeconds}
        readout={formatSeconds(delay.timeSeconds)}
        onChange={(value) =>
          onChange({ ...delay, timeSeconds: clampDelaySeconds(value) })
        }
      />

      <RailSlider
        label="Feedback"
        ariaLabel="Master delay feedback"
        min={MIN_FEEDBACK}
        max={MAX_FEEDBACK}
        step={0.01}
        value={delay.feedback}
        readout={`${Math.round(delay.feedback * 100)}%`}
        onChange={(value) =>
          onChange({ ...delay, feedback: clampFeedback(value) })
        }
      />

      <RailSlider
        label="Level"
        ariaLabel="Master delay level"
        min={MIN_VOLUME}
        max={MAX_VOLUME}
        step={0.01}
        value={delay.level}
        readout={`${Math.round(delay.level * 100)}%`}
        onChange={(value) => onChange({ ...delay, level: clampVolume(value) })}
      />
    </MasterFxSection>
  );
}
