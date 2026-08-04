"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import ChannelEditor from "./ChannelEditor";
import ChannelGrid from "./ChannelGrid";
import LoadSamplesNotice from "./LoadSamplesNotice";
import MasterDelayControls from "./MasterDelayControls";
import MasterDriveControls from "./MasterDriveControls";
import MasterFilterControls from "./MasterFilterControls";
import MasterReverbControls from "./MasterReverbControls";
import MasterVolumeControls from "./MasterVolumeControls";
import PlayButton from "./PlayButton";
import PresetPicker from "./PresetPicker";
import RailGroup from "./RailGroup";
import Sidebar, { CONTROLS_SIDEBAR_ID, FX_SIDEBAR_ID } from "./Sidebar";
import SidebarTab from "./SidebarTab";
import SnapshotControls from "./SnapshotControls";
import ThemeSelector from "./ThemeSelector";
import Transport from "./Transport";
import { useChannelFlash } from "@/hooks/useChannelFlash";
import { useChannelShortcuts } from "@/hooks/useChannelShortcuts";
import { useMasterFilterShortcuts } from "@/hooks/useMasterFilterShortcuts";
import { useSampleBank } from "@/hooks/useSampleBank";
import { useSequencer } from "@/hooks/useSequencer";
import { useTransportShortcuts } from "@/hooks/useTransportShortcuts";
import {
  CHANNEL_COUNT,
  DEFAULT_BPM,
  DEFAULT_MASTER_DELAY,
  DEFAULT_MASTER_DRIVE,
  DEFAULT_MASTER_FILTER,
  DEFAULT_MASTER_REVERB,
  DEFAULT_MASTER_VOLUME,
  DEFAULT_SWING,
  applyChannelSnapshots,
  applyStepFill,
  captureChannelSnapshots,
  channelIdForIndex,
  clampAttack,
  clampChannelName,
  clampDecay,
  clampFrequency,
  clampLength,
  clampPitch,
  clampSend,
  clampVolume,
  clearSteps,
  createInitialChannels,
  hasSoloedChannel,
  invertSteps,
  isChannelAudible,
  nudgeSteps,
  triggerOptionsForChannel,
  type Channel,
  type ChannelLfo,
  type MasterDelay,
  type MasterDrive,
  type MasterFilter,
  type MasterReverb,
  type ParameterSnapshot,
  type StepFill,
} from "@/lib/sequencer";
import { PRESETS, presetSlotUrl, type Preset } from "@/lib/presets";
import { computePeaks } from "@/lib/waveform";

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

  const [loadingPresetId, setLoadingPresetId] = useState<string | null>(null);

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
  const [masterVolume, setMasterVolume] = useState(DEFAULT_MASTER_VOLUME);

  /** The last saved parameter snapshot, or null until one has been taken. */
  const [snapshot, setSnapshot] = useState<ParameterSnapshot | null>(null);

  const {
    ensureContext,
    applyMasterDrive,
    applyMasterFilter,
    applyMasterDelay,
    applyMasterReverb,
    applyMasterVolume,
    loadSample,
    loadSampleFromUrl,
    removeSample,
    trigger,
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

      for (const channel of channelsRef.current) {
        if (!isChannelAudible(channel, soloActive)) continue;
        if (channel.steps[tick % clampLength(channel.length)]) {
          trigger(channel.id, time, triggerOptionsForChannel(channel));
          firedChannelIds.push(channel.id);
        }
      }

      // One call for the whole step, so a busy tick lights every pad it hit in
      // a single update.
      flashChannels(firedChannelIds, time);
    },
    [flashChannels, trigger],
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

  const handleToggleStep = useCallback(
    (channelId: string, stepIndex: number) => {
      setChannels((prev) =>
        prev.map((channel) =>
          channel.id === channelId
            ? {
                ...channel,
                steps: channel.steps.map((active, index) =>
                  index === stepIndex ? !active : active,
                ),
              }
            : channel,
        ),
      );
    },
    [],
  );

  /**
   * Writes one of the ready-made rhythms over a channel's pattern, replacing
   * whatever was there. Overwriting rather than adding to what is programmed
   * keeps each button meaning one thing: press it and the channel plays that
   * rhythm, whatever it was playing before.
   */
  const handleApplyStepFill = useCallback(
    (channelId: string, fill: StepFill) => {
      setChannels((prev) =>
        prev.map((channel) =>
          channel.id === channelId
            ? {
                ...channel,
                steps: applyStepFill(channel.steps, channel.length, fill),
              }
            : channel,
        ),
      );
    },
    [],
  );

  const handleNudgeSteps = useCallback((channelId: string, offset: number) => {
    setChannels((prev) =>
      prev.map((channel) =>
        channel.id === channelId
          ? {
              ...channel,
              steps: nudgeSteps(channel.steps, channel.length, offset),
            }
          : channel,
      ),
    );
  }, []);

  const handleClearSteps = useCallback((channelId: string) => {
    setChannels((prev) =>
      prev.map((channel) =>
        channel.id === channelId
          ? { ...channel, steps: clearSteps(channel.steps, channel.length) }
          : channel,
      ),
    );
  }, []);

  const handleInvertSteps = useCallback((channelId: string) => {
    setChannels((prev) =>
      prev.map((channel) =>
        channel.id === channelId
          ? { ...channel, steps: invertSteps(channel.steps, channel.length) }
          : channel,
      ),
    );
  }, []);

  const handleUpload = useCallback(
    async (channelId: string, file: File) => {
      updateChannel(channelId, {
        sample: { status: "loading", name: file.name },
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

  // Removing a sample keeps the channel's pattern, so a new sample can be
  // dropped straight onto the same rhythm.
  const handleRemove = useCallback(
    (channelId: string) => {
      removeSample(channelId);
      updateChannel(channelId, { sample: { status: "empty" } });
    },
    [removeSample, updateChannel],
  );

  const handleLengthChange = useCallback(
    (channelId: string, length: number) => {
      updateChannel(channelId, { length: clampLength(length) });
    },
    [updateChannel],
  );

  const handleVolumeChange = useCallback(
    (channelId: string, volume: number) => {
      updateChannel(channelId, { volume: clampVolume(volume) });
    },
    [updateChannel],
  );

  const handlePitchChange = useCallback(
    (channelId: string, pitch: number) => {
      updateChannel(channelId, { pitch: clampPitch(pitch) });
    },
    [updateChannel],
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
    },
    [ensureContext, flashChannels, trigger],
  );

  const handleSelectChannelIndex = useCallback((index: number) => {
    setSelectedChannelId(channelIdForIndex(index));
  }, []);

  useChannelShortcuts({
    channelCount: channels.length,
    onSelectChannelIndex: handleSelectChannelIndex,
  });

  const handleToggleMasterFilter = useCallback(() => {
    setMasterFilter((prev) => ({ ...prev, enabled: !prev.enabled }));
  }, []);

  useMasterFilterShortcuts({ onToggle: handleToggleMasterFilter });

  const handleLowCutChange = useCallback(
    (channelId: string, hz: number) => {
      updateChannel(channelId, { lowCutHz: clampFrequency(hz) });
    },
    [updateChannel],
  );

  const handleHighCutChange = useCallback(
    (channelId: string, hz: number) => {
      updateChannel(channelId, { highCutHz: clampFrequency(hz) });
    },
    [updateChannel],
  );

  const handleAttackChange = useCallback(
    (channelId: string, seconds: number) => {
      updateChannel(channelId, { attackSeconds: clampAttack(seconds) });
    },
    [updateChannel],
  );

  const handleDecayChange = useCallback(
    (channelId: string, seconds: number) => {
      updateChannel(channelId, { decaySeconds: clampDecay(seconds) });
    },
    [updateChannel],
  );

  const handleDelaySendChange = useCallback(
    (channelId: string, amount: number) => {
      updateChannel(channelId, { delaySend: clampSend(amount) });
    },
    [updateChannel],
  );

  const handleReverbSendChange = useCallback(
    (channelId: string, amount: number) => {
      updateChannel(channelId, { reverbSend: clampSend(amount) });
    },
    [updateChannel],
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
   * Freezes the current sound: every channel's parameters, all four master
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
      volume: masterVolume,
    });
  }, [masterDelay, masterDrive, masterFilter, masterReverb, masterVolume]);

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
    setMasterVolume(snapshot.volume);
  }, [snapshot]);

  /**
   * Fills the leading channels with a kit: names and loading state are applied
   * up front in one pass, then each sample resolves independently so a single
   * missing file can't stall the rest of the kit. Step patterns are untouched.
   */
  const handleLoadPreset = useCallback(
    async (preset: Preset) => {
      // Create the audio context while still inside the click gesture.
      ensureContext();
      setLoadingPresetId(preset.id);

      const slots = preset.slots.slice(0, CHANNEL_COUNT);

      setChannels((prev) =>
        prev.map((channel, index) => {
          const slot = slots[index];
          if (!slot) return channel;
          return {
            ...channel,
            name: clampChannelName(slot.channelName),
            sample: { status: "loading", name: slot.file },
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

  const selectedChannel =
    channels.find((channel) => channel.id === selectedChannelId) ?? channels[0];

  // The playhead shown is the selected channel's own position in its cycle.
  const currentStep =
    currentTick === null
      ? null
      : currentTick % clampLength(selectedChannel.length);

  return (
    // The page carries the surface colour now that the cards are unfilled —
    // the header and the rails already assume this pairing.
    <div className="bg-surface text-fg min-h-screen">
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
          Both groups run in signal-chain order, and the sends come first
          because their returns rejoin at the master input — so the drive and
          the cuts in the group below are working on the repeats and the tail
          as well as on the dry channels.
        */}
        <RailGroup title="Send FX">
          <MasterDelayControls
            delay={masterDelay}
            bpm={bpm}
            onChange={setMasterDelay}
          />

          <MasterReverbControls
            reverb={masterReverb}
            onChange={setMasterReverb}
          />
        </RailGroup>

        <RailGroup title="Master FX">
          <MasterDriveControls drive={masterDrive} onChange={setMasterDrive} />

          <MasterFilterControls
            filter={masterFilter}
            onChange={setMasterFilter}
          />
        </RailGroup>
      </Sidebar>

      <SidebarTab
        side="right"
        label="Show effects"
        controls={FX_SIDEBAR_ID}
        isOpen={openDrawer === "fx"}
        onToggle={() => toggleDrawer("fx")}
      />

      {/* Padding clears the fixed rails so the content centres between them. */}
      <div className="lg:px-64">
        {/*
          Sticky, so the snapshot buttons stay on screen and a mix can be saved
          from anywhere in a long page. It sits below the drawer's backdrop, so
          on mobile the header goes behind the overlay with everything else.
        */}
        <header className="border-line bg-surface sticky top-0 z-20 border-b">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-3 px-6 py-3">
            {/* Below `lg` the rail holding Play is a closed drawer, so the
                transport gets a stand-in here — first in the row, since it is
                the control reached for most. */}
            <PlayButton
              isPlaying={isPlaying}
              canPlay={canPlay}
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
            <div className="ml-auto lg:ml-0">
              <SnapshotControls
                hasSnapshot={snapshot !== null}
                onSave={handleSaveSnapshot}
                onRecall={handleRecallSnapshot}
              />
            </div>
          </div>
        </header>

        <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
          {/* First thing in the column, directly above the sample slot that
              answers it. Only while the kit is empty: once anything is loaded
              the greyed-out transport is no longer a mystery worth explaining. */}
          {!canPlay && <LoadSamplesNotice />}

          <ChannelEditor
            channel={selectedChannel}
            showSampleOnly={true}
            onUpload={(file) => void handleUpload(selectedChannel.id, file)}
            onRemove={() => handleRemove(selectedChannel.id)}
            onNameChange={(name) => handleNameChange(selectedChannel.id, name)}
          />

          <ChannelGrid
            channels={channels}
            selectedChannelId={selectedChannel.id}
            flashedChannelIds={flashedChannelIds}
            onSelectChannel={setSelectedChannelId}
            onPreviewChannel={handlePreviewChannel}
            onToggleMute={handleToggleMute}
            onToggleSolo={handleToggleSolo}
          />

          <ChannelEditor
            channel={selectedChannel}
            currentStep={currentStep}
            showSequencerOnly={true}
            onToggleStep={(stepIndex) =>
              handleToggleStep(selectedChannel.id, stepIndex)
            }
            onApplyStepFill={(fill) =>
              handleApplyStepFill(selectedChannel.id, fill)
            }
            onNudgeSteps={(offset) =>
              handleNudgeSteps(selectedChannel.id, offset)
            }
            onClearSteps={() => handleClearSteps(selectedChannel.id)}
            onInvertSteps={() => handleInvertSteps(selectedChannel.id)}
            onLengthChange={(length) =>
              handleLengthChange(selectedChannel.id, length)
            }
          />

          <ChannelEditor
            channel={selectedChannel}
            currentStep={currentStep}
            showControlsOnly={true}
            onVolumeChange={(volume) =>
              handleVolumeChange(selectedChannel.id, volume)
            }
            onPitchChange={(pitch) =>
              handlePitchChange(selectedChannel.id, pitch)
            }
            onLowCutChange={(hz) => handleLowCutChange(selectedChannel.id, hz)}
            onHighCutChange={(hz) =>
              handleHighCutChange(selectedChannel.id, hz)
            }
            onAttackChange={(seconds) =>
              handleAttackChange(selectedChannel.id, seconds)
            }
            onDecayChange={(seconds) =>
              handleDecayChange(selectedChannel.id, seconds)
            }
            onDelaySendChange={(amount) =>
              handleDelaySendChange(selectedChannel.id, amount)
            }
            onReverbSendChange={(amount) =>
              handleReverbSendChange(selectedChannel.id, amount)
            }
            onLfoChange={(lfo) => handleLfoChange(selectedChannel.id, lfo)}
          />
        </div>
      </div>
    </div>
  );
}
