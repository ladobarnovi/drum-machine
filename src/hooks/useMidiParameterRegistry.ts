"use client";

import { useEffect, type Dispatch, type SetStateAction } from "react";

import {
  CHANNEL_MIDI_PARAMETERS,
  MASTER_COMPRESSOR_PARAMETERS,
  MASTER_DELAY_PARAMETERS,
  MASTER_DRIVE_PARAMETERS,
  MASTER_FILTER_PARAMETERS,
  MASTER_PHASER_PARAMETERS,
  MASTER_REVERB_PARAMETERS,
  MASTER_VOLUME_MAP_ID,
  channelMidiMapId,
  type MasterMidiParameter,
} from "@/lib/midiParameters";
import { registerMidiControl } from "@/lib/midiCcMap";
import {
  MAX_VOLUME,
  MIN_VOLUME,
  clampVolume,
  type Channel,
  type MasterCompressor,
  type MasterDelay,
  type MasterDrive,
  type MasterFilter,
  type MasterPhaser,
  type MasterReverb,
} from "@/lib/sequencer";

type UseMidiParameterRegistryOptions = {
  /** Only the ids are read: what each CC writes is resolved at the moment it lands. */
  channels: Channel[];
  updateChannelWith: (
    channelId: string,
    makePatch: (channel: Channel) => Partial<Channel>,
  ) => void;
  setMasterVolume: Dispatch<SetStateAction<number>>;
  setMasterDrive: Dispatch<SetStateAction<MasterDrive>>;
  setMasterFilter: Dispatch<SetStateAction<MasterFilter>>;
  setMasterDelay: Dispatch<SetStateAction<MasterDelay>>;
  setMasterReverb: Dispatch<SetStateAction<MasterReverb>>;
  setMasterPhaser: Dispatch<SetStateAction<MasterPhaser>>;
  setMasterCompressor: Dispatch<SetStateAction<MasterCompressor>>;
};

/**
 * Keeps every MIDI-mappable parameter registered for as long as the machine is
 * running, rather than only while the knob that shows it happens to be on
 * screen.
 *
 * Registration used to live in the controls themselves, which meant a mapping
 * went dead the moment its tab was closed or another channel was selected —
 * the binding was still saved, but there was nothing left listening for it. A
 * mapped knob is a wire to a parameter, so the wire is held here, next to the
 * state it writes to and mounted exactly once, and the controls are left with
 * only the part that really is theirs: showing which CC they answer to and
 * starting a learn (see `useMidiLearnControl`).
 */
export function useMidiParameterRegistry({
  channels,
  updateChannelWith,
  setMasterVolume,
  setMasterDrive,
  setMasterFilter,
  setMasterDelay,
  setMasterReverb,
  setMasterPhaser,
  setMasterCompressor,
}: UseMidiParameterRegistryOptions) {
  /*
   * Every write below goes through the updater form rather than reading the
   * current value from a prop or a ref.
   *
   * Not merely tidier — required. A CC lands outside React's own flow, so two
   * arriving in the same tick both see the state as it was before either of
   * them, and a parameter that writes a nested object (an LFO's rate, any of
   * the master stages) would rebuild it from that stale copy and quietly undo
   * the other's work. A controller sending its whole state at once, or a hand
   * on two knobs, is enough to hit it. The updater form composes instead.
   */

  // Only the ids matter to the registration itself, so this rebuilds when a
  // channel is added or removed and at no other time.
  const channelIds = channels.map((channel) => channel.id).join(",");

  useEffect(() => {
    const cleanups: Array<() => void> = [];

    /** Registers one group of master parameters against its own setter. */
    function registerMasterGroup<T>(
      parameters: Record<string, MasterMidiParameter<T>>,
      setGroup: Dispatch<SetStateAction<T>>,
    ): void {
      for (const [mapId, parameter] of Object.entries(parameters)) {
        cleanups.push(
          registerMidiControl(mapId, parameter.min, parameter.max, (value) => {
            setGroup((current) => parameter.write(value, current));
          }),
        );
      }
    }

    for (const channelId of channelIds.split(",")) {
      for (const [suffix, parameter] of Object.entries(
        CHANNEL_MIDI_PARAMETERS,
      )) {
        cleanups.push(
          registerMidiControl(
            channelMidiMapId(channelId, suffix),
            parameter.min,
            parameter.max,
            (value) => {
              updateChannelWith(channelId, (channel) =>
                parameter.write(value, channel),
              );
            },
          ),
        );
      }
    }

    cleanups.push(
      registerMidiControl(
        MASTER_VOLUME_MAP_ID,
        MIN_VOLUME,
        MAX_VOLUME,
        (value) => setMasterVolume(clampVolume(value)),
      ),
    );

    registerMasterGroup(MASTER_DRIVE_PARAMETERS, setMasterDrive);
    registerMasterGroup(MASTER_FILTER_PARAMETERS, setMasterFilter);
    registerMasterGroup(MASTER_DELAY_PARAMETERS, setMasterDelay);
    registerMasterGroup(MASTER_REVERB_PARAMETERS, setMasterReverb);
    registerMasterGroup(MASTER_PHASER_PARAMETERS, setMasterPhaser);
    registerMasterGroup(MASTER_COMPRESSOR_PARAMETERS, setMasterCompressor);

    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  }, [
    channelIds,
    updateChannelWith,
    setMasterVolume,
    setMasterDrive,
    setMasterFilter,
    setMasterDelay,
    setMasterReverb,
    setMasterPhaser,
    setMasterCompressor,
  ]);
}
