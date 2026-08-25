"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import ChannelContextMenu from "@/components/channel/ChannelContextMenu";
import ChannelGrid from "@/components/channel/ChannelGrid";
import SampleEditorTabsSection from "@/components/channel/SampleEditorTabsSection";
import StepEditBanner from "@/components/channel/StepEditBanner";
import StepContextMenu from "@/components/channel/steps/StepContextMenu";
import MasterCompressorControls from "@/components/master/MasterCompressorControls";
import MasterDelayControls from "@/components/master/MasterDelayControls";
import MasterDriveControls from "@/components/master/MasterDriveControls";
import MasterFilterControls from "@/components/master/MasterFilterControls";
import MasterPhaserControls from "@/components/master/MasterPhaserControls";
import MasterReverbControls from "@/components/master/MasterReverbControls";
import MasterVolumeControls from "@/components/master/MasterVolumeControls";
import Oscilloscope from "@/components/master/Oscilloscope";
import PatternContextMenu from "@/components/patterns/PatternContextMenu";
import SequencerTabsSection from "@/components/patterns/SequencerTabsSection";
import PresetPicker from "@/components/session/PresetPicker";
import SnapshotControls from "@/components/session/SnapshotControls";
import LoadSamplesNotice from "@/components/shell/LoadSamplesNotice";
import SettingsButton from "@/components/shell/SettingsButton";
import SharePanel from "@/components/shell/SharePanel";
import SharedBeatNotice, {
  type SharedBeatStatus,
} from "@/components/shell/SharedBeatNotice";
import MobileFooterNav, {
  type MobilePage,
} from "@/components/shell/MobileFooterNav";
import Sidebar, {
  CONTROLS_SIDEBAR_ID,
  FX_SIDEBAR_ID,
} from "@/components/shell/Sidebar";
import Transport from "@/components/transport/Transport";
import RailTabs from "@/components/ui/RailTabs";
import { useBanks } from "@/hooks/useBanks";
import { useChannelFlash } from "@/hooks/useChannelFlash";
import { useChannelShortcuts } from "@/hooks/useChannelShortcuts";
import { useMasterFilterShortcuts } from "@/hooks/useMasterFilterShortcuts";
import { useAudioOutput } from "@/hooks/useAudioOutput";
import { useMidiAccess } from "@/hooks/useMidiAccess";
import { useMidiClockInput } from "@/hooks/useMidiClockInput";
import { useMidiClockOutput } from "@/hooks/useMidiClockOutput";
import { useMidiInput } from "@/hooks/useMidiInput";
import { useMidiParameterRegistry } from "@/hooks/useMidiParameterRegistry";
import { useSampleBank } from "@/hooks/useSampleBank";
import { useSequencer } from "@/hooks/useSequencer";
import { useTransportShortcuts } from "@/hooks/useTransportShortcuts";
import {
  CHANNEL_COUNT,
  DEFAULT_BPM,
  DEFAULT_MASTER_COMPRESSOR,
  DEFAULT_MASTER_DELAY,
  DEFAULT_MASTER_DRIVE,
  DEFAULT_MASTER_FILTER,
  DEFAULT_MASTER_PHASER,
  DEFAULT_MASTER_REVERB,
  DEFAULT_MASTER_VOLUME,
  DEFAULT_SAMPLE_END,
  DEFAULT_SAMPLE_MODE,
  DEFAULT_SAMPLE_REVERSED,
  DEFAULT_SAMPLE_START,
  DEFAULT_SLICE_COUNT,
  DEFAULT_SWING,
  DEFAULT_SWIPE_TARGET,
  applyChannelSnapshots,
  applyStepFill,
  captureChannelSnapshots,
  channelDisplayName,
  channelIdForIndex,
  channelSettingsForStep,
  channelsChokedBy,
  clampAttack,
  clampChannelName,
  clampChokeSource,
  clampDecay,
  clampFrequency,
  clampLength,
  clampPan,
  clampPitch,
  clampRelease,
  clampResonance,
  clampSampleEnd,
  clampSampleStart,
  clampSend,
  clampSustain,
  clampVolume,
  clearStepAt,
  clearStepLockAt,
  clampStepTiming,
  clearStepLocksAt,
  clearSteps,
  createInitialChannels,
  emptyChannel,
  hasSoloedChannel,
  humanizeSteps,
  invertSteps,
  isChannelAudible,
  isSliced,
  isStepCleared,
  lastFiredStepAt,
  nudgeSteps,
  pasteStepAt,
  repeatOffsets,
  secondsToNextStep,
  setStepLockAt,
  setStepProbabilityAt,
  setStepRepeatAt,
  setStepSliceAt,
  setStepTimingAt,
  setStepVelocityAt,
  stepFires,
  toggleStepAt,
  triggerOptionsForChannel,
  type Channel,
  type ChannelLfo,
  type FilterSlope,
  type LockableParameter,
  type MasterCompressor,
  type MasterDelay,
  type MasterDrive,
  type MasterFilter,
  type MasterPhaser,
  type MasterReverb,
  type ParameterSnapshot,
  type SampleMode,
  type SampleState,
  type SliceCount,
  type Step,
  type StepFill,
  type SwipeTarget,
} from "@/lib/sequencer";
import { handleIncomingCc } from "@/lib/midiCcMap";
import { applyPattern } from "@/lib/patterns";
import {
  applySharedBeat,
  buildShareUrl,
  captureSharedBeat,
  clearShareToken,
  decodeSharedBeat,
  encodeSharedBeat,
  isWorthSharing,
  readShareToken,
  sharedBeatKit,
  type SharedBeat,
} from "@/lib/patternShare";
import {
  DEFAULT_PRESET,
  PRESETS,
  presetEntries,
  type Preset,
} from "@/lib/presets";
import {
  channelNameFollowsSample,
  findLibrarySample,
  librarySampleLabel,
  librarySampleUrl,
  type LibraryEntry,
} from "@/lib/sampleLibrary";
import { computePeaks } from "@/lib/waveform";

/** Back to playing the whole file, which is what "Reset trim" asks for. */
const UNTRIMMED = {
  sampleStart: DEFAULT_SAMPLE_START,
  sampleEnd: DEFAULT_SAMPLE_END,
} as const;

/**
 * Every edit made to the sample in a slot, undone. Applied wherever the slot
 * changes hands, because the handles index into the sample that was in it: a
 * start point two thirds of the way through the old file means nothing in the
 * new one, and would quietly hand back a hit that is mostly silence.
 *
 * The direction and the slicing go with them, unlike on a trim reset — that
 * button is about the handles alone, where a new file arriving to find itself
 * already playing backwards, or already cut into 24 parts of which the pattern
 * only asks for a few, would be a surprise nothing on screen accounts for.
 */
const UNEDITED = {
  ...UNTRIMMED,
  sampleReversed: DEFAULT_SAMPLE_REVERSED,
  sampleMode: DEFAULT_SAMPLE_MODE,
  sliceCount: DEFAULT_SLICE_COUNT,
} as const;

