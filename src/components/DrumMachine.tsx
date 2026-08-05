"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import ChannelContextMenu from "@/components/channel/ChannelContextMenu";
import ChannelEditor from "@/components/channel/ChannelEditor";
import ChannelGrid from "@/components/channel/ChannelGrid";
import StepContextMenu from "@/components/channel/steps/StepContextMenu";
import MasterCompressorControls from "@/components/master/MasterCompressorControls";
import MasterDelayControls from "@/components/master/MasterDelayControls";
import MasterDriveControls from "@/components/master/MasterDriveControls";
import MasterFilterControls from "@/components/master/MasterFilterControls";
import MasterPhaserControls from "@/components/master/MasterPhaserControls";
import MasterReverbControls from "@/components/master/MasterReverbControls";
import MasterVolumeControls from "@/components/master/MasterVolumeControls";
import Oscilloscope from "@/components/master/Oscilloscope";
import PresetPicker from "@/components/session/PresetPicker";
import SnapshotControls from "@/components/session/SnapshotControls";
import LoadSamplesNotice from "@/components/shell/LoadSamplesNotice";
import Sidebar, {
  CONTROLS_SIDEBAR_ID,
  FX_SIDEBAR_ID,
} from "@/components/shell/Sidebar";
import SidebarTab from "@/components/shell/SidebarTab";
import ThemeSelector from "@/components/shell/ThemeSelector";
import PlayButton from "@/components/transport/PlayButton";
import Transport from "@/components/transport/Transport";
import RailTabs from "@/components/ui/RailTabs";
import { useChannelFlash } from "@/hooks/useChannelFlash";
import { useChannelShortcuts } from "@/hooks/useChannelShortcuts";
import { useMasterFilterShortcuts } from "@/hooks/useMasterFilterShortcuts";
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
  DEFAULT_SAMPLE_REVERSED,
  DEFAULT_SAMPLE_START,
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
  clampSampleEnd,
  clampSampleStart,
  clampSend,
  clampVolume,
  clearStepAt,
  clearStepLockAt,
  clearStepLocksAt,
  clearSteps,
  createInitialChannels,
  emptyChannel,
  hasSoloedChannel,
  humanizeSteps,
  invertSteps,
  isChannelAudible,
  isStepCleared,
  nudgeSteps,
  pasteStepAt,
  repeatOffsets,
  secondsToNextStep,
  setStepLockAt,
  setStepProbabilityAt,
  setStepRepeatAt,
  setStepVelocityAt,
  stepFires,
  toggleStepAt,
  triggerOptionsForChannel,
  type Channel,
  type ChannelLfo,
  type LockableParameter,
  type MasterCompressor,
  type MasterDelay,
  type MasterDrive,
  type MasterFilter,
  type MasterPhaser,
  type MasterReverb,
  type ParameterSnapshot,
  type SampleState,
  type Step,
  type StepFill,
  type SwipeTarget,
} from "@/lib/sequencer";
import {
  DEFAULT_PRESET,
  PRESETS,
  presetSlotUrl,
  type Preset,
} from "@/lib/presets";
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
 * The direction goes with them, unlike on a trim reset — that button is about
 * the handles alone, where a new file arriving to find itself already playing
 * backwards would be a surprise nothing on screen accounts for.
 */
const UNEDITED = {
  ...UNTRIMMED,
  sampleReversed: DEFAULT_SAMPLE_REVERSED,
} as const;

