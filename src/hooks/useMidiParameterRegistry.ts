"use client";

import { useEffect, useRef } from "react";

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
  channels: Channel[];
  updateChannel: (channelId: string, patch: Partial<Channel>) => void;
  masterVolume: number;
  setMasterVolume: (volume: number) => void;
  masterDrive: MasterDrive;
  setMasterDrive: (drive: MasterDrive) => void;
  masterFilter: MasterFilter;
  setMasterFilter: (filter: MasterFilter) => void;
  masterDelay: MasterDelay;
  setMasterDelay: (delay: MasterDelay) => void;
  masterReverb: MasterReverb;
  setMasterReverb: (reverb: MasterReverb) => void;
  masterPhaser: MasterPhaser;
  setMasterPhaser: (phaser: MasterPhaser) => void;
  masterCompressor: MasterCompressor;
  setMasterCompressor: (compressor: MasterCompressor) => void;
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
  updateChannel,
  masterVolume,
  setMasterVolume,
  masterDrive,
  setMasterDrive,
  masterFilter,
  setMasterFilter,
  masterDelay,
  setMasterDelay,
  masterReverb,
  setMasterReverb,
  masterPhaser,
  setMasterPhaser,
  masterCompressor,
  setMasterCompressor,
}: UseMidiParameterRegistryOptions) {
  /*
   * The current values are read through a ref at the moment a CC lands rather
   * than captured when the registration is made. A CC that arrives has to act
   * on the mix as it is right now, and depending on the values directly would
   * mean tearing down and rebuilding all ~110 registrations on every turn of
   * every knob — including the one the CC itself just moved.
   */
  const latest = useRef({
    channels,
    masterVolume,
    masterDrive,
    masterFilter,
    masterDelay,
    masterReverb,
    masterPhaser,
    masterCompressor,
  });
  useEffect(() => {
    latest.current = {
      channels,
      masterVolume,
      masterDrive,
      masterFilter,
      masterDelay,
      masterReverb,
      masterPhaser,
      masterCompressor,
    };
  });

  // Only the ids matter to the registration itself — the values behind them
  // are reached through the ref — so this rebuilds when a channel is added or
  // removed and at no other time.
  const channelIds = channels.map((channel) => channel.id).join(",");

  useEffect(() => {
    const cleanups: Array<() => void> = [];

    /** Registers one group of master parameters against its own setter. */
    function registerMasterGroup<T>(
      parameters: Record<string, MasterMidiParameter<T>>,
      read: () => T,
      write: (next: T) => void,
    ): void {
      for (const [mapId, parameter] of Object.entries(parameters)) {
        cleanups.push(
          registerMidiControl(mapId, parameter.min, parameter.max, (value) => {
            write(parameter.write(value, read()));
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
              const channel = latest.current.channels.find(
                (candidate) => candidate.id === channelId,
              );
              if (!channel) return;
              updateChannel(channelId, parameter.write(value, channel));
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

    registerMasterGroup(
      MASTER_DRIVE_PARAMETERS,
      () => latest.current.masterDrive,
      setMasterDrive,
    );
    registerMasterGroup(
      MASTER_FILTER_PARAMETERS,
      () => latest.current.masterFilter,
      setMasterFilter,
    );
    registerMasterGroup(
      MASTER_DELAY_PARAMETERS,
      () => latest.current.masterDelay,
      setMasterDelay,
    );
    registerMasterGroup(
      MASTER_REVERB_PARAMETERS,
      () => latest.current.masterReverb,
      setMasterReverb,
    );
    registerMasterGroup(
      MASTER_PHASER_PARAMETERS,
      () => latest.current.masterPhaser,
      setMasterPhaser,
    );
    registerMasterGroup(
      MASTER_COMPRESSOR_PARAMETERS,
      () => latest.current.masterCompressor,
      setMasterCompressor,
    );

    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  }, [
    channelIds,
    updateChannel,
    setMasterVolume,
    setMasterDrive,
    setMasterFilter,
    setMasterDelay,
    setMasterReverb,
    setMasterPhaser,
    setMasterCompressor,
  ]);
}
