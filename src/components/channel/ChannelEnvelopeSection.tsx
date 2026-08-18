"use client";

import { useState, type FocusEvent } from "react";

import EnvelopeGraph from "./EnvelopeGraph";
import RotaryKnob from "@/components/ui/RotaryKnob";
import { channelMidiMapId } from "@/lib/midiParameters";
import {
  MAX_SUSTAIN_LEVEL,
  MIN_SUSTAIN_LEVEL,
  attackToSlider,
  decayToSlider,
  formatSeconds,
  formatSustain,
  isAttackBypassed,
  isDecayBypassed,
  isReleaseBypassed,
  isSustainBypassed,
  releaseToSlider,
  sliderToAttack,
  sliderToDecay,
  sliderToRelease,
  type LockableParameter,
  type StepLocks,
} from "@/lib/sequencer";

/**
 * The four values this card shows, whoever they belong to — the envelope's
 * own equivalent of `FilterSettings`.
 */
export type EnvelopeSettings = {
  attackSeconds: number;
  decaySeconds: number;
  sustainLevel: number;
  releaseSeconds: number;
};

/**
 * What the section is given while a single step is open for editing — the
 * same shape or `ChannelFilterSection`'s own `stepEdit`, since a lock is a
 * lock on the channel's settings whichever card is showing it.
 */
type EnvelopeStepEdit = {
  /** Which step is open, counted from 0. */
  index: number;
  /** Which of the parameters this step overrides. */
  locks: StepLocks;
  onClearLock: (key: LockableParameter) => void;
};

/**
 * The hit the channel is sounding right now, while the transport runs — the
 * step the card follows rather than one it edits.
 */
type PlayingEnvelope = {
  /** Which step is being heard, counted from 0. */
  index: number;
  /** The four values as that step actually plays them, locks applied. */
  settings: EnvelopeSettings;
  /** Which of the four it overrides, so those can be marked as locks. */
  locks: StepLocks;
};

type ChannelEnvelopeSectionProps = {
  /** Whose envelope this is, so a MIDI mapping binds to that channel's knobs
   *  rather than to whichever channel happens to be selected. */
  channelId: string;
  /** Whose envelope this is, so the card says which channel it belongs to. */
  channelName: string;
  /** What the knobs edit: the channel's own, or an open step's. */
  settings: EnvelopeSettings;
  /**
   * What is currently being heard, or null while the transport is stopped —
   * or while it is running and the channel has no hits to sound.
   */
  playing?: PlayingEnvelope | null;
  onAttackChange: (seconds: number) => void;
  onDecayChange: (seconds: number) => void;
  onSustainChange: (level: number) => void;
  onReleaseChange: (seconds: number) => void;
  /** Set while one step is being edited; absent while the channel is. */
  stepEdit?: EnvelopeStepEdit;
};

/**
 * The selected channel's amplitude envelope, as a picture with its four
 * controls under it — attack and decay exactly as `ChannelControls`' own
 * Shaping group already has sliders for, plus sustain and release to carry
 * the shape past a plain fade-then-fall. Deliberately the same settings
 * rather than a second envelope of their own, so this card and that group
 * are two views of one thing and moving either moves the other.
 *
 * Structured like `ChannelFilterSection` throughout — the same follow-the-
 * playhead behaviour, the same lock marks — since the two now sit one tab
 * apart and a player switching between them should find the same rules
 * still holding.
 */
export default function ChannelEnvelopeSection({
  channelId,
  channelName,
  settings,
  playing,
  onAttackChange,
  onDecayChange,
  onSustainChange,
  onReleaseChange,
  stepEdit,
}: ChannelEnvelopeSectionProps) {
  /** Whether a knob is currently being worked — see `ChannelFilterSection`
   *  for why following the playhead has to pause while it is. */
  const [adjusting, setAdjusting] = useState(false);

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    setAdjusting(false);
  };

  const following = !stepEdit && !adjusting ? (playing ?? null) : null;
  const shown = following ? following.settings : settings;

  const lockProps = (key: LockableParameter) => {
    if (following) return { locked: following.locks[key] !== undefined };

    return stepEdit
      ? {
          locked: stepEdit.locks[key] !== undefined,
          onClearLock: () => stepEdit.onClearLock(key),
        }
      : {};
  };

  return (
    <div className="flex flex-col gap-4">
      <EnvelopeGraph
        attackSeconds={shown.attackSeconds}
        decaySeconds={shown.decaySeconds}
        sustainLevel={shown.sustainLevel}
        releaseSeconds={shown.releaseSeconds}
      />

      <div
        onFocus={() => setAdjusting(true)}
        onBlur={handleBlur}
        className="grid grid-cols-4 justify-items-center gap-x-2 gap-y-4 sm:gap-x-8"
      >
        {/* Envelope times ride a 0..1 curve, so the readout shows the real
            time — exactly the mapping the Shaping group's own sliders use. */}
        <RotaryKnob
          label="Attack"
          ariaLabel="Attack time"
          min={0}
          max={1}
          step={0.001}
          value={attackToSlider(shown.attackSeconds)}
          readout={
            isAttackBypassed(shown.attackSeconds)
              ? "Off"
              : formatSeconds(shown.attackSeconds)
          }
          onChange={(position) => onAttackChange(sliderToAttack(position))}
          {...lockProps("attackSeconds")}
          midiMapId={channelMidiMapId(channelId, "envelope:attack")}
        />

        <RotaryKnob
          label="Decay"
          ariaLabel="Decay time"
          min={0}
          max={1}
          step={0.001}
          value={decayToSlider(shown.decaySeconds)}
          readout={
            isDecayBypassed(shown.decaySeconds)
              ? "Off"
              : formatSeconds(shown.decaySeconds)
          }
          onChange={(position) => onDecayChange(sliderToDecay(position))}
          {...lockProps("decaySeconds")}
          midiMapId={channelMidiMapId(channelId, "envelope:decay")}
        />

        <RotaryKnob
          label="Sustain"
          ariaLabel="Sustain level"
          min={MIN_SUSTAIN_LEVEL}
          max={MAX_SUSTAIN_LEVEL}
          step={0.01}
          value={shown.sustainLevel}
          readout={
            isSustainBypassed(shown.sustainLevel)
              ? "Off"
              : formatSustain(shown.sustainLevel)
          }
          onChange={onSustainChange}
          {...lockProps("sustainLevel")}
          midiMapId={channelMidiMapId(channelId, "envelope:sustain")}
        />

        <RotaryKnob
          label="Release"
          ariaLabel="Release time"
          min={0}
          max={1}
          step={0.001}
          value={releaseToSlider(shown.releaseSeconds)}
          readout={
            isReleaseBypassed(shown.releaseSeconds)
              ? "Off"
              : formatSeconds(shown.releaseSeconds)
          }
          onChange={(position) => onReleaseChange(sliderToRelease(position))}
          {...lockProps("releaseSeconds")}
          midiMapId={channelMidiMapId(channelId, "envelope:release")}
        />
      </div>
    </div>
  );
}