export default function DrumMachine() {
  const [channels, setChannels] = useState<Channel[]>(createInitialChannels);
  const {
    banks,
    selectedBankIndex,
    selectBank,
    activePattern,
    getPattern,
    savePattern,
    deletePattern,
    markPatternActive,
  } = useBanks();
  const [bpm, setBpm] = useState(DEFAULT_BPM);
  const [swing, setSwing] = useState(DEFAULT_SWING);

  /**
   * Whether the transport runs at the BPM dialled into the slider, or at
   * whatever tempo the incoming MIDI clock is estimated to be running —
   * see `useMidiClockInput`. Kept apart from `bpm` itself rather than
   * overwriting it while external, so switching back to Internal lands
   * exactly where the slider was left rather than wherever the last
   * incoming pulse happened to land it.
   *
   * Not persisted, unlike the device selections: defaulting back to
   * Internal on every reload is what keeps a machine nobody has plugged
   * a clock into today from silently waiting on one that's never coming.
   */
  const [midiClockSource, setMidiClockSource] = useState<
    "internal" | "external"
  >("internal");
  const midiClockInput = useMidiClockInput();

  /**
   * The tempo actually driving the transport right now — read everywhere
   * `bpm` used to be read for anything that has to follow what's actually
   * playing, while the slider's own `bpm` is left to mean only what it has
   * always meant: where the dial is set.
   */
  const effectiveBpm =
    midiClockSource === "external" && midiClockInput.estimatedBpm !== null
      ? midiClockInput.estimatedBpm
      : bpm;

  const [selectedChannelId, setSelectedChannelId] = useState(
    channelIdForIndex(0),
  );
  /**
   * Which of the three pages is showing, only meaningful below `xl` — from
   * there up all three are on screen at once and this is ignored. Starts on
   * Main so the machine opens the same way it always has.
   */
  const [mobilePage, setMobilePage] = useState<MobilePage>("main");

  /**
   * Which step of the selected channel the controls panel is pointed at, or
   * null while it is pointed at the channel itself.
   *
   * Held raw and narrowed below rather than used directly: a step can stop
   * playing under it — the channel shortened past it, or another channel
   * selected — and the editor has to close with it rather than stay open on a
   * step that is no longer there.
   */
  const [rawEditingStepIndex, setRawEditingStepIndex] = useState<number | null>(
    null,
  );

  /** Which step's right-click menu is open, and where it was raised. */
  const [contextMenuStep, setContextMenuStep] = useState<{
    index: number;
    x: number;
    y: number;
  } | null>(null);

  /** The last step copied from the grid's context menu, or null until one is. */
  const [clipboardStep, setClipboardStep] = useState<Step | null>(null);

  /** Which channel's right-click menu is open, and where it was raised. */
  const [contextMenuChannel, setContextMenuChannel] = useState<{
    channelId: string;
    x: number;
    y: number;
  } | null>(null);

  /** The last steps copied from a channel's context menu. */
  const [clipboardSteps, setClipboardSteps] = useState<{
    steps: Step[];
    length: number;
  } | null>(null);

  /** Which pattern slot's right-click menu is open, and where it was raised. */
  const [contextMenuPattern, setContextMenuPattern] = useState<{
    index: number;
    x: number;
    y: number;
  } | null>(null);

  /** The last sample copied from a channel's context menu. */
  const [clipboardSample, setClipboardSample] = useState<{
    buffer: AudioBuffer;
    sample: SampleState;
    /** The trim it was copied with, as fractions of the file. */
    start: number;
    end: number;
    /** Whether it was playing backwards when it was copied. */
    reversed: boolean;
    /** And how it was cut up, if it was. */
    mode: SampleMode;
    sliceCount: SliceCount;
  } | null>(null);

  /**
   * What a vertical swipe across the step grid writes.
   *
   * Kept on the machine rather than on the channel, because it is a choice about
   * what you are doing right now — knocking out a rhythm, or writing a line —
   * rather than a fact about the channel. Tuning a kick by swiping down its row
   * is the same gesture as writing a bassline, and neither is a property the
   * channel should have to carry around afterwards.
   */
  const [swipeTarget, setSwipeTarget] =
    useState<SwipeTarget>(DEFAULT_SWIPE_TARGET);

  /**
   * Which preset is being fetched, if any. Starts on the default kit rather
   * than on null, because the machine is about to load it: the effect below
   * only runs after the first paint, and starting at null would show a frame
   * of the empty-kit notice and an idle picker before it did.
   */
  const [loadingPresetId, setLoadingPresetId] = useState<string | null>(
    DEFAULT_PRESET.id,
  );

  const [masterDrive, setMasterDrive] =
    useState<MasterDrive>(DEFAULT_MASTER_DRIVE);
  const [masterFilter, setMasterFilter] = useState<MasterFilter>(
    DEFAULT_MASTER_FILTER,
  );
  const [masterDelay, setMasterDelay] =
    useState<MasterDelay>(DEFAULT_MASTER_DELAY);
  const [masterReverb, setMasterReverb] = useState<MasterReverb>(
    DEFAULT_MASTER_REVERB,
  );
  const [masterPhaser, setMasterPhaser] = useState<MasterPhaser>(
    DEFAULT_MASTER_PHASER,
  );
  const [masterCompressor, setMasterCompressor] = useState<MasterCompressor>(
    DEFAULT_MASTER_COMPRESSOR,
  );
  const [masterVolume, setMasterVolume] = useState(DEFAULT_MASTER_VOLUME);

  /** The last saved parameter snapshot, or null until one has been taken. */
  const [snapshot, setSnapshot] = useState<ParameterSnapshot | null>(null);

  const selectedChannel =
    channels.find((channel) => channel.id === selectedChannelId) ?? channels[0];

  /**
   * The step the controls are editing, narrowed to one that still plays.
   *
   * Derived rather than trusted, so shortening a channel past the open step
   * closes the editor instead of leaving it pointed at a step that has dropped
   * out of the cycle — and so the same is true for any other way a step could
   * stop being reachable, without each needing to remember to clear this.
   */
  const editingStepIndex =
    rawEditingStepIndex !== null &&
    rawEditingStepIndex < clampLength(selectedChannel.length)
      ? rawEditingStepIndex
      : null;

  const editingStep: Step | null =
    editingStepIndex === null ? null : selectedChannel.steps[editingStepIndex];

  /** The channel the open context menu belongs to, whichever pad raised it. */
  const contextMenuChannelTarget =
    contextMenuChannel === null
      ? null
      : (channels.find(
          (channel) => channel.id === contextMenuChannel.channelId,
        ) ?? null);

  const {
    ensureContext,
    applyAudioOutput,
    applyMasterDrive,
    applyMasterFilter,
    applyMasterDelay,
    applyMasterReverb,
    applyMasterPhaser,
    applyMasterCompressor,
    getGainReduction,
    getWaveform,
    getChannelLevel,
    applyMasterVolume,
    loadSample,
    loadSampleFromUrl,
    removeSample,
    getSampleBuffer,
    setSampleBuffer,
    trigger,
    getSamplePosition,
    choke,
  } = useSampleBank();

  // Bound to the selected channel here rather than in the editor, which is the
  // one place that knows whose sample is on the strip. Stable while the
  // selection is, so the waveform's own frame loop is never restarted by a
  // render it had no interest in.
  const getSelectedPlayhead = useCallback(
    () => getSamplePosition(selectedChannel.id),
    [getSamplePosition, selectedChannel.id],
  );

  // The master stages are persistent nodes rather than per-hit ones, so they
  // are pushed across on change instead of being read at trigger time.
  useEffect(() => {
    applyMasterDrive(masterDrive);
  }, [applyMasterDrive, masterDrive]);

  useEffect(() => {
    applyMasterFilter(masterFilter);
  }, [applyMasterFilter, masterFilter]);

  // The send buses are persistent too. Only the per-channel send amounts are
  // read at trigger time, since those ride the voice rather than the bus.
  // The delay depends on the tempo as well, so a BPM change re-applies it and
  // a synced delay tracks the transport.
  useEffect(() => {
    applyMasterDelay(masterDelay, effectiveBpm);
  }, [applyMasterDelay, effectiveBpm, masterDelay]);

  useEffect(() => {
    applyMasterReverb(masterReverb);
  }, [applyMasterReverb, masterReverb]);

  useEffect(() => {
    applyMasterPhaser(masterPhaser);
  }, [applyMasterPhaser, masterPhaser]);

  useEffect(() => {
    applyMasterCompressor(masterCompressor);
  }, [applyMasterCompressor, masterCompressor]);

  useEffect(() => {
    applyMasterVolume(masterVolume);
  }, [applyMasterVolume, masterVolume]);

  // The scheduler runs outside React's render cycle, so it reads the current
  // pattern through a ref rather than through a captured prop.
  const channelsRef = useRef(channels);
  useEffect(() => {
    channelsRef.current = channels;
  }, [channels]);

  const { flashedChannelIds, flashChannels, clearFlashes } = useChannelFlash({
    ensureContext,
  });

  // Each channel wraps the absolute tick by its own length, so channels with
  // different lengths drift against each other instead of restarting together.
  const handleStep = useCallback(
    (tick: number, time: number) => {
      const soloActive = hasSoloedChannel(channelsRef.current);
      const firedChannelIds: string[] = [];
      // The gap to the next tick, swing included — what a step's own repeats
      // have to fit inside without running into the one after it.
      const stepDuration = secondsToNextStep(tick, effectiveBpm, swing);

      for (const channel of channelsRef.current) {
        if (!isChannelAudible(channel, soloActive)) continue;

        // The step is handed to the options rather than only consulted, so its
        // velocity and whatever it locks reach this one hit and nothing else.
        const step = channel.steps[tick % clampLength(channel.length)];
        if (!step.on) continue;
        // Rolled once per step rather than once per repeat, so a roll either
        // happens in full or not at all — never half-fires.
        if (!stepFires(step.probability)) continue;

        // The step's own nudge off the grid, on top of whichever repeat is
        // firing — a roll moves with the hit that owns it rather than staying
        // pinned to the grid the hit itself has stepped off.
        const hitTime = time + clampStepTiming(step.timingOffset);
        const options = triggerOptionsForChannel(channel, step);
        for (const offset of repeatOffsets(step.repeatCount, stepDuration)) {
          trigger(channel.id, hitTime + offset, options);
        }
        firedChannelIds.push(channel.id);
      }

      // One call for the whole step, so a busy tick lights every pad it hit in
      // a single update.
      flashChannels(firedChannelIds, time);

      // Whatever these hits choke is cut at the same instant they land, and only
      // what was already ringing goes: a channel firing on the same step as the
      // channel that chokes it is heard, not swallowed. A muted or un-soloed
      // channel never reaches this loop, so a channel nobody can hear also
      // cannot take anything away.
      for (const sourceId of firedChannelIds) {
        choke(channelsChokedBy(channelsRef.current, sourceId), time);
      }
    },
    [choke, effectiveBpm, flashChannels, swing, trigger],
  );

  const { isPlaying, currentTick, play, stop } = useSequencer({
    bpm: effectiveBpm,
    swing,
    ensureContext,
    onStep: handleStep,
  });

  /**
   * Applies a partial update to a single channel, working out the patch from
   * that channel as it stands at the moment the update runs.
   *
   * The form `updateChannel` can't offer: a caller that has to read the
   * channel before it can say what to write — an LFO, where one knob's value
   * has to be folded into the object the others live in — would otherwise read
   * it from a render that may already be stale, and hand back a patch that
   * undoes whatever landed in between. See `useMidiParameterRegistry`, whose
   * writes arrive from outside React's flow and can land two to a tick.
   */
  const updateChannelWith = useCallback(
    (channelId: string, makePatch: (channel: Channel) => Partial<Channel>) => {
      setChannels((prev) =>
        prev.map((channel) =>
          channel.id === channelId
            ? { ...channel, ...makePatch(channel) }
            : channel,
        ),
      );
    },
    [],
  );

  /** Applies a partial update to a single channel. */
  const updateChannel = useCallback(
    (channelId: string, patch: Partial<Channel>) => {
      updateChannelWith(channelId, () => patch);
    },
    [updateChannelWith],
  );

  /** Rewrites one channel's pattern, whichever channel that is. */
  const updateStepsForChannel = useCallback(
    (channelId: string, write: (steps: Step[], length: number) => Step[]) => {
      setChannels((prev) =>
        prev.map((channel) =>
          channel.id === channelId
            ? { ...channel, steps: write(channel.steps, channel.length) }
            : channel,
        ),
      );
    },
    [],
  );

  /**
   * Rewrites the selected channel's pattern. Every gesture on the grid comes
   * through here, so each one only has to say what it does to the steps — and
   * the grid is always the selected channel, which is what lets the handlers
   * below take a step index and nothing else.
   */
  const updateSelectedSteps = useCallback(
    (write: (steps: Step[], length: number) => Step[]) => {
      updateStepsForChannel(selectedChannel.id, write);
    },
    [selectedChannel.id, updateStepsForChannel],
  );

  /**
   * A plain click on a step.
   *
   * While a step is open this closes it and does nothing else: the click that
   * dismisses the editor must never also rewrite the step it was aimed at, or
   * there would be no way out of the mode that didn't cost a hit.
   */
  const handleStepClick = useCallback(
    (stepIndex: number) => {
      if (editingStepIndex !== null) {
        setRawEditingStepIndex(null);
        return;
      }

      updateSelectedSteps((steps) => toggleStepAt(steps, stepIndex));
    },
    [editingStepIndex, updateSelectedSteps],
  );

  /**
   * A held press or a swipe: opens the step for editing, switching it on if it
   * was silent. There is nothing to shape about a hit that never happens, and
   * the gesture is a request to shape one.
   */
  const handleStepHold = useCallback(
    (stepIndex: number) => {
      updateSelectedSteps((steps) =>
        steps[stepIndex].on ? steps : toggleStepAt(steps, stepIndex),
      );
      setRawEditingStepIndex(stepIndex);
    },
    [updateSelectedSteps],
  );

  /** A right click on a step: raises its action menu at the pointer. */
  const handleStepContextMenu = useCallback(
    (stepIndex: number, x: number, y: number) => {
      setContextMenuStep({ index: stepIndex, x, y });
    },
    [],
  );

  const closeStepContextMenu = useCallback(() => setContextMenuStep(null), []);

  /** "Clear Step" from the context menu: back to off with nothing set. */
  const handleClearStepFromMenu = useCallback(() => {
    if (contextMenuStep === null) return;
    updateSelectedSteps((steps) => clearStepAt(steps, contextMenuStep.index));
  }, [contextMenuStep, updateSelectedSteps]);

  /** "Edit Step" from the context menu: the same gesture as a held press. */
  const handleEditStepFromMenu = useCallback(() => {
    if (contextMenuStep === null) return;
    handleStepHold(contextMenuStep.index);
  }, [contextMenuStep, handleStepHold]);

  /** "Copy" from the context menu: the step is never mutated in place, so
   *  holding this reference is enough — nothing can change underneath it. */
  const handleCopyStepFromMenu = useCallback(() => {
    if (contextMenuStep === null) return;
    setClipboardStep(selectedChannel.steps[contextMenuStep.index]);
  }, [contextMenuStep, selectedChannel.steps]);

  /** "Paste" from the context menu: overwrites the step with the copied one. */
  const handlePasteStepFromMenu = useCallback(() => {
    if (contextMenuStep === null || clipboardStep === null) return;
    updateSelectedSteps((steps) =>
      pasteStepAt(steps, contextMenuStep.index, clipboardStep),
    );
  }, [contextMenuStep, clipboardStep, updateSelectedSteps]);

  const handleStepVelocityChange = useCallback(
    (stepIndex: number, velocity: number) => {
      updateSelectedSteps((steps) =>
        setStepVelocityAt(steps, stepIndex, velocity),
      );
    },
    [updateSelectedSteps],
  );

  const handleStepProbabilityChange = useCallback(
    (stepIndex: number, probability: number) => {
      updateSelectedSteps((steps) =>
        setStepProbabilityAt(steps, stepIndex, probability),
      );
    },
    [updateSelectedSteps],
  );

  const handleStepRepeatChange = useCallback(
    (stepIndex: number, repeatCount: number) => {
      updateSelectedSteps((steps) =>
        setStepRepeatAt(steps, stepIndex, repeatCount),
      );
    },
    [updateSelectedSteps],
  );

  const handleStepTimingChange = useCallback(
    (stepIndex: number, timingOffset: number) => {
      updateSelectedSteps((steps) =>
        setStepTimingAt(steps, stepIndex, timingOffset),
      );
    },
    [updateSelectedSteps],
  );

  /**
   * Points one step at a slice of the sample. Clamped against the channel's own
   * count on the way in, so the grid can never hold a position that the sample
   * as it is currently cut has no part for.
   */
  const handleStepSliceChange = useCallback(
    (stepIndex: number, slice: number) => {
      updateSelectedSteps((steps) =>
        setStepSliceAt(steps, stepIndex, slice, selectedChannel.sliceCount),
      );
    },
    [selectedChannel.sliceCount, updateSelectedSteps],
  );

  /**
   * Tunes one step, which — unlike its velocity — means writing a lock: pitch
   * belongs to the channel until a step says otherwise. Clamped on the way in,
   * so a swipe lands on whole semitones rather than between them.
   */
  const handleStepPitchChange = useCallback(
    (stepIndex: number, semitones: number) => {
      updateSelectedSteps((steps) =>
        setStepLockAt(steps, stepIndex, "pitch", clampPitch(semitones)),
      );
    },
    [updateSelectedSteps],
  );

  /**
   * Writes one of the ready-made rhythms over a channel's pattern, replacing
   * whatever was there. Overwriting rather than adding to what is programmed
   * keeps each button meaning one thing: press it and the channel plays that
   * rhythm, whatever it was playing before.
   */
  const handleApplyStepFill = useCallback(
    (fill: StepFill) => {
      updateSelectedSteps((steps, length) =>
        applyStepFill(steps, length, fill),
      );
    },
    [updateSelectedSteps],
  );

  const handleNudgeSteps = useCallback(
    (offset: number) => {
      updateSelectedSteps((steps, length) => nudgeSteps(steps, length, offset));
    },
    [updateSelectedSteps],
  );

  const handleClearSteps = useCallback(() => {
    updateSelectedSteps(clearSteps);
  }, [updateSelectedSteps]);

  const handleInvertSteps = useCallback(() => {
    updateSelectedSteps(invertSteps);
  }, [updateSelectedSteps]);

  /**
   * Rolls a fresh scatter over the played hits' velocities. Pressing it again
   * humanizes what the last press left rather than re-rolling from where the
   * pattern started, so the drift accumulates the way a nudge's does.
   */
  const handleHumanizeSteps = useCallback(() => {
    updateSelectedSteps(humanizeSteps);
  }, [updateSelectedSteps]);

  const handleUpload = useCallback(
    async (channelId: string, file: File) => {
      updateChannel(channelId, {
        sample: { status: "loading", name: file.name },
        ...UNEDITED,
      });
      try {
        const buffer = await loadSample(channelId, file);
        updateChannel(channelId, {
          sample: {
            status: "loaded",
            name: file.name,
            peaks: computePeaks(buffer),
            durationSeconds: buffer.duration,
          },
        });
      } catch (error) {
        console.error(`Failed to decode audio for ${channelId}`, error);
        removeSample(channelId);
        updateChannel(channelId, {
          sample: { status: "error", message: "Couldn't load that file" },
        });
      }
    },
    [loadSample, removeSample, updateChannel],
  );

  /**
   * Moves one edge of the region a channel plays.
   *
   * The raw fraction the handle reports is clamped here rather than in the
   * waveform, against the edge that did not move — so the strip only has to say
   * where the pointer went, and there is one place that decides what a legal
   * pair of edges is. Which also means a handle dragged past the other one
   * simply stops, without the display and the setting ever disagreeing.
   */
  const handleSampleStartChange = useCallback(
    (channelId: string, start: number) => {
      setChannels((prev) =>
        prev.map((channel) =>
          channel.id === channelId
            ? {
                ...channel,
                sampleStart: clampSampleStart(start, channel.sampleEnd),
              }
            : channel,
        ),
      );
    },
    [],
  );

  const handleSampleEndChange = useCallback(
    (channelId: string, end: number) => {
      setChannels((prev) =>
        prev.map((channel) =>
          channel.id === channelId
            ? {
                ...channel,
                sampleEnd: clampSampleEnd(end, channel.sampleStart),
              }
            : channel,
        ),
      );
    },
    [],
  );

  /**
   * Turns the sample round. Nothing is touched in the audio bank here: the
   * reversed copy of the file is built by the first hit that needs one, so a
   * channel switched back and forth never pays for it twice and one switched on
   * and never played never pays at all.
   */
  const handleSampleReversedChange = useCallback(
    (channelId: string, reversed: boolean) => {
      updateChannel(channelId, { sampleReversed: reversed });
    },
    [updateChannel],
  );

  /**
   * Switches the sample between playing whole and playing in parts.
   *
   * Nothing is written into the pattern either way: a step's position is left
   * exactly where it was, so a chop survives being auditioned as a one shot and
   * switched back — the same promise a switched-off step's velocity makes.
   */
  const handleSampleModeChange = useCallback(
    (channelId: string, mode: SampleMode) => {
      updateChannel(channelId, { sampleMode: mode });
    },
    [updateChannel],
  );

  /**
   * Re-cuts the sample into a different number of parts.
   *
   * The steps are again left alone. A position past the new count is clamped
   * where it is read rather than rewritten here, so cutting a 24-part chop down
   * to 8 and back hands the pattern back rather than a flattened copy of it.
   */
  const handleSliceCountChange = useCallback(
    (channelId: string, sliceCount: SliceCount) => {
      updateChannel(channelId, { sliceCount });
    },
    [updateChannel],
  );

  const handleSampleTrimReset = useCallback(
    (channelId: string) => updateChannel(channelId, UNTRIMMED),
    [updateChannel],
  );

  // Removing a sample keeps the channel's pattern, so a new sample can be
  // dropped straight onto the same rhythm.
  const handleRemove = useCallback(
    (channelId: string) => {
      removeSample(channelId);
      setChannels((prev) =>
        prev.map((channel) =>
          channel.id === channelId
            ? {
                ...channel,
                // A name the machine put there goes out with the sample that
                // put it there, so an emptied channel isn't left sitting under
                // the name of a drum it no longer has — and so the next sample
                // loaded into it is free to name it again. A typed name stays:
                // that one was someone's decision.
                name: channelNameFollowsSample(channel) ? "" : channel.name,
                sample: { status: "empty" },
                ...UNEDITED,
              }
            : channel,
        ),
      );
    },
    [removeSample],
  );

  const handleLengthChange = useCallback(
    (channelId: string, length: number) => {
      updateChannel(channelId, { length: clampLength(length) });
    },
    [updateChannel],
  );

  /**
   * Writes one of the selected channel's parameters — or, while a step is open,
   * that step's override of it.
   *
   * One place for the decision, so every slider in the panel follows the scope
   * the panel is showing rather than each having to remember which mode it is
   * in. Values arrive clamped, exactly as they did when these went straight to
   * the channel: a lock is the same value, kept somewhere narrower.
   */
  const setParameter = useCallback(
    (key: LockableParameter, value: number) => {
      if (editingStepIndex !== null) {
        updateSelectedSteps((steps) =>
          setStepLockAt(steps, editingStepIndex, key, value),
        );
        return;
      }

      updateChannel(selectedChannel.id, { [key]: value } as Partial<Channel>);
    },
    [editingStepIndex, selectedChannel.id, updateChannel, updateSelectedSteps],
  );

  const handleVolumeChange = useCallback(
    (volume: number) => setParameter("volume", clampVolume(volume)),
    [setParameter],
  );

  const handlePanChange = useCallback(
    (pan: number) => setParameter("pan", clampPan(pan)),
    [setParameter],
  );

  const handlePitchChange = useCallback(
    (pitch: number) => setParameter("pitch", clampPitch(pitch)),
    [setParameter],
  );

  const handleNameChange = useCallback(
    (channelId: string, name: string) => {
      updateChannel(channelId, { name: clampChannelName(name) });
    },
    [updateChannel],
  );

  /** Flips one of the boolean routing flags on a single channel. */
  const toggleChannelFlag = useCallback(
    (channelId: string, key: "muted" | "soloed") => {
      setChannels((prev) =>
        prev.map((channel) =>
          channel.id === channelId
            ? { ...channel, [key]: !channel[key] }
            : channel,
        ),
      );
    },
    [],
  );

  const handleToggleMute = useCallback(
    (channelId: string) => toggleChannelFlag(channelId, "muted"),
    [toggleChannelFlag],
  );

  // Solo is additive: soloing a second channel leaves both playing, and
  // clearing the last solo brings every unmuted channel back.
  const handleToggleSolo = useCallback(
    (channelId: string) => toggleChannelFlag(channelId, "soloed"),
    [toggleChannelFlag],
  );

  /** A right click on a channel pad: raises its action menu at the pointer. */
  const handleChannelContextMenu = useCallback(
    (channelId: string, x: number, y: number) => {
      setContextMenuChannel({ channelId, x, y });
    },
    [],
  );

  const closeChannelContextMenu = useCallback(
    () => setContextMenuChannel(null),
    [],
  );

  /**
   * Clicking a pattern slot: loads it into the live kit right away, steps and
   * mix alike, even mid-playback — there is nothing to queue, since the
   * scheduler already reads `channels` fresh on every tick. A click on an
   * empty slot has nothing to load, so `PatternGrid` never calls this for one.
   */
  const handleLoadPattern = useCallback(
    (index: number) => {
      const pattern = getPattern(index);
      if (!pattern) return;
      setChannels((current) => applyPattern(current, pattern));
      markPatternActive(index);
    },
    [getPattern, markPatternActive],
  );

  /** A right click on a pattern slot: raises its action menu at the pointer. */
  const handlePatternContextMenu = useCallback(
    (index: number, x: number, y: number) => {
      setContextMenuPattern({ index, x, y });
    },
    [],
  );

  const closePatternContextMenu = useCallback(
    () => setContextMenuPattern(null),
    [],
  );

  /** "Save Pattern": snapshots the live kit into the right-clicked slot. */
  const handleSavePatternFromMenu = useCallback(
    (index: number) => savePattern(index, channels),
    [savePattern, channels],
  );

  /** "Delete Pattern": empties the slot without touching the live kit. */
  const handleDeletePatternFromMenu = useCallback(
    (index: number) => deletePattern(index),
    [deletePattern],
  );

  /** "Clear Steps" from the context menu: every step back to `createStep`. */
  const handleClearStepsFromMenu = useCallback(
    (channelId: string) => updateStepsForChannel(channelId, clearSteps),
    [updateStepsForChannel],
  );

  /** "Copy Steps": the steps and the length that gives them their loop. */
  const handleCopyStepsFromMenu = useCallback(
    (channelId: string) => {
      const channel = channels.find((item) => item.id === channelId);
      if (!channel) return;
      setClipboardSteps({ steps: channel.steps, length: channel.length });
    },
    [channels],
  );

  const handlePasteStepsFromMenu = useCallback(
    (channelId: string) => {
      if (!clipboardSteps) return;
      updateChannel(channelId, {
        steps: clipboardSteps.steps,
        length: clipboardSteps.length,
      });
    },
    [clipboardSteps, updateChannel],
  );

  /** "Copy Sample": nothing to copy from a channel with none loaded. */
  const handleCopySampleFromMenu = useCallback(
    (channelId: string) => {
      const channel = channels.find((item) => item.id === channelId);
      if (!channel || channel.sample.status !== "loaded") return;

      const buffer = getSampleBuffer(channelId);
      if (!buffer) return;

      // The trim, the direction and the slicing go with it: all of them are
      // part of what was dialled into that sample, and pasting a hit that was
      // cut down to its transient only to hear the whole file again — the right
      // way round, and in one piece — would be the wrong answer to "copy".
      setClipboardSample({
        buffer,
        sample: channel.sample,
        start: channel.sampleStart,
        end: channel.sampleEnd,
        reversed: channel.sampleReversed,
        mode: channel.sampleMode,
        sliceCount: channel.sliceCount,
      });
    },
    [channels, getSampleBuffer],
  );

  const handlePasteSampleFromMenu = useCallback(
    (channelId: string) => {
      if (!clipboardSample) return;
      setSampleBuffer(channelId, clipboardSample.buffer);
      updateChannel(channelId, {
        sample: clipboardSample.sample,
        sampleStart: clipboardSample.start,
        sampleEnd: clipboardSample.end,
        sampleReversed: clipboardSample.reversed,
        sampleMode: clipboardSample.mode,
        sliceCount: clipboardSample.sliceCount,
      });
    },
    [clipboardSample, setSampleBuffer, updateChannel],
  );

  /**
   * Auditions one channel outside the transport, so a sample can be checked
   * without starting playback. Mute and solo are deliberately ignored: this is
   * a direct request to hear that one channel, not a change to the mix.
   *
   * `velocityGain` scales the hit on top of the channel's own volume, exactly
   * as a step's velocity does — 1 by a plain pad click, and whatever a MIDI
   * note arrived with when this is what `useMidiInput` calls.
   *
   * The context is created and resumed inside the click gesture, which is what
   * browsers require before any sound can come out.
   */
  const handlePreviewChannel = useCallback(
    (channelId: string, velocityGain = 1) => {
      const context = ensureContext();
      if (context.state === "suspended") {
        void context.resume();
      }

      const channel = channelsRef.current.find((item) => item.id === channelId);
      if (!channel) return;

      const options = triggerOptionsForChannel(channel);
      trigger(channelId, context.currentTime, {
        ...options,
        gain: options.gain * velocityGain,
      });
      flashChannels([channelId], context.currentTime);

      // Chokes apply here as well: what a pad does to the rest of the kit is
      // part of hearing the channel, and a hat pedal that only worked under the
      // transport would be the odd exception rather than the rule.
      choke(
        channelsChokedBy(channelsRef.current, channelId),
        context.currentTime,
      );
    },
    [choke, ensureContext, flashChannels, trigger],
  );

  /**
   * A note-on from the selected MIDI input: the same direct trigger a pad's
   * alt-click makes, just addressed by channel index — see `lib/midi` for how
   * a note number gets there — with the note's own velocity standing in for
   * the click's implicit full gain.
   */
  const handleMidiNoteOn = useCallback(
    (channelIndex: number, velocityGain: number) => {
      if (channelIndex >= channels.length) return;
      handlePreviewChannel(channelIdForIndex(channelIndex), velocityGain);
    },
    [channels.length, handlePreviewChannel],
  );

  // Requested once and shared: `useMidiInput` and `useMidiClockOutput` each
  // read ports off this rather than asking for access again themselves, so
  // there's one permission prompt regardless of how many of the two are used.
  const midiAccess = useMidiAccess();

  /**
   * An incoming Start or Continue while external clock is the chosen source:
   * begins playback the same way pressing Play does, skipping only the
   * `canPlay` guard the button itself enforces — a transport message
   * arriving before anything is loaded is still safe to act on, since the
   * scheduler simply has nothing to trigger yet. Ignored outright while the
   * source is Internal, so gear left sending clock in the background can't
   * start the transport nobody asked it to.
   */
  const handleMidiTransportStart = useCallback(() => {
    if (midiClockSource !== "external" || isPlaying) return;
    play();
  }, [isPlaying, midiClockSource, play]);

  const handleMidiTransportStop = useCallback(() => {
    if (midiClockSource !== "external" || !isPlaying) return;
    stop();
    clearFlashes();
  }, [clearFlashes, isPlaying, midiClockSource, stop]);

  /*
   * Every mappable parameter, wired to the CC map for as long as the machine
   * is up — not merely while the knob that shows it is on screen. Kept here
   * rather than in the controls because a mapping is a wire to a parameter,
   * and a tab being closed is not a reason for that wire to come loose.
   */
  useMidiParameterRegistry({
    channels,
    updateChannelWith,
    setMasterVolume,
    setMasterDrive,
    setMasterFilter,
    setMasterDelay,
    setMasterReverb,
    setMasterPhaser,
    setMasterCompressor,
  });

  const {
    inputs: midiInputs,
    selectedInputId: midiInputId,
    selectInput: selectMidiInput,
  } = useMidiInput({
    access: midiAccess,
    onNoteOn: handleMidiNoteOn,
    // A CC message is never this machine's to interpret directly — it's
    // routed straight to the shared MIDI-learn runtime, which knows whether
    // it's binding a knob or driving one that's already mapped (see
    // `lib/midiCcMap`).
    onControlChange: handleIncomingCc,
    // Always fed to the estimator regardless of which source is chosen, so a
    // recent tempo is already waiting the moment External is switched on —
    // see `useMidiClockInput`.
    onClockTick: midiClockInput.handleClockTick,
    onTransportStart: handleMidiTransportStart,
    onTransportStop: handleMidiTransportStop,
  });

  /**
   * Picking a device from the rail is a click, and so — unlike a note arriving
   * from the device afterwards — is a gesture browsers trust to unlock audio.
   * Resuming here means the very first note played is heard even if nothing
   * else on the page has been clicked yet.
   */
  const handleSelectMidiInput = useCallback(
    (id: string | null) => {
      const context = ensureContext();
      if (context.state === "suspended") {
        void context.resume();
      }
      selectMidiInput(id);
    },
    [ensureContext, selectMidiInput],
  );

  const {
    supported: audioOutputSupported,
    outputs: audioOutputs,
    selectedOutputId: audioOutputId,
    selectOutput: selectAudioOutput,
    namesHidden: audioOutputNamesHidden,
    revealNames: revealAudioOutputNames,
  } = useAudioOutput({ applyAudioOutput });

  /**
   * Same reasoning as `handleSelectMidiInput`: picking a device is a click, so
   * it's a gesture the browser trusts to unlock audio. Building the context
   * here also means `setSinkId` has something to act on straight away, rather
   * than the choice sitting in a ref until the first pad is hit.
   */
  const handleSelectAudioOutput = useCallback(
    (id: string) => {
      const context = ensureContext();
      if (context.state === "suspended") {
        void context.resume();
      }
      selectAudioOutput(id);
    },
    [ensureContext, selectAudioOutput],
  );

  const {
    outputs: midiOutputs,
    selectedOutputId: midiOutputId,
    selectOutput: selectMidiOutput,
  } = useMidiClockOutput({
    access: midiAccess,
    isPlaying,
    // Whatever tempo is actually running, external source included, so a
    // second device chained off this machine's clock out follows the same
    // beat this one is following rather than the slider it's ignoring.
    bpm: effectiveBpm,
    ensureContext,
  });

  /**
   * Moves the editor to another channel, closing whichever step was open.
   *
   * A step index means nothing across channels — step 5 of the snare is not the
   * step that was being edited on the kick — so carrying it over would leave the
   * panel scoped to a step nobody opened, showing locks nobody set.
   */
  const handleSelectChannel = useCallback((channelId: string) => {
    setSelectedChannelId(channelId);
    setRawEditingStepIndex(null);
    setContextMenuStep(null);
  }, []);

  const handleSelectChannelIndex = useCallback(
    (index: number) => handleSelectChannel(channelIdForIndex(index)),
    [handleSelectChannel],
  );

  useChannelShortcuts({
    channelCount: channels.length,
    onSelectChannelIndex: handleSelectChannelIndex,
  });

  const handleToggleMasterFilter = useCallback(() => {
    setMasterFilter((prev) => ({ ...prev, enabled: !prev.enabled }));
  }, []);

  useMasterFilterShortcuts({ onToggle: handleToggleMasterFilter });

  const handleLowCutChange = useCallback(
    (hz: number) => setParameter("lowCutHz", clampFrequency(hz)),
    [setParameter],
  );

  const handleHighCutChange = useCallback(
    (hz: number) => setParameter("highCutHz", clampFrequency(hz)),
    [setParameter],
  );

  // The resonances go through `setParameter` like the cutoffs beside them, so
  // the knobs in the filter card follow whatever the panel is scoped to: the
  // channel, or the one step open for editing.
  const handleLowCutResonanceChange = useCallback(
    (amount: number) => setParameter("lowCutResonance", clampResonance(amount)),
    [setParameter],
  );

  const handleHighCutResonanceChange = useCallback(
    (amount: number) =>
      setParameter("highCutResonance", clampResonance(amount)),
    [setParameter],
  );

  /**
   * How steep the selected channel's cuts are.
   *
   * Straight onto the channel rather than through `setParameter`, unlike the
   * four knobs beside it: this is what kind of filter the channel has — the
   * same sort of decision as the choke source or the sample's direction —
   * rather than something one step of the pattern gets to override.
   */
  const handleFilterSlopeChange = useCallback(
    (slope: FilterSlope) => {
      updateChannel(selectedChannel.id, { filterSlope: slope });
    },
    [selectedChannel.id, updateChannel],
  );

  const handleAttackChange = useCallback(
    (seconds: number) => setParameter("attackSeconds", clampAttack(seconds)),
    [setParameter],
  );

  const handleDecayChange = useCallback(
    (seconds: number) => setParameter("decaySeconds", clampDecay(seconds)),
    [setParameter],
  );

  const handleSustainChange = useCallback(
    (level: number) => setParameter("sustainLevel", clampSustain(level)),
    [setParameter],
  );

  const handleReleaseChange = useCallback(
    (seconds: number) => setParameter("releaseSeconds", clampRelease(seconds)),
    [setParameter],
  );

  const handleDelaySendChange = useCallback(
    (amount: number) => setParameter("delaySend", clampSend(amount)),
    [setParameter],
  );

  const handleReverbSendChange = useCallback(
    (amount: number) => setParameter("reverbSend", clampSend(amount)),
    [setParameter],
  );

  const handlePhaserSendChange = useCallback(
    (amount: number) => setParameter("phaserSend", clampSend(amount)),
    [setParameter],
  );

  /** Puts one parameter of the open step back on the channel's own setting. */
  const handleClearStepLock = useCallback(
    (key: LockableParameter) => {
      if (editingStepIndex === null) return;
      updateSelectedSteps((steps) =>
        clearStepLockAt(steps, editingStepIndex, key),
      );
    },
    [editingStepIndex, updateSelectedSteps],
  );

  /** Puts the whole step back on the channel, velocity aside. */
  const handleClearStepLocks = useCallback(() => {
    if (editingStepIndex === null) return;
    updateSelectedSteps((steps) => clearStepLocksAt(steps, editingStepIndex));
  }, [editingStepIndex, updateSelectedSteps]);

  /**
   * Points a channel at the channel that chokes it, or at nothing.
   *
   * The raw select value is narrowed against the channels that exist rather than
   * trusted, so a stale id — or the channel's own, which would make it
   * monophonic instead of routed — falls back to no choke at all.
   */
  const handleChokedByChange = useCallback(
    (channelId: string, sourceId: string) => {
      setChannels((prev) =>
        prev.map((channel) =>
          channel.id === channelId
            ? {
                ...channel,
                chokedBy: clampChokeSource(sourceId, prev, channelId),
              }
            : channel,
        ),
      );
    },
    [],
  );

  // Arrives already clamped field by field, like the master stages: the section
  // hands back a whole settings object rather than one loose number.
  const handleLfoChange = useCallback(
    (channelId: string, lfo: ChannelLfo) => {
      updateChannel(channelId, { lfo });
    },
    [updateChannel],
  );

  /**
   * Freezes the current sound: every channel's parameters, all six master
   * stages and the output fader, in one go. Patterns, samples and the transport
   * are deliberately not part of it, so a snapshot is a mix to come back to
   * rather than a whole song.
   *
   * The channels are read through the ref rather than taken as a dependency, so
   * this doesn't have to be rebuilt every time a step is toggled.
   */
  const handleSaveSnapshot = useCallback(() => {
    setSnapshot({
      channels: captureChannelSnapshots(channelsRef.current),
      drive: masterDrive,
      filter: masterFilter,
      delay: masterDelay,
      reverb: masterReverb,
      phaser: masterPhaser,
      compressor: masterCompressor,
      volume: masterVolume,
    });
  }, [
    masterCompressor,
    masterDelay,
    masterDrive,
    masterFilter,
    masterPhaser,
    masterReverb,
    masterVolume,
  ]);

  /**
   * Puts every parameter back to the last save. The master stages and the
   * output fader reach the audio graph through the effects above, so setting
   * the state here is the whole of it — including the reverb, whose impulse is
   * rebuilt on the way if the decay has moved since.
   */
  const handleRecallSnapshot = useCallback(() => {
    if (!snapshot) return;

    setChannels((prev) => applyChannelSnapshots(prev, snapshot.channels));
    setMasterDrive(snapshot.drive);
    setMasterFilter(snapshot.filter);
    setMasterDelay(snapshot.delay);
    setMasterReverb(snapshot.reverb);
    setMasterPhaser(snapshot.phaser);
    setMasterCompressor(snapshot.compressor);
    setMasterVolume(snapshot.volume);
  }, [snapshot]);

  /**
   * Fills the leading channels with a kit: names and loading state are applied
   * up front in one pass, then each sample resolves independently so a single
   * missing file can't stall the rest of the kit. Step patterns are untouched.
   *
   * A kit with no samples of its own is the blank one, and does the opposite:
   * it empties every channel, patterns included, and reaches the channels the
   * loaded kit never filled as well as the ones it did.
   */
  const handleLoadPreset = useCallback(
    async (preset: Preset) => {
      // Create the audio context while still inside the click gesture.
      ensureContext();

      const entries = presetEntries(preset).slice(0, CHANNEL_COUNT);

      if (entries.length === 0) {
        // The decoded buffers go with the channels that pointed at them, or the
        // kit would still be sitting in memory behind sixteen empty slots.
        for (let index = 0; index < CHANNEL_COUNT; index += 1) {
          removeSample(channelIdForIndex(index));
        }

        setChannels((prev) => prev.map(emptyChannel));
        // The step the panel was pointed at has just been cleared, so there is
        // no longer a hit there to shape.
        setRawEditingStepIndex(null);
        // Nothing is fetched, so this never enters the loading state at all.
        setLoadingPresetId(null);
        return;
      }

      setLoadingPresetId(preset.id);

      setChannels((prev) =>
        prev.map((channel, index) => {
          const entry = entries[index];
          if (!entry) return channel;
          return {
            ...channel,
            // A kit names the channels it fills after the samples it puts in
            // them, whatever they were called before: loading one is a request
            // for that kit, and half of what makes it one is which drum sits
            // on which channel.
            name: clampChannelName(entry.sample.name),
            sample: { status: "loading", name: librarySampleLabel(entry) },
            ...UNEDITED,
          };
        }),
      );

      await Promise.all(
        entries.map(async (entry, index) => {
          const channelId = channelIdForIndex(index);
          const label = librarySampleLabel(entry);
          try {
            const buffer = await loadSampleFromUrl(
              channelId,
              librarySampleUrl(entry),
            );
            updateChannel(channelId, {
              sample: {
                status: "loaded",
                name: label,
                libraryId: entry.sample.id,
                peaks: computePeaks(buffer),
                durationSeconds: buffer.duration,
              },
            });
          } catch (error) {
            console.error(`Failed to load preset sample ${label}`, error);
            removeSample(channelId);
            updateChannel(channelId, {
              sample: {
                status: "error",
                message: "Couldn't load preset sample",
              },
            });
          }
        }),
      );

      setLoadingPresetId(null);
    },
    [ensureContext, loadSampleFromUrl, removeSample, updateChannel],
  );

  /**
   * Loads one bundled sample into one channel, which is the same fetch a kit
   * makes for each of its slots — the difference being that a kit is a whole
   * machine arriving at once and this is a single drum being swapped, so
   * nothing else about the channel is touched.
   *
   * The channel takes the sample's name, but only when the name it has now was
   * put there by a sample rather than typed; see `channelNameFollowsSample`.
   * And it is auditioned once it lands, because picking from a list of names
   * is a guess until it is heard — the browser stays open on top of this, so
   * the next guess is one press away.
   */
  const handleLoadLibrarySample = useCallback(
    async (channelId: string, entry: LibraryEntry) => {
      // Created inside the press, as everything that ends in a sound is.
      ensureContext();

      const label = librarySampleLabel(entry);

      setChannels((prev) =>
        prev.map((channel) =>
          channel.id === channelId
            ? {
                ...channel,
                name: channelNameFollowsSample(channel)
                  ? clampChannelName(entry.sample.name)
                  : channel.name,
                sample: { status: "loading", name: label },
                ...UNEDITED,
              }
            : channel,
        ),
      );

      try {
        const buffer = await loadSampleFromUrl(
          channelId,
          librarySampleUrl(entry),
        );
        updateChannel(channelId, {
          sample: {
            status: "loaded",
            name: label,
            libraryId: entry.sample.id,
            peaks: computePeaks(buffer),
            durationSeconds: buffer.duration,
          },
        });
        handlePreviewChannel(channelId);
      } catch (error) {
        console.error(`Failed to load library sample ${label}`, error);
        removeSample(channelId);
        updateChannel(channelId, {
          sample: { status: "error", message: "Couldn't load that sample" },
        });
      }
    },
    [
      ensureContext,
      handlePreviewChannel,
      loadSampleFromUrl,
      removeSample,
      updateChannel,
    ],
  );

  /**
   * What became of a beat that arrived by link, for the banner to report, or
   * null once there is nothing left to say about one.
   */
  const [shareStatus, setShareStatus] = useState<SharedBeatStatus | null>(null);

  /** True while a shared kit is being fetched, the way a preset's id is. */
  const [loadingSharedBeat, setLoadingSharedBeat] = useState(false);

  /** Everything the machine is playing right now, packed into a link. */
  const handleBuildShareLink = useCallback(async () => {
    const beat = captureSharedBeat(channels, bpm, swing, {
      drive: masterDrive,
      filter: masterFilter,
      delay: masterDelay,
      reverb: masterReverb,
      phaser: masterPhaser,
      compressor: masterCompressor,
    });
    return buildShareUrl(await encodeSharedBeat(beat));
  }, [
    bpm,
    channels,
    masterCompressor,
    masterDelay,
    masterDrive,
    masterFilter,
    masterPhaser,
    masterReverb,
    swing,
  ]);

  /**
   * Puts a decoded beat into the machine — steps, mix, tempo and kit.
   *
   * Shaped like `handleLoadPreset`, because it is the same job: a whole machine
   * arriving at once, with a fetch per filled slot and the channels marked as
   * loading in between. The difference is that a kit fills channels from the
   * top and leaves the rest alone, where this one speaks for all sixteen —
   * `applySharedBeat` empties the channels the beat never mentions, and every
   * decoded buffer is dropped here first so none of them can outlive the
   * pattern that asked for it.
   */
  const loadSharedBeat = useCallback(
    async (beat: SharedBeat) => {
      // Created inside the gesture where there is one, matching the kit loader:
      // the fetches below are awaited, so by the time a sample is decoded the
      // click that asked for it is long over.
      ensureContext();

      const kit = sharedBeatKit(beat);
      const entries = new Map(
        kit.flatMap(({ channelId, libraryId }) => {
          const entry = findLibrarySample(libraryId);
          return entry ? [[channelId, entry] as const] : [];
        }),
      );

      for (let index = 0; index < CHANNEL_COUNT; index += 1) {
        removeSample(channelIdForIndex(index));
      }

      setBpm(beat.bpm);
      setSwing(beat.swing);

      /*
       * The effects rail, wholesale. Set from the beat even where the link
       * carried no master block at all — an older one, or a machine whose rail
       * was never touched — because `decodeSharedBeat` answers both of those
       * with the six stages at their defaults, and applying that is what keeps
       * the receiving machine's own reverb from ending up over someone else's
       * beat. The output fader is deliberately not among them: how loud this
       * arrives is the listener's business.
       */
      setMasterDrive(beat.master.drive);
      setMasterFilter(beat.master.filter);
      setMasterDelay(beat.master.delay);
      setMasterReverb(beat.master.reverb);
      setMasterPhaser(beat.master.phaser);
      setMasterCompressor(beat.master.compressor);

      // The step the panel was pointed at belonged to a pattern that has gone.
      setRawEditingStepIndex(null);
      setLoadingSharedBeat(entries.size > 0);

      setChannels((prev) =>
        applySharedBeat(prev, beat).map((channel) => {
          const entry = entries.get(channel.id);
          if (!entry) return channel;
          return {
            ...channel,
            sample: { status: "loading", name: librarySampleLabel(entry) },
          };
        }),
      );

      await Promise.all(
        [...entries].map(async ([channelId, entry]) => {
          const label = librarySampleLabel(entry);
          try {
            const buffer = await loadSampleFromUrl(
              channelId,
              librarySampleUrl(entry),
            );
            updateChannel(channelId, {
              sample: {
                status: "loaded",
                name: label,
                libraryId: entry.sample.id,
                peaks: computePeaks(buffer),
                durationSeconds: buffer.duration,
              },
            });
          } catch (error) {
            console.error(`Failed to load shared sample ${label}`, error);
            removeSample(channelId);
            updateChannel(channelId, {
              sample: { status: "error", message: "Couldn't load that sample" },
            });
          }
        }),
      );

      setLoadingSharedBeat(false);
    },
    [ensureContext, loadSampleFromUrl, removeSample, updateChannel],
  );

  /** Opens a token from the address bar, reporting what happened in the banner. */
  const openSharedToken = useCallback(
    async (token: string): Promise<boolean> => {
      /*
       * Marked as loading from here rather than from inside `loadSharedBeat`,
       * which is a decode away: the empty-kit notice is suppressed by this, and
       * a machine opened from a link has no samples yet, so leaving the gap
       * uncovered would flash "No samples loaded" before the beat arrived.
       *
       * The preset id goes at the same time. It starts out set for exactly this
       * reason — to cover the first paint — and the kit it names is one this
       * beat has just replaced.
       */
      setLoadingSharedBeat(true);
      setLoadingPresetId(null);

      const result = await decodeSharedBeat(token);

      if (!result.ok) {
        setLoadingSharedBeat(false);
        setShareStatus({ kind: "failed", reason: result.reason });
        return false;
      }

      await loadSharedBeat(result.beat);

      setShareStatus({
        kind: "loaded",
        channelCount: Object.keys(result.beat.channels).length,
        bpm: result.beat.bpm,
        missingSamples: Object.values(result.beat.channels)
          .map((channel) => channel.missingSampleName)
          .filter((name): name is string => name !== undefined),
        effectsActive: Object.values(result.beat.master).some(
          (stage) => stage.enabled,
        ),
      });

      return true;
    },
    [loadSharedBeat],
  );

  /**
   * Loads the default kit once, on the way in, so the machine opens on
   * something that plays instead of on sixteen empty channels waiting to be
   * filled before anything can be heard.
   *
   * Unless the address bar is carrying a beat, in which case that is the kit:
   * loading the default one first would fetch eleven samples in order to
   * replace them a moment later, and the two loads would be racing for the same
   * sixteen slots as they landed.
   *
   * The AudioContext this creates has no gesture behind it, so it starts
   * suspended — which decoding doesn't mind, and Play resumes. The ref is what
   * keeps it to once: React runs mount effects twice in development, and
   * without it the whole kit would be fetched and decoded twice over.
   */
  const loadedDefaultKitRef = useRef(false);

  useEffect(() => {
    if (loadedDefaultKitRef.current) return;
    loadedDefaultKitRef.current = true;

    /*
     * The whole of the way in, as one sequence rather than a branch that starts
     * two. What loads depends on what the address bar turns out to be carrying,
     * and a link that fails to open falls back to the kit — three steps in
     * order, which is what an async function says and what a pair of `void`
     * calls beside each other does not. It also keeps the first setState off
     * the effect body itself, where a synchronous one costs a cascading render.
     */
    void (async () => {
      const token = readShareToken();

      if (!token) {
        await handleLoadPreset(DEFAULT_PRESET);
        return;
      }

      /*
       * Taken out of the address bar before it is read, not after: what is on
       * screen from here on is the machine, which the reader is free to change,
       * and an address still claiming to describe a beat would hand a stale one
       * back on the next refresh. Cleared even if the token turns out to be
       * unreadable, since a link that cannot be opened is no more worth keeping.
       */
      clearShareToken();

      // A link that would not open leaves sixteen empty channels behind, which
      // is a worse place to land than the one everyone else gets. The banner
      // says what happened; the default kit is what makes the page usable while
      // it is being read.
      if (!(await openSharedToken(token))) {
        await handleLoadPreset(DEFAULT_PRESET);
      }
    })();
  }, [handleLoadPreset, openSharedToken]);

  const canPlay = channels.some(
    (channel) => channel.sample.status === "loaded",
  );

  /**
   * What each channel is going by right now, for the mappings list in the
   * settings dialog: a binding held against `channel-1` has to read as the
   * drum it actually moves, and follow it when the channel is renamed.
   *
   * Memoised on the channels rather than rebuilt every render, since this
   * component re-renders on every step of the transport and the names change
   * only when a channel is renamed or a kit is loaded.
   */
  const channelNames = useMemo(
    () =>
      Object.fromEntries(
        channels.map((channel) => [channel.id, channelDisplayName(channel)]),
      ),
    [channels],
  );

  // Stopping always works; starting needs at least one loaded sample, matching
  // the transport button's own disabled rule.
  const handleTogglePlay = useCallback(() => {
    if (isPlaying) {
      stop();
      // Drop queued flashes with the playhead, so nothing lights up after the
      // transport has already stopped.
      clearFlashes();
    } else if (canPlay) {
      play();
    }
  }, [canPlay, clearFlashes, isPlaying, play, stop]);

  useTransportShortcuts({ onTogglePlay: handleTogglePlay });

  /**
   * What the choke select offers: every channel but the selected one, under the
   * name shown on its pad, so the choice reads as "Hihat Closed" rather than as
   * a channel number.
   */
  const chokeOptions = channels
    .filter((channel) => channel.id !== selectedChannel.id)
    .map((channel) => ({ id: channel.id, name: channelDisplayName(channel) }));

  /**
   * What the selected channel sounds like right now: its own settings, or the
   * open step's overrides standing in for them.
   *
   * Resolved once here rather than at each of the two places that read it, so
   * the filter card and the controls panel can never end up showing a different
   * answer to the same question.
   */
  const selectedSettings = channelSettingsForStep(selectedChannel, editingStep);

  // The playhead shown is the selected channel's own position in its cycle.
  const currentStep =
    currentTick === null
      ? null
      : currentTick % clampLength(selectedChannel.length);

  /**
   * The hit the selected channel is sounding right now — the step the filter
   * card follows while the transport runs, so a pattern that sweeps its cutoff
   * hit by hit can be watched doing it.
   *
   * The last step that *fires* rather than the one the playhead is standing on:
   * see `lastFiredStepAt`. Null while stopped, while a step is held open — that
   * is a deliberate request to look at one step, which the playhead must not
   * drag the card off — and while the channel has nothing programmed to sound.
   */
  const playingStepIndex =
    currentStep === null || editingStepIndex !== null
      ? null
      : lastFiredStepAt(
          selectedChannel.steps,
          selectedChannel.length,
          currentStep,
        );

  const playingStep =
    playingStepIndex === null ? null : selectedChannel.steps[playingStepIndex];

  // Resolved through the same function the controls panel uses, so a followed
  // step and an opened one can never report a hit differently.
  const playingSettings =
    playingStep === null
      ? null
      : channelSettingsForStep(selectedChannel, playingStep);

  return (
    // The page carries the surface colour now that the cards are unfilled —
    // the header and the rails already assume this pairing.
    //
    // Filling the viewport exactly, rather than growing past it, is what moves
    // the scrolling inside: nothing here can push the window taller, so the
    // only thing that scrolls is the content pane further down. A flex column
    // itself now, so the footer nav below `xl` can take its own row at the
    // bottom rather than floating over the page as a fixed overlay.
    <div className="bg-surface text-fg flex h-full flex-col overflow-hidden">
      {/* Padding clears the fixed rails so the content centres between them,
          from `xl` up where both are on screen at once. Below that this is
          the only page showing, so it's a plain full-width column instead. */}
      <div className="flex min-h-0 flex-1 flex-col xl:px-64">
        {/*
          Outside the scrolling pane rather than sticky within it, so the
          snapshot buttons stay on screen and a mix can be saved however far
          the channel list is scrolled. On every page below `xl`, not just
          Main, so the transport stays reachable while Settings or FX is open.
        */}
        <header className="border-line bg-surface shrink-0 border-b">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-3 px-4 py-3 md:px-6">
            <Oscilloscope
              getWaveform={getWaveform}
              compact={true}
              isPlaying={isPlaying}
              onTogglePlay={handleTogglePlay}
            />

            {/*
              Kept for screen readers at every width — it is the page's only h1
              — but off the phone header, where the title is the one thing there
              that does nothing, and the play button says what the page is
              better than the words do.
            */}
            <h1 className="sr-only text-lg font-semibold xl:not-sr-only">
              Drum Machine
            </h1>

            {/* Pushed to the far edge below `xl`, away from the play button, so
                a snapshot is never saved by a thumb aiming for the transport.
                From `xl` up it stays beside the title, as before. */}
            <div className="ml-auto">
              <SnapshotControls
                hasSnapshot={snapshot !== null}
                onSave={handleSaveSnapshot}
                onRecall={handleRecallSnapshot}
              />
            </div>
          </div>
        </header>

        {/*
          Everything that acts on the machine as a whole rather than on one
          channel: what it plays with, how it plays, and how loud it comes out.
          A fixed rail from `xl` up, so it stays put however far the channel
          list is scrolled; below that it's the Settings page, standing in for
          the whole column whenever that's the page showing.
        */}
        <Sidebar
          id={CONTROLS_SIDEBAR_ID}
          side="left"
          label="Settings"
          mobileActive={mobilePage === "settings"}
        >
          <Transport
            isPlaying={isPlaying}
            bpm={bpm}
            swing={swing}
            canPlay={canPlay}
            onTogglePlay={handleTogglePlay}
            onBpmChange={setBpm}
            onSwingChange={setSwing}
          />

          <PresetPicker
            presets={PRESETS}
            loadingPresetId={loadingPresetId}
            onLoadPreset={(preset) => void handleLoadPreset(preset)}
          />

          <SharePanel
            canShare={isWorthSharing(channels)}
            onBuildLink={handleBuildShareLink}
          />

          <SettingsButton
            midi={{
              supported: midiAccess.supported,
              inputs: midiInputs,
              selectedInputId: midiInputId,
              onSelectInput: handleSelectMidiInput,
              outputs: midiOutputs,
              selectedOutputId: midiOutputId,
              onSelectOutput: selectMidiOutput,
              clockSource: midiClockSource,
              onClockSourceChange: setMidiClockSource,
              estimatedBpm: midiClockInput.estimatedBpm,
            }}
            mappings={{ channelNames }}
            sound={{
              supported: audioOutputSupported,
              outputs: audioOutputs,
              selectedOutputId: audioOutputId,
              onSelectOutput: handleSelectAudioOutput,
              namesHidden: audioOutputNamesHidden,
              onRevealNames: revealAudioOutputNames,
            }}
          />
        </Sidebar>

        {shareStatus !== null && (
          <SharedBeatNotice
            status={shareStatus}
            onDismiss={() => setShareStatus(null)}
          />
        )}

        {editingStepIndex !== null && (
          <div
            className={`xl:block ${mobilePage === "main" ? "block" : "hidden"}`}
          >
            <StepEditBanner
              stepIndex={editingStepIndex}
              channelName={channelDisplayName(selectedChannel)}
              onClose={() => setRawEditingStepIndex(null)}
            />
          </div>
        )}

        <div
          className={`quiet-scrollbar min-h-0 flex-1 overflow-y-auto xl:flex ${
            mobilePage === "main" ? "flex" : "hidden"
          }`}
        >
          <div
            id="drum-main-content"
            className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-6"
          >
            <ChannelGrid
              channels={channels}
              selectedChannelId={selectedChannel.id}
              flashedChannelIds={flashedChannelIds}
              getChannelLevel={getChannelLevel}
              onSelectChannel={handleSelectChannel}
              onPreviewChannel={handlePreviewChannel}
              onToggleMute={handleToggleMute}
              onToggleSolo={handleToggleSolo}
              onChannelContextMenu={handleChannelContextMenu}
            />

            {/* First thing in the column, directly above the sample slot that
              answers it. Only while the kit is empty: once anything is loaded
              the greyed-out transport is no longer a mystery worth explaining.
              And not while a kit is on its way in, since asking for samples at
              the moment samples are arriving would answer itself. */}
            {!canPlay && loadingPresetId === null && !loadingSharedBeat && (
              <LoadSamplesNotice />
            )}

            {/*
              What the channel is playing, what shape it comes out in, how its
              amplitude moves over one hit, what is moving it underneath, and
              where it gets sent — five tabs sharing a card, directly above the
              pattern grid that says when each of them fires. The two filter
              cutoffs and the four envelope stages are the same ones the
              controls panel below has sliders for — moving either moves both —
              with a picture of what each set comes to. The LFO and the three
              sends are only here.
            */}
            <SampleEditorTabsSection
              channel={selectedChannel}
              onUpload={(file) => void handleUpload(selectedChannel.id, file)}
              onLoadLibrarySample={(entry) =>
                void handleLoadLibrarySample(selectedChannel.id, entry)
              }
              onRemove={() => handleRemove(selectedChannel.id)}
              onNameChange={(name) =>
                handleNameChange(selectedChannel.id, name)
              }
              onSampleStartChange={(start) =>
                handleSampleStartChange(selectedChannel.id, start)
              }
              onSampleEndChange={(end) =>
                handleSampleEndChange(selectedChannel.id, end)
              }
              onSampleReversedChange={(reversed) =>
                handleSampleReversedChange(selectedChannel.id, reversed)
              }
              onSampleModeChange={(mode) =>
                handleSampleModeChange(selectedChannel.id, mode)
              }
              onSliceCountChange={(sliceCount) =>
                handleSliceCountChange(selectedChannel.id, sliceCount)
              }
              // Only while a step is open, and only while the sample is in
              // parts: the band marks the slice the Position slider is pointed
              // at, so with no slider on screen there is nothing for it to mark.
              highlightSlice={
                editingStep && isSliced(selectedChannel.sampleMode)
                  ? editingStep.slice
                  : null
              }
              onSampleTrimReset={() =>
                handleSampleTrimReset(selectedChannel.id)
              }
              getPlayhead={getSelectedPlayhead}
              volume={selectedSettings.volume}
              pan={selectedSettings.pan}
              pitch={selectedSettings.pitch}
              onVolumeChange={handleVolumeChange}
              onPanChange={handlePanChange}
              onPitchChange={handlePitchChange}
              filterSettings={{
                lowCutHz: selectedSettings.lowCutHz,
                lowCutResonance: selectedSettings.lowCutResonance,
                highCutHz: selectedSettings.highCutHz,
                highCutResonance: selectedSettings.highCutResonance,
              }}
              filterSlope={selectedChannel.filterSlope}
              // What the Filter, Env and FX tabs follow while the transport
              // runs, so the knobs and the pictures read out the locks of the
              // hit being heard rather than the channel underneath them.
              playingFilter={
                playingStepIndex === null ||
                playingStep === null ||
                playingSettings === null
                  ? null
                  : {
                      index: playingStepIndex,
                      settings: {
                        lowCutHz: playingSettings.lowCutHz,
                        lowCutResonance: playingSettings.lowCutResonance,
                        highCutHz: playingSettings.highCutHz,
                        highCutResonance: playingSettings.highCutResonance,
                      },
                      locks: playingStep.locks ?? {},
                    }
              }
              onLowCutChange={handleLowCutChange}
              onLowCutResonanceChange={handleLowCutResonanceChange}
              onHighCutChange={handleHighCutChange}
              onHighCutResonanceChange={handleHighCutResonanceChange}
              onFilterSlopeChange={handleFilterSlopeChange}
              envelopeSettings={{
                attackSeconds: selectedSettings.attackSeconds,
                decaySeconds: selectedSettings.decaySeconds,
                sustainLevel: selectedSettings.sustainLevel,
                releaseSeconds: selectedSettings.releaseSeconds,
              }}
              playingEnvelope={
                playingStepIndex === null ||
                playingStep === null ||
                playingSettings === null
                  ? null
                  : {
                      index: playingStepIndex,
                      settings: {
                        attackSeconds: playingSettings.attackSeconds,
                        decaySeconds: playingSettings.decaySeconds,
                        sustainLevel: playingSettings.sustainLevel,
                        releaseSeconds: playingSettings.releaseSeconds,
                      },
                      locks: playingStep.locks ?? {},
                    }
              }
              onAttackChange={handleAttackChange}
              onDecayChange={handleDecayChange}
              onSustainChange={handleSustainChange}
              onReleaseChange={handleReleaseChange}
              // Always the channel's own, and never a step's: no lock can
              // stand in for any of it, so there is nothing to resolve and
              // nothing for the playhead to drag the tab onto.
              lfo={selectedChannel.lfo}
              onLfoChange={(lfo) => handleLfoChange(selectedChannel.id, lfo)}
              fxSettings={{
                delaySend: selectedSettings.delaySend,
                reverbSend: selectedSettings.reverbSend,
                phaserSend: selectedSettings.phaserSend,
              }}
              playingFx={
                playingStepIndex === null ||
                playingStep === null ||
                playingSettings === null
                  ? null
                  : {
                      index: playingStepIndex,
                      settings: {
                        delaySend: playingSettings.delaySend,
                        reverbSend: playingSettings.reverbSend,
                        phaserSend: playingSettings.phaserSend,
                      },
                      locks: playingStep.locks ?? {},
                    }
              }
              onDelaySendChange={handleDelaySendChange}
              onReverbSendChange={handleReverbSendChange}
              onPhaserSendChange={handlePhaserSendChange}
              stepEdit={
                editingStepIndex === null || editingStep === null
                  ? undefined
                  : {
                      index: editingStepIndex,
                      locks: editingStep.locks ?? {},
                      onClearLock: handleClearStepLock,
                    }
              }
            />

            <SequencerTabsSection
              channel={selectedChannel}
              currentStep={currentStep}
              editingStep={editingStepIndex}
              swipeTarget={swipeTarget}
              onStepClick={handleStepClick}
              onStepHold={handleStepHold}
              onStepVelocityChange={handleStepVelocityChange}
              onStepPitchChange={handleStepPitchChange}
              onStepSliceChange={handleStepSliceChange}
              onStepProbabilityChange={handleStepProbabilityChange}
              onStepRepeatChange={handleStepRepeatChange}
              onStepTimingChange={handleStepTimingChange}
              onStepContextMenu={handleStepContextMenu}
              onSwipeTargetChange={setSwipeTarget}
              onApplyStepFill={handleApplyStepFill}
              onNudgeSteps={handleNudgeSteps}
              onClearSteps={handleClearSteps}
              onInvertSteps={handleInvertSteps}
              onHumanizeSteps={handleHumanizeSteps}
              onLengthChange={(length) =>
                handleLengthChange(selectedChannel.id, length)
              }
              banks={banks}
              selectedBankIndex={selectedBankIndex}
              activePatternIndex={
                activePattern?.bankIndex === selectedBankIndex
                  ? activePattern.patternIndex
                  : null
              }
              onSelectBank={selectBank}
              onLoadPattern={handleLoadPattern}
              onPatternContextMenu={handlePatternContextMenu}
            />
          </div>
        </div>

        {/*
          What the mix is put through: a fixed rail from `xl` up, and the FX
          page below that, standing in for the column the same way Settings
          does on its own turn.
        */}
        <Sidebar
          id={FX_SIDEBAR_ID}
          side="right"
          label="Effects"
          mobileActive={mobilePage === "fx"}
        >
          {/*
            Two tabs rather than two stacked bands: six stages of sliders is more
            than a rail's height, and which of the two kinds of stage you are
            working on — the buses channels feed by choice, or the stages the
            whole mix goes through whether it likes it or not — is a decision that
            holds for a while rather than one made slider by slider.

            Sends come first because their returns rejoin at the master input, so
            the stages on the other tab are working on the repeats, the tail and
            the sweep as well as on the dry channels. Each tab then runs in
            signal-chain order within itself.
          */}
          <RailTabs
            label="Effects"
            tabs={[
              {
                id: "send-fx",
                label: "Send FX",
                panel: (
                  <>
                    <MasterDelayControls
                      delay={masterDelay}
                      bpm={effectiveBpm}
                      onChange={setMasterDelay}
                    />

                    <MasterReverbControls
                      reverb={masterReverb}
                      onChange={setMasterReverb}
                    />

                    {/* Last of the three, because the other two can feed it: the
                        delay sends on into the reverb, and the reverb sends on
                        into here. */}
                    <MasterPhaserControls
                      phaser={masterPhaser}
                      onChange={setMasterPhaser}
                    />
                  </>
                ),
              },
              {
                id: "master-fx",
                label: "Master FX",
                panel: (
                  <>
                    <MasterDriveControls
                      drive={masterDrive}
                      onChange={setMasterDrive}
                    />

                    <MasterFilterControls
                      filter={masterFilter}
                      onChange={setMasterFilter}
                    />

                    {/* Last of the stages, and last of them in the signal too:
                        it is levelling what the drive and the cuts have already
                        made rather than a mix still about to change under it. */}
                    <MasterCompressorControls
                      compressor={masterCompressor}
                      getGainReduction={getGainReduction}
                      onChange={setMasterCompressor}
                    />

                    {/*
                      The foot of the chain, under the stages that shape what it
                      is setting the level of — it used to sit in the controls
                      rail, a page away on mobile from every other thing done to
                      the whole mix. Boxed like the stages above it, minus the
                      bypass button no fader has any use for.
                    */}
                    <MasterVolumeControls
                      volume={masterVolume}
                      onChange={setMasterVolume}
                    />
                  </>
                ),
              },
            ]}
          />
        </Sidebar>
      </div>

      <MobileFooterNav page={mobilePage} onChange={setMobilePage} />

      {contextMenuStep && (
        <StepContextMenu
          x={contextMenuStep.x}
          y={contextMenuStep.y}
          onClose={closeStepContextMenu}
          clearDisabled={isStepCleared(
            selectedChannel.steps[contextMenuStep.index],
          )}
          onClearStep={handleClearStepFromMenu}
          onEditStep={handleEditStepFromMenu}
          onCopyStep={handleCopyStepFromMenu}
          pasteDisabled={clipboardStep === null}
          onPasteStep={handlePasteStepFromMenu}
        />
      )}

      {contextMenuChannel && contextMenuChannelTarget && (
        <ChannelContextMenu
          x={contextMenuChannel.x}
          y={contextMenuChannel.y}
          onClose={closeChannelContextMenu}
          onClearSteps={() =>
            handleClearStepsFromMenu(contextMenuChannelTarget.id)
          }
          onCopySteps={() =>
            handleCopyStepsFromMenu(contextMenuChannelTarget.id)
          }
          pasteStepsDisabled={clipboardSteps === null}
          onPasteSteps={() =>
            handlePasteStepsFromMenu(contextMenuChannelTarget.id)
          }
          copySampleDisabled={
            contextMenuChannelTarget.sample.status !== "loaded"
          }
          onCopySample={() =>
            handleCopySampleFromMenu(contextMenuChannelTarget.id)
          }
          pasteSampleDisabled={clipboardSample === null}
          onPasteSample={() =>
            handlePasteSampleFromMenu(contextMenuChannelTarget.id)
          }
          muted={contextMenuChannelTarget.muted}
          onToggleMute={() => handleToggleMute(contextMenuChannelTarget.id)}
          soloed={contextMenuChannelTarget.soloed}
          onToggleSolo={() => handleToggleSolo(contextMenuChannelTarget.id)}
        />
      )}

      {contextMenuPattern && (
        <PatternContextMenu
          x={contextMenuPattern.x}
          y={contextMenuPattern.y}
          onClose={closePatternContextMenu}
          onSavePattern={() =>
            handleSavePatternFromMenu(contextMenuPattern.index)
          }
          deleteDisabled={getPattern(contextMenuPattern.index) === null}
          onDeletePattern={() =>
            handleDeletePatternFromMenu(contextMenuPattern.index)
          }
        />
      )}
    </div>
  );
}
