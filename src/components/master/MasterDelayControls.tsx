"use client";

import MasterFxSection from "./MasterFxSection";
import RailSlider from "@/components/ui/RailSlider";
import {
  DELAY_DIVISIONS,
  DELAY_DIVISION_LABELS,
  MAX_DELAY_SECONDS,
  MAX_FEEDBACK,
  MAX_SEND,
  MAX_VOLUME,
  MIN_DELAY_SECONDS,
  MIN_FEEDBACK,
  MIN_SEND,
  MIN_VOLUME,
  clampDelayDivision,
  clampDelaySeconds,
  clampFeedback,
  clampSend,
  clampVolume,
  delayTimeSeconds,
  formatFrequency,
  formatSeconds,
  frequencyToSlider,
  isHighCutBypassed,
  sliderToFrequency,
  type MasterDelay,
} from "@/lib/sequencer";

/**
 * The one `<select>` entry that is not a division. Divisions all look like
 * "1/8d", so this can never collide with one.
 */
const FREE_OPTION = "free";

/** The two mode `<select>` values. Ping-pong is the one that isn't stereo. */
const STEREO_OPTION = "stereo";
const PING_PONG_OPTION = "pingpong";

type MasterDelayControlsProps = {
  delay: MasterDelay;
  /** Only used to resolve and display a synced time. */
  bpm: number;
  onChange: (delay: MasterDelay) => void;
};

/**
 * The delay bus. This is a send, not an insert: channels decide how much of
 * themselves to feed it from their own Delay control, and what is set here is
 * only what the bus does with whatever arrives.
 *
 * So the toggle silences the return rather than bypassing a path — with every
 * channel send closed this section is inaudible no matter how it is set.
 *
 * Time is set either by locking to a note value or by dialling a free time in
 * milliseconds. Both are kept, so switching between them is non-destructive.
 *
 * Mode decides where the repeats land: stereo leaves them where the channels
 * that sent them are panned, ping-pong throws them from one side to the other
 * instead. Ping-pong is the wider of the two by some distance, and the reason
 * is that it stops being a copy of the mix and becomes movement of its own. It
 * stops short of the hard edges, so the alternation is felt without the repeats
 * detaching from the middle of the image; see PING_PONG_PAN.
 *
 * The bus is also a sender in its own right: "To reverb" passes the return on
 * into the reverb bus, so the repeats can be given the same space the channels
 * are sitting in instead of arriving dry on top of it.
 */
export default function MasterDelayControls({
  delay,
  bpm,
  onChange,
}: MasterDelayControlsProps) {
  return (
    <MasterFxSection
      title="Delay"
      toggleLabel="Master delay"
      enabled={delay.enabled}
      onToggle={() => onChange({ ...delay, enabled: !delay.enabled })}
    >
      {/*
        Sync and the free time are one control, not a toggle beside a slider:
        picking a division and picking "Free" are the same decision, so they
        belong in the same list. The readout resolves the division against the
        tempo, and follows the BPM knob.
      */}
      <label className="flex flex-col gap-1 text-xs">
        <span className="flex items-baseline justify-between">
          <span>Sync</span>
          {delay.synced && (
            <span className="text-muted tabular-nums">
              {formatSeconds(delayTimeSeconds(delay, bpm))}
            </span>
          )}
        </span>
        <select
          value={delay.synced ? delay.division : FREE_OPTION}
          onChange={(event) => {
            const value = event.target.value;
            // Neither field is cleared on the way past, so flipping back and
            // forth returns to whatever was last dialled in on each side.
            onChange(
              value === FREE_OPTION
                ? { ...delay, synced: false }
                : {
                    ...delay,
                    synced: true,
                    division: clampDelayDivision(value),
                  },
            );
          }}
          aria-label="Master delay sync"
          className="border-edge bg-field w-full rounded border px-2 py-1"
        >
          <option value={FREE_OPTION}>Free</option>
          {DELAY_DIVISIONS.map((division) => (
            <option key={division} value={division}>
              {DELAY_DIVISION_LABELS[division]}
            </option>
          ))}
        </select>
      </label>

      {!delay.synced && (
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
          midiMapId="master:delay:time"
        />
      )}

      {/*
        The second of the two choices here, and it sits below the time rather
        than above it because it is heard on the repeats the time sets out: in
        ping-pong the bus is summed, placed out to one side and swapped on every
        trip, so the echoes alternate across the speakers. That replaces the
        panning the sends arrive with — worth knowing before reaching for it on
        a kit that is already spread out.
      */}
      <label className="flex flex-col gap-1 text-xs">
        <span>Mode</span>
        <select
          value={delay.pingPong ? PING_PONG_OPTION : STEREO_OPTION}
          onChange={(event) =>
            onChange({
              ...delay,
              pingPong: event.target.value === PING_PONG_OPTION,
            })
          }
          aria-label="Master delay mode"
          className="border-edge bg-field w-full rounded border px-2 py-1"
        >
          <option value={STEREO_OPTION}>Stereo</option>
          <option value={PING_PONG_OPTION}>Ping-pong</option>
        </select>
      </label>

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
        midiMapId="master:delay:feedback"
      />

      {/*
        Sits below Feedback because that is where it sits in the signal too: the
        filter is inside the loop, so this is the tone of the *repeats* rather
        than of the return, and each one comes back darker than the last. Shares
        the cutoff scale the filters use, so the readout is a real Hz.
      */}
      <RailSlider
        label="Tone"
        ariaLabel="Master delay tone"
        min={0}
        max={1}
        step={0.001}
        value={frequencyToSlider(delay.toneHz)}
        readout={
          isHighCutBypassed(delay.toneHz)
            ? "Open"
            : formatFrequency(delay.toneHz)
        }
        onChange={(position) =>
          onChange({ ...delay, toneHz: sliderToFrequency(position) })
        }
        midiMapId="master:delay:tone"
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
        midiMapId="master:delay:level"
      />

      {/*
        Last, because the send is taken after the level: it feeds the reverb bus
        whatever the return is putting out, so it reads as the end of this
        stage rather than as a second output alongside it.
      */}
      <RailSlider
        label="To reverb"
        ariaLabel="Master delay reverb send"
        min={MIN_SEND}
        max={MAX_SEND}
        step={0.01}
        value={delay.reverbSend}
        readout={`${Math.round(delay.reverbSend * 100)}%`}
        onChange={(value) =>
          onChange({ ...delay, reverbSend: clampSend(value) })
        }
        midiMapId="master:delay:reverbSend"
      />
    </MasterFxSection>
  );
}
