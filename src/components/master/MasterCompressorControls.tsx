"use client";

import GainReductionMeter from "./GainReductionMeter";
import MasterFxSection from "./MasterFxSection";
import RailSlider from "@/components/ui/RailSlider";
import {
  MAX_COMPRESSOR_ATTACK_SECONDS,
  MAX_COMPRESSOR_RELEASE_SECONDS,
  MAX_RATIO,
  MAX_THRESHOLD_DB,
  MAX_VOLUME,
  MIN_COMPRESSOR_ATTACK_SECONDS,
  MIN_COMPRESSOR_RELEASE_SECONDS,
  MIN_RATIO,
  MIN_THRESHOLD_DB,
  MIN_VOLUME,
  clampCompressorAttack,
  clampCompressorRelease,
  clampRatio,
  clampThresholdDb,
  clampVolume,
  formatDecibels,
  formatRatio,
  formatSeconds,
  type MasterCompressor,
} from "@/lib/sequencer";

type MasterCompressorControlsProps = {
  compressor: MasterCompressor;
  /** Reads how much the compressor is taking off right now, in dB. */
  getGainReduction: () => number;
  onChange: (compressor: MasterCompressor) => void;
};

/**
 * The compressor on the mix, with the meter that says what it is doing.
 *
 * The meter comes first, above everything that decides it: a threshold and a
 * ratio are guesses until something shows what they add up to, and reading it
 * off the top of the stage is what turns the sliders below from numbers into
 * a thing being aimed. It keeps running while the stage is bypassed, so what
 * switching it in would do can be seen before it is switched in.
 */
export default function MasterCompressorControls({
  compressor,
  getGainReduction,
  onChange,
}: MasterCompressorControlsProps) {
  return (
    <MasterFxSection
      title="Compressor"
      toggleLabel="Master compressor"
      enabled={compressor.enabled}
      onToggle={() => onChange({ ...compressor, enabled: !compressor.enabled })}
    >
      <GainReductionMeter getReduction={getGainReduction} />

      {/* Threshold first: it decides how much of the mix the rest of these are
          acting on at all. */}
      <RailSlider
        label="Threshold"
        ariaLabel="Master compressor threshold"
        min={MIN_THRESHOLD_DB}
        max={MAX_THRESHOLD_DB}
        step={1}
        value={compressor.thresholdDb}
        readout={formatDecibels(compressor.thresholdDb)}
        onChange={(value) =>
          onChange({ ...compressor, thresholdDb: clampThresholdDb(value) })
        }
        midiMapId="master:compressor:threshold"
      />

      <RailSlider
        label="Ratio"
        ariaLabel="Master compressor ratio"
        min={MIN_RATIO}
        max={MAX_RATIO}
        step={0.1}
        value={compressor.ratio}
        readout={formatRatio(compressor.ratio)}
        onChange={(value) =>
          onChange({ ...compressor, ratio: clampRatio(value) })
        }
        midiMapId="master:compressor:ratio"
      />

      <RailSlider
        label="Attack"
        ariaLabel="Master compressor attack"
        min={MIN_COMPRESSOR_ATTACK_SECONDS}
        max={MAX_COMPRESSOR_ATTACK_SECONDS}
        step={0.001}
        value={compressor.attackSeconds}
        readout={formatSeconds(compressor.attackSeconds)}
        onChange={(value) =>
          onChange({
            ...compressor,
            attackSeconds: clampCompressorAttack(value),
          })
        }
        midiMapId="master:compressor:attack"
      />

      <RailSlider
        label="Release"
        ariaLabel="Master compressor release"
        min={MIN_COMPRESSOR_RELEASE_SECONDS}
        max={MAX_COMPRESSOR_RELEASE_SECONDS}
        step={0.01}
        value={compressor.releaseSeconds}
        readout={formatSeconds(compressor.releaseSeconds)}
        onChange={(value) =>
          onChange({
            ...compressor,
            releaseSeconds: clampCompressorRelease(value),
          })
        }
        midiMapId="master:compressor:release"
      />

      {/* Last, because it is last in this stage's signal too: what the
          compressor puts out after it has taken something off. */}
      <RailSlider
        label="Makeup"
        ariaLabel="Master compressor makeup gain"
        min={MIN_VOLUME}
        max={MAX_VOLUME}
        step={0.01}
        value={compressor.level}
        readout={`${Math.round(compressor.level * 100)}%`}
        onChange={(value) =>
          onChange({ ...compressor, level: clampVolume(value) })
        }
        midiMapId="master:compressor:makeup"
      />
    </MasterFxSection>
  );
}