export default function DrumMachine() {
  const [channels, setChannels] = useState<Channel[]>(createInitialChannels);
  const [bpm, setBpm] = useState(DEFAULT_BPM);
  const [swing, setSwing] = useState(DEFAULT_SWING);
  const [selectedChannelId, setSelectedChannelId] = useState(
    channelIdForIndex(0),
  );
  /**
   * Which rail is showing as a drawer, only meaningful below `lg` where the
   * rails are overlays. One field rather than two flags, so opening one drawer
   * closes the other instead of stacking them on top of each other.
   */
  const [openDrawer, setOpenDrawer] = useState<"fx" | "controls" | null>(null);

  const toggleDrawer = useCallback((drawer: "fx" | "controls") => {
    setOpenDrawer((open) => (open === drawer ? null : drawer));
  }, []);

  const closeDrawer = useCallback(() => setOpenDrawer(null), []);

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

  /** The last pattern copied from a channel's context menu. */
  const [clipboardPattern, setClipboardPattern] = useState<{
    steps: Step[];
    length: number;
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
    applyMasterDrive,
    applyMasterFilter,
    applyMasterDelay,
    applyMasterReverb,
    applyMasterPhaser,
    applyMasterCompressor,
    getGainReduction,
    getWaveform,
    applyMasterVolume,
    loadSample,
    loadSampleFromUrl,
    removeSample,
    getSampleBuffer,
    setSampleBuffer,
    trigger,
    choke,
  } = useSampleBank();

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
    applyMasterDelay(masterDelay, bpm);
  }, [applyMasterDelay, bpm, masterDelay]);

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
      const stepDuration = secondsToNextStep(tick, bpm, swing);

      for (const channel of channelsRef.current) {
        if (!isChannelAudible(channel, soloActive)) continue;

        // The step is handed to the options rather than only consulted, so its
        // velocity and whatever it locks reach this one hit and nothing else.
        const step = channel.steps[tick % clampLength(channel.length)];
        if (!step.on) continue;
        // Rolled once per step rather than once per repeat, so a roll either
        // happens in full or not at all — never half-fires.
        if (!stepFires(step.probability)) continue;

        const options = triggerOptionsForChannel(channel, step);
        for (const offset of repeatOffsets(step.repeatCount, stepDuration)) {
          trigger(channel.id, time + offset, options);
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
    [bpm, choke, flashChannels, swing, trigger],
  );

  const { isPlaying, currentTick, play, stop } = useSequencer({
    bpm,
    swing,
    ensureContext,
    onStep: handleStep,
  });

  /** Applies a partial update to a single channel. */
  const updateChannel = useCallback(
    (channelId: string, patch: Partial<Channel>) => {
      setChannels((prev) =>
        prev.map((channel) =>
          channel.id === channelId ? { ...channel, ...patch } : channel,
        ),
      );
    },
    [],
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

  const handleSampleTrimReset = useCallback(
    (channelId: string) => updateChannel(channelId, UNTRIMMED),
    [updateChannel],
  );

  // Removing a sample keeps the channel's pattern, so a new sample can be
  // dropped straight onto the same rhythm.
  const handleRemove = useCallback(
    (channelId: string) => {
      removeSample(channelId);
      updateChannel(channelId, { sample: { status: "empty" }, ...UNEDITED });
    },
    [removeSample, updateChannel],
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

  /** "Clear Pattern" from the context menu: every step back to `createStep`. */
  const handleClearPatternFromMenu = useCallback(
    (channelId: string) => updateStepsForChannel(channelId, clearSteps),
    [updateStepsForChannel],
  );

  /** "Copy Pattern": the steps and the length that gives them their loop. */
  const handleCopyPatternFromMenu = useCallback(
    (channelId: string) => {
      const channel = channels.find((item) => item.id === channelId);
      if (!channel) return;
      setClipboardPattern({ steps: channel.steps, length: channel.length });
    },
    [channels],
  );

  const handlePastePatternFromMenu = useCallback(
    (channelId: string) => {
      if (!clipboardPattern) return;
      updateChannel(channelId, {
        steps: clipboardPattern.steps,
        length: clipboardPattern.length,
      });
    },
    [clipboardPattern, updateChannel],
  );

  /** "Copy Sample": nothing to copy from a channel with none loaded. */
  const handleCopySampleFromMenu = useCallback(
    (channelId: string) => {
      const channel = channels.find((item) => item.id === channelId);
      if (!channel || channel.sample.status !== "loaded") return;

      const buffer = getSampleBuffer(channelId);
      if (!buffer) return;

      // The trim and the direction go with it: both are part of what was
      // dialled into that sample, and pasting a hit that was cut down to its
      // transient only to hear the whole file again — the right way round —
      // would be the wrong answer to "copy".
      setClipboardSample({
        buffer,
        sample: channel.sample,
        start: channel.sampleStart,
        end: channel.sampleEnd,
        reversed: channel.sampleReversed,
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
      });
    },
    [clipboardSample, setSampleBuffer, updateChannel],
  );

  /**
   * Auditions one channel outside the transport, so a sample can be checked
   * without starting playback. Mute and solo are deliberately ignored: this is
   * a direct request to hear that one channel, not a change to the mix.
   *
   * The context is created and resumed inside the click gesture, which is what
   * browsers require before any sound can come out.
   */
  const handlePreviewChannel = useCallback(
    (channelId: string) => {
      const context = ensureContext();
      if (context.state === "suspended") {
        void context.resume();
      }

      const channel = channelsRef.current.find((item) => item.id === channelId);
      if (!channel) return;

      trigger(
        channelId,
        context.currentTime,
        triggerOptionsForChannel(channel),
      );
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

  const handleAttackChange = useCallback(
    (seconds: number) => setParameter("attackSeconds", clampAttack(seconds)),
    [setParameter],
  );

  const handleDecayChange = useCallback(
    (seconds: number) => setParameter("decaySeconds", clampDecay(seconds)),
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

      const slots = preset.slots.slice(0, CHANNEL_COUNT);

      if (slots.length === 0) {
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
          const slot = slots[index];
          if (!slot) return channel;
          return {
            ...channel,
            name: clampChannelName(slot.channelName),
            sample: { status: "loading", name: slot.file },
            ...UNEDITED,
          };
        }),
      );

      await Promise.all(
        slots.map(async (slot, index) => {
          const channelId = channelIdForIndex(index);
          try {
            const buffer = await loadSampleFromUrl(
              channelId,
              presetSlotUrl(preset, slot),
            );
            updateChannel(channelId, {
              sample: {
                status: "loaded",
                name: slot.file,
                peaks: computePeaks(buffer),
                durationSeconds: buffer.duration,
              },
            });
          } catch (error) {
            console.error(`Failed to load preset sample ${slot.file}`, error);
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
   * Loads the default kit once, on the way in, so the machine opens on
   * something that plays instead of on sixteen empty channels waiting to be
   * filled before anything can be heard.
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
    void handleLoadPreset(DEFAULT_PRESET);
  }, [handleLoadPreset]);

  const canPlay = channels.some(
    (channel) => channel.sample.status === "loaded",
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

  // The playhead shown is the selected channel's own position in its cycle.
  const currentStep =
    currentTick === null
      ? null
      : currentTick % clampLength(selectedChannel.length);

  return (
    // The page carries the surface colour now that the cards are unfilled —
    // the header and the rails already assume this pairing.
    //
    // Filling the viewport exactly, rather than growing past it, is what moves
    // the scrolling inside: nothing here can push the window taller, so the
    // only thing that scrolls is the content pane further down.
    <div className="bg-surface text-fg h-full overflow-hidden">
      {/*
        Everything that acts on the machine as a whole rather than on one
        channel: what it plays with, how it plays, and how loud it comes out.
        Keeping them off the page means they stay put however far the channel
        list is scrolled.
      */}
      <Sidebar
        id={CONTROLS_SIDEBAR_ID}
        side="left"
        label="controls"
        isOpen={openDrawer === "controls"}
        onClose={closeDrawer}
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

        {/* Last of the controls, because it is last in the signal too. */}
        <MasterVolumeControls
          volume={masterVolume}
          onChange={setMasterVolume}
        />

        {/*
          Below the fader, and so below everything that makes a sound: how the
          machine looks is a preference about the page rather than a control on
          the instrument, and putting it last keeps it out of the way of the
          things that are reached for while playing.
        */}
        <ThemeSelector />
      </Sidebar>

      <SidebarTab
        side="left"
        label="Show controls"
        controls={CONTROLS_SIDEBAR_ID}
        isOpen={openDrawer === "controls"}
        onToggle={() => toggleDrawer("controls")}
      />

      <Sidebar
        id={FX_SIDEBAR_ID}
        side="right"
        label="effects"
        isOpen={openDrawer === "fx"}
        onClose={closeDrawer}
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
                    bpm={bpm}
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

                  {/* Last of the stages, and last in the signal too: it is
                      levelling what the drive and the cuts have already made
                      rather than a mix still about to change under it. */}
                  <MasterCompressorControls
                    compressor={masterCompressor}
                    getGainReduction={getGainReduction}
                    onChange={setMasterCompressor}
                  />
                </>
              ),
            },
          ]}
        />
      </Sidebar>

      <SidebarTab
        side="right"
        label="Show effects"
        controls={FX_SIDEBAR_ID}
        isOpen={openDrawer === "fx"}
        onToggle={() => toggleDrawer("fx")}
      />

      {/* Padding clears the fixed rails so the content centres between them.
          A column the height of the viewport: the header takes what it needs
          and the pane below it takes the rest. */}
      <div className="flex h-full flex-col lg:px-64">
        {/*
          Outside the scrolling pane rather than sticky within it, so the
          snapshot buttons stay on screen and a mix can be saved however far
          the channel list is scrolled. The drawer's backdrop is fixed, so on
          mobile the header still goes behind the overlay with everything else.
        */}
        <header className="border-line bg-surface shrink-0 border-b">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-3 px-6 py-3">
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
            <h1 className="sr-only text-lg font-semibold lg:not-sr-only">
              Drum Machine
            </h1>

            {/* Pushed to the far edge below `lg`, away from the play button, so
                a snapshot is never saved by a thumb aiming for the transport.
                From `lg` up it stays beside the title, as before. */}
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
          The one scrolling box on the page. `min-h-0` is what lets it shrink
          below its content's height — without it a flex item refuses to, and
          the overflow would push the column past the viewport instead of
          scrolling here.
        */}
        <div className="quiet-scrollbar overflow-y-auto flex-1 min-h-0 flex">
          <div
            id="drum-main-content"
            className="mx-auto flex w-full max-w-5xl flex-col gap-6  p-6"
          >
            {/* First thing in the column, directly above the sample slot that
              answers it. Only while the kit is empty: once anything is loaded
              the greyed-out transport is no longer a mystery worth explaining.
              And not while a kit is on its way in, since asking for samples at
              the moment samples are arriving would answer itself. */}
            {!canPlay && loadingPresetId === null && <LoadSamplesNotice />}

            <ChannelEditor
              channel={selectedChannel}
              showSampleOnly={true}
              onUpload={(file) => void handleUpload(selectedChannel.id, file)}
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
              onSampleTrimReset={() =>
                handleSampleTrimReset(selectedChannel.id)
              }
            />

            <ChannelGrid
              channels={channels}
              selectedChannelId={selectedChannel.id}
              flashedChannelIds={flashedChannelIds}
              onSelectChannel={handleSelectChannel}
              onPreviewChannel={handlePreviewChannel}
              onToggleMute={handleToggleMute}
              onToggleSolo={handleToggleSolo}
              onChannelContextMenu={handleChannelContextMenu}
            />

            <ChannelEditor
              channel={selectedChannel}
              currentStep={currentStep}
              editingStep={editingStepIndex}
              swipeTarget={swipeTarget}
              showSequencerOnly={true}
              onStepClick={handleStepClick}
              onStepHold={handleStepHold}
              onStepVelocityChange={handleStepVelocityChange}
              onStepPitchChange={handleStepPitchChange}
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
            />

            <ChannelEditor
              channel={selectedChannel}
              settings={channelSettingsForStep(selectedChannel, editingStep)}
              showControlsOnly={true}
              chokeOptions={chokeOptions}
              stepEdit={
                editingStepIndex === null || editingStep === null
                  ? undefined
                  : {
                      index: editingStepIndex,
                      velocity: editingStep.velocity,
                      probability: editingStep.probability,
                      repeatCount: editingStep.repeatCount,
                      locks: editingStep.locks ?? {},
                      onVelocityChange: (velocity) =>
                        handleStepVelocityChange(editingStepIndex, velocity),
                      onProbabilityChange: (probability) =>
                        handleStepProbabilityChange(
                          editingStepIndex,
                          probability,
                        ),
                      onRepeatChange: (repeatCount) =>
                        handleStepRepeatChange(editingStepIndex, repeatCount),
                      onClearLock: handleClearStepLock,
                      onClearLocks: handleClearStepLocks,
                    }
              }
              onVolumeChange={handleVolumeChange}
              onPanChange={handlePanChange}
              onPitchChange={handlePitchChange}
              onLowCutChange={handleLowCutChange}
              onHighCutChange={handleHighCutChange}
              onAttackChange={handleAttackChange}
              onDecayChange={handleDecayChange}
              onDelaySendChange={handleDelaySendChange}
              onReverbSendChange={handleReverbSendChange}
              onPhaserSendChange={handlePhaserSendChange}
              onChokedByChange={(sourceId) =>
                handleChokedByChange(selectedChannel.id, sourceId)
              }
              onLfoChange={(lfo) => handleLfoChange(selectedChannel.id, lfo)}
            />
          </div>
        </div>
      </div>

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
          onClearPattern={() =>
            handleClearPatternFromMenu(contextMenuChannelTarget.id)
          }
          onCopyPattern={() =>
            handleCopyPatternFromMenu(contextMenuChannelTarget.id)
          }
          pastePatternDisabled={clipboardPattern === null}
          onPastePattern={() =>
            handlePastePatternFromMenu(contextMenuChannelTarget.id)
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
    </div>
  );
}
