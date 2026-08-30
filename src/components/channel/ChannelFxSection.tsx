"use client";

import { useState, type FocusEvent } from "react";

import FxGraph from "./FxGraph";
import RotaryKnob from "@/components/ui/RotaryKnob";
import { channelMidiMapId } from "@/lib/midiParameters";
import {
  MAX_SEND,
  MIN_SEND,
  clampSend,
  isSendClosed,
  randomInRange,
  type LockableParameter,
  type StepLocks,
} from "@/lib/sequencer";

/**
 * The three values this card shows, whoever they belong to — the sends' own
 * equivalent of `FilterSettings` and `EnvelopeSettings`.
 */
export type FxSettings = {
  delaySend: number;
  reverbSend: number;
  phaserSend: number;
};

/**
 * What the section is given while a single step is open for editing — the same
 * shape as the Filter and Env tabs' own, since a lock is a lock on the
 * channel's settings whichever card is showing it.
 */
type FxStepEdit = {
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
type PlayingFx = {
  /** Which step is being heard, counted from 0. */
  index: number;
  /** The three values as that step actually plays them, locks applied. */
  settings: FxSettings;
  /** Which of the three it overrides, so those can be marked as locks. */
  locks: StepLocks;
};

type ChannelFxSectionProps = {
  /** Whose sends these are, so a MIDI mapping binds to that channel's knobs
   *  rather than to whichever channel happens to be selected. */
  channelId: string;
  /** What the knobs edit: the channel's own, or an open step's. */
  settings: FxSettings;
  /**
   * What is currently being heard, or null while the transport is stopped —
   * or while it is running and the channel has no hits to sound.
   */
  playing?: PlayingFx | null;
  onDelaySendChange: (amount: number) => void;
  onReverbSendChange: (amount: number) => void;
  onPhaserSendChange: (amount: number) => void;
  /** Rerolls one of the three sends above across every active step. */
  onRandomizeParameter: (key: LockableParameter, randomize: () => number) => void;
  /** Drops every override of one of the three sends above, pattern-wide. */
  onClearLockedParameter: (key: LockableParameter) => void;
  /** Set while one step is being edited; absent while the channel is. */
  stepEdit?: FxStepEdit;
};

/**
 * How much of the selected channel is tapped off to each of the three master
 * buses, pictured — the sends that used to sit as a band of sliders at the
 * bottom of the Channel Params accordion, moved up here beside the Filter and
 * Env tabs they belong with.
 *
 * The picture above them is three tiles rather than one plot, for the reason
 * `FxGraph` gives: these are three separate taps rather than three parts of
 * one shape. What is on this card is only ever the amount sent — what the
 * delay, reverb and phaser then do with it is set once for the whole machine,
 * over in the FX rail, and is nothing a channel gets a say in.
 *
 * Structured like the two tabs either side of it throughout — the same
 * follow-the-playhead behaviour, the same lock marks — since a player
 * switching between them should find the same rules still holding.
 */
export default function ChannelFxSection({
  channelId,
  settings,
  playing,
  onDelaySendChange,
  onReverbSendChange,
  onPhaserSendChange,
  onRandomizeParameter,
  onClearLockedParameter,
  stepEdit,
}: ChannelFxSectionProps) {
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

  /** A shut send reads as off rather than as 0%, the same way a parked cutoff
   *  or a bypassed envelope stage does on the tabs either side. */
  const readout = (amount: number) =>
    isSendClosed(amount) ? "Off" : `${Math.round(amount * 100)}%`;

  return (
    <div className="flex flex-col gap-4">
      <FxGraph
        delaySend={shown.delaySend}
        reverbSend={shown.reverbSend}
        phaserSend={shown.phaserSend}
      />

      {/* One knob under each tile, in the same three columns, so which
          picture belongs to which control needs no saying. */}
      <div
        onFocus={() => setAdjusting(true)}
        onBlur={handleBlur}
        className="grid grid-cols-3 justify-items-center gap-x-2 gap-y-4 sm:gap-x-8"
      >
        <RotaryKnob
          label="Delay"
          ariaLabel="Delay send"
          min={MIN_SEND}
          max={MAX_SEND}
          step={0.01}
          value={shown.delaySend}
          readout={readout(shown.delaySend)}
          onChange={(value) => onDelaySendChange(clampSend(value))}
          {...lockProps("delaySend")}
          midiMapId={channelMidiMapId(channelId, "fx:delaySend")}
          onRandomize={() =>
            onRandomizeParameter("delaySend", () =>
              clampSend(randomInRange(MIN_SEND, MAX_SEND)),
            )
          }
          onClearLocks={() => onClearLockedParameter("delaySend")}
        />

        <RotaryKnob
          label="Reverb"
          ariaLabel="Reverb send"
          min={MIN_SEND}
          max={MAX_SEND}
          step={0.01}
          value={shown.reverbSend}
          readout={readout(shown.reverbSend)}
          onChange={(value) => onReverbSendChange(clampSend(value))}
          {...lockProps("reverbSend")}
          midiMapId={channelMidiMapId(channelId, "fx:reverbSend")}
          onRandomize={() =>
            onRandomizeParameter("reverbSend", () =>
              clampSend(randomInRange(MIN_SEND, MAX_SEND)),
            )
          }
          onClearLocks={() => onClearLockedParameter("reverbSend")}
        />

        <RotaryKnob
          label="Phaser"
          ariaLabel="Phaser send"
          min={MIN_SEND}
          max={MAX_SEND}
          step={0.01}
          value={shown.phaserSend}
          readout={readout(shown.phaserSend)}
          onChange={(value) => onPhaserSendChange(clampSend(value))}
          {...lockProps("phaserSend")}
          midiMapId={channelMidiMapId(channelId, "fx:phaserSend")}
          onRandomize={() =>
            onRandomizeParameter("phaserSend", () =>
              clampSend(randomInRange(MIN_SEND, MAX_SEND)),
            )
          }
          onClearLocks={() => onClearLockedParameter("phaserSend")}
        />
      </div>
    </div>
  );
}
