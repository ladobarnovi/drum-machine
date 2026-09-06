"use client";

import { useCallback, useEffect, useState } from "react";

import {
  DEFAULT_MASTER_COMPRESSOR,
  DEFAULT_MASTER_DELAY,
  DEFAULT_MASTER_DRIVE,
  DEFAULT_MASTER_FILTER,
  DEFAULT_MASTER_PHASER,
  DEFAULT_MASTER_REVERB,
  DEFAULT_MASTER_VOLUME,
  type MasterCompressor,
  type MasterDelay,
  type MasterDrive,
  type MasterFilter,
  type MasterPhaser,
  type MasterReverb,
} from "@/lib/sequencer";

/** The six stages the mix is put through, without the output fader. */
export type MasterStages = {
  drive: MasterDrive;
  filter: MasterFilter;
  delay: MasterDelay;
  reverb: MasterReverb;
  phaser: MasterPhaser;
  compressor: MasterCompressor;
};

type UseMasterChainOptions = {
  /**
   * The tempo the delay is resolved against, so a synced time tracks the
   * transport. The only stage that depends on anything outside itself.
   */
  bpm: number;
  applyDrive: (drive: MasterDrive) => void;
  applyFilter: (filter: MasterFilter) => void;
  applyDelay: (delay: MasterDelay, bpm: number) => void;
  applyReverb: (reverb: MasterReverb) => void;
  applyPhaser: (phaser: MasterPhaser) => void;
  applyCompressor: (compressor: MasterCompressor) => void;
  applyVolume: (volume: number) => void;
};

/**
 * The master rail: six stages and the output fader, each held as state and
 * pushed to the audio graph when it changes.
 *
 * The push is what makes these different from a channel's settings. A stage is
 * a persistent node rather than one built per hit, so nothing reads it at
 * trigger time — it has to be told. That gave seven near-identical
 * state-and-effect pairs, which is what this collects.
 */
export function useMasterChain({
  bpm,
  applyDrive,
  applyFilter,
  applyDelay,
  applyReverb,
  applyPhaser,
  applyCompressor,
  applyVolume,
}: UseMasterChainOptions) {
  const [drive, setDrive] = useState<MasterDrive>(DEFAULT_MASTER_DRIVE);
  const [filter, setFilter] = useState<MasterFilter>(DEFAULT_MASTER_FILTER);
  const [delay, setDelay] = useState<MasterDelay>(DEFAULT_MASTER_DELAY);
  const [reverb, setReverb] = useState<MasterReverb>(DEFAULT_MASTER_REVERB);
  const [phaser, setPhaser] = useState<MasterPhaser>(DEFAULT_MASTER_PHASER);
  const [compressor, setCompressor] = useState<MasterCompressor>(
    DEFAULT_MASTER_COMPRESSOR,
  );
  const [volume, setVolume] = useState(DEFAULT_MASTER_VOLUME);

  useEffect(() => {
    applyDrive(drive);
  }, [applyDrive, drive]);

  useEffect(() => {
    applyFilter(filter);
  }, [applyFilter, filter]);

  // The send buses are persistent too. Only the per-channel send amounts are
  // read at trigger time, since those ride the voice rather than the bus.
  useEffect(() => {
    applyDelay(delay, bpm);
  }, [applyDelay, bpm, delay]);

  useEffect(() => {
    applyReverb(reverb);
  }, [applyReverb, reverb]);

  useEffect(() => {
    applyPhaser(phaser);
  }, [applyPhaser, phaser]);

  useEffect(() => {
    applyCompressor(compressor);
  }, [applyCompressor, compressor]);

  useEffect(() => {
    applyVolume(volume);
  }, [applyVolume, volume]);

  /**
   * Replaces all six stages at once, for the two things that carry a whole
   * rail: recalling a snapshot, and opening a shared beat. The fader is not
   * among them — a snapshot sets it, a link deliberately does not.
   */
  const setStages = useCallback((stages: MasterStages) => {
    setDrive(stages.drive);
    setFilter(stages.filter);
    setDelay(stages.delay);
    setReverb(stages.reverb);
    setPhaser(stages.phaser);
    setCompressor(stages.compressor);
  }, []);

  return {
    drive,
    setDrive,
    filter,
    setFilter,
    delay,
    setDelay,
    reverb,
    setReverb,
    phaser,
    setPhaser,
    compressor,
    setCompressor,
    volume,
    setVolume,
    setStages,
  };
}
